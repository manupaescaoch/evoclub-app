ALTER TABLE public.training_exercise_sets
  ADD COLUMN IF NOT EXISTS distance_km numeric,
  ADD COLUMN IF NOT EXISTS pace text;