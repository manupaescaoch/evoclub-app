
-- ================= LEITURA PERMITIDA =================
CREATE OR REPLACE FUNCTION public.retro_can_read(_client_id integer)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.current_client_id() = _client_id
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = _client_id
        AND public.can_module(auth.uid(), 'clientes', 'view')
        AND (c.unit_id IS NULL OR c.unit_id = ANY (public.allowed_unit_ids(auth.uid())))
    );
$$;
REVOKE EXECUTE ON FUNCTION public.retro_can_read(integer) FROM anon;

-- ================= CÁLCULO =================
CREATE OR REPLACE FUNCTION public.retro_compute(_client_id integer, _from date, _to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cli record;
  tz text := 'America/Recife';
  goal int;
  weeks_span numeric;
  planned numeric;
  total_presence int;
  out jsonb := '{}'::jsonb;
  j jsonb;
  first_a record;
  last_a record;
  metrics jsonb;
  best_streak int := 0;
  comebacks int := 0;
  months_hit int := 0;
BEGIN
  IF NOT public.retro_can_read(_client_id) THEN
    RETURN jsonb_build_object('allowed', false);
  END IF;

  SELECT c.*, u.name AS unit_name, u.default_weekly_goal
    INTO cli FROM public.clients c LEFT JOIN public.units u ON u.id = c.unit_id
   WHERE c.id = _client_id;
  IF cli.id IS NULL THEN RETURN jsonb_build_object('allowed', false); END IF;

  goal := GREATEST(COALESCE(cli.weekly_goal, cli.default_weekly_goal, 3), 1);
  weeks_span := GREATEST(((_to - _from) + 1)::numeric / 7.0, 1);
  planned := ROUND(goal * weeks_span);

  CREATE TEMP TABLE IF NOT EXISTS _pres (d date, h int) ON COMMIT DROP;
  DELETE FROM _pres;
  INSERT INTO _pres (d, h)
  SELECT d, MIN(h) FROM (
    SELECT cb.class_date::date AS d,
           EXTRACT(hour FROM (cb.checked_in_at AT TIME ZONE tz))::int AS h
      FROM public.class_bookings cb
     WHERE cb.client_id = _client_id
       AND cb.class_date BETWEEN _from AND _to
       AND (cb.attendance_status = 'presente' OR cb.checked_in_at IS NOT NULL)
    UNION ALL
    SELECT (ci.checked_at AT TIME ZONE tz)::date,
           EXTRACT(hour FROM (ci.checked_at AT TIME ZONE tz))::int
      FROM public.check_ins ci
     WHERE ci.client_id = _client_id
       AND (ci.checked_at AT TIME ZONE tz)::date BETWEEN _from AND _to
  ) s GROUP BY d;

  SELECT count(*) INTO total_presence FROM _pres;

  -- maior sequência de semanas ativas + retornos após ausência
  WITH w AS (
    SELECT DISTINCT (date_trunc('week', d))::date AS wk FROM _pres
  ), g AS (
    SELECT wk, (wk - (row_number() OVER (ORDER BY wk) * 7))::date AS grp FROM w
  )
  SELECT COALESCE(MAX(cnt), 0) INTO best_streak FROM (SELECT count(*) cnt FROM g GROUP BY grp) x;

  WITH ordered AS (SELECT d, lag(d) OVER (ORDER BY d) prev FROM _pres)
  SELECT count(*) INTO comebacks FROM ordered WHERE prev IS NOT NULL AND (d - prev) >= 21;

  -- ============ PERFIL / ABERTURA ============
  out := out || jsonb_build_object('allowed', true,
    'client', jsonb_build_object(
      'id', cli.id, 'name', cli.name, 'first_name', split_part(cli.name, ' ', 1),
      'avatar_url', cli.avatar_url, 'unit_id', cli.unit_id, 'unit_name', cli.unit_name,
      'plan', cli.plan, 'objective', cli.objective, 'limitations', cli.limitations,
      'weekly_goal', goal,
      'joined_at', COALESCE(cli.contract_start::text, cli.created_at::date::text),
      'months_as_student', GREATEST(ROUND(EXTRACT(epoch FROM (now() - COALESCE(cli.contract_start::timestamptz, cli.created_at))) / 2592000.0)::int, 0),
      'contract_end', cli.contract_end
    ),
    'period', jsonb_build_object('from', _from, 'to', _to, 'weeks', ROUND(weeks_span, 1)));

  -- ============ FREQUÊNCIA ============
  SELECT jsonb_build_object(
    'total', total_presence,
    'planned', planned,
    'pct', CASE WHEN planned > 0 THEN ROUND(total_presence * 100.0 / planned) ELSE NULL END,
    'per_week', ROUND(total_presence / weeks_span, 1),
    'per_month', ROUND(total_presence / GREATEST(weeks_span / 4.345, 1), 1),
    'active_weeks', (SELECT count(DISTINCT date_trunc('week', d)) FROM _pres),
    'best_week_streak', best_streak,
    'comebacks', comebacks,
    'by_month', COALESCE((SELECT jsonb_agg(x ORDER BY x->>'month') FROM (
        SELECT jsonb_build_object('month', to_char(date_trunc('month', d), 'YYYY-MM'), 'total', count(*)) x
          FROM _pres GROUP BY date_trunc('month', d)) m), '[]'::jsonb),
    'by_dow', COALESCE((SELECT jsonb_agg(x ORDER BY (x->>'dow')::int) FROM (
        SELECT jsonb_build_object('dow', EXTRACT(dow FROM d)::int, 'total', count(*)) x
          FROM _pres GROUP BY EXTRACT(dow FROM d)) m), '[]'::jsonb),
    'best_month', (SELECT to_char(date_trunc('month', d), 'YYYY-MM') FROM _pres
                    GROUP BY date_trunc('month', d) ORDER BY count(*) DESC, date_trunc('month', d) LIMIT 1),
    'best_month_total', (SELECT count(*) FROM _pres GROUP BY date_trunc('month', d) ORDER BY count(*) DESC LIMIT 1),
    'best_week', (SELECT to_char(date_trunc('week', d), 'YYYY-MM-DD') FROM _pres
                   GROUP BY date_trunc('week', d) ORDER BY count(*) DESC LIMIT 1),
    'fav_dow', (SELECT EXTRACT(dow FROM d)::int FROM _pres GROUP BY EXTRACT(dow FROM d) ORDER BY count(*) DESC LIMIT 1),
    'fav_hour', (SELECT h FROM _pres WHERE h IS NOT NULL GROUP BY h ORDER BY count(*) DESC LIMIT 1)
  ) INTO j;

  months_hit := COALESCE((SELECT count(*) FROM (
      SELECT date_trunc('month', d) m, count(*) t FROM _pres GROUP BY 1
    ) x WHERE x.t >= goal * 4), 0);
  j := j || jsonb_build_object('months_goal_hit', months_hit);
  out := out || jsonb_build_object('frequency', j);

  -- ============ TREINOS ============
  SELECT jsonb_build_object(
    'total', count(*),
    'by_month', COALESCE((SELECT jsonb_agg(x ORDER BY x->>'month') FROM (
        SELECT jsonb_build_object('month', to_char(date_trunc('month', wl2.workout_date), 'YYYY-MM'), 'total', count(*)) x
          FROM public.workout_logs wl2
         WHERE wl2.client_id = _client_id AND wl2.status = 'completed'
           AND wl2.workout_date BETWEEN _from AND _to
         GROUP BY date_trunc('month', wl2.workout_date)) m), '[]'::jsonb),
    'top_session', (SELECT wl3.session_name FROM public.workout_logs wl3
                     WHERE wl3.client_id = _client_id AND wl3.status = 'completed'
                       AND wl3.workout_date BETWEEN _from AND _to AND wl3.session_name IS NOT NULL
                     GROUP BY wl3.session_name ORDER BY count(*) DESC LIMIT 1),
    'minutes', COALESCE((SELECT ROUND(SUM(EXTRACT(epoch FROM (wl4.finished_at - wl4.started_at)) / 60.0))
                     FROM public.workout_logs wl4
                    WHERE wl4.client_id = _client_id AND wl4.status = 'completed'
                      AND wl4.finished_at IS NOT NULL AND wl4.started_at IS NOT NULL
                      AND wl4.workout_date BETWEEN _from AND _to), 0),
    'avg_rpe', (SELECT ROUND(AVG(wl5.rpe)::numeric, 1) FROM public.workout_logs wl5
                 WHERE wl5.client_id = _client_id AND wl5.status = 'completed' AND wl5.rpe IS NOT NULL
                   AND wl5.workout_date BETWEEN _from AND _to)
  ) INTO j
  FROM public.workout_logs wl
  WHERE wl.client_id = _client_id AND wl.status = 'completed' AND wl.workout_date BETWEEN _from AND _to;

  j := j || jsonb_build_object(
    'plans', (SELECT count(*) FROM public.training_plans tp WHERE tp.student_id = _client_id
               AND tp.created_at::date <= _to),
    'plan_changes', (SELECT count(*) FROM public.training_plans tp WHERE tp.student_id = _client_id
                      AND tp.created_at::date BETWEEN _from AND _to),
    'top_exercises', COALESCE((SELECT jsonb_agg(x) FROM (
        SELECT jsonb_build_object('name', s.exercise_name, 'sessions', count(DISTINCT s.workout_log_id)) x
          FROM public.workout_log_sets s
          JOIN public.workout_logs wl6 ON wl6.id = s.workout_log_id
         WHERE wl6.client_id = _client_id AND wl6.status = 'completed'
           AND wl6.workout_date BETWEEN _from AND _to AND s.completed
           AND s.exercise_name IS NOT NULL
         GROUP BY s.exercise_name ORDER BY count(DISTINCT s.workout_log_id) DESC LIMIT 6) t), '[]'::jsonb),
    'load_records', COALESCE((SELECT jsonb_agg(x) FROM (
        SELECT jsonb_build_object('name', name, 'first', first_kg, 'best', best_kg,
                                  'delta', ROUND(best_kg - first_kg, 1)) x
          FROM (
            SELECT s.exercise_name AS name,
                   MAX(kg) AS best_kg,
                   (array_agg(kg ORDER BY wl7.workout_date))[1] AS first_kg
              FROM public.workout_log_sets s
              JOIN public.workout_logs wl7 ON wl7.id = s.workout_log_id
              CROSS JOIN LATERAL (
                SELECT NULLIF(regexp_replace(replace(COALESCE(s.performed_load, ''), ',', '.'), '[^0-9.]', '', 'g'), '')::numeric AS kg
              ) k
             WHERE wl7.client_id = _client_id AND wl7.status = 'completed'
               AND wl7.workout_date BETWEEN _from AND _to AND s.completed
               AND k.kg IS NOT NULL AND k.kg > 0
             GROUP BY s.exercise_name
             HAVING count(*) >= 2
          ) r
         WHERE best_kg > first_kg
         ORDER BY (best_kg - first_kg) DESC LIMIT 5) t), '[]'::jsonb)
  );
  out := out || jsonb_build_object('workouts', j);

  -- ============ AVALIAÇÕES ============
  SELECT pa.id, pa.performed_at, pa.professional_name INTO first_a
    FROM public.physical_assessments pa
   WHERE pa.client_id = _client_id AND pa.performed_at IS NOT NULL
     AND pa.performed_at::date BETWEEN _from AND _to
   ORDER BY pa.performed_at ASC LIMIT 1;
  SELECT pa.id, pa.performed_at, pa.professional_name INTO last_a
    FROM public.physical_assessments pa
   WHERE pa.client_id = _client_id AND pa.performed_at IS NOT NULL
     AND pa.performed_at::date BETWEEN _from AND _to
   ORDER BY pa.performed_at DESC LIMIT 1;

  j := jsonb_build_object(
    'total', (SELECT count(*) FROM public.physical_assessments pa WHERE pa.client_id = _client_id
               AND pa.performed_at IS NOT NULL AND pa.performed_at::date BETWEEN _from AND _to),
    'dates', COALESCE((SELECT jsonb_agg(pa.performed_at ORDER BY pa.performed_at)
               FROM public.physical_assessments pa WHERE pa.client_id = _client_id
                AND pa.performed_at IS NOT NULL AND pa.performed_at::date BETWEEN _from AND _to), '[]'::jsonb),
    'professionals', COALESCE((SELECT jsonb_agg(DISTINCT pa.professional_name)
               FROM public.physical_assessments pa WHERE pa.client_id = _client_id
                AND pa.professional_name IS NOT NULL
                AND pa.performed_at::date BETWEEN _from AND _to), '[]'::jsonb),
    'avg_rating', (SELECT ROUND(AVG(pa.student_rating)::numeric, 1) FROM public.physical_assessments pa
                    WHERE pa.client_id = _client_id AND pa.student_rating IS NOT NULL
                      AND pa.performed_at::date BETWEEN _from AND _to),
    'first_at', first_a.performed_at, 'last_at', last_a.performed_at
  );

  IF first_a.id IS NOT NULL AND last_a.id IS NOT NULL AND first_a.id <> last_a.id THEN
    j := j || jsonb_build_object(
      'bio', (SELECT jsonb_build_object(
                'first', to_jsonb(b1) - 'id' - 'assessment_id' - 'created_at' - 'updated_at',
                'last', to_jsonb(b2) - 'id' - 'assessment_id' - 'created_at' - 'updated_at')
              FROM public.assessment_bioimpedance b1, public.assessment_bioimpedance b2
             WHERE b1.assessment_id = first_a.id AND b2.assessment_id = last_a.id),
      'measures', COALESCE((SELECT jsonb_agg(x) FROM (
              SELECT jsonb_build_object('key', COALESCE(m1.measure_key, m2.measure_key),
                                        'first', m1.value, 'last', m2.value,
                                        'delta', ROUND(m2.value - m1.value, 1)) x
                FROM public.assessment_measures m1
                FULL JOIN public.assessment_measures m2
                  ON m2.assessment_id = last_a.id AND m2.measure_key = m1.measure_key
               WHERE m1.assessment_id = first_a.id AND m1.value IS NOT NULL AND m2.value IS NOT NULL) t), '[]'::jsonb));
  END IF;
  out := out || jsonb_build_object('assessments', j);

  -- ============ SAÚDE ============
  out := out || jsonb_build_object('health', jsonb_build_object(
    'checkins', (SELECT count(*) FROM public.daily_checkins dc WHERE dc.client_id = _client_id
                  AND dc.checkin_date BETWEEN _from AND _to),
    'avg', (SELECT jsonb_build_object('sleep_hours', ROUND(AVG(dc.sleep_hours), 1),
                                      'sleep_quality', ROUND(AVG(dc.sleep_quality), 1),
                                      'energy', ROUND(AVG(dc.energy), 1),
                                      'mood', ROUND(AVG(dc.mood), 1),
                                      'stress', ROUND(AVG(dc.stress_level), 1))
              FROM public.daily_checkins dc WHERE dc.client_id = _client_id
               AND dc.checkin_date BETWEEN _from AND _to),
    'first_half', (SELECT jsonb_build_object('energy', ROUND(AVG(dc.energy), 1), 'mood', ROUND(AVG(dc.mood), 1),
                                             'stress', ROUND(AVG(dc.stress_level), 1))
              FROM public.daily_checkins dc WHERE dc.client_id = _client_id
               AND dc.checkin_date BETWEEN _from AND (_from + ((_to - _from) / 2))),
    'second_half', (SELECT jsonb_build_object('energy', ROUND(AVG(dc.energy), 1), 'mood', ROUND(AVG(dc.mood), 1),
                                              'stress', ROUND(AVG(dc.stress_level), 1))
              FROM public.daily_checkins dc WHERE dc.client_id = _client_id
               AND dc.checkin_date > (_from + ((_to - _from) / 2)) AND dc.checkin_date <= _to),
    'weight_first', (SELECT hw.value FROM public.health_weights hw WHERE hw.client_id = _client_id
                      AND hw.measured_at::date BETWEEN _from AND _to ORDER BY hw.measured_at ASC LIMIT 1),
    'weight_last', (SELECT hw.value FROM public.health_weights hw WHERE hw.client_id = _client_id
                      AND hw.measured_at::date BETWEEN _from AND _to ORDER BY hw.measured_at DESC LIMIT 1),
    'bp_last', (SELECT jsonb_build_object('systolic', bp.systolic, 'diastolic', bp.diastolic, 'at', bp.measured_at)
                 FROM public.health_blood_pressure bp WHERE bp.client_id = _client_id
                  AND bp.measured_at::date BETWEEN _from AND _to ORDER BY bp.measured_at DESC LIMIT 1),
    'pain_reports', (SELECT count(*) FROM public.pain_reports pr WHERE pr.client_id = _client_id
                      AND pr.created_at::date BETWEEN _from AND _to),
    'occurrences_resolved', (SELECT count(*) FROM public.occurrences o WHERE o.client_id = _client_id
                      AND o.status IN ('resolvida', 'concluida') AND o.created_at::date BETWEEN _from AND _to),
    'adaptations', (SELECT count(*) FROM public.training_plans tp WHERE tp.student_id = _client_id
                      AND tp.created_at::date BETWEEN _from AND _to),
    'anamnesis_objective', (SELECT an.objective FROM public.anamnesis an WHERE an.client_id = _client_id
                             ORDER BY an.created_at ASC LIMIT 1),
    'limitations', cli.limitations
  ));

  -- ============ FOTOS ============
  out := out || jsonb_build_object('photos', jsonb_build_object(
    'total', (SELECT count(*) FROM public.evolution_photos ep WHERE ep.client_id = _client_id
               AND ep.taken_at::date BETWEEN _from AND _to),
    'items', COALESCE((SELECT jsonb_agg(x ORDER BY x->>'taken_at') FROM (
        SELECT jsonb_build_object('pose', ep.pose, 'path', ep.storage_path, 'taken_at', ep.taken_at) x
          FROM public.evolution_photos ep WHERE ep.client_id = _client_id
           AND ep.taken_at::date BETWEEN _from AND _to) t), '[]'::jsonb),
    'consent', COALESCE((SELECT rc.allow_photos FROM public.retro_consents rc WHERE rc.client_id = _client_id), false)));

  -- ============ RANKING ============
  IF COALESCE((SELECT rc.ranking_opt_out FROM public.retro_consents rc WHERE rc.client_id = _client_id), false) THEN
    out := out || jsonb_build_object('ranking', jsonb_build_object('opt_out', true));
  ELSE
    SELECT jsonb_build_object('opt_out', false, 'position', pos, 'total', tot,
                              'points', points, 'workouts', workouts,
                              'top_pct', CASE WHEN tot > 0 THEN ROUND(pos * 100.0 / tot) ELSE NULL END)
      INTO j
      FROM (
        SELECT r.client_id, r.points, r.workouts,
               row_number() OVER (ORDER BY r.points DESC) AS pos,
               count(*) OVER () AS tot
          FROM public.ranking_scores(cli.unit_id, _from) r
      ) z WHERE z.client_id = _client_id;
    out := out || jsonb_build_object('ranking', COALESCE(j, jsonb_build_object('opt_out', false)));
  END IF;

  -- ============ CONQUISTAS ============
  out := out || jsonb_build_object('achievements', COALESCE((SELECT jsonb_agg(x ORDER BY x->>'unlocked_at') FROM (
      SELECT jsonb_build_object('code', ca.achievement_code, 'name', a.name,
                                'description', a.description, 'icon', a.icon,
                                'unlocked_at', ca.unlocked_at) x
        FROM public.client_achievements ca
        LEFT JOIN public.achievements a ON a.code = ca.achievement_code
       WHERE ca.client_id = _client_id AND ca.unlocked_at::date BETWEEN _from AND _to) t), '[]'::jsonb));

  -- ============ COMUNIDADE / RELACIONAMENTO ============
  out := out || jsonb_build_object('community', jsonb_build_object(
    'indications', (SELECT count(*) FROM public.crm_indications ci WHERE ci.indicator_student_id = _client_id
                     AND ci.created_at::date BETWEEN _from AND _to),
    'indications_converted', (SELECT count(*) FROM public.crm_indications ci
                     WHERE ci.indicator_student_id = _client_id AND ci.indicated_student_id IS NOT NULL
                       AND ci.created_at::date BETWEEN _from AND _to),
    'posts', (SELECT count(*) FROM public.community_posts cp
               JOIN public.clients c2 ON c2.auth_user_id = cp.author_id
              WHERE c2.id = _client_id AND cp.created_at::date BETWEEN _from AND _to),
    'contacts', (SELECT count(*) FROM public.contact_logs cl WHERE cl.client_id = _client_id
                  AND cl.created_at::date BETWEEN _from AND _to),
    'nps', (SELECT ROUND(AVG(nr.score)::numeric, 1) FROM public.nps_responses nr WHERE nr.client_id = _client_id
             AND nr.created_at::date BETWEEN _from AND _to),
    'renewals', (SELECT count(*) FROM public.renewal_requests rr WHERE rr.client_id = _client_id
                  AND rr.created_at::date BETWEEN _from AND _to)));

  -- ============ LINHA DO TEMPO ============
  out := out || jsonb_build_object('timeline', COALESCE((
    SELECT jsonb_agg(x ORDER BY x->>'at') FROM (
      SELECT jsonb_build_object('at', COALESCE(cli.contract_start::text, cli.created_at::date::text),
                                'kind', 'entrada', 'title', 'Início na EVO') x
      UNION ALL
      SELECT jsonb_build_object('at', pa.performed_at::date::text, 'kind', 'avaliacao',
                                'title', 'Avaliação física', 'detail', pa.professional_name)
        FROM public.physical_assessments pa WHERE pa.client_id = _client_id
         AND pa.performed_at IS NOT NULL AND pa.performed_at::date BETWEEN _from AND _to
      UNION ALL
      SELECT jsonb_build_object('at', tp.created_at::date::text, 'kind', 'treino',
                                'title', 'Novo programa de treino', 'detail', tp.name)
        FROM public.training_plans tp WHERE tp.student_id = _client_id
         AND tp.created_at::date BETWEEN _from AND _to
      UNION ALL
      SELECT jsonb_build_object('at', ca.unlocked_at::date::text, 'kind', 'selo',
                                'title', COALESCE(a.name, ca.achievement_code))
        FROM public.client_achievements ca LEFT JOIN public.achievements a ON a.code = ca.achievement_code
       WHERE ca.client_id = _client_id AND ca.unlocked_at::date BETWEEN _from AND _to
      UNION ALL
      SELECT jsonb_build_object('at', rr.created_at::date::text, 'kind', 'renovacao',
                                'title', 'Renovação', 'detail', rr.status)
        FROM public.renewal_requests rr WHERE rr.client_id = _client_id
         AND rr.created_at::date BETWEEN _from AND _to
      UNION ALL
      SELECT jsonb_build_object('at', ci.created_at::date::text, 'kind', 'indicacao',
                                'title', 'Indicação', 'detail', ci.indicated_name)
        FROM public.crm_indications ci WHERE ci.indicator_student_id = _client_id
         AND ci.created_at::date BETWEEN _from AND _to
    ) t), '[]'::jsonb));

  -- ============ SELOS ============
  metrics := jsonb_build_object(
    'workouts', (out->'workouts'->>'total')::numeric,
    'months_goal_hit', months_hit,
    'months_as_student', (out->'client'->>'months_as_student')::numeric,
    'frequency_pct', COALESCE((out->'frequency'->>'pct')::numeric, 0),
    'comebacks', comebacks,
    'best_week_streak', best_streak);

  out := out || jsonb_build_object('badges', COALESCE((SELECT jsonb_agg(x ORDER BY (x->>'sort')::int) FROM (
      SELECT jsonb_build_object('code', br.code, 'label', br.label, 'description', br.description,
                                'sort', br.sort_order) x
        FROM public.retro_badge_rules br
       WHERE br.active AND COALESCE((metrics->>br.metric)::numeric, 0) >= br.threshold) t), '[]'::jsonb),
    'metrics', metrics);

  RETURN out;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.retro_compute(integer, date, date) FROM anon;

-- ================= PERÍODO =================
CREATE OR REPLACE FUNCTION public.retro_period(_client_id integer, _kind text, _from date DEFAULT NULL, _to date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; f date; t date;
BEGIN
  SELECT * INTO c FROM public.clients WHERE id = _client_id;
  IF c.id IS NULL THEN RETURN NULL; END IF;
  t := LEAST(COALESCE(_to, CURRENT_DATE), CURRENT_DATE);
  IF _kind = 'entrada' THEN
    f := COALESCE(c.contract_start, c.created_at::date);
  ELSIF _kind = 'contrato' THEN
    f := COALESCE(c.contract_start, c.created_at::date);
    t := LEAST(COALESCE(c.contract_end, CURRENT_DATE), CURRENT_DATE);
  ELSIF _kind = '12m' THEN
    f := CURRENT_DATE - INTERVAL '12 months';
  ELSIF _kind = 'ano' THEN
    f := date_trunc('year', CURRENT_DATE)::date;
  ELSE
    f := COALESCE(_from, CURRENT_DATE - INTERVAL '12 months');
  END IF;
  IF t < f THEN t := f; END IF;
  RETURN jsonb_build_object('from', f, 'to', t);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.retro_period(integer, text, date, date) FROM anon;

-- ================= GERAR =================
CREATE OR REPLACE FUNCTION public.retro_generate(_client_id integer, _kind text DEFAULT 'contrato',
  _from date DEFAULT NULL, _to date DEFAULT NULL, _trigger text DEFAULT 'manual')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p jsonb; snap jsonb; rid uuid; u uuid; existing record; hl jsonb;
BEGIN
  IF NOT (public.can_module(auth.uid(), 'clientes', 'create') OR _trigger <> 'manual') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_permissao');
  END IF;
  SELECT unit_id INTO u FROM public.clients WHERE id = _client_id;
  p := public.retro_period(_client_id, _kind, _from, _to);
  IF p IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'cliente'); END IF;
  snap := public.retro_compute(_client_id, (p->>'from')::date, (p->>'to')::date);
  IF NOT COALESCE((snap->>'allowed')::boolean, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_acesso');
  END IF;

  hl := public.retro_highlights(snap);

  SELECT * INTO existing FROM public.retrospectives r
   WHERE r.client_id = _client_id AND r.period_from = (p->>'from')::date AND r.period_to = (p->>'to')::date
     AND r.status IN ('aguardando', 'gerada', 'revisada')
   ORDER BY r.created_at DESC LIMIT 1;

  IF existing.id IS NOT NULL THEN
    UPDATE public.retrospectives SET snapshot = snap, generated_at = now(), status = 'gerada',
      highlights = CASE WHEN highlights = '[]'::jsonb THEN hl ELSE highlights END,
      trigger = _trigger
     WHERE id = existing.id;
    rid := existing.id;
  ELSE
    INSERT INTO public.retrospectives (client_id, unit_id, period_kind, period_from, period_to,
      status, trigger, snapshot, highlights, generated_at)
    VALUES (_client_id, u, _kind, (p->>'from')::date, (p->>'to')::date,
      'gerada', _trigger, snap, hl, now())
    RETURNING id INTO rid;
  END IF;

  INSERT INTO public.retro_events (retrospective_id, kind, detail, actor)
  VALUES (rid, 'gerada', _trigger, auth.uid());
  RETURN jsonb_build_object('ok', true, 'id', rid);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.retro_generate(integer, text, date, date, text) FROM anon;

-- ================= DESTAQUES AUTOMÁTICOS =================
CREATE OR REPLACE FUNCTION public.retro_highlights(_snap jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE res jsonb := '[]'::jsonb; v numeric;
BEGIN
  v := COALESCE((_snap->'frequency'->>'total')::numeric, 0);
  IF v > 0 THEN res := res || jsonb_build_array(jsonb_build_object(
    'key', 'presencas', 'value', v, 'label', 'presenças no período')); END IF;

  v := COALESCE((_snap->'workouts'->>'total')::numeric, 0);
  IF v > 0 THEN res := res || jsonb_build_array(jsonb_build_object(
    'key', 'treinos', 'value', v, 'label', 'treinos concluídos')); END IF;

  v := COALESCE((_snap->'frequency'->>'best_week_streak')::numeric, 0);
  IF v >= 2 THEN res := res || jsonb_build_array(jsonb_build_object(
    'key', 'sequencia', 'value', v, 'label', 'semanas seguidas em atividade')); END IF;

  IF jsonb_array_length(COALESCE(_snap->'workouts'->'load_records', '[]'::jsonb)) > 0 THEN
    res := res || jsonb_build_array(jsonb_build_object(
      'key', 'carga',
      'value', (_snap->'workouts'->'load_records'->0->>'delta'),
      'label', 'kg de avanço em ' || (_snap->'workouts'->'load_records'->0->>'name')));
  END IF;

  IF (_snap->'ranking'->>'top_pct') IS NOT NULL THEN
    res := res || jsonb_build_array(jsonb_build_object(
      'key', 'ranking', 'value', (_snap->'ranking'->>'top_pct'),
      'label', '% mais ativos da sua unidade'));
  END IF;

  RETURN res;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.retro_highlights(jsonb) FROM anon;

-- ================= REVISÃO / APROVAÇÃO / ENVIO =================
CREATE OR REPLACE FUNCTION public.retro_review_save(_id uuid, _hidden text[] DEFAULT NULL,
  _order text[] DEFAULT NULL, _highlights jsonb DEFAULT NULL, _texts jsonb DEFAULT NULL,
  _team_message text DEFAULT NULL, _team_kind text DEFAULT NULL, _team_url text DEFAULT NULL,
  _next_cycle jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nm text;
BEGIN
  IF NOT public.can_module(auth.uid(), 'clientes', 'edit') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_permissao');
  END IF;
  SELECT name INTO nm FROM public.collaborators WHERE auth_user_id = auth.uid() LIMIT 1;
  UPDATE public.retrospectives SET
    hidden_cards = COALESCE(_hidden, hidden_cards),
    card_order = COALESCE(_order, card_order),
    highlights = COALESCE(_highlights, highlights),
    custom_texts = COALESCE(_texts, custom_texts),
    team_message = COALESCE(_team_message, team_message),
    team_message_kind = COALESCE(_team_kind, team_message_kind),
    team_message_url = COALESCE(_team_url, team_message_url),
    team_message_by = CASE WHEN _team_message IS NOT NULL THEN auth.uid() ELSE team_message_by END,
    team_message_name = CASE WHEN _team_message IS NOT NULL THEN nm ELSE team_message_name END,
    next_cycle = COALESCE(_next_cycle, next_cycle)
  WHERE id = _id;
  INSERT INTO public.retro_events (retrospective_id, kind, actor, actor_name) VALUES (_id, 'editada', auth.uid(), nm);
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.retro_review_save(uuid, text[], text[], jsonb, jsonb, text, text, text, jsonb) FROM anon;

CREATE OR REPLACE FUNCTION public.retro_approve(_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nm text;
BEGIN
  IF NOT public.can_module(auth.uid(), 'clientes', 'edit') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_permissao');
  END IF;
  SELECT name INTO nm FROM public.collaborators WHERE auth_user_id = auth.uid() LIMIT 1;
  UPDATE public.retrospectives SET status = 'revisada', reviewed_by = auth.uid(),
         reviewed_by_name = nm, reviewed_at = now()
   WHERE id = _id AND status IN ('aguardando', 'gerada', 'revisada');
  INSERT INTO public.retro_events (retrospective_id, kind, actor, actor_name) VALUES (_id, 'revisada', auth.uid(), nm);
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.retro_approve(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.retro_share_create(_id uuid, _days integer DEFAULT 30,
  _allow_photos boolean DEFAULT false, _allow_health boolean DEFAULT false, _social boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tok text; consent boolean;
BEGIN
  IF NOT public.can_module(auth.uid(), 'clientes', 'edit') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_permissao');
  END IF;
  SELECT COALESCE(rc.allow_photos, false) INTO consent
    FROM public.retrospectives r LEFT JOIN public.retro_consents rc ON rc.client_id = r.client_id
   WHERE r.id = _id;
  tok := encode(gen_random_bytes(18), 'hex');
  INSERT INTO public.retro_share_links (retrospective_id, token, expires_at, allow_photos, allow_health, social_mode)
  VALUES (_id, tok, CASE WHEN _days IS NULL THEN NULL ELSE now() + (_days || ' days')::interval END,
          _allow_photos AND COALESCE(consent, false), _allow_health, _social);
  INSERT INTO public.retro_events (retrospective_id, kind, actor) VALUES (_id, 'link_criado', auth.uid());
  RETURN jsonb_build_object('ok', true, 'token', tok);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.retro_share_create(uuid, integer, boolean, boolean, boolean) FROM anon;

CREATE OR REPLACE FUNCTION public.retro_share_revoke(_link_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_module(auth.uid(), 'clientes', 'edit') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_permissao');
  END IF;
  UPDATE public.retro_share_links SET revoked_at = now() WHERE id = _link_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.retro_share_revoke(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.retro_mark_sent(_id uuid, _channel text DEFAULT 'whatsapp')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nm text;
BEGIN
  IF NOT public.can_module(auth.uid(), 'clientes', 'edit') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_permissao');
  END IF;
  SELECT name INTO nm FROM public.collaborators WHERE auth_user_id = auth.uid() LIMIT 1;
  UPDATE public.retrospectives SET status = 'enviada', sent_at = now(), sent_channel = _channel
   WHERE id = _id AND status IN ('gerada', 'revisada', 'enviada');
  INSERT INTO public.retro_events (retrospective_id, kind, detail, actor, actor_name)
  VALUES (_id, 'enviada', _channel, auth.uid(), nm);
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.retro_mark_sent(uuid, text) FROM anon;

-- ================= VISUALIZAÇÃO PÚBLICA (TOKEN) =================
CREATE OR REPLACE FUNCTION public.retro_open(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record; r record; snap jsonb;
BEGIN
  SELECT * INTO l FROM public.retro_share_links WHERE token = _token;
  IF l.id IS NULL THEN RETURN jsonb_build_object('error', 'nao_encontrado'); END IF;
  IF l.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('error', 'revogado'); END IF;
  IF l.expires_at IS NOT NULL AND l.expires_at < now() THEN RETURN jsonb_build_object('error', 'expirado'); END IF;

  SELECT * INTO r FROM public.retrospectives WHERE id = l.retrospective_id;
  IF r.id IS NULL THEN RETURN jsonb_build_object('error', 'nao_encontrado'); END IF;

  snap := COALESCE(r.snapshot, '{}'::jsonb);
  IF NOT l.allow_health THEN snap := snap - 'health'; END IF;
  IF NOT l.allow_photos THEN snap := snap - 'photos'; END IF;
  IF l.social_mode THEN
    snap := jsonb_build_object(
      'client', jsonb_build_object('first_name', snap->'client'->>'first_name',
                                   'unit_name', snap->'client'->>'unit_name'),
      'period', snap->'period',
      'frequency', jsonb_build_object('total', snap->'frequency'->'total'),
      'workouts', jsonb_build_object('total', snap->'workouts'->'total'),
      'badges', snap->'badges',
      'ranking', jsonb_build_object('top_pct', snap->'ranking'->'top_pct'));
  END IF;

  UPDATE public.retro_share_links SET views = views + 1, last_viewed_at = now() WHERE id = l.id;
  UPDATE public.retrospectives SET views = views + 1,
    first_viewed_at = COALESCE(first_viewed_at, now()),
    status = CASE WHEN status = 'enviada' THEN 'visualizada' ELSE status END
   WHERE id = r.id;
  INSERT INTO public.retro_events (retrospective_id, kind) VALUES (r.id, 'visualizada');

  RETURN jsonb_build_object('id', r.id, 'status', r.status, 'snapshot', snap,
    'highlights', r.highlights, 'hidden_cards', r.hidden_cards, 'card_order', r.card_order,
    'custom_texts', r.custom_texts, 'team_message', r.team_message,
    'team_message_kind', r.team_message_kind, 'team_message_url', r.team_message_url,
    'team_message_name', r.team_message_name, 'next_cycle', r.next_cycle,
    'social', l.social_mode, 'token', _token,
    'contract_end', (SELECT contract_end FROM public.clients WHERE id = r.client_id),
    'plan', (SELECT plan FROM public.clients WHERE id = r.client_id));
END;
$$;

-- ================= AÇÃO DE RENOVAÇÃO =================
CREATE OR REPLACE FUNCTION public.retro_renew_intent(_token text, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record; r record; c record; rr uuid;
BEGIN
  SELECT * INTO l FROM public.retro_share_links WHERE token = _token AND revoked_at IS NULL;
  IF l.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'link'); END IF;
  SELECT * INTO r FROM public.retrospectives WHERE id = l.retrospective_id;
  SELECT * INTO c FROM public.clients WHERE id = r.client_id;

  INSERT INTO public.renewal_requests (client_id, unit_id, desired_plan, notes, status,
    current_plan, current_value, cycle_end, retro_link_id)
  VALUES (c.id, c.unit_id, c.plan, COALESCE(_note, 'Interesse vindo da Retrospectiva EVO'),
    'pendente', c.plan, c.plan_value, c.contract_end, l.id)
  RETURNING id INTO rr;

  UPDATE public.retrospectives SET status = 'renovacao_iniciada', renewal_request_id = rr,
    renewal_outcome = 'iniciada' WHERE id = r.id;
  INSERT INTO public.retro_events (retrospective_id, kind, detail) VALUES (r.id, 'renovacao_iniciada', _note);
  RETURN jsonb_build_object('ok', true, 'renewal_id', rr);
END;
$$;

-- ================= ALUNO (APP) =================
CREATE OR REPLACE FUNCTION public.retro_my()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid integer; r record;
BEGIN
  cid := public.current_client_id();
  IF cid IS NULL THEN RETURN jsonb_build_object('found', false); END IF;
  SELECT * INTO r FROM public.retrospectives
   WHERE client_id = cid AND status IN ('enviada', 'visualizada', 'renovacao_iniciada', 'renovado', 'nao_renovado')
   ORDER BY COALESCE(sent_at, created_at) DESC LIMIT 1;
  IF r.id IS NULL THEN RETURN jsonb_build_object('found', false); END IF;
  UPDATE public.retrospectives SET views = views + 1,
    first_viewed_at = COALESCE(first_viewed_at, now()),
    status = CASE WHEN status = 'enviada' THEN 'visualizada' ELSE status END
   WHERE id = r.id;
  RETURN jsonb_build_object('found', true, 'id', r.id, 'snapshot', r.snapshot,
    'highlights', r.highlights, 'hidden_cards', r.hidden_cards, 'card_order', r.card_order,
    'custom_texts', r.custom_texts, 'team_message', r.team_message,
    'team_message_kind', r.team_message_kind, 'team_message_url', r.team_message_url,
    'team_message_name', r.team_message_name, 'next_cycle', r.next_cycle,
    'plan', (SELECT plan FROM public.clients WHERE id = r.client_id),
    'contract_end', (SELECT contract_end FROM public.clients WHERE id = r.client_id));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.retro_my() FROM anon;

-- ================= PAINEL GERENCIAL =================
CREATE OR REPLACE FUNCTION public.retro_dashboard(_unit_id uuid DEFAULT NULL,
  _from date DEFAULT NULL, _to date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE f date := COALESCE(_from, CURRENT_DATE - 90); t date := COALESCE(_to, CURRENT_DATE); res jsonb;
BEGIN
  IF NOT public.can_module(auth.uid(), 'clientes', 'view') THEN
    RETURN jsonb_build_object('allowed', false);
  END IF;
  SELECT jsonb_build_object('allowed', true,
    'to_generate', (SELECT count(*) FROM public.clients c
                     WHERE c.status = 'ativo' AND c.contract_end IS NOT NULL
                       AND c.contract_end BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
                       AND (_unit_id IS NULL OR c.unit_id = _unit_id)
                       AND c.unit_id = ANY (public.allowed_unit_ids(auth.uid()))
                       AND NOT EXISTS (SELECT 1 FROM public.retrospectives r
                                        WHERE r.client_id = c.id AND r.created_at > CURRENT_DATE - 45)),
    'pending_review', count(*) FILTER (WHERE r.status = 'gerada'),
    'reviewed', count(*) FILTER (WHERE r.status = 'revisada'),
    'sent', count(*) FILTER (WHERE r.sent_at IS NOT NULL),
    'viewed', count(*) FILTER (WHERE r.first_viewed_at IS NOT NULL),
    'not_viewed', count(*) FILTER (WHERE r.sent_at IS NOT NULL AND r.first_viewed_at IS NULL),
    'renewal_started', count(*) FILTER (WHERE r.renewal_outcome IS NOT NULL),
    'renewed', count(*) FILTER (WHERE r.status = 'renovado'),
    'conversion_pct', CASE WHEN count(*) FILTER (WHERE r.sent_at IS NOT NULL) > 0
      THEN ROUND(count(*) FILTER (WHERE r.status = 'renovado') * 100.0
                 / count(*) FILTER (WHERE r.sent_at IS NOT NULL)) ELSE NULL END,
    'avg_hours_to_renew', (SELECT ROUND(AVG(EXTRACT(epoch FROM (e.created_at - r2.first_viewed_at)) / 3600.0))
        FROM public.retrospectives r2 JOIN public.retro_events e
          ON e.retrospective_id = r2.id AND e.kind = 'renovacao_iniciada'
       WHERE r2.first_viewed_at IS NOT NULL
         AND (_unit_id IS NULL OR r2.unit_id = _unit_id))
  ) INTO res
  FROM public.retrospectives r
  WHERE r.created_at::date BETWEEN f AND t
    AND (_unit_id IS NULL OR r.unit_id = _unit_id)
    AND (r.unit_id IS NULL OR r.unit_id = ANY (public.allowed_unit_ids(auth.uid())));
  RETURN res;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.retro_dashboard(uuid, date, date) FROM anon;

-- ================= GATILHO AUTOMÁTICO =================
CREATE OR REPLACE FUNCTION public.retro_auto_generate()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; n int := 0;
BEGIN
  FOR c IN
    SELECT id FROM public.clients
     WHERE status = 'ativo' AND contract_end IS NOT NULL
       AND (contract_end = CURRENT_DATE + 30 OR contract_end = CURRENT_DATE + 15)
  LOOP
    PERFORM public.retro_generate(c.id, 'contrato', NULL, NULL, 'automatico');
    n := n + 1;
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'generated', n);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.retro_auto_generate() FROM anon;
REVOKE EXECUTE ON FUNCTION public.retro_auto_generate() FROM authenticated;
