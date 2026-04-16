
-- Workouts (training plans)
CREATE TABLE public.workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Treino',
  description TEXT,
  week INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  starts_at DATE,
  expires_at DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage workouts" ON public.workouts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Workout exercises
CREATE TABLE public.workout_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sets INTEGER DEFAULT 3,
  reps TEXT DEFAULT '12',
  rest_seconds INTEGER DEFAULT 60,
  day_label TEXT DEFAULT 'Treino A',
  sort_order INTEGER DEFAULT 0,
  notes TEXT
);

ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage workout_exercises" ON public.workout_exercises FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anamnesis
CREATE TABLE public.anamnesis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  type TEXT DEFAULT 'general',
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.anamnesis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage anamnesis" ON public.anamnesis FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Check-ins
CREATE TABLE public.check_ins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage check_ins" ON public.check_ins FOR ALL TO authenticated USING (true) WITH CHECK (true);
