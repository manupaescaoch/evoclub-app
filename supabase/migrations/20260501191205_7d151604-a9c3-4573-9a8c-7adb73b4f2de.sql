-- ========== ROLES ==========
CREATE TYPE public.app_role AS ENUM ('admin', 'coach', 'coordinator', 'student', 'viewer');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_training(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','coach','coordinator')
  )
$$;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ========== TRAINING PLANS ==========
CREATE TABLE public.training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id INTEGER NOT NULL,
  coach_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  goal TEXT,
  level TEXT,
  frequency TEXT,
  organization_type TEXT NOT NULL DEFAULT 'weekday',
  status TEXT NOT NULL DEFAULT 'draft',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.training_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_plan_id UUID NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_week_id UUID NOT NULL REFERENCES public.training_weeks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  day_of_week TEXT,
  session_number INTEGER,
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.training_session_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercise_library(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.training_exercise_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_exercise_id UUID NOT NULL REFERENCES public.training_session_exercises(id) ON DELETE CASCADE,
  set_type TEXT NOT NULL DEFAULT 'reps_load',
  sets INTEGER NOT NULL DEFAULT 1,
  reps TEXT,
  load TEXT,
  rest_seconds INTEGER,
  time_seconds INTEGER,
  incline TEXT,
  cadence TEXT,
  method_id UUID REFERENCES public.training_methods(id) ON DELETE SET NULL,
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_exercise_sets ENABLE ROW LEVEL SECURITY;

-- READ for any authenticated; WRITE for managers only
CREATE POLICY "Auth read plans" ON public.training_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers write plans" ON public.training_plans FOR ALL TO authenticated
  USING (public.can_manage_training(auth.uid()))
  WITH CHECK (public.can_manage_training(auth.uid()));

CREATE POLICY "Auth read weeks" ON public.training_weeks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers write weeks" ON public.training_weeks FOR ALL TO authenticated
  USING (public.can_manage_training(auth.uid()))
  WITH CHECK (public.can_manage_training(auth.uid()));

CREATE POLICY "Auth read sessions" ON public.training_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers write sessions" ON public.training_sessions FOR ALL TO authenticated
  USING (public.can_manage_training(auth.uid()))
  WITH CHECK (public.can_manage_training(auth.uid()));

CREATE POLICY "Auth read session_ex" ON public.training_session_exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers write session_ex" ON public.training_session_exercises FOR ALL TO authenticated
  USING (public.can_manage_training(auth.uid()))
  WITH CHECK (public.can_manage_training(auth.uid()));

CREATE POLICY "Auth read sets" ON public.training_exercise_sets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers write sets" ON public.training_exercise_sets FOR ALL TO authenticated
  USING (public.can_manage_training(auth.uid()))
  WITH CHECK (public.can_manage_training(auth.uid()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_training_plans_updated
  BEFORE UPDATE ON public.training_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Single active plan per student
CREATE OR REPLACE FUNCTION public.ensure_single_active_plan()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_active THEN
    UPDATE public.training_plans
       SET is_active = false, status = 'archived'
     WHERE student_id = NEW.student_id
       AND id <> NEW.id
       AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_active_plan
  BEFORE INSERT OR UPDATE ON public.training_plans
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_active_plan();

CREATE INDEX idx_training_plans_student ON public.training_plans(student_id);
CREATE INDEX idx_training_weeks_plan ON public.training_weeks(training_plan_id);
CREATE INDEX idx_training_sessions_week ON public.training_sessions(training_week_id);
CREATE INDEX idx_training_session_ex_session ON public.training_session_exercises(training_session_id);
CREATE INDEX idx_training_sets_session_ex ON public.training_exercise_sets(session_exercise_id);