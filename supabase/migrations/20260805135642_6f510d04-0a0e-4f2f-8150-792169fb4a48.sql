-- 1. Colunas de vínculo e onboarding
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- 2. Client do usuário logado
CREATE OR REPLACE FUNCTION public.current_client_id()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.clients WHERE auth_user_id = auth.uid() LIMIT 1
$$;

-- 3. Vínculo por e-mail no cadastro
CREATE OR REPLACE FUNCTION public.link_client_by_email(_email text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cid integer;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_session');
  END IF;

  SELECT id INTO _cid FROM public.clients WHERE auth_user_id = _uid LIMIT 1;
  IF _cid IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'client_id', _cid);
  END IF;

  SELECT id INTO _cid
  FROM public.clients
  WHERE lower(email) = lower(trim(_email))
    AND auth_user_id IS NULL
  ORDER BY created_at NULLS LAST
  LIMIT 1;

  IF _cid IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.clients WHERE lower(email) = lower(trim(_email))) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'already_linked');
    END IF;
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  UPDATE public.clients SET auth_user_id = _uid WHERE id = _cid;
  RETURN jsonb_build_object('ok', true, 'client_id', _cid);
END;
$$;

REVOKE ALL ON FUNCTION public.link_client_by_email(text) FROM public;
GRANT EXECUTE ON FUNCTION public.link_client_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_client_id() TO authenticated;

-- 4. clients: aluno vê só a própria linha; equipe mantém acesso total
DROP POLICY IF EXISTS "Authenticated users can manage clients" ON public.clients;

CREATE POLICY "Staff manage clients" ON public.clients
  FOR ALL TO authenticated
  USING (public.can_manage_training(auth.uid()))
  WITH CHECK (public.can_manage_training(auth.uid()));

CREATE POLICY "Student reads own client row" ON public.clients
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Student updates own client row" ON public.clients
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- 5. daily_checkins: só o próprio aluno
DROP POLICY IF EXISTS "Public can insert daily checkins" ON public.daily_checkins;
DROP POLICY IF EXISTS "Public can update daily checkins" ON public.daily_checkins;
DROP POLICY IF EXISTS "Public can view daily checkins" ON public.daily_checkins;

CREATE POLICY "Student manages own checkins" ON public.daily_checkins
  FOR ALL TO authenticated
  USING (client_id = public.current_client_id())
  WITH CHECK (client_id = public.current_client_id());

CREATE POLICY "Staff read checkins" ON public.daily_checkins
  FOR SELECT TO authenticated
  USING (public.can_manage_training(auth.uid()));

CREATE POLICY "Staff write checkins" ON public.daily_checkins
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_training(auth.uid()));

CREATE POLICY "Staff update checkins" ON public.daily_checkins
  FOR UPDATE TO authenticated
  USING (public.can_manage_training(auth.uid()))
  WITH CHECK (public.can_manage_training(auth.uid()));

REVOKE ALL ON public.daily_checkins FROM anon;

-- 6. class_bookings: só as próprias reservas
DROP POLICY IF EXISTS "Public can insert class bookings" ON public.class_bookings;
DROP POLICY IF EXISTS "Public can view class bookings" ON public.class_bookings;

CREATE POLICY "Student manages own bookings" ON public.class_bookings
  FOR ALL TO authenticated
  USING (client_id = public.current_client_id())
  WITH CHECK (client_id = public.current_client_id());

REVOKE ALL ON public.class_bookings FROM anon;

-- lotação da grade sem expor dados de outros alunos
CREATE OR REPLACE FUNCTION public.class_booking_counts(_day integer)
RETURNS TABLE(class_id uuid, total bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.class_id, count(*)::bigint
  FROM public.class_bookings b
  JOIN public.classes c ON c.id = b.class_id
  WHERE c.day_of_week = _day
  GROUP BY b.class_id
$$;

GRANT EXECUTE ON FUNCTION public.class_booking_counts(integer) TO authenticated;

-- 7. classes: leitura apenas autenticada
DROP POLICY IF EXISTS "Public can view classes" ON public.classes;
CREATE POLICY "Authenticated can view classes" ON public.classes
  FOR SELECT TO authenticated USING (true);
REVOKE ALL ON public.classes FROM anon;

-- 8. Treinos: aluno lê apenas o próprio plano
DROP POLICY IF EXISTS "Auth read plans" ON public.training_plans;
CREATE POLICY "Read own or staff plans" ON public.training_plans
  FOR SELECT TO authenticated
  USING (student_id = public.current_client_id() OR public.can_manage_training(auth.uid()));

DROP POLICY IF EXISTS "Auth read weeks" ON public.training_weeks;
CREATE POLICY "Read own or staff weeks" ON public.training_weeks
  FOR SELECT TO authenticated
  USING (
    public.can_manage_training(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.training_plans p
      WHERE p.id = training_weeks.training_plan_id
        AND p.student_id = public.current_client_id()
    )
  );

DROP POLICY IF EXISTS "Auth read sessions" ON public.training_sessions;
CREATE POLICY "Read own or staff sessions" ON public.training_sessions
  FOR SELECT TO authenticated
  USING (
    public.can_manage_training(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.training_weeks w
      JOIN public.training_plans p ON p.id = w.training_plan_id
      WHERE w.id = training_sessions.training_week_id
        AND p.student_id = public.current_client_id()
    )
  );

DROP POLICY IF EXISTS "Auth read session exercises" ON public.training_session_exercises;
CREATE POLICY "Read own or staff session exercises" ON public.training_session_exercises
  FOR SELECT TO authenticated
  USING (
    public.can_manage_training(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.training_sessions s
      JOIN public.training_weeks w ON w.id = s.training_week_id
      JOIN public.training_plans p ON p.id = w.training_plan_id
      WHERE s.id = training_session_exercises.training_session_id
        AND p.student_id = public.current_client_id()
    )
  );

DROP POLICY IF EXISTS "Auth read sets" ON public.training_exercise_sets;
CREATE POLICY "Read own or staff sets" ON public.training_exercise_sets
  FOR SELECT TO authenticated
  USING (
    public.can_manage_training(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.training_session_exercises se
      JOIN public.training_sessions s ON s.id = se.training_session_id
      JOIN public.training_weeks w ON w.id = s.training_week_id
      JOIN public.training_plans p ON p.id = w.training_plan_id
      WHERE se.id = training_exercise_sets.session_exercise_id
        AND p.student_id = public.current_client_id()
    )
  );