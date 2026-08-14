CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'trophy',
  category text NOT NULL DEFAULT 'treino',
  metric text NOT NULL,
  threshold integer NOT NULL DEFAULT 1,
  xp_bonus integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.achievements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "achievements_read_all" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "achievements_staff_manage" ON public.achievements FOR ALL TO authenticated
  USING (public.can_manage_training(auth.uid()))
  WITH CHECK (public.can_manage_training(auth.uid()));

CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON public.achievements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.client_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  achievement_code text NOT NULL REFERENCES public.achievements(code) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  seen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, achievement_code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_achievements TO authenticated;
GRANT ALL ON public.client_achievements TO service_role;
ALTER TABLE public.client_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_achievements_own_read" ON public.client_achievements FOR SELECT TO authenticated
  USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));
CREATE POLICY "client_achievements_own_update" ON public.client_achievements FOR UPDATE TO authenticated
  USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()))
  WITH CHECK (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));
CREATE POLICY "client_achievements_staff_manage" ON public.client_achievements FOR DELETE TO authenticated
  USING (public.can_manage_training(auth.uid()));

CREATE OR REPLACE FUNCTION public.gamification_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client integer := public.current_client_id();
  _xp integer := 0;
  _workouts integer := 0;
  _class_checkins integer := 0;
  _daily integer := 0;
  _posts integer := 0;
  _streak integer := 0;
  _cursor date;
  _level integer;
  _level_xp integer;
  _next_xp integer;
  _items jsonb;
BEGIN
  IF _client IS NULL THEN
    RETURN jsonb_build_object('client_id', null);
  END IF;

  SELECT COALESCE(SUM(total), 0)::int INTO _xp FROM public.student_xp(_client, NULL, NULL);

  SELECT COUNT(*)::int INTO _workouts FROM public.workout_logs
    WHERE client_id = _client AND status = 'completed';
  SELECT COUNT(*)::int INTO _class_checkins FROM public.class_bookings
    WHERE client_id = _client AND checked_in_at IS NOT NULL;
  SELECT COUNT(*)::int INTO _daily FROM public.daily_checkins WHERE client_id = _client;
  SELECT COUNT(*)::int INTO _posts FROM public.community_posts
    WHERE client_id = _client AND COALESCE(hidden, false) = false;

  _cursor := (public.br_now())::date;
  IF NOT EXISTS (SELECT 1 FROM public.workout_logs
                 WHERE client_id = _client AND status = 'completed' AND workout_date = _cursor) THEN
    _cursor := _cursor - 1;
  END IF;
  WHILE EXISTS (SELECT 1 FROM public.workout_logs
                WHERE client_id = _client AND status = 'completed' AND workout_date = _cursor) LOOP
    _streak := _streak + 1;
    _cursor := _cursor - 1;
  END LOOP;

  -- nível: cada nível exige 250 XP a mais que o anterior (250, 750, 1500, ...)
  _level := GREATEST(1, FLOOR((SQRT(1 + 8 * GREATEST(_xp, 0)::numeric / 250) - 1) / 2)::int + 1);
  _level_xp := (250 * (_level - 1) * _level / 2)::int;
  _next_xp := (250 * _level * (_level + 1) / 2)::int;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'category', (x->>'threshold')::int), '[]'::jsonb) INTO _items
  FROM (
    SELECT jsonb_build_object(
      'code', a.code, 'name', a.name, 'description', a.description,
      'icon', a.icon, 'category', a.category, 'metric', a.metric,
      'threshold', a.threshold, 'xp_bonus', a.xp_bonus,
      'progress', LEAST(
        CASE a.metric
          WHEN 'workouts' THEN _workouts
          WHEN 'streak' THEN _streak
          WHEN 'class_checkins' THEN _class_checkins
          WHEN 'daily_checkins' THEN _daily
          WHEN 'posts' THEN _posts
          WHEN 'xp' THEN _xp
          ELSE 0 END, a.threshold),
      'unlocked_at', ca.unlocked_at
    ) AS x
    FROM public.achievements a
    LEFT JOIN public.client_achievements ca
      ON ca.achievement_code = a.code AND ca.client_id = _client
    WHERE a.active
  ) s;

  RETURN jsonb_build_object(
    'client_id', _client,
    'xp', _xp,
    'level', _level,
    'level_start_xp', _level_xp,
    'level_end_xp', _next_xp,
    'workouts', _workouts,
    'class_checkins', _class_checkins,
    'daily_checkins', _daily,
    'posts', _posts,
    'streak', _streak,
    'achievements', _items
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_achievements()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client integer := public.current_client_id();
  _state jsonb;
  _new jsonb := '[]'::jsonb;
  _item jsonb;
BEGIN
  IF _client IS NULL THEN RETURN _new; END IF;
  _state := public.gamification_state();

  FOR _item IN SELECT * FROM jsonb_array_elements(_state->'achievements') LOOP
    IF (_item->>'unlocked_at') IS NULL
       AND (_item->>'progress')::int >= (_item->>'threshold')::int THEN
      INSERT INTO public.client_achievements (client_id, achievement_code)
      VALUES (_client, _item->>'code')
      ON CONFLICT (client_id, achievement_code) DO NOTHING;
      _new := _new || jsonb_build_array(_item);
    END IF;
  END LOOP;

  RETURN _new;
END;
$$;

INSERT INTO public.achievements (code, name, description, icon, category, metric, threshold, xp_bonus, sort_order) VALUES
  ('first_workout', 'Primeiro treino', 'Concluiu seu primeiro treino no app', 'zap', 'treino', 'workouts', 1, 20, 1),
  ('workouts_10', '10 treinos', 'Concluiu 10 treinos', 'dumbbell', 'treino', 'workouts', 10, 50, 2),
  ('workouts_50', '50 treinos', 'Concluiu 50 treinos', 'dumbbell', 'treino', 'workouts', 50, 150, 3),
  ('workouts_100', '100 treinos', 'Concluiu 100 treinos', 'crown', 'treino', 'workouts', 100, 300, 4),
  ('streak_3', 'Sequência de 3 dias', '3 dias seguidos treinando', 'flame', 'consistencia', 'streak', 3, 30, 1),
  ('streak_7', 'Sequência de 7 dias', '7 dias seguidos treinando', 'flame', 'consistencia', 'streak', 7, 80, 2),
  ('streak_30', 'Sequência de 30 dias', '30 dias seguidos treinando', 'flame', 'consistencia', 'streak', 30, 400, 3),
  ('daily_10', '10 check-ins diários', 'Respondeu o check-in diário 10 vezes', 'heart-pulse', 'bem-estar', 'daily_checkins', 10, 40, 1),
  ('daily_50', '50 check-ins diários', 'Respondeu o check-in diário 50 vezes', 'heart-pulse', 'bem-estar', 'daily_checkins', 50, 150, 2),
  ('class_10', '10 aulas presenciais', 'Fez check-in em 10 aulas', 'calendar-check', 'presenca', 'class_checkins', 10, 60, 1),
  ('class_50', '50 aulas presenciais', 'Fez check-in em 50 aulas', 'calendar-check', 'presenca', 'class_checkins', 50, 200, 2),
  ('post_1', 'Primeiro post', 'Publicou na comunidade', 'message-circle', 'comunidade', 'posts', 1, 20, 1),
  ('post_10', '10 posts', 'Publicou 10 vezes na comunidade', 'message-circle', 'comunidade', 'posts', 10, 80, 2),
  ('xp_500', '500 XP', 'Acumulou 500 XP', 'star', 'xp', 'xp', 500, 0, 1),
  ('xp_2000', '2.000 XP', 'Acumulou 2.000 XP', 'star', 'xp', 'xp', 2000, 0, 2),
  ('xp_5000', '5.000 XP', 'Acumulou 5.000 XP', 'star', 'xp', 'xp', 5000, 0, 3);