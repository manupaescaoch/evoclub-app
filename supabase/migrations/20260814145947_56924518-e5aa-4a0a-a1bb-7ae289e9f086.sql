-- 1. OCCURRENCES TABLE
CREATE TABLE IF NOT EXISTS public.occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id integer REFERENCES public.clients(id) ON DELETE CASCADE,
  unit_id uuid,
  type text NOT NULL DEFAULT 'outro',
  severity text NOT NULL DEFAULT 'media',
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'aberta',
  owner_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL,
  resolution_note text,
  resolved_by uuid,
  resolved_at timestamptz,
  source_table text,
  source_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT occurrences_type_chk CHECK (type IN ('dor','denuncia','acesso','equipamento','limpeza','atendimento','financeiro','limitacao','outro')),
  CONSTRAINT occurrences_status_chk CHECK (status IN ('aberta','em_andamento','resolvida')),
  CONSTRAINT occurrences_severity_chk CHECK (severity IN ('baixa','media','alta'))
);

CREATE UNIQUE INDEX IF NOT EXISTS occurrences_source_uidx ON public.occurrences(source_table, source_id);
CREATE INDEX IF NOT EXISTS occurrences_status_idx ON public.occurrences(status, created_at DESC);
CREATE INDEX IF NOT EXISTS occurrences_client_idx ON public.occurrences(client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.occurrences TO authenticated;
GRANT ALL ON public.occurrences TO service_role;

ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read occurrences" ON public.occurrences
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff insert occurrences" ON public.occurrences
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update occurrences" ON public.occurrences
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "admin delete occurrences" ON public.occurrences
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER occurrences_updated_at BEFORE UPDATE ON public.occurrences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. CRM OWNER ON CLIENTS
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS crm_owner_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL;

-- 3. MIRROR TRIGGERS
CREATE OR REPLACE FUNCTION public.occurrence_from_pain_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.occurrences (client_id, unit_id, type, severity, title, description, status, source_table, source_id, created_at)
  SELECT NEW.client_id, c.unit_id, 'dor', 'alta', 'Relato de dor/desconforto', NEW.note,
         CASE WHEN COALESCE(NEW.status,'open') IN ('resolved','resolvida') THEN 'resolvida' ELSE 'aberta' END,
         'pain_reports', NEW.id, COALESCE(NEW.created_at, now())
    FROM public.clients c WHERE c.id = NEW.client_id
  ON CONFLICT (source_table, source_id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS pain_report_occurrence ON public.pain_reports;
CREATE TRIGGER pain_report_occurrence AFTER INSERT ON public.pain_reports
FOR EACH ROW EXECUTE FUNCTION public.occurrence_from_pain_report();

CREATE OR REPLACE FUNCTION public.occurrence_from_limitation_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.occurrences (client_id, unit_id, type, severity, title, description, status, source_table, source_id, created_at)
  VALUES (NEW.client_id, NEW.unit_id, 'limitacao', 'media', 'Limitação atualizada pelo aluno',
          COALESCE(NEW.new_value,''),
          CASE WHEN NEW.acknowledged_at IS NOT NULL THEN 'resolvida' ELSE 'aberta' END,
          'limitation_alerts', NEW.id, COALESCE(NEW.created_at, now()))
  ON CONFLICT (source_table, source_id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS limitation_alert_occurrence ON public.limitation_alerts;
CREATE TRIGGER limitation_alert_occurrence AFTER INSERT ON public.limitation_alerts
FOR EACH ROW EXECUTE FUNCTION public.occurrence_from_limitation_alert();

-- 4. BACKFILL
INSERT INTO public.occurrences (client_id, unit_id, type, severity, title, description, status, source_table, source_id, created_at)
SELECT pr.client_id, c.unit_id, 'dor', 'alta', 'Relato de dor/desconforto', pr.note,
       CASE WHEN COALESCE(pr.status,'open') IN ('resolved','resolvida') THEN 'resolvida' ELSE 'aberta' END,
       'pain_reports', pr.id, pr.created_at
  FROM public.pain_reports pr LEFT JOIN public.clients c ON c.id = pr.client_id
ON CONFLICT (source_table, source_id) DO NOTHING;

INSERT INTO public.occurrences (client_id, unit_id, type, severity, title, description, status, source_table, source_id, created_at)
SELECT la.client_id, la.unit_id, 'limitacao', 'media', 'Limitação atualizada pelo aluno', COALESCE(la.new_value,''),
       CASE WHEN la.acknowledged_at IS NOT NULL THEN 'resolvida' ELSE 'aberta' END,
       'limitation_alerts', la.id, la.created_at
  FROM public.limitation_alerts la
ON CONFLICT (source_table, source_id) DO NOTHING;

-- 5. COMMUNITY REPORT -> OCCURRENCE
CREATE OR REPLACE FUNCTION public.handle_community_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _n integer; _author integer; _hidden boolean; _content text; _unit uuid;
BEGIN
  SELECT count(DISTINCT client_id) INTO _n FROM public.community_reports WHERE post_id = NEW.post_id;
  SELECT client_id, hidden, content INTO _author, _hidden, _content FROM public.community_posts WHERE id = NEW.post_id;

  IF _n >= 3 AND COALESCE(_hidden, false) = false THEN
    UPDATE public.community_posts SET hidden = true, hidden_reason = 'denuncias' WHERE id = NEW.post_id;

    IF _author IS NOT NULL THEN
      UPDATE public.clients SET post_blocked_until = now() + interval '24 hours' WHERE id = _author;
      INSERT INTO public.notifications (client_id, title, body, kind, url)
      VALUES (_author, 'Post removido do feed',
              'Seu post foi ocultado após denúncias da comunidade.', 'community', '/');
    END IF;

    SELECT unit_id INTO _unit FROM public.clients WHERE id = _author;
    INSERT INTO public.occurrences (client_id, unit_id, type, severity, title, description, status, source_table, source_id)
    VALUES (_author, _unit, 'denuncia', 'alta', 'Post denunciado na comunidade',
            COALESCE(NULLIF(_content,''),'(sem conteúdo)') || ' — ' || _n || ' denúncias', 'aberta',
            'community_posts', NEW.post_id)
    ON CONFLICT (source_table, source_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

-- 6. OCCURRENCE ACTIONS
CREATE OR REPLACE FUNCTION public.occurrence_set_status(_id uuid, _status text, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o record; _coord boolean;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RETURN jsonb_build_object('ok', false, 'reason','forbidden'); END IF;
  IF _status NOT IN ('aberta','em_andamento','resolvida') THEN RETURN jsonb_build_object('ok', false, 'reason','invalid_status'); END IF;
  SELECT * INTO _o FROM public.occurrences WHERE id = _id;
  IF _o.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason','not_found'); END IF;

  _coord := public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordinator')
            OR public.can_module(auth.uid(),'ocorrencias','sensitive');

  IF _o.type = 'dor' AND _status = 'resolvida' AND NOT _coord THEN
    RETURN jsonb_build_object('ok', false, 'reason','coordination_only');
  END IF;

  UPDATE public.occurrences
     SET status = _status,
         resolution_note = COALESCE(_note, resolution_note),
         resolved_by = CASE WHEN _status = 'resolvida' THEN auth.uid() ELSE NULL END,
         resolved_at = CASE WHEN _status = 'resolvida' THEN now() ELSE NULL END
   WHERE id = _id;

  IF _o.source_table = 'pain_reports' AND _o.source_id IS NOT NULL THEN
    UPDATE public.pain_reports
       SET status = CASE WHEN _status = 'resolvida' THEN 'resolved'
                         WHEN _status = 'em_andamento' THEN 'following' ELSE 'open' END,
           handled_by = CASE WHEN _status = 'aberta' THEN NULL ELSE auth.uid() END,
           handled_at = CASE WHEN _status = 'aberta' THEN NULL ELSE now() END
     WHERE id = _o.source_id;
  END IF;

  IF _o.source_table = 'limitation_alerts' AND _o.source_id IS NOT NULL AND _status = 'resolvida' THEN
    UPDATE public.limitation_alerts
       SET acknowledged_by = auth.uid(), acknowledged_at = now()
     WHERE id = _o.source_id AND acknowledged_at IS NULL;
  END IF;

  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.occurrence_assign(_id uuid, _collaborator_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RETURN jsonb_build_object('ok', false, 'reason','forbidden'); END IF;
  UPDATE public.occurrences SET owner_id = _collaborator_id WHERE id = _id;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.occurrence_list(_unit_id uuid DEFAULT NULL, _from date DEFAULT NULL, _to date DEFAULT NULL)
RETURNS TABLE(id uuid, client_id integer, client_name text, unit_id uuid, type text, severity text,
              title text, description text, status text, owner_id uuid, owner_name text,
              resolution_note text, resolved_at timestamptz, source_table text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.client_id, cl.name, o.unit_id, o.type, o.severity, o.title, o.description,
         o.status, o.owner_id, co.full_name, o.resolution_note, o.resolved_at, o.source_table, o.created_at
    FROM public.occurrences o
    LEFT JOIN public.clients cl ON cl.id = o.client_id
    LEFT JOIN public.collaborators co ON co.id = o.owner_id
   WHERE public.is_staff(auth.uid())
     AND (_unit_id IS NULL OR COALESCE(o.unit_id, cl.unit_id) = _unit_id)
     AND (_from IS NULL OR o.created_at::date >= _from)
     AND (_to IS NULL OR o.created_at::date <= _to)
   ORDER BY (o.status = 'resolvida'), o.created_at DESC
$$;

-- 7. WAITLIST CONFIRM
CREATE OR REPLACE FUNCTION public.confirm_waitlist(_waitlist_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _w record; _cap integer; _booked integer; _bid uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.can_module(auth.uid(),'grade','edit')) THEN
    RETURN jsonb_build_object('ok', false, 'reason','forbidden');
  END IF;
  SELECT * INTO _w FROM public.class_waitlist WHERE id = _waitlist_id;
  IF _w.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason','not_found'); END IF;
  IF _w.status <> 'waiting' THEN RETURN jsonb_build_object('ok', false, 'reason','already_handled'); END IF;
  IF public.slot_blocked(_w.class_id, _w.class_date) THEN
    RETURN jsonb_build_object('ok', false, 'reason','slot_blocked');
  END IF;

  _cap := public.effective_capacity(_w.class_id, _w.class_date);
  SELECT count(*) INTO _booked FROM public.class_bookings b
   WHERE b.class_id = _w.class_id AND b.class_date = _w.class_date
     AND COALESCE(b.status,'confirmed') <> 'cancelled';
  IF _booked >= _cap THEN RETURN jsonb_build_object('ok', false, 'reason','class_full'); END IF;

  INSERT INTO public.class_bookings (class_id, client_id, class_date, muscle_group, status, kind, student_name)
  SELECT _w.class_id, _w.client_id, _w.class_date, _w.muscle_group, 'confirmed', 'agendamento', cl.name
    FROM public.clients cl WHERE cl.id = _w.client_id
  RETURNING id INTO _bid;

  UPDATE public.class_waitlist SET status = 'confirmed' WHERE id = _waitlist_id;

  INSERT INTO public.notifications (client_id, title, body, kind, url)
  VALUES (_w.client_id, 'Vaga confirmada',
          'Você saiu da lista de espera e está confirmado na aula de ' || to_char(_w.class_date,'DD/MM'), 'grade', '/');

  RETURN jsonb_build_object('ok', true, 'booking_id', _bid);
END; $$;

-- 8. VIEW: crm owner + occurrences count from new table
CREATE OR REPLACE VIEW public.client_overview
WITH (security_invoker = on) AS
 SELECT c.id, c.name, c.email, c.phone, c.cpf, c.status, c.plan, c.plan_value, c.unit_id,
    c.visit_type, c.avatar_url, c.contract_start, c.contract_end, c.created_at, c.auth_user_id,
    c.objective, c.limitations, c.weekly_goal,
    la.last_activity,
    CASE WHEN la.last_activity IS NULL THEN NULL::integer ELSE br_now()::date - la.last_activity END AS days_since_activity,
    COALESCE(w30.n, 0::bigint)::integer AS workouts_30d,
    CASE
      WHEN COALESCE(c.status, 'OP') <> 'AT' THEN 'na'
      WHEN c.contract_end IS NULL THEN 'ok'
      WHEN c.contract_end < (br_now()::date - 5) THEN 'blocked'
      WHEN c.contract_end < br_now()::date THEN 'overdue'
      WHEN c.contract_end <= (br_now()::date + 7) THEN 'expiring'
      ELSE 'ok'
    END AS financial_state,
    tp.expires_at AS plan_expires_at,
    tp.id IS NULL OR tp.expires_at IS NOT NULL AND tp.expires_at < br_now()::date AS training_overdue,
    pa.last_assessment,
    pa.last_assessment IS NULL OR pa.last_assessment < (br_now()::date - 90) AS assessment_overdue,
    COALESCE(oc.n, 0::bigint)::integer AS open_occurrences,
    COALESCE(rr.n, 0::bigint)::integer AS pending_renewals,
    COALESCE(al.n, 0::bigint)::integer AS open_alerts,
    c.crm_owner_id,
    own.full_name AS crm_owner_name
   FROM clients c
     LEFT JOIN LATERAL ( SELECT max(x.d) AS last_activity
           FROM ( SELECT max(wl.workout_date) AS d FROM workout_logs wl
                   WHERE wl.client_id = c.id AND wl.status = 'completed'
                UNION ALL
                 SELECT max(b.checked_in_at::date) FROM class_bookings b
                   WHERE b.client_id = c.id AND b.checked_in_at IS NOT NULL) x) la ON true
     LEFT JOIN LATERAL ( SELECT count(*) AS n FROM workout_logs wl
          WHERE wl.client_id = c.id AND wl.status = 'completed' AND wl.workout_date >= (br_now()::date - 30)) w30 ON true
     LEFT JOIN LATERAL ( SELECT p.id, p.expires_at FROM training_plans p
          WHERE p.student_id = c.id AND p.is_active ORDER BY p.created_at DESC LIMIT 1) tp ON true
     LEFT JOIN LATERAL ( SELECT max(COALESCE(a.performed_at::date, a.scheduled_at::date)) AS last_assessment
           FROM physical_assessments a WHERE a.client_id = c.id AND a.status = 'done') pa ON true
     LEFT JOIN LATERAL ( SELECT count(*) AS n FROM occurrences o
          WHERE o.client_id = c.id AND o.status <> 'resolvida') oc ON true
     LEFT JOIN LATERAL ( SELECT count(*) AS n FROM renewal_requests r
          WHERE r.client_id = c.id AND COALESCE(r.status, 'pending') = 'pending') rr ON true
     LEFT JOIN LATERAL ( SELECT count(*) AS n FROM crm_attendance_alerts a
          WHERE a.client_id = c.id AND a.status = 'open') al ON true
     LEFT JOIN collaborators own ON own.id = c.crm_owner_id;

-- 9. TIMELINE: include occurrences (non pain duplicates)
CREATE OR REPLACE FUNCTION public.client_timeline(_client_id integer, _kinds text[] DEFAULT NULL::text[], _limit integer DEFAULT 30, _offset integer DEFAULT 0)
 RETURNS TABLE(occurred_at timestamp with time zone, kind text, title text, detail text, meta jsonb)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH allowed AS (
    SELECT (public.is_staff(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.clients WHERE id = _client_id AND auth_user_id = auth.uid())) AS ok
  ),
  ev AS (
    SELECT c.created_at AS occurred_at, 'cadastro'::text AS kind, 'Cadastro criado'::text AS title,
           COALESCE(c.visit_type, 'cadastro')::text AS detail, '{}'::jsonb AS meta
      FROM public.clients c WHERE c.id = _client_id
    UNION ALL
    SELECT (c.contract_start)::timestamptz, 'matricula', 'Matrícula', COALESCE(c.plan, 'Plano'), '{}'::jsonb
      FROM public.clients c WHERE c.id = _client_id AND c.contract_start IS NOT NULL
    UNION ALL
    SELECT b.checked_in_at, 'acessos', 'Check-in na aula', COALESCE(b.muscle_group, 'treino'), '{}'::jsonb
      FROM public.class_bookings b WHERE b.client_id = _client_id AND b.checked_in_at IS NOT NULL
    UNION ALL
    SELECT COALESCE(b.cancelled_at, b.class_date::timestamptz), 'faltas',
           CASE WHEN b.status = 'cancelled' THEN 'Agendamento cancelado' ELSE 'Falta na aula' END,
           to_char(b.class_date, 'DD/MM/YYYY'), '{}'::jsonb
      FROM public.class_bookings b
      WHERE b.client_id = _client_id
        AND (b.status = 'cancelled'
             OR (b.checked_in_at IS NULL AND b.class_date IS NOT NULL AND b.class_date < (public.br_now())::date))
    UNION ALL
    SELECT COALESCE(wl.finished_at, wl.created_at), 'treino', 'Treino ' || COALESCE(wl.status, 'registrado'),
           COALESCE(wl.session_name, ''), '{}'::jsonb
      FROM public.workout_logs wl WHERE wl.client_id = _client_id
    UNION ALL
    SELECT COALESCE(a.performed_at, a.scheduled_at, a.created_at), 'avaliacoes',
           'Avaliação física ' || COALESCE(a.status, ''), COALESCE(a.professional_name, ''), '{}'::jsonb
      FROM public.physical_assessments a WHERE a.client_id = _client_id
    UNION ALL
    SELECT s.created_at, 'pagamentos', 'Pagamento registrado',
           COALESCE(s.type, '') || ' · R$ ' || to_char(COALESCE(s.value, 0), 'FM999999990.00'), '{}'::jsonb
      FROM public.sales s WHERE s.client_id = _client_id
    UNION ALL
    SELECT COALESCE(ct.signed_at, ct.created_at), 'contratos',
           CASE WHEN ct.status = 'signed' THEN 'Contrato assinado' ELSE 'Contrato emitido' END,
           COALESCE(ct.title, ''), '{}'::jsonb
      FROM public.client_contracts ct WHERE ct.client_id = _client_id
    UNION ALL
    SELECT r.created_at, 'renovacoes', 'Pedido de renovação',
           COALESCE(r.desired_plan, '') || ' · ' || COALESCE(r.status, ''), '{}'::jsonb
      FROM public.renewal_requests r WHERE r.client_id = _client_id
    UNION ALL
    SELECT o.created_at, 'ocorrencias', o.title,
           COALESCE(o.description, '') || ' · ' || o.status, jsonb_build_object('type', o.type, 'severity', o.severity)
      FROM public.occurrences o WHERE o.client_id = _client_id
    UNION ALL
    SELECT i.created_at, 'indicacoes', 'Indicação registrada', COALESCE(i.indicated_name, ''), '{}'::jsonb
      FROM public.crm_indications i WHERE i.indicator_student_id = _client_id
    UNION ALL
    SELECT al.created_at, 'contatos', 'Alerta de frequência',
           al.days_without::text || ' dias sem treinar', '{}'::jsonb
      FROM public.crm_attendance_alerts al WHERE al.client_id = _client_id
    UNION ALL
    SELECT lg.created_at, 'alteracoes', lg.description, COALESCE(lg.user_name, ''),
           jsonb_build_object('before', lg.before_data, 'after', lg.after_data,
                              'user_email', lg.user_email, 'module', lg.module)
      FROM public.audit_logs lg
      WHERE lg.entity = 'client' AND lg.entity_id = _client_id::text
  )
  SELECT ev.occurred_at, ev.kind, ev.title, ev.detail, ev.meta
    FROM ev, allowed
   WHERE allowed.ok AND ev.occurred_at IS NOT NULL
     AND (_kinds IS NULL OR ev.kind = ANY(_kinds))
   ORDER BY ev.occurred_at DESC
   LIMIT GREATEST(COALESCE(_limit, 30), 1) OFFSET GREATEST(COALESCE(_offset, 0), 0)
$function$;
