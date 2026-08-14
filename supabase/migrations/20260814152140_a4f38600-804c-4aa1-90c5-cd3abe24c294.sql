-- ============ PARTE A: tipos de ocorrência ============
ALTER TABLE public.occurrences DROP CONSTRAINT IF EXISTS occurrences_type_chk;
ALTER TABLE public.occurrences ADD CONSTRAINT occurrences_type_chk CHECK (type IN (
  'dor','denuncia','acesso','equipamento','limpeza','atendimento','financeiro','limitacao',
  'avaliacao_baixa','experiencia_evo','operacional','outro'));

-- ============ PARTE B1: avaliações ============
ALTER TABLE public.physical_assessments
  ADD COLUMN IF NOT EXISTS unit_id uuid,
  ADD COLUMN IF NOT EXISTS professional_id uuid,
  ADD COLUMN IF NOT EXISTS scheduled_by uuid,
  ADD COLUMN IF NOT EXISTS rescheduled_from timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS origin text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_due_at date,
  ADD COLUMN IF NOT EXISTS student_rating integer,
  ADD COLUMN IF NOT EXISTS student_rating_note text,
  ADD COLUMN IF NOT EXISTS student_rated_at timestamptz;

UPDATE public.physical_assessments SET status = CASE
  WHEN status IN ('scheduled','agendada') THEN 'agendada'
  WHEN status IN ('present','presente') THEN 'presente'
  WHEN status IN ('missed','faltou') THEN 'faltou'
  WHEN status IN ('cancelled','cancelou','canceled') THEN 'cancelou'
  WHEN status IN ('done','realizada') THEN 'realizada'
  ELSE 'agendada' END;

UPDATE public.physical_assessments a
   SET unit_id = c.unit_id
  FROM public.clients c
 WHERE c.id = a.client_id AND a.unit_id IS NULL;

UPDATE public.physical_assessments
   SET published_at = COALESCE(published_at, performed_at),
       next_due_at  = COALESCE(next_due_at, (performed_at + interval '90 days')::date)
 WHERE performed_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.assessment_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.physical_assessments(id) ON DELETE CASCADE,
  changed_by uuid,
  changed_by_name text,
  reason text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.assessment_revisions TO authenticated;
GRANT ALL ON public.assessment_revisions TO service_role;
ALTER TABLE public.assessment_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read assessment revisions" ON public.assessment_revisions
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS assessment_revisions_assessment_idx ON public.assessment_revisions(assessment_id);

-- agendar
CREATE OR REPLACE FUNCTION public.assessment_schedule(
  _client_id integer, _at timestamptz, _professional_id uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _unit uuid; _pname text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  SELECT unit_id INTO _unit FROM public.clients WHERE id = _client_id;
  SELECT full_name INTO _pname FROM public.collaborators WHERE id = _professional_id;
  INSERT INTO public.physical_assessments(client_id, scheduled_at, status, notes, unit_id, professional_id, professional_name, scheduled_by, origin)
  VALUES (_client_id, _at, 'agendada', _notes, _unit, _professional_id, _pname, auth.uid(), NULL)
  RETURNING id INTO _id;
  INSERT INTO public.notifications(client_id, kind, title, body)
  VALUES (_client_id, 'avaliacao', 'Avaliação agendada',
          'Sua avaliação física foi agendada para ' || to_char(_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || '.');
  RETURN jsonb_build_object('ok', true, 'id', _id);
END $$;

-- remarcar
CREATE OR REPLACE FUNCTION public.assessment_reschedule(_id uuid, _at timestamptz, _professional_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old timestamptz; _client integer; _pname text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  SELECT scheduled_at, client_id INTO _old, _client FROM public.physical_assessments WHERE id = _id;
  IF _client IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  SELECT full_name INTO _pname FROM public.collaborators WHERE id = _professional_id;
  UPDATE public.physical_assessments
     SET scheduled_at = _at, rescheduled_from = COALESCE(rescheduled_from, _old), status = 'agendada',
         cancelled_at = NULL, cancelled_by = NULL, cancel_reason = NULL,
         professional_id = COALESCE(_professional_id, professional_id),
         professional_name = COALESCE(_pname, professional_name), updated_at = now()
   WHERE id = _id;
  INSERT INTO public.notifications(client_id, kind, title, body)
  VALUES (_client, 'avaliacao', 'Avaliação remarcada',
          'Novo horário: ' || to_char(_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || '.');
  RETURN jsonb_build_object('ok', true);
END $$;

-- cancelar
CREATE OR REPLACE FUNCTION public.assessment_cancel(_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _client integer;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  UPDATE public.physical_assessments
     SET status = 'cancelou', cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = _reason, updated_at = now()
   WHERE id = _id RETURNING client_id INTO _client;
  IF _client IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  INSERT INTO public.notifications(client_id, kind, title, body)
  VALUES (_client, 'avaliacao', 'Avaliação cancelada', COALESCE(_reason, 'Procure a equipe para reagendar.'));
  RETURN jsonb_build_object('ok', true);
END $$;

-- presença / falta
CREATE OR REPLACE FUNCTION public.assessment_set_status(_id uuid, _status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  IF _status NOT IN ('agendada','presente','faltou','cancelou') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_status');
  END IF;
  UPDATE public.physical_assessments SET status = _status, updated_at = now() WHERE id = _id;
  RETURN jsonb_build_object('ok', true);
END $$;

-- publicar / corrigir
CREATE OR REPLACE FUNCTION public.assessment_publish(
  _id uuid, _measures jsonb, _bio jsonb, _origin text,
  _notes text DEFAULT NULL, _reason text DEFAULT NULL, _next_due date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _client integer; _was timestamptz; _before jsonb; _after jsonb; _uname text; _k text; _v jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  IF _origin NOT IN ('integrado','manual') THEN RETURN jsonb_build_object('ok', false, 'reason', 'origin_required'); END IF;
  SELECT client_id, published_at INTO _client, _was FROM public.physical_assessments WHERE id = _id;
  IF _client IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _was IS NOT NULL AND (_reason IS NULL OR btrim(_reason) = '') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'reason_required');
  END IF;

  SELECT jsonb_build_object(
    'measures', (SELECT jsonb_object_agg(measure_key, value) FROM public.assessment_measures WHERE assessment_id = _id),
    'bio', (SELECT to_jsonb(b) - 'id' - 'assessment_id' - 'created_at' - 'updated_at' FROM public.assessment_bioimpedance b WHERE b.assessment_id = _id)
  ) INTO _before;

  DELETE FROM public.assessment_measures WHERE assessment_id = _id;
  FOR _k, _v IN SELECT * FROM jsonb_each(COALESCE(_measures, '{}'::jsonb)) LOOP
    IF _v IS NOT NULL AND _v::text <> 'null' AND _v::text <> '""' THEN
      INSERT INTO public.assessment_measures(assessment_id, measure_key, value)
      VALUES (_id, _k, (_v #>> '{}')::numeric);
    END IF;
  END LOOP;

  INSERT INTO public.assessment_bioimpedance(
    assessment_id, origin, weight, body_fat_pct, fat_mass, muscle_mass, lean_mass, body_water, visceral_fat, basal_metabolism, bmi)
  VALUES (_id, _origin,
    NULLIF(_bio->>'weight','')::numeric, NULLIF(_bio->>'body_fat_pct','')::numeric, NULLIF(_bio->>'fat_mass','')::numeric,
    NULLIF(_bio->>'muscle_mass','')::numeric, NULLIF(_bio->>'lean_mass','')::numeric, NULLIF(_bio->>'body_water','')::numeric,
    NULLIF(_bio->>'visceral_fat','')::numeric, NULLIF(_bio->>'basal_metabolism','')::numeric, NULLIF(_bio->>'bmi','')::numeric)
  ON CONFLICT (assessment_id) DO UPDATE SET
    origin = EXCLUDED.origin, weight = EXCLUDED.weight, body_fat_pct = EXCLUDED.body_fat_pct,
    fat_mass = EXCLUDED.fat_mass, muscle_mass = EXCLUDED.muscle_mass, lean_mass = EXCLUDED.lean_mass,
    body_water = EXCLUDED.body_water, visceral_fat = EXCLUDED.visceral_fat,
    basal_metabolism = EXCLUDED.basal_metabolism, bmi = EXCLUDED.bmi, updated_at = now();

  UPDATE public.physical_assessments
     SET performed_at = COALESCE(performed_at, now()), published_at = COALESCE(published_at, now()),
         status = 'realizada', origin = _origin, notes = COALESCE(_notes, notes),
         next_due_at = COALESCE(_next_due, next_due_at, (now() + interval '90 days')::date), updated_at = now()
   WHERE id = _id;

  SELECT jsonb_build_object(
    'measures', (SELECT jsonb_object_agg(measure_key, value) FROM public.assessment_measures WHERE assessment_id = _id),
    'bio', (SELECT to_jsonb(b) - 'id' - 'assessment_id' - 'created_at' - 'updated_at' FROM public.assessment_bioimpedance b WHERE b.assessment_id = _id)
  ) INTO _after;

  IF _was IS NOT NULL THEN
    SELECT full_name INTO _uname FROM public.collaborators WHERE auth_user_id = auth.uid();
    INSERT INTO public.assessment_revisions(assessment_id, changed_by, changed_by_name, reason, before_data, after_data)
    VALUES (_id, auth.uid(), _uname, _reason, _before, _after);
  END IF;

  IF NULLIF(_bio->>'weight','') IS NOT NULL THEN
    INSERT INTO public.health_weights(client_id, value, measured_at, source, recorded_by)
    VALUES (_client, (_bio->>'weight')::numeric, now(), 'avaliacao', auth.uid());
  END IF;

  INSERT INTO public.notifications(client_id, kind, title, body, url)
  VALUES (_client, 'avaliacao',
          CASE WHEN _was IS NULL THEN 'Avaliação disponível' ELSE 'Avaliação atualizada' END,
          CASE WHEN _was IS NULL THEN 'Sua nova avaliação física já está no app.' ELSE 'Sua avaliação foi corrigida pela equipe.' END,
          '/avaliacoes');

  RETURN jsonb_build_object('ok', true, 'revised', _was IS NOT NULL);
END $$;

-- avaliação do aluno sobre o profissional
CREATE OR REPLACE FUNCTION public.assessment_rate(_id uuid, _rating integer, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _client integer; _cname text; _unit uuid; _prof text;
BEGIN
  SELECT a.client_id, c.name, a.unit_id, a.professional_name
    INTO _client, _cname, _unit, _prof
    FROM public.physical_assessments a JOIN public.clients c ON c.id = a.client_id
   WHERE a.id = _id;
  IF _client IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _client <> COALESCE(public.current_client_id(), -1) AND NOT public.is_staff(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;
  IF _rating < 1 OR _rating > 5 THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_rating'); END IF;

  UPDATE public.physical_assessments
     SET student_rating = _rating, student_rating_note = _note, student_rated_at = now(), updated_at = now()
   WHERE id = _id;

  IF _rating <= 2 THEN
    INSERT INTO public.occurrences(client_id, unit_id, type, severity, title, description, status, source_table, source_id)
    VALUES (_client, _unit, 'avaliacao_baixa', CASE WHEN _rating = 1 THEN 'alta' ELSE 'media' END,
            'Avaliação baixa do professor (' || _rating || '/5)',
            COALESCE(_note, '') || CASE WHEN _prof IS NOT NULL THEN ' · Profissional: ' || _prof ELSE '' END,
            'aberta', 'physical_assessments', _id::text);
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;

-- lista de avaliações
CREATE OR REPLACE FUNCTION public.assessment_list(_unit_id uuid DEFAULT NULL, _from date DEFAULT NULL, _to date DEFAULT NULL)
RETURNS TABLE(id uuid, client_id integer, client_name text, unit_id uuid, scheduled_at timestamptz,
  performed_at timestamptz, published_at timestamptz, status text, professional_id uuid, professional_name text,
  origin text, next_due_at date, student_rating integer, revisions bigint, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.client_id, c.name, a.unit_id, a.scheduled_at, a.performed_at, a.published_at, a.status,
         a.professional_id, a.professional_name, a.origin, a.next_due_at, a.student_rating,
         (SELECT count(*) FROM public.assessment_revisions r WHERE r.assessment_id = a.id), a.created_at
    FROM public.physical_assessments a
    JOIN public.clients c ON c.id = a.client_id
   WHERE public.is_staff(auth.uid())
     AND (_unit_id IS NULL OR COALESCE(a.unit_id, c.unit_id) = _unit_id)
     AND (_from IS NULL OR COALESCE(a.performed_at, a.scheduled_at, a.created_at)::date >= _from)
     AND (_to IS NULL OR COALESCE(a.performed_at, a.scheduled_at, a.created_at)::date <= _to)
   ORDER BY COALESCE(a.scheduled_at, a.performed_at, a.created_at) DESC
$$;

-- dashboard de avaliações
CREATE OR REPLACE FUNCTION public.assessment_dashboard(_unit_id uuid DEFAULT NULL, _from date DEFAULT NULL, _to date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _today date := (public.br_now())::date; _res jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RETURN jsonb_build_object('allowed', false); END IF;
  WITH base AS (
    SELECT a.*, COALESCE(a.unit_id, c.unit_id) AS eff_unit
      FROM public.physical_assessments a JOIN public.clients c ON c.id = a.client_id
     WHERE (_unit_id IS NULL OR COALESCE(a.unit_id, c.unit_id) = _unit_id)
  ), period AS (
    SELECT * FROM base
     WHERE (_from IS NULL OR COALESCE(performed_at, scheduled_at, created_at)::date >= _from)
       AND (_to IS NULL OR COALESCE(performed_at, scheduled_at, created_at)::date <= _to)
  ), clients_scope AS (
    SELECT id FROM public.clients WHERE (_unit_id IS NULL OR unit_id = _unit_id) AND COALESCE(status,'AT') <> 'CA'
  )
  SELECT jsonb_build_object(
    'allowed', true,
    'today_scheduled', (SELECT count(*) FROM base WHERE scheduled_at::date = _today AND status IN ('agendada','presente')),
    'done', (SELECT count(*) FROM period WHERE performed_at IS NOT NULL),
    'scheduled', (SELECT count(*) FROM period WHERE status = 'agendada' AND performed_at IS NULL),
    'missed', (SELECT count(*) FROM period WHERE status = 'faltou'),
    'cancelled', (SELECT count(*) FROM period WHERE status = 'cancelou'),
    'due_7d', (SELECT count(*) FROM base WHERE next_due_at BETWEEN _today AND _today + 7),
    'overdue', (SELECT count(*) FROM base WHERE next_due_at < _today),
    'never', (SELECT count(*) FROM clients_scope cs WHERE NOT EXISTS (
        SELECT 1 FROM base b WHERE b.client_id = cs.id AND b.performed_at IS NOT NULL)),
    'attendance_pct', (SELECT CASE WHEN count(*) = 0 THEN 0
        ELSE round(100.0 * count(*) FILTER (WHERE status IN ('presente','realizada')) / count(*)) END
      FROM period WHERE status IN ('presente','realizada','faltou')),
    'by_professional', COALESCE((SELECT jsonb_agg(x) FROM (
        SELECT COALESCE(professional_name, 'Sem responsável') AS name,
               count(*) FILTER (WHERE performed_at IS NOT NULL) AS done,
               count(*) AS total,
               round(avg(student_rating)::numeric, 1) AS rating
          FROM period GROUP BY 1 ORDER BY 2 DESC) x), '[]'::jsonb)
  ) INTO _res;
  RETURN _res;
END $$;

-- ============ PARTE B2: saúde no admin ============
CREATE OR REPLACE FUNCTION public.health_record_weight(_client_id integer, _value numeric, _measured_at timestamptz DEFAULT now())
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  INSERT INTO public.health_weights(client_id, value, measured_at, source, recorded_by)
  VALUES (_client_id, _value, _measured_at, 'equipe', auth.uid()) RETURNING id INTO _id;
  RETURN jsonb_build_object('ok', true, 'id', _id);
END $$;

CREATE OR REPLACE FUNCTION public.health_correct_weight(_id uuid, _value numeric, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old numeric; _client integer;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RETURN jsonb_build_object('ok', false, 'reason', 'reason_required'); END IF;
  SELECT value, client_id INTO _old, _client FROM public.health_weights WHERE id = _id;
  IF _client IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  UPDATE public.health_weights SET value = _value, updated_at = now(), recorded_by = auth.uid() WHERE id = _id;
  RETURN jsonb_build_object('ok', true, 'old_value', _old, 'new_value', _value);
END $$;

CREATE OR REPLACE FUNCTION public.health_record_bp(_client_id integer, _systolic integer, _diastolic integer, _measured_at timestamptz DEFAULT now())
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  INSERT INTO public.health_blood_pressure(client_id, systolic, diastolic, measured_at, source, recorded_by)
  VALUES (_client_id, _systolic, _diastolic, _measured_at, 'equipe', auth.uid()) RETURNING id INTO _id;
  RETURN jsonb_build_object('ok', true, 'id', _id);
END $$;

CREATE OR REPLACE FUNCTION public.health_correct_bp(_id uuid, _systolic integer, _diastolic integer, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _os integer; _od integer; _client integer;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RETURN jsonb_build_object('ok', false, 'reason', 'reason_required'); END IF;
  SELECT systolic, diastolic, client_id INTO _os, _od, _client FROM public.health_blood_pressure WHERE id = _id;
  IF _client IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  UPDATE public.health_blood_pressure
     SET systolic = _systolic, diastolic = _diastolic, updated_at = now(), recorded_by = auth.uid()
   WHERE id = _id;
  RETURN jsonb_build_object('ok', true, 'old_systolic', _os, 'old_diastolic', _od);
END $$;

CREATE OR REPLACE FUNCTION public.client_health_overview(_client_id integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _res jsonb; _today date := (public.br_now())::date;
BEGIN
  IF NOT public.is_staff(auth.uid()) AND COALESCE(public.current_client_id(), -1) <> _client_id THEN
    RETURN jsonb_build_object('allowed', false);
  END IF;
  SELECT jsonb_build_object(
    'allowed', true,
    'weight', (SELECT jsonb_build_object('id', id, 'value', value, 'measured_at', measured_at, 'source', source)
                 FROM public.health_weights WHERE client_id = _client_id ORDER BY measured_at DESC LIMIT 1),
    'goal', (SELECT jsonb_build_object('target', target, 'start_value', start_value, 'achieved_at', achieved_at)
               FROM public.weight_goals WHERE client_id = _client_id AND active ORDER BY created_at DESC LIMIT 1),
    'resting_hr', (SELECT jsonb_build_object('value', value, 'measured_at', measured_at, 'source', source)
                     FROM public.health_metrics WHERE client_id = _client_id AND metric = 'resting_hr'
                    ORDER BY measured_at DESC LIMIT 1),
    'bp', (SELECT jsonb_build_object('id', id, 'systolic', systolic, 'diastolic', diastolic, 'measured_at', measured_at, 'source', source)
             FROM public.health_blood_pressure WHERE client_id = _client_id ORDER BY measured_at DESC LIMIT 1),
    'checkin', (SELECT jsonb_build_object('date', checkin_date, 'sleep_hours', sleep_hours, 'sleep_quality', sleep_quality,
                        'energy', energy, 'mood', mood, 'stress_level', stress_level,
                        'readiness', round(((COALESCE(energy,3) + COALESCE(mood,3) + COALESCE(sleep_quality,3)) / 3.0)::numeric, 1),
                        'today', checkin_date = _today)
                  FROM public.daily_checkins WHERE client_id = _client_id ORDER BY checkin_date DESC LIMIT 1),
    'device', (SELECT jsonb_build_object('provider', provider, 'label', label, 'last_sync_at', last_sync_at)
                 FROM public.connected_devices WHERE client_id = _client_id AND active
                ORDER BY last_sync_at DESC NULLS LAST LIMIT 1),
    'alerts', jsonb_build_object(
      'new_limitation', (SELECT count(*) FROM public.limitation_alerts WHERE client_id = _client_id AND acknowledged_at IS NULL),
      'pain_open', (SELECT count(*) FROM public.occurrences WHERE client_id = _client_id AND type = 'dor' AND status <> 'resolvida'),
      'low_readiness', (SELECT CASE WHEN (COALESCE(energy,3) + COALESCE(mood,3) + COALESCE(sleep_quality,3)) / 3.0 <= 2.5 THEN 1 ELSE 0 END
                          FROM public.daily_checkins WHERE client_id = _client_id ORDER BY checkin_date DESC LIMIT 1),
      'assessment_overdue', (SELECT CASE WHEN count(*) > 0 THEN 1 ELSE 0 END FROM public.physical_assessments
                              WHERE client_id = _client_id AND next_due_at < _today),
      'training_overdue', (SELECT CASE WHEN count(*) > 0 THEN 1 ELSE 0 END FROM public.training_plans
                            WHERE student_id = _client_id AND is_active AND expires_at IS NOT NULL AND expires_at < _today))
  ) INTO _res;
  RETURN _res;
END $$;