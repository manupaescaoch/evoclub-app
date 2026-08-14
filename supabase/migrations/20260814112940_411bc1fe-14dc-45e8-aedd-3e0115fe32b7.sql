
ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS rpe smallint,
  ADD COLUMN IF NOT EXISTS followup_stars smallint,
  ADD COLUMN IF NOT EXISTS followup_note text,
  ADD COLUMN IF NOT EXISTS pain boolean,
  ADD COLUMN IF NOT EXISTS pain_note text;

ALTER TABLE public.workout_log_sets
  ADD COLUMN IF NOT EXISTS performed_time_seconds integer,
  ADD COLUMN IF NOT EXISTS performed_distance_km numeric,
  ADD COLUMN IF NOT EXISTS performed_speed numeric,
  ADD COLUMN IF NOT EXISTS performed_incline text,
  ADD COLUMN IF NOT EXISTS performed_calories integer;

ALTER TABLE public.exercise_library
  ADD COLUMN IF NOT EXISTS secondary_muscle_2 text;

ALTER TABLE public.training_methods
  ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE TABLE IF NOT EXISTS public.pain_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  workout_log_id uuid REFERENCES public.workout_logs(id) ON DELETE SET NULL,
  note text,
  status text NOT NULL DEFAULT 'novo',
  handled_by uuid,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.pain_reports TO authenticated;
GRANT ALL ON public.pain_reports TO service_role;

ALTER TABLE public.pain_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pain own read" ON public.pain_reports FOR SELECT TO authenticated
  USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));
CREATE POLICY "pain own insert" ON public.pain_reports FOR INSERT TO authenticated
  WITH CHECK (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));
CREATE POLICY "pain staff update" ON public.pain_reports FOR UPDATE TO authenticated
  USING (public.can_manage_training(auth.uid()))
  WITH CHECK (public.can_manage_training(auth.uid()));

CREATE TRIGGER trg_pain_reports_updated BEFORE UPDATE ON public.pain_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
