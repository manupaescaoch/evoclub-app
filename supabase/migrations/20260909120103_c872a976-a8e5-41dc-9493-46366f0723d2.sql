
CREATE OR REPLACE FUNCTION public.retro_compute(_client_id integer, _from date, _to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cli record;
  tz text := 'America/Recife';
  goal int;
  weeks_span numeric;
  planned numeric;
  total_presence int;
  pres jsonb;
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

  SELECT COALESCE(jsonb_agg(jsonb_build_object('d', d, 'h', h) ORDER BY d), '[]'::jsonb)
    INTO pres
    FROM (
      SELECT d, MIN(h) AS h FROM (
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
      ) s GROUP BY d
    ) g;

  total_presence := jsonb_array_length(pres);

  WITH p AS (SELECT * FROM jsonb_to_recordset(pres) AS x(d date, h int)),
  w AS (SELECT DISTINCT (date_trunc('week', d))::date AS wk FROM p),
  g AS (SELECT wk, (wk - ((row_number() OVER (ORDER BY wk)) * 7)::int) AS grp FROM w)
  SELECT COALESCE(MAX(cnt), 0) INTO best_streak FROM (SELECT count(*) cnt FROM g GROUP BY grp) x;

  WITH p AS (SELECT * FROM jsonb_to_recordset(pres) AS x(d date, h int)),
  ordered AS (SELECT d, lag(d) OVER (ORDER BY d) prev FROM p)
  SELECT count(*) INTO comebacks FROM ordered WHERE prev IS NOT NULL AND (d - prev) >= 21;

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

  WITH p AS (SELECT * FROM jsonb_to_recordset(pres) AS x(d date, h int))
  SELECT jsonb_build_object(
    'total', total_presence,
    'planned', planned,
    'pct', CASE WHEN planned > 0 THEN ROUND(total_presence * 100.0 / planned) ELSE NULL END,
    'per_week', ROUND(total_presence / weeks_span, 1),
    'per_month', ROUND(total_presence / GREATEST(weeks_span / 4.345, 1), 1),
    'active_weeks', (SELECT count(DISTINCT date_trunc('week', d)) FROM p),
    'best_week_streak', best_streak,
    'comebacks', comebacks,
    'by_month', COALESCE((SELECT jsonb_agg(x ORDER BY x->>'month') FROM (
        SELECT jsonb_build_object('month', to_char(date_trunc('month', d), 'YYYY-MM'), 'total', count(*)) x
          FROM p GROUP BY date_trunc('month', d)) m), '[]'::jsonb),
    'by_dow', COALESCE((SELECT jsonb_agg(x ORDER BY (x->>'dow')::int) FROM (
        SELECT jsonb_build_object('dow', EXTRACT(dow FROM d)::int, 'total', count(*)) x
          FROM p GROUP BY EXTRACT(dow FROM d)) m), '[]'::jsonb),
    'best_month', (SELECT to_char(date_trunc('month', d), 'YYYY-MM') FROM p
                    GROUP BY date_trunc('month', d) ORDER BY count(*) DESC, date_trunc('month', d) LIMIT 1),
    'best_month_total', (SELECT count(*) FROM p GROUP BY date_trunc('month', d) ORDER BY count(*) DESC LIMIT 1),
    'best_week', (SELECT to_char(date_trunc('week', d), 'YYYY-MM-DD') FROM p
                   GROUP BY date_trunc('week', d) ORDER BY count(*) DESC LIMIT 1),
    'fav_dow', (SELECT EXTRACT(dow FROM d)::int FROM p GROUP BY EXTRACT(dow FROM d) ORDER BY count(*) DESC LIMIT 1),
    'fav_hour', (SELECT h FROM p WHERE h IS NOT NULL GROUP BY h ORDER BY count(*) DESC LIMIT 1),
    'months_goal_hit', (SELECT count(*) FROM (
        SELECT date_trunc('month', d) m, count(*) t FROM p GROUP BY 1) z WHERE z.t >= goal * 4)
  ) INTO j;

  months_hit := COALESCE((j->>'months_goal_hit')::int, 0);
  out := out || jsonb_build_object('frequency', j);

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
                   MAX(k.kg) AS best_kg,
                   (array_agg(k.kg ORDER BY wl7.workout_date))[1] AS first_kg
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
              SELECT jsonb_build_object('key', m1.measure_key,
                                        'first', m1.value, 'last', m2.value,
                                        'delta', ROUND(m2.value - m1.value, 1)) x
                FROM public.assessment_measures m1
                JOIN public.assessment_measures m2
                  ON m2.assessment_id = last_a.id AND m2.measure_key = m1.measure_key
               WHERE m1.assessment_id = first_a.id AND m1.value IS NOT NULL AND m2.value IS NOT NULL) t), '[]'::jsonb));
  END IF;
  out := out || jsonb_build_object('assessments', j);

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

  out := out || jsonb_build_object('photos', jsonb_build_object(
    'total', (SELECT count(*) FROM public.evolution_photos ep WHERE ep.client_id = _client_id
               AND ep.taken_at::date BETWEEN _from AND _to),
    'items', COALESCE((SELECT jsonb_agg(x ORDER BY x->>'taken_at') FROM (
        SELECT jsonb_build_object('pose', ep.pose, 'path', ep.storage_path, 'taken_at', ep.taken_at) x
          FROM public.evolution_photos ep WHERE ep.client_id = _client_id
           AND ep.taken_at::date BETWEEN _from AND _to) t), '[]'::jsonb),
    'consent', COALESCE((SELECT rc.allow_photos FROM public.retro_consents rc WHERE rc.client_id = _client_id), false)));

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

  out := out || jsonb_build_object('achievements', COALESCE((SELECT jsonb_agg(x ORDER BY x->>'unlocked_at') FROM (
      SELECT jsonb_build_object('code', ca.achievement_code, 'name', a.name,
                                'description', a.description, 'icon', a.icon,
                                'unlocked_at', ca.unlocked_at) x
        FROM public.client_achievements ca
        LEFT JOIN public.achievements a ON a.code = ca.achievement_code
       WHERE ca.client_id = _client_id AND ca.unlocked_at::date BETWEEN _from AND _to) t), '[]'::jsonb));

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

  metrics := jsonb_build_object(
    'workouts', COALESCE((out->'workouts'->>'total')::numeric, 0),
    'months_goal_hit', months_hit,
    'months_as_student', COALESCE((out->'client'->>'months_as_student')::numeric, 0),
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
