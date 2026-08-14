-- 1) Campos novos
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS limitations text,
  ADD COLUMN IF NOT EXISTS weekly_goal integer;

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS default_weekly_goal integer NOT NULL DEFAULT 3;

-- 2) Fila de alertas de frequência (consumida pelo CRM)
CREATE TABLE IF NOT EXISTS public.crm_attendance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id),
  days_without integer NOT NULL DEFAULT 0,
  last_activity date,
  status text NOT NULL DEFAULT 'open',
  notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_attendance_alerts_open_uniq
  ON public.crm_attendance_alerts (client_id) WHERE status = 'open';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_attendance_alerts TO authenticated;
GRANT ALL ON public.crm_attendance_alerts TO service_role;
ALTER TABLE public.crm_attendance_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage attendance alerts" ON public.crm_attendance_alerts;
CREATE POLICY "Staff manage attendance alerts" ON public.crm_attendance_alerts
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

DROP TRIGGER IF EXISTS trg_crm_attendance_alerts_updated ON public.crm_attendance_alerts;
CREATE TRIGGER trg_crm_attendance_alerts_updated
  BEFORE UPDATE ON public.crm_attendance_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Visão consolidada para a lista de clientes
CREATE OR REPLACE VIEW public.client_overview
WITH (security_invoker = on) AS
SELECT
  c.id,
  c.name,
  c.email,
  c.phone,
  c.cpf,
  c.status,
  c.plan,
  c.plan_value,
  c.unit_id,
  c.visit_type,
  c.avatar_url,
  c.contract_start,
  c.contract_end,
  c.created_at,
  c.auth_user_id,
  c.objective,
  c.limitations,
  c.weekly_goal,
  la.last_activity,
  CASE WHEN la.last_activity IS NULL THEN NULL
       ELSE ((public.br_now())::date - la.last_activity) END AS days_since_activity,
  COALESCE(w30.n, 0)::int AS workouts_30d,
  CASE
    WHEN COALESCE(c.status, 'OP') <> 'AT' THEN 'na'
    WHEN c.contract_end IS NULL THEN 'ok'
    WHEN c.contract_end < (public.br_now())::date - 5 THEN 'blocked'
    WHEN c.contract_end < (public.br_now())::date THEN 'overdue'
    WHEN c.contract_end <= (public.br_now())::date + 7 THEN 'expiring'
    ELSE 'ok'
  END AS financial_state,
  tp.expires_at AS plan_expires_at,
  (tp.id IS NULL OR (tp.expires_at IS NOT NULL AND tp.expires_at < (public.br_now())::date)) AS training_overdue,
  pa.last_assessment,
  (pa.last_assessment IS NULL OR pa.last_assessment < (public.br_now())::date - 90) AS assessment_overdue,
  COALESCE(oc.n, 0)::int AS open_occurrences,
  COALESCE(rr.n, 0)::int AS pending_renewals,
  COALESCE(al.n, 0)::int AS open_alerts
FROM public.clients c
LEFT JOIN LATERAL (
  SELECT max(d) AS last_activity FROM (
    SELECT max(wl.workout_date) AS d FROM public.workout_logs wl
      WHERE wl.client_id = c.id AND wl.status = 'completed'
    UNION ALL
    SELECT max(b.checked_in_at::date) FROM public.class_bookings b
      WHERE b.client_id = c.id AND b.checked_in_at IS NOT NULL
  ) x
) la ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS n FROM public.workout_logs wl
   WHERE wl.client_id = c.id AND wl.status = 'completed'
     AND wl.workout_date >= (public.br_now())::date - 30
) w30 ON true
LEFT JOIN LATERAL (
  SELECT p.id, p.expires_at FROM public.training_plans p
   WHERE p.student_id = c.id AND p.is_active
   ORDER BY p.created_at DESC LIMIT 1
) tp ON true
LEFT JOIN LATERAL (
  SELECT max(COALESCE(a.performed_at::date, a.scheduled_at::date)) AS last_assessment
    FROM public.physical_assessments a
   WHERE a.client_id = c.id AND a.status = 'done'
) pa ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS n FROM public.pain_reports pr
   WHERE pr.client_id = c.id AND COALESCE(pr.status, 'open') = 'open'
) oc ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS n FROM public.renewal_requests r
   WHERE r.client_id = c.id AND COALESCE(r.status, 'pending') = 'pending'
) rr ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS n FROM public.crm_attendance_alerts a
   WHERE a.client_id = c.id AND a.status = 'open'
) al ON true;

GRANT SELECT ON public.client_overview TO authenticated;
GRANT SELECT ON public.client_overview TO service_role;

-- 4) Estatísticas de frequência do aluno
CREATE OR REPLACE FUNCTION public.client_attendance_stats(_client_id integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _today date := (public.br_now())::date;
  _goal integer;
  _last date;
  _d7 integer; _d30 integer; _d90 integer;
  _cancels integer; _absences integer;
  _streak integer := 0; _best integer := 0;
  _cursor date;
  _dow jsonb;
  _weeks jsonb;
  _weeks_ok integer := 0; _weeks_total integer := 0;
BEGIN
  IF NOT (public.is_staff(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.clients WHERE id = _client_id AND auth_user_id = auth.uid())) THEN
    RETURN jsonb_build_object('allowed', false);
  END IF;

  SELECT COALESCE(c.weekly_goal, u.default_weekly_goal, 3) INTO _goal
    FROM public.clients c LEFT JOIN public.units u ON u.id = c.unit_id
   WHERE c.id = _client_id;

  CREATE TEMP TABLE IF NOT EXISTS _tmp_act (d date) ON COMMIT DROP;
  DELETE FROM _tmp_act;
  INSERT INTO _tmp_act (d)
  SELECT DISTINCT d FROM (
    SELECT wl.workout_date AS d FROM public.workout_logs wl
      WHERE wl.client_id = _client_id AND wl.status = 'completed'
    UNION
    SELECT b.checked_in_at::date FROM public.class_bookings b
      WHERE b.client_id = _client_id AND b.checked_in_at IS NOT NULL
  ) s WHERE d IS NOT NULL;

  SELECT max(d) INTO _last FROM _tmp_act;
  SELECT count(*) INTO _d7 FROM _tmp_act WHERE d > _today - 7;
  SELECT count(*) INTO _d30 FROM _tmp_act WHERE d > _today - 30;
  SELECT count(*) INTO _d90 FROM _tmp_act WHERE d > _today - 90;

  SELECT count(*) INTO _cancels FROM public.class_bookings
   WHERE client_id = _client_id AND status = 'cancelled';
  SELECT count(*) INTO _absences FROM public.class_bookings
   WHERE client_id = _client_id AND checked_in_at IS NULL
     AND COALESCE(status, 'confirmed') <> 'cancelled'
     AND class_date IS NOT NULL AND class_date < _today;

  _cursor := _today;
  IF NOT EXISTS (SELECT 1 FROM _tmp_act WHERE d = _cursor) THEN _cursor := _cursor - 1; END IF;
  WHILE EXISTS (SELECT 1 FROM _tmp_act WHERE d = _cursor) LOOP
    _streak := _streak + 1; _cursor := _cursor - 1;
  END LOOP;

  SELECT COALESCE(max(len), 0) INTO _best FROM (
    SELECT count(*)::int AS len FROM (
      SELECT d, d - (row_number() OVER (ORDER BY d))::int AS g FROM _tmp_act
    ) x GROUP BY g
  ) y;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('dow', dw, 'total', n) ORDER BY dw), '[]'::jsonb)
    INTO _dow
    FROM (SELECT EXTRACT(DOW FROM d)::int AS dw, count(*)::int AS n FROM _tmp_act GROUP BY 1) z;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('week', wk, 'total', n) ORDER BY wk), '[]'::jsonb),
         COALESCE(count(*) FILTER (WHERE n >= _goal), 0),
         COALESCE(count(*), 0)
    INTO _weeks, _weeks_ok, _weeks_total
    FROM (
      SELECT date_trunc('week', d)::date AS wk, count(*)::int AS n
        FROM _tmp_act WHERE d > _today - 84 GROUP BY 1
    ) w;

  RETURN jsonb_build_object(
    'allowed', true,
    'weekly_goal', _goal,
    'last_activity', _last,
    'days_since_activity', CASE WHEN _last IS NULL THEN NULL ELSE _today - _last END,
    'd7', _d7, 'd30', _d30, 'd90', _d90,
    'avg_per_week', ROUND(COALESCE(_d90, 0)::numeric / 12.0, 1),
    'cancellations', _cancels,
    'absences', _absences,
    'streak', _streak,
    'best_streak', _best,
    'by_dow', _dow,
    'weeks', _weeks,
    'weeks_ok', _weeks_ok,
    'weeks_total', _weeks_total,
    'weeks_pct', CASE WHEN _weeks_total = 0 THEN 0
                      ELSE ROUND(_weeks_ok::numeric * 100 / _weeks_total, 0) END
  );
END;
$$;

-- 5) Timeline única do aluno
CREATE OR REPLACE FUNCTION public.client_timeline(
  _client_id integer,
  _kinds text[] DEFAULT NULL,
  _limit integer DEFAULT 30,
  _offset integer DEFAULT 0
)
RETURNS TABLE(occurred_at timestamptz, kind text, title text, detail text, meta jsonb)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH allowed AS (
    SELECT (public.is_staff(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.clients WHERE id = _client_id AND auth_user_id = auth.uid())) AS ok
  ),
  ev AS (
    SELECT c.created_at AS occurred_at, 'cadastro'::text AS kind, 'Cadastro criado'::text AS title,
           COALESCE(c.visit_type, 'cadastro')::text AS detail, '{}'::jsonb AS meta
      FROM public.clients c WHERE c.id = _client_id
    UNION ALL
    SELECT (c.contract_start)::timestamptz, 'matricula', 'Matrícula',
           COALESCE(c.plan, 'Plano'), '{}'::jsonb
      FROM public.clients c WHERE c.id = _client_id AND c.contract_start IS NOT NULL
    UNION ALL
    SELECT b.checked_in_at, 'acessos', 'Check-in na aula',
           COALESCE(b.muscle_group, 'treino'), '{}'::jsonb
      FROM public.class_bookings b
      WHERE b.client_id = _client_id AND b.checked_in_at IS NOT NULL
    UNION ALL
    SELECT COALESCE(b.cancelled_at, b.class_date::timestamptz), 'faltas',
           CASE WHEN b.status = 'cancelled' THEN 'Agendamento cancelado' ELSE 'Falta na aula' END,
           to_char(b.class_date, 'DD/MM/YYYY'), '{}'::jsonb
      FROM public.class_bookings b
      WHERE b.client_id = _client_id
        AND (b.status = 'cancelled'
             OR (b.checked_in_at IS NULL AND b.class_date IS NOT NULL
                 AND b.class_date < (public.br_now())::date))
    UNION ALL
    SELECT COALESCE(wl.finished_at, wl.created_at), 'treino',
           'Treino ' || COALESCE(wl.status, 'registrado'),
           COALESCE(wl.session_name, ''), '{}'::jsonb
      FROM public.workout_logs wl WHERE wl.client_id = _client_id
    UNION ALL
    SELECT COALESCE(a.performed_at, a.scheduled_at, a.created_at), 'avaliacoes',
           'Avaliação física ' || COALESCE(a.status, ''),
           COALESCE(a.professional_name, ''), '{}'::jsonb
      FROM public.physical_assessments a WHERE a.client_id = _client_id
    UNION ALL
    SELECT s.created_at, 'pagamentos', 'Pagamento registrado',
           COALESCE(s.type, '') || ' · R$ ' || to_char(COALESCE(s.value, 0), 'FM999999990.00'),
           '{}'::jsonb
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
    SELECT pr.created_at, 'ocorrencias', 'Ocorrência de dor/lesão',
           COALESCE(pr.note, ''), '{}'::jsonb
      FROM public.pain_reports pr WHERE pr.client_id = _client_id
    UNION ALL
    SELECT i.created_at, 'indicacoes', 'Indicação registrada',
           COALESCE(i.indicated_name, ''), '{}'::jsonb
      FROM public.crm_indications i WHERE i.indicator_student_id = _client_id
    UNION ALL
    SELECT al.created_at, 'contatos', 'Alerta de frequência',
           al.days_without::text || ' dias sem treinar', '{}'::jsonb
      FROM public.crm_attendance_alerts al WHERE al.client_id = _client_id
    UNION ALL
    SELECT lg.created_at, 'alteracoes', lg.description,
           COALESCE(lg.user_name, ''),
           jsonb_build_object('before', lg.before_data, 'after', lg.after_data,
                              'user_email', lg.user_email, 'module', lg.module)
      FROM public.audit_logs lg
      WHERE lg.entity = 'client' AND lg.entity_id = _client_id::text
  )
  SELECT ev.occurred_at, ev.kind, ev.title, ev.detail, ev.meta
    FROM ev, allowed
   WHERE allowed.ok
     AND ev.occurred_at IS NOT NULL
     AND (_kinds IS NULL OR ev.kind = ANY(_kinds))
   ORDER BY ev.occurred_at DESC
   LIMIT GREATEST(COALESCE(_limit, 30), 1) OFFSET GREATEST(COALESCE(_offset, 0), 0)
$$;

-- 6) Rotina: alunos com mais de 3 dias sem treinar alimentam a fila do CRM
CREATE OR REPLACE FUNCTION public.refresh_attendance_alerts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _n integer := 0;
BEGIN
  WITH base AS (
    SELECT o.id, o.unit_id, o.last_activity, o.days_since_activity
      FROM public.client_overview o
     WHERE COALESCE(o.status, 'OP') = 'AT'
       AND (o.days_since_activity IS NULL OR o.days_since_activity > 3)
  ),
  ins AS (
    INSERT INTO public.crm_attendance_alerts (client_id, unit_id, days_without, last_activity)
    SELECT b.id, b.unit_id, COALESCE(b.days_since_activity, 999), b.last_activity
      FROM base b
     WHERE NOT EXISTS (
       SELECT 1 FROM public.crm_attendance_alerts a
        WHERE a.client_id = b.id AND a.status = 'open')
    RETURNING 1
  )
  SELECT count(*) INTO _n FROM ins;

  UPDATE public.crm_attendance_alerts a
     SET days_without = COALESCE(b.days_since_activity, 999),
         last_activity = b.last_activity,
         updated_at = now()
    FROM base b
   WHERE a.client_id = b.id AND a.status = 'open';

  UPDATE public.crm_attendance_alerts a
     SET status = 'resolved', resolved_at = now(), updated_at = now()
   WHERE a.status = 'open'
     AND NOT EXISTS (SELECT 1 FROM base b WHERE b.id = a.client_id);

  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_attendance_alerts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_attendance_alerts() TO authenticated, service_role;