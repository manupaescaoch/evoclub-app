CREATE TABLE public.workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  training_plan_id uuid REFERENCES public.training_plans(id) ON DELETE SET NULL,
  training_session_id uuid REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  session_name text,
  workout_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress',
  student_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_logs TO authenticated;
GRANT ALL ON public.workout_logs TO service_role;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own workout logs"
ON public.workout_logs FOR ALL TO authenticated
USING (client_id = public.current_client_id())
WITH CHECK (client_id = public.current_client_id());

CREATE POLICY "Staff read all workout logs"
ON public.workout_logs FOR SELECT TO authenticated
USING (public.can_manage_training(auth.uid()));

CREATE POLICY "Staff manage all workout logs"
ON public.workout_logs FOR ALL TO authenticated
USING (public.can_manage_training(auth.uid()))
WITH CHECK (public.can_manage_training(auth.uid()));

CREATE TRIGGER trg_workout_logs_updated BEFORE UPDATE ON public.workout_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_workout_logs_client_date ON public.workout_logs (client_id, workout_date DESC);

CREATE TABLE public.workout_log_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id uuid NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  session_exercise_id uuid REFERENCES public.training_session_exercises(id) ON DELETE SET NULL,
  prescribed_set_id uuid REFERENCES public.training_exercise_sets(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  set_type text,
  prescribed_sets integer,
  prescribed_reps text,
  prescribed_load text,
  performed_sets integer,
  performed_reps text,
  performed_load text,
  completed boolean NOT NULL DEFAULT false,
  exercise_order integer NOT NULL DEFAULT 0,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_log_sets TO authenticated;
GRANT ALL ON public.workout_log_sets TO service_role;
ALTER TABLE public.workout_log_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own log sets"
ON public.workout_log_sets FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.workout_logs l WHERE l.id = workout_log_id AND l.client_id = public.current_client_id()))
WITH CHECK (EXISTS (SELECT 1 FROM public.workout_logs l WHERE l.id = workout_log_id AND l.client_id = public.current_client_id()));

CREATE POLICY "Staff manage all log sets"
ON public.workout_log_sets FOR ALL TO authenticated
USING (public.can_manage_training(auth.uid()))
WITH CHECK (public.can_manage_training(auth.uid()));

CREATE TRIGGER trg_workout_log_sets_updated BEFORE UPDATE ON public.workout_log_sets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_workout_log_sets_log ON public.workout_log_sets (workout_log_id, exercise_order, order_index);