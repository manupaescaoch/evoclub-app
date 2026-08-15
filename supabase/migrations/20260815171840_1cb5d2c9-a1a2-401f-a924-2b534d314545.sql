CREATE OR REPLACE FUNCTION public.assessment_publish(_id uuid, _measures jsonb, _bio jsonb, _origin text, _notes text DEFAULT NULL::text, _reason text DEFAULT NULL::text, _next_due date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _client integer; _was timestamptz; _before jsonb; _after jsonb; _uname text; _k text; _v jsonb; _period int;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  IF _origin NOT IN ('integrado','manual') THEN RETURN jsonb_build_object('ok', false, 'reason', 'origin_required'); END IF;
  SELECT client_id, published_at INTO _client, _was FROM public.physical_assessments WHERE id = _id;
  IF _client IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _was IS NOT NULL AND (_reason IS NULL OR btrim(_reason) = '') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'reason_required');
  END IF;

  _period := COALESCE(public.cfg_num('avaliacoes', 'periodicity_days', 90), 90)::int;

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
         next_due_at = COALESCE(_next_due, next_due_at, (now() + make_interval(days => _period))::date), updated_at = now()
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
END $function$;

CREATE OR REPLACE FUNCTION public.assessment_dashboard(_unit_id uuid DEFAULT NULL::uuid, _from date DEFAULT NULL::date, _to date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _today date := (public.br_now())::date; _res jsonb; _warn int;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RETURN jsonb_build_object('allowed', false); END IF;
  _warn := COALESCE(public.cfg_num('avaliacoes', 'warn_days_before', 7), 7)::int;
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
    'due_7d', (SELECT count(*) FROM base WHERE next_due_at BETWEEN _today AND _today + _warn),
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
END $function$;