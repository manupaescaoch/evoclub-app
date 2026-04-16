
-- Create workout_sessions table
CREATE TABLE public.workout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Treino A',
  day_label TEXT,
  duration_min INTEGER,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage workout_sessions"
ON public.workout_sessions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Add session_id and load columns to workout_exercises
ALTER TABLE public.workout_exercises 
  ADD COLUMN session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  ADD COLUMN load TEXT;
