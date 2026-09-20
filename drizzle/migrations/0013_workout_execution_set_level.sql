ALTER TABLE public.workout_log_sets
  ADD COLUMN IF NOT EXISTS set_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rest_seconds integer,
  ADD COLUMN IF NOT EXISTS side_mode text;

ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS paused_ms integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_seconds integer;

CREATE INDEX IF NOT EXISTS workout_log_sets_lookup_idx
  ON public.workout_log_sets (workout_log_id, session_exercise_id, order_index, set_index);