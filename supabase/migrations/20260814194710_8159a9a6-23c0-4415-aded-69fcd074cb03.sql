-- ============ 1. TAREFAS: campos faltantes ============
ALTER TABLE public.crm_tasks
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS responsible_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurrence text,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS notified_assign boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notified_before boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notified_due boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notified_late boolean NOT NULL DEFAULT false;

-- ============ 2. LINKS RASTREÁVEIS ============
CREATE TABLE IF NOT EXISTS public.form_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  kind text NOT NULL DEFAULT 'form' CHECK (kind IN ('form','anamnese','nps')),
  form_id uuid REFERENCES public.operational_forms(id) ON DELETE SET NULL,
  client_id integer REFERENCES public.clients(id) ON DELETE SET NULL,
  lead_name text,
  phone text,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','viewed','answered')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz,
  answered_at timestamptz,
  response jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_links TO authenticated;
GRANT ALL ON public.form_links TO service_role;
ALTER TABLE public.form_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage form links" ON public.form_links
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_form_links_updated BEFORE UPDATE ON public.form_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 3. ENCERRAMENTO DE TURNO ============
CREATE TABLE IF NOT EXISTS public.shift_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  collaborator_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL,
  collaborator_name text,
  sector text NOT NULL CHECK (sector IN ('recepcao','tecnico','comercial','gerencia')),
  shift text NOT NULL DEFAULT 'manha' CHECK (shift IN ('manha','tarde','noite')),
  date date NOT NULL DEFAULT (public.br_now())::date,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','pending')),
  system_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_closures TO authenticated;
GRANT ALL ON public.shift_closures TO service_role;
ALTER TABLE public.shift_closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage shift closures" ON public.shift_closures
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_shift_closures_updated BEFORE UPDATE ON public.shift_closures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.shift_handover_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closure_id uuid NOT NULL REFERENCES public.shift_closures(id) ON DELETE CASCADE,
  collaborator_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL,
  collaborator_name text,
  read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.shift_handover_reads TO authenticated;
GRANT ALL ON public.shift_handover_reads TO service_role;
ALTER TABLE public.shift_handover_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read handover reads" ON public.shift_handover_reads
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff insert handover reads" ON public.shift_handover_reads
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- ============ 4. NPS ============
CREATE TABLE IF NOT EXISTS public.nps_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id integer REFERENCES public.clients(id) ON DELETE SET NULL,
  lead_name text,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 10),
  classification text GENERATED ALWAYS AS (
    CASE WHEN score <= 6 THEN 'detrator' WHEN score <= 8 THEN 'neutro' ELSE 'promotor' END
  ) STORED,
  comment text,
  source text NOT NULL DEFAULT 'link',
  link_id uuid REFERENCES public.form_links(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nps_responses TO authenticated;
GRANT ALL ON public.nps_responses TO service_role;
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage nps" ON public.nps_responses
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.nps_detractor_flow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF NEW.score <= 6 THEN
    SELECT c.name INTO v_name FROM public.clients c WHERE c.id = NEW.client_id;
    v_name := COALESCE(v_name, NEW.lead_name, 'Visitante');

    INSERT INTO public.occurrences (client_id, unit_id, type, severity, title, description, status, source_table, source_id)
    VALUES (NEW.client_id, NEW.unit_id, 'experiencia_evo',
            CASE WHEN NEW.score <= 3 THEN 'alta' ELSE 'media' END,
            'NPS detrator (' || NEW.score || ') — ' || v_name,
            COALESCE(NEW.comment, 'Sem comentário informado.'), 'aberta', 'nps_responses', NEW.id::text);

    INSERT INTO public.crm_tasks (unit_id, title, description, sector, category, priority, status, due_date, source)
    VALUES (NEW.unit_id, 'Contatar NPS detrator — ' || v_name,
            'Nota ' || NEW.score || '. ' || COALESCE(NEW.comment, ''),
            'Atendimento', 'Atendimento',
            CASE WHEN NEW.score <= 3 THEN 'urgent' ELSE 'high' END,
            'todo', (public.br_now())::date, 'nps');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_nps_detractor ON public.nps_responses;
CREATE TRIGGER trg_nps_detractor AFTER INSERT ON public.nps_responses
  FOR EACH ROW EXECUTE FUNCTION public.nps_detractor_flow();

-- ============ 5. ANAMNESE estruturada + leads ============
ALTER TABLE public.anamnesis ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.anamnesis
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS link_id uuid REFERENCES public.form_links(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS training_history text,
  ADD COLUMN IF NOT EXISTS injuries text,
  ADD COLUMN IF NOT EXISTS pain text,
  ADD COLUMN IF NOT EXISTS limitations text,
  ADD COLUMN IF NOT EXISTS restrictions text,
  ADD COLUMN IF NOT EXISTS sleep text,
  ADD COLUMN IF NOT EXISTS stress text,
  ADD COLUMN IF NOT EXISTS routine text;

-- ============ 6. FUNÇÕES PÚBLICAS DO LINK RASTREÁVEL ============
CREATE OR REPLACE FUNCTION public.form_link_open(p_token text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.form_links; f public.operational_forms;
BEGIN
  SELECT * INTO l FROM public.form_links WHERE token = p_token;
  IF l.id IS NULL THEN RETURN json_build_object('error','not_found'); END IF;
  IF l.status = 'sent' THEN
    UPDATE public.form_links SET status = 'viewed', viewed_at = now() WHERE id = l.id;
    l.status := 'viewed';
  END IF;
  IF l.form_id IS NOT NULL THEN SELECT * INTO f FROM public.operational_forms WHERE id = l.form_id; END IF;
  RETURN json_build_object(
    'kind', l.kind, 'status', l.status, 'lead_name', l.lead_name,
    'answered', l.answered_at IS NOT NULL,
    'form_name', f.name, 'form_fields', f.fields
  );
END; $$;
REVOKE ALL ON FUNCTION public.form_link_open(text) FROM public;
GRANT EXECUTE ON FUNCTION public.form_link_open(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.form_link_submit(p_token text, p_payload jsonb)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.form_links;
BEGIN
  SELECT * INTO l FROM public.form_links WHERE token = p_token;
  IF l.id IS NULL THEN RETURN json_build_object('error','not_found'); END IF;
  IF l.answered_at IS NOT NULL THEN RETURN json_build_object('error','already_answered'); END IF;

  UPDATE public.form_links
     SET status = 'answered', answered_at = now(), response = p_payload
   WHERE id = l.id;

  IF l.kind = 'anamnese' THEN
    INSERT INTO public.anamnesis (client_id, unit_id, lead_name, phone, link_id, type, content,
      objective, training_history, injuries, pain, limitations, restrictions, sleep, stress, routine)
    VALUES (l.client_id, l.unit_id, l.lead_name, l.phone, l.id, 'anamnese',
      p_payload->>'notes',
      p_payload->>'objective', p_payload->>'training_history', p_payload->>'injuries',
      p_payload->>'pain', p_payload->>'limitations', p_payload->>'restrictions',
      p_payload->>'sleep', p_payload->>'stress', p_payload->>'routine');
    IF l.client_id IS NOT NULL THEN
      UPDATE public.clients SET objective = COALESCE(p_payload->>'objective', objective),
             limitations = COALESCE(p_payload->>'limitations', limitations)
       WHERE id = l.client_id;
    END IF;
  ELSIF l.kind = 'nps' THEN
    INSERT INTO public.nps_responses (client_id, lead_name, unit_id, score, comment, source, link_id)
    VALUES (l.client_id, l.lead_name, l.unit_id,
            LEAST(10, GREATEST(0, COALESCE((p_payload->>'score')::int, 0))),
            p_payload->>'comment', 'link', l.id);
  ELSE
    INSERT INTO public.operational_form_submissions (form_id, unit_id, responsible_name, answers, notes, status)
    VALUES (l.form_id, l.unit_id, l.lead_name, p_payload, p_payload->>'notes', 'respondido');
  END IF;

  RETURN json_build_object('ok', true);
END; $$;
REVOKE ALL ON FUNCTION public.form_link_submit(text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.form_link_submit(text, jsonb) TO anon, authenticated;

-- ============ 7. DASHBOARD OPERACIONAL ============
CREATE OR REPLACE FUNCTION public.operational_dashboard(_unit_id uuid, _from date, _to date)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'tasks_today', (SELECT count(*) FROM crm_tasks t WHERE NOT t.archived AND t.due_date = (br_now())::date AND (_unit_id IS NULL OR t.unit_id = _unit_id)),
    'tasks_done', (SELECT count(*) FROM crm_tasks t WHERE t.status = 'done' AND COALESCE(t.due_date, t.created_at::date) BETWEEN _from AND _to AND (_unit_id IS NULL OR t.unit_id = _unit_id)),
    'tasks_pending', (SELECT count(*) FROM crm_tasks t WHERE NOT t.archived AND t.status <> 'done' AND (_unit_id IS NULL OR t.unit_id = _unit_id)),
    'tasks_late', (SELECT count(*) FROM crm_tasks t WHERE NOT t.archived AND t.status <> 'done' AND t.due_date < (br_now())::date AND (_unit_id IS NULL OR t.unit_id = _unit_id)),
    'forms_pending', (SELECT count(*) FROM form_links l WHERE l.status <> 'answered' AND l.sent_at::date BETWEEN _from AND _to AND (_unit_id IS NULL OR l.unit_id = _unit_id)),
    'nps_avg', (SELECT round(avg(score)::numeric, 1) FROM nps_responses n WHERE n.created_at::date BETWEEN _from AND _to AND (_unit_id IS NULL OR n.unit_id = _unit_id)),
    'nps_count', (SELECT count(*) FROM nps_responses n WHERE n.created_at::date BETWEEN _from AND _to AND (_unit_id IS NULL OR n.unit_id = _unit_id)),
    'nps_detractors', (SELECT count(*) FROM nps_responses n WHERE n.classification = 'detrator' AND n.created_at::date BETWEEN _from AND _to AND (_unit_id IS NULL OR n.unit_id = _unit_id)),
    'nps_promoters', (SELECT count(*) FROM nps_responses n WHERE n.classification = 'promotor' AND n.created_at::date BETWEEN _from AND _to AND (_unit_id IS NULL OR n.unit_id = _unit_id)),
    'anamnesis_count', (SELECT count(*) FROM anamnesis a WHERE a.created_at::date BETWEEN _from AND _to AND (_unit_id IS NULL OR a.unit_id = _unit_id OR a.unit_id IS NULL)),
    'closures_today', (SELECT count(*) FROM shift_closures s WHERE s.date = (br_now())::date AND s.status = 'submitted' AND (_unit_id IS NULL OR s.unit_id = _unit_id)),
    'closures_pending', (SELECT count(*) FROM shift_closures s WHERE s.status <> 'submitted' AND s.date <= (br_now())::date AND (_unit_id IS NULL OR s.unit_id = _unit_id))
  )
$$;
REVOKE ALL ON FUNCTION public.operational_dashboard(uuid, date, date) FROM public;
GRANT EXECUTE ON FUNCTION public.operational_dashboard(uuid, date, date) TO authenticated;

-- ============ 8. PRÉ-CARGA DE NÚMEROS REAIS DO ENCERRAMENTO ============
CREATE OR REPLACE FUNCTION public.shift_closure_prefill(_unit_id uuid, _sector text, _date date)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'pagamentos', (SELECT count(*) FROM transactions t WHERE t.date = _date AND t.kind = 'entrada' AND (_unit_id IS NULL OR t.unit_id = _unit_id)),
    'experimentais', (SELECT count(*) FROM class_bookings b JOIN classes c ON c.id = b.class_id
                       WHERE b.class_date = _date AND b.kind = 'experimental' AND (_unit_id IS NULL OR c.unit_id = _unit_id)),
    'contratos', (SELECT count(*) FROM client_contracts c WHERE c.created_at::date = _date AND (_unit_id IS NULL OR c.unit_id = _unit_id)),
    'acessos', (SELECT count(*) FROM class_bookings b JOIN classes c ON c.id = b.class_id
                 WHERE b.class_date = _date AND b.attendance_status = 'presente' AND (_unit_id IS NULL OR c.unit_id = _unit_id)),
    'ocorrencias', (SELECT count(*) FROM occurrences o WHERE o.created_at::date = _date AND (_unit_id IS NULL OR o.unit_id = _unit_id)),
    'treinos_vencidos', (SELECT count(*) FROM training_plans p WHERE p.status = 'active' AND p.expires_at IS NOT NULL AND p.expires_at < _date),
    'limitacoes', (SELECT count(*) FROM limitation_alerts a WHERE a.created_at::date = _date AND (_unit_id IS NULL OR a.unit_id = _unit_id)),
    'dor_desconforto', (SELECT count(*) FROM pain_reports r WHERE r.created_at::date = _date),
    'leads', (SELECT count(*) FROM crm_indications i WHERE i.created_at::date = _date AND (_unit_id IS NULL OR i.unit_id = _unit_id)),
    'vendas', (SELECT count(*) FROM enrollment_conversions e WHERE e.created_at::date = _date AND (_unit_id IS NULL OR e.unit_id = _unit_id)),
    'follow_ups', (SELECT count(*) FROM crm_tasks t WHERE NOT t.archived AND t.status <> 'done' AND (_unit_id IS NULL OR t.unit_id = _unit_id)),
    'avaliacoes', (SELECT count(*) FROM physical_assessments a WHERE a.scheduled_at::date = _date AND (_unit_id IS NULL OR a.unit_id = _unit_id)),
    'nps_dia', (SELECT count(*) FROM nps_responses n WHERE n.created_at::date = _date AND (_unit_id IS NULL OR n.unit_id = _unit_id))
  )
$$;
REVOKE ALL ON FUNCTION public.shift_closure_prefill(uuid, text, date) FROM public;
GRANT EXECUTE ON FUNCTION public.shift_closure_prefill(uuid, text, date) TO authenticated;

-- ============ 9. ENVIO DO ENCERRAMENTO + PASSAGEM DE TURNO ============
CREATE OR REPLACE FUNCTION public.shift_closure_submit(_id uuid, _summary text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.shift_closures; r record;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  UPDATE public.shift_closures
     SET status = 'submitted', submitted_at = now(), summary = _summary
   WHERE id = _id RETURNING * INTO c;
  IF c.id IS NULL THEN RETURN json_build_object('error','not_found'); END IF;

  FOR r IN SELECT id FROM public.collaborators
            WHERE status = 'active' AND (c.unit_id IS NULL OR unit_id = c.unit_id)
  LOOP
    INSERT INTO public.staff_notifications (collaborator_id, title, body, kind, url)
    VALUES (r.id, 'Passagem de turno disponível',
            'Encerramento do setor ' || c.sector || ' (' || c.shift || ') de ' || to_char(c.date, 'DD/MM') || ' foi enviado.',
            'handover', '/admin/operacional/encerramento');
  END LOOP;

  RETURN json_build_object('ok', true);
END; $$;
REVOKE ALL ON FUNCTION public.shift_closure_submit(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.shift_closure_submit(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.handover_ack(_closure_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_collab uuid; v_name text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  v_collab := public.current_collaborator_id();
  SELECT full_name INTO v_name FROM public.collaborators WHERE id = v_collab;
  INSERT INTO public.shift_handover_reads (closure_id, collaborator_id, collaborator_name)
  VALUES (_closure_id, v_collab, COALESCE(v_name, 'Equipe'));
  RETURN json_build_object('ok', true);
END; $$;
REVOKE ALL ON FUNCTION public.handover_ack(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.handover_ack(uuid) TO authenticated;

-- ============ 10. RÉGUA DE PENDÊNCIAS E AVISOS DE TAREFA ============
CREATE OR REPLACE FUNCTION public.operational_ruler()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pending int := 0; v_notified int := 0; r record;
BEGIN
  UPDATE public.shift_closures
     SET status = 'pending'
   WHERE status = 'draft' AND date < (br_now())::date;
  GET DIAGNOSTICS v_pending = ROW_COUNT;

  FOR r IN SELECT s.id, s.sector, s.date, s.unit_id, c.id AS collab
             FROM public.shift_closures s
             JOIN public.collaborators c ON c.status = 'active' AND (s.unit_id IS NULL OR c.unit_id = s.unit_id)
            WHERE s.status = 'pending' AND s.date >= (br_now())::date - 3
  LOOP
    INSERT INTO public.staff_notifications (collaborator_id, title, body, kind, url)
    SELECT r.collab, 'Encerramento de turno pendente',
           'O encerramento do setor ' || r.sector || ' de ' || to_char(r.date, 'DD/MM') || ' não foi enviado.',
           'closure_pending', '/admin/operacional/encerramento'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.staff_notifications n
       WHERE n.collaborator_id = r.collab AND n.kind = 'closure_pending'
         AND n.created_at::date = (br_now())::date AND n.body LIKE '%' || to_char(r.date, 'DD/MM') || '%'
    );
  END LOOP;

  FOR r IN SELECT t.id, t.title, t.responsible_id, t.due_date, t.notified_assign, t.notified_before, t.notified_due, t.notified_late
             FROM public.crm_tasks t
            WHERE NOT t.archived AND t.status <> 'done' AND t.responsible_id IS NOT NULL
  LOOP
    IF NOT r.notified_assign THEN
      INSERT INTO public.staff_notifications (collaborator_id, title, body, kind, url)
      VALUES (r.responsible_id, 'Nova tarefa atribuída', r.title, 'task_assigned', '/admin/crm/tarefas');
      UPDATE public.crm_tasks SET notified_assign = true WHERE id = r.id; v_notified := v_notified + 1;
    END IF;
    IF r.due_date IS NOT NULL AND NOT r.notified_before AND r.due_date = (br_now())::date + 1 THEN
      INSERT INTO public.staff_notifications (collaborator_id, title, body, kind, url)
      VALUES (r.responsible_id, 'Tarefa vence amanhã', r.title, 'task_before', '/admin/crm/tarefas');
      UPDATE public.crm_tasks SET notified_before = true WHERE id = r.id; v_notified := v_notified + 1;
    END IF;
    IF r.due_date IS NOT NULL AND NOT r.notified_due AND r.due_date = (br_now())::date THEN
      INSERT INTO public.staff_notifications (collaborator_id, title, body, kind, url)
      VALUES (r.responsible_id, 'Tarefa vence hoje', r.title, 'task_due', '/admin/crm/tarefas');
      UPDATE public.crm_tasks SET notified_due = true WHERE id = r.id; v_notified := v_notified + 1;
    END IF;
    IF r.due_date IS NOT NULL AND NOT r.notified_late AND r.due_date < (br_now())::date THEN
      INSERT INTO public.staff_notifications (collaborator_id, title, body, kind, url)
      VALUES (r.responsible_id, 'Tarefa em atraso', r.title, 'task_late', '/admin/crm/tarefas');
      UPDATE public.crm_tasks SET notified_late = true WHERE id = r.id; v_notified := v_notified + 1;
    END IF;
  END LOOP;

  RETURN json_build_object('pendencias', v_pending, 'avisos', v_notified);
END; $$;
REVOKE ALL ON FUNCTION public.operational_ruler() FROM public;
GRANT EXECUTE ON FUNCTION public.operational_ruler() TO authenticated;