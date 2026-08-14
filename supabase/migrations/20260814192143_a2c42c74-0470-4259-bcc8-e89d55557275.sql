
-- ============ 1. COLABORADORES: supervisor + turno fixo ============
ALTER TABLE public.collaborators
  ADD COLUMN IF NOT EXISTS supervisor_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shift_start time,
  ADD COLUMN IF NOT EXISTS shift_end time,
  ADD COLUMN IF NOT EXISTS shift_break_minutes integer DEFAULT 60,
  ADD COLUMN IF NOT EXISTS shift_weekdays integer[] DEFAULT '{1,2,3,4,5}';

-- ============ 2. AVISOS INTERNOS DA EQUIPE ============
CREATE TABLE IF NOT EXISTS public.staff_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  kind text NOT NULL DEFAULT 'geral',
  url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_notifications TO authenticated;
GRANT ALL ON public.staff_notifications TO service_role;
ALTER TABLE public.staff_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff sees own notifications" ON public.staff_notifications
  FOR SELECT TO authenticated
  USING (collaborator_id = public.current_collaborator_id() OR public.can_module(auth.uid(), 'equipe', 'view'));
CREATE POLICY "staff updates own notifications" ON public.staff_notifications
  FOR UPDATE TO authenticated
  USING (collaborator_id = public.current_collaborator_id());

-- ============ 3. PONTO E JORNADA ============
CREATE TABLE IF NOT EXISTS public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('entrada','intervalo','retorno','saida')),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  entry_date date NOT NULL DEFAULT (public.br_now())::date,
  latitude numeric,
  longitude numeric,
  distance_m numeric,
  within_radius boolean NOT NULL DEFAULT true,
  photo_url text,
  device text,
  status text NOT NULL DEFAULT 'valido' CHECK (status IN ('valido','ajuste_solicitado','ajustado','recusado')),
  request_reason text,
  adjust_reason text,
  adjusted_by uuid,
  adjusted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS time_entries_collab_date_idx ON public.time_entries(collaborator_id, entry_date);
CREATE INDEX IF NOT EXISTS time_entries_unit_date_idx ON public.time_entries(unit_id, entry_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT ALL ON public.time_entries TO service_role;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or team reads time entries" ON public.time_entries
  FOR SELECT TO authenticated
  USING (collaborator_id = public.current_collaborator_id() OR public.can_module(auth.uid(), 'equipe', 'view'));
CREATE POLICY "team manages time entries" ON public.time_entries
  FOR ALL TO authenticated
  USING (public.can_module(auth.uid(), 'equipe', 'edit'))
  WITH CHECK (public.can_module(auth.uid(), 'equipe', 'edit'));
CREATE TRIGGER time_entries_updated_at BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 4. ESCALA (sábado, domingo e feriado) ============
CREATE TABLE IF NOT EXISTS public.shift_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  schedule_date date NOT NULL,
  day_type text NOT NULL DEFAULT 'sabado' CHECK (day_type IN ('sabado','domingo','feriado')),
  collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  role_title text,
  start_time time,
  end_time time,
  break_minutes integer DEFAULT 0,
  supervisor_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL,
  notes text,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicada','substituida','removida')),
  published_at timestamptz,
  published_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shift_schedules_date_idx ON public.shift_schedules(schedule_date, unit_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_schedules TO authenticated;
GRANT ALL ON public.shift_schedules TO service_role;
ALTER TABLE public.shift_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff reads schedules" ON public.shift_schedules
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "team manages schedules" ON public.shift_schedules
  FOR ALL TO authenticated
  USING (public.can_module(auth.uid(), 'equipe', 'edit'))
  WITH CHECK (public.can_module(auth.uid(), 'equipe', 'edit'));
CREATE TRIGGER shift_schedules_updated_at BEFORE UPDATE ON public.shift_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.shift_swap_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.shift_schedules(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  reason text,
  status text NOT NULL DEFAULT 'solicitada' CHECK (status IN ('solicitada','aceita','recusada','aprovada','rejeitada','cancelada')),
  accepted_at timestamptz,
  decided_at timestamptz,
  decided_by uuid,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_swap_requests TO authenticated;
GRANT ALL ON public.shift_swap_requests TO service_role;
ALTER TABLE public.shift_swap_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff reads swaps" ON public.shift_swap_requests
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "team manages swaps" ON public.shift_swap_requests
  FOR ALL TO authenticated
  USING (public.can_module(auth.uid(), 'equipe', 'edit'))
  WITH CHECK (public.can_module(auth.uid(), 'equipe', 'edit'));
CREATE TRIGGER shift_swap_requests_updated_at BEFORE UPDATE ON public.shift_swap_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 5. FUNÇÕES: PONTO ============
CREATE OR REPLACE FUNCTION public.geo_distance_m(_lat1 numeric, _lng1 numeric, _lat2 numeric, _lng2 numeric)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN _lat1 IS NULL OR _lng1 IS NULL OR _lat2 IS NULL OR _lng2 IS NULL THEN NULL ELSE
    6371000 * 2 * asin(sqrt(
      power(sin(radians(_lat2 - _lat1) / 2), 2) +
      cos(radians(_lat1)) * cos(radians(_lat2)) * power(sin(radians(_lng2 - _lng1) / 2), 2)
    )) END;
$$;

CREATE OR REPLACE FUNCTION public.punch_clock(
  _kind text, _latitude numeric, _longitude numeric, _photo_url text,
  _device text DEFAULT NULL, _unit_id uuid DEFAULT NULL, _reason text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_collab uuid := public.current_collaborator_id();
  v_unit uuid;
  u record;
  v_dist numeric;
  v_within boolean := true;
  v_id uuid;
BEGIN
  IF v_collab IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'sem_colaborador'); END IF;
  IF _photo_url IS NULL OR _latitude IS NULL OR _longitude IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'foto_e_localizacao_obrigatorias');
  END IF;
  SELECT COALESCE(_unit_id, c.unit_id) INTO v_unit FROM public.collaborators c WHERE c.id = v_collab;
  SELECT * INTO u FROM public.units WHERE id = v_unit;
  IF u.latitude IS NOT NULL AND u.longitude IS NOT NULL THEN
    v_dist := public.geo_distance_m(_latitude, _longitude, u.latitude, u.longitude);
    v_within := v_dist <= COALESCE(u.timeclock_radius_m, 150);
  END IF;

  IF NOT v_within AND _reason IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'fora_do_raio', 'distance_m', round(v_dist), 'radius_m', COALESCE(u.timeclock_radius_m, 150));
  END IF;

  INSERT INTO public.time_entries (collaborator_id, unit_id, kind, latitude, longitude, distance_m, within_radius, photo_url, device, status, request_reason)
  VALUES (v_collab, v_unit, _kind, _latitude, _longitude, v_dist, v_within, _photo_url, _device,
          CASE WHEN v_within THEN 'valido' ELSE 'ajuste_solicitado' END, CASE WHEN v_within THEN NULL ELSE _reason END)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'within_radius', v_within, 'distance_m', round(COALESCE(v_dist, 0)),
                            'status', CASE WHEN v_within THEN 'valido' ELSE 'ajuste_solicitado' END);
END $$;

CREATE OR REPLACE FUNCTION public.time_entry_adjust(
  _id uuid, _recorded_at timestamptz, _kind text, _reason text, _approve boolean DEFAULT true
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_before jsonb; v_after jsonb;
BEGIN
  IF NOT public.can_module(auth.uid(), 'equipe', 'edit') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'sem_permissao');
  END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 3 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'motivo_obrigatorio');
  END IF;
  SELECT to_jsonb(t) INTO v_before FROM public.time_entries t WHERE t.id = _id;
  IF v_before IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'nao_encontrado'); END IF;

  UPDATE public.time_entries SET
    recorded_at = COALESCE(_recorded_at, recorded_at),
    entry_date = COALESCE(_recorded_at, recorded_at)::date,
    kind = COALESCE(_kind, kind),
    status = CASE WHEN _approve THEN 'ajustado' ELSE 'recusado' END,
    adjust_reason = _reason, adjusted_by = auth.uid(), adjusted_at = now()
  WHERE id = _id
  RETURNING to_jsonb(time_entries) INTO v_after;

  RETURN jsonb_build_object('ok', true, 'before', v_before, 'after', v_after);
END $$;

CREATE OR REPLACE FUNCTION public.timeclock_report(_unit_id uuid, _from date, _to date, _collaborator_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid, collaborator_id uuid, collaborator_name text, unit_id uuid, unit_name text,
  entry_date date, kind text, recorded_at timestamptz, expected_start time, expected_end time,
  latitude numeric, longitude numeric, distance_m numeric, radius_m integer, within_radius boolean,
  photo_url text, device text, status text, request_reason text, adjust_reason text, adjusted_at timestamptz
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.collaborator_id, c.full_name, t.unit_id, u.name,
         t.entry_date, t.kind, t.recorded_at, c.shift_start, c.shift_end,
         t.latitude, t.longitude, t.distance_m, COALESCE(u.timeclock_radius_m, 150), t.within_radius,
         t.photo_url, t.device, t.status, t.request_reason, t.adjust_reason, t.adjusted_at
  FROM public.time_entries t
  JOIN public.collaborators c ON c.id = t.collaborator_id
  LEFT JOIN public.units u ON u.id = t.unit_id
  WHERE public.can_module(auth.uid(), 'equipe', 'view')
    AND (_unit_id IS NULL OR t.unit_id = _unit_id)
    AND (_collaborator_id IS NULL OR t.collaborator_id = _collaborator_id)
    AND t.entry_date BETWEEN _from AND _to
  ORDER BY t.entry_date DESC, t.recorded_at DESC;
$$;

-- ============ 6. FUNÇÕES: ESCALA ============
CREATE OR REPLACE FUNCTION public.schedule_publish(_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_count integer := 0;
BEGIN
  IF NOT public.can_module(auth.uid(), 'equipe', 'edit') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'sem_permissao');
  END IF;
  FOR r IN SELECT * FROM public.shift_schedules WHERE id = ANY(_ids) LOOP
    UPDATE public.shift_schedules SET status = 'publicada', published_at = now(), published_by = auth.uid() WHERE id = r.id;
    INSERT INTO public.staff_notifications (collaborator_id, title, body, kind, url)
    VALUES (r.collaborator_id, 'Escala publicada',
            'Você está escalado em ' || to_char(r.schedule_date, 'DD/MM/YYYY') ||
            COALESCE(' das ' || to_char(r.start_time, 'HH24:MI') || ' às ' || to_char(r.end_time, 'HH24:MI'), ''),
            'escala', '/admin/equipe/escala');
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'published', v_count);
END $$;

CREATE OR REPLACE FUNCTION public.schedule_copy_previous(_unit_id uuid, _from_date date, _to_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer := 0;
BEGIN
  IF NOT public.can_module(auth.uid(), 'equipe', 'create') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'sem_permissao');
  END IF;
  INSERT INTO public.shift_schedules (unit_id, schedule_date, day_type, collaborator_id, role_title, start_time, end_time, break_minutes, supervisor_id, notes, status)
  SELECT unit_id, _to_date, day_type, collaborator_id, role_title, start_time, end_time, break_minutes, supervisor_id, notes, 'rascunho'
  FROM public.shift_schedules
  WHERE schedule_date = _from_date AND status <> 'removida' AND (_unit_id IS NULL OR unit_id = _unit_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'created', v_count);
END $$;

CREATE OR REPLACE FUNCTION public.swap_request(_schedule_id uuid, _target_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := public.current_collaborator_id(); v_owner uuid; v_id uuid;
BEGIN
  SELECT collaborator_id INTO v_owner FROM public.shift_schedules WHERE id = _schedule_id;
  IF v_owner IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'escala_nao_encontrada'); END IF;
  IF v_me IS NULL OR (v_me <> v_owner AND NOT public.can_module(auth.uid(), 'equipe', 'edit')) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'sem_permissao');
  END IF;
  INSERT INTO public.shift_swap_requests (schedule_id, requester_id, target_id, reason)
  VALUES (_schedule_id, v_owner, _target_id, _reason) RETURNING id INTO v_id;
  INSERT INTO public.staff_notifications (collaborator_id, title, body, kind, url)
  VALUES (_target_id, 'Solicitação de troca de escala', 'Um colega solicitou troca de escala com você.', 'escala', '/admin/equipe/escala');
  RETURN jsonb_build_object('ok', true, 'id', v_id);
END $$;

CREATE OR REPLACE FUNCTION public.swap_respond(_id uuid, _accept boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := public.current_collaborator_id(); r record;
BEGIN
  SELECT * INTO r FROM public.shift_swap_requests WHERE id = _id;
  IF r IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'nao_encontrado'); END IF;
  IF v_me <> r.target_id AND NOT public.can_module(auth.uid(), 'equipe', 'edit') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'sem_permissao');
  END IF;
  UPDATE public.shift_swap_requests
    SET status = CASE WHEN _accept THEN 'aceita' ELSE 'recusada' END, accepted_at = CASE WHEN _accept THEN now() END
  WHERE id = _id;
  INSERT INTO public.staff_notifications (collaborator_id, title, body, kind, url)
  VALUES (r.requester_id, 'Troca de escala ' || CASE WHEN _accept THEN 'aceita' ELSE 'recusada' END,
          CASE WHEN _accept THEN 'Aguardando aprovação da gestão.' ELSE 'O colega recusou a troca.' END, 'escala', '/admin/equipe/escala');
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.swap_decide(_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.can_module(auth.uid(), 'equipe', 'sensitive') AND NOT public.can_module(auth.uid(), 'equipe', 'edit') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'sem_permissao');
  END IF;
  SELECT * INTO r FROM public.shift_swap_requests WHERE id = _id;
  IF r IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'nao_encontrado'); END IF;
  IF r.status <> 'aceita' THEN RETURN jsonb_build_object('ok', false, 'reason', 'aguardando_aceite'); END IF;

  UPDATE public.shift_swap_requests
    SET status = CASE WHEN _approve THEN 'aprovada' ELSE 'rejeitada' END,
        decided_at = now(), decided_by = auth.uid(), decision_note = _note
  WHERE id = _id;

  IF _approve THEN
    UPDATE public.shift_schedules SET collaborator_id = r.target_id WHERE id = r.schedule_id;
    INSERT INTO public.staff_notifications (collaborator_id, title, body, kind, url)
    SELECT x, 'Troca de escala aprovada', 'A escala foi atualizada.', 'escala', '/admin/equipe/escala'
    FROM unnest(ARRAY[r.requester_id, r.target_id]) x;
  ELSE
    INSERT INTO public.staff_notifications (collaborator_id, title, body, kind, url)
    SELECT x, 'Troca de escala rejeitada', COALESCE(_note, 'A gestão não aprovou a troca.'), 'escala', '/admin/equipe/escala'
    FROM unnest(ARRAY[r.requester_id, r.target_id]) x;
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;

-- ============ 7. FUNÇÃO: INDICADORES + SCORE + RANKING ============
CREATE OR REPLACE FUNCTION public.collaborator_scores(_unit_id uuid, _from date, _to date)
RETURNS TABLE(
  collaborator_id uuid, full_name text, role_title text, unit_id uuid,
  unique_students bigint, sessions_done bigint, trials bigint, conversions bigint,
  avg_stars numeric, plans_updated bigint, assessments bigint,
  score numeric, rank integer, breakdown jsonb
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
WITH base AS (
  SELECT c.id, c.full_name, c.role_title, c.unit_id
  FROM public.collaborators c
  WHERE (_unit_id IS NULL OR c.unit_id = _unit_id) AND COALESCE(c.status,'active') = 'active'
), asg AS (
  SELECT a.collaborator_id,
         count(DISTINCT b.client_id) AS unique_students,
         count(*) FILTER (WHERE b.attendance_status = 'presente') AS sessions_done,
         count(*) FILTER (WHERE b.kind = 'experimental') AS trials
  FROM public.class_assignments a
  JOIN public.class_bookings b ON b.id = a.booking_id
  WHERE a.class_date BETWEEN _from AND _to
  GROUP BY a.collaborator_id
), conv AS (
  SELECT trial_professor_id AS cid, count(*) AS conversions
  FROM public.enrollment_conversions
  WHERE enrollment_date BETWEEN _from AND _to AND trial_professor_id IS NOT NULL
  GROUP BY 1
), stars AS (
  SELECT professional_id AS cid, avg(student_rating)::numeric AS avg_stars
  FROM public.physical_assessments
  WHERE student_rating IS NOT NULL AND performed_at::date BETWEEN _from AND _to AND professional_id IS NOT NULL
  GROUP BY 1
), plans AS (
  SELECT coach_id AS cid, count(*) AS plans_updated
  FROM public.training_plans
  WHERE updated_at::date BETWEEN _from AND _to AND coach_id IS NOT NULL
  GROUP BY 1
), aval AS (
  SELECT professional_id AS cid, count(*) AS assessments
  FROM public.physical_assessments
  WHERE performed_at::date BETWEEN _from AND _to AND professional_id IS NOT NULL
  GROUP BY 1
), agg AS (
  SELECT b.id, b.full_name, b.role_title, b.unit_id,
         COALESCE(asg.unique_students,0) AS unique_students,
         COALESCE(asg.sessions_done,0) AS sessions_done,
         COALESCE(asg.trials,0) AS trials,
         COALESCE(conv.conversions,0) AS conversions,
         COALESCE(stars.avg_stars,0) AS avg_stars,
         COALESCE(plans.plans_updated,0) AS plans_updated,
         COALESCE(aval.assessments,0) AS assessments
  FROM base b
  LEFT JOIN asg ON asg.collaborator_id = b.id
  LEFT JOIN conv ON conv.cid = b.id
  LEFT JOIN stars ON stars.cid = b.id
  LEFT JOIN plans ON plans.cid = b.id
  LEFT JOIN aval ON aval.cid = b.id
), mx AS (
  SELECT GREATEST(max(unique_students),1) m1, GREATEST(max(sessions_done),1) m2, GREATEST(max(trials),1) m3,
         GREATEST(max(conversions),1) m4, GREATEST(max(plans_updated),1) m6, GREATEST(max(assessments),1) m7
  FROM agg
), scored AS (
  SELECT a.*,
    round(20 * a.unique_students::numeric / mx.m1, 2) AS s1,
    round(20 * a.sessions_done::numeric / mx.m2, 2) AS s2,
    round(10 * a.trials::numeric / mx.m3, 2) AS s3,
    round(15 * a.conversions::numeric / mx.m4, 2) AS s4,
    round(15 * LEAST(a.avg_stars, 5) / 5, 2) AS s5,
    round(10 * a.plans_updated::numeric / mx.m6, 2) AS s6,
    round(10 * a.assessments::numeric / mx.m7, 2) AS s7
  FROM agg a CROSS JOIN mx
)
SELECT id, full_name, role_title, unit_id, unique_students, sessions_done, trials, conversions,
       round(avg_stars, 2), plans_updated, assessments,
       round(s1+s2+s3+s4+s5+s6+s7, 1) AS score,
       rank() OVER (ORDER BY (s1+s2+s3+s4+s5+s6+s7) DESC)::integer AS rank,
       jsonb_build_object(
         'alunos_unicos', jsonb_build_object('peso', 20, 'pontos', s1),
         'treinos_realizados', jsonb_build_object('peso', 20, 'pontos', s2),
         'experimentais', jsonb_build_object('peso', 10, 'pontos', s3),
         'conversoes', jsonb_build_object('peso', 15, 'pontos', s4),
         'media_estrelas', jsonb_build_object('peso', 15, 'pontos', s5),
         'treinos_atualizados', jsonb_build_object('peso', 10, 'pontos', s6),
         'avaliacoes', jsonb_build_object('peso', 10, 'pontos', s7)
       ) AS breakdown
FROM scored
ORDER BY score DESC, full_name;
$$;
