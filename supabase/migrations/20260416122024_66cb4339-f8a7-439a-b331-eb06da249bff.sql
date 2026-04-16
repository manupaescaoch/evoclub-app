
-- Exercise Library
CREATE TABLE public.exercise_library (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  muscle_group text,
  secondary_muscle text,
  equipment text,
  video_url text,
  is_global boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage exercise_library" ON public.exercise_library FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Training Methods
CREATE TABLE public.training_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  is_global boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.training_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage training_methods" ON public.training_methods FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Workout Templates
CREATE TABLE public.workout_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage workout_templates" ON public.workout_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Template Sessions
CREATE TABLE public.template_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  name text,
  day_label text,
  duration_min integer,
  notes text,
  sort_order integer DEFAULT 0
);
ALTER TABLE public.template_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage template_sessions" ON public.template_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Template Exercises
CREATE TABLE public.template_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_session_id uuid NOT NULL REFERENCES public.template_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  sets integer DEFAULT 3,
  reps text DEFAULT '12',
  load text,
  rest_seconds integer DEFAULT 60,
  notes text,
  sort_order integer DEFAULT 0
);
ALTER TABLE public.template_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage template_exercises" ON public.template_exercises FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed training methods
INSERT INTO public.training_methods (name, description, is_global) VALUES
  ('DROP-SET', 'Reduzir a carga progressivamente sem descanso entre as reduções.', true),
  ('BI-SET', 'Dois exercícios consecutivos para o mesmo grupo muscular sem descanso.', true),
  ('SUPER-SET', 'Dois exercícios consecutivos para grupos musculares antagonistas sem descanso.', true),
  ('REST-PAUSE', 'Realizar série até a falha, descansar 10-15s e continuar até nova falha.', true),
  ('CLUSTER SET', 'Dividir uma série em mini-séries com pausas curtas (10-30s) entre elas.', true),
  ('BACK OFF SET', 'Após a série pesada principal, reduzir a carga em 10-20% e fazer mais repetições.', true),
  ('100/10', 'Completar 100 repetições totais com descansos de 10 segundos entre as mini-séries.', true),
  ('BÚLGARO + PARCIAIS', 'Realizar repetições completas seguidas de parciais no final da série.', true),
  ('PIRAMIDAL', 'Aumentar ou diminuir a carga progressivamente a cada série.', true),
  ('FST-7', 'Sete séries de 8-12 reps com 30s de descanso no último exercício do grupo.', true),
  ('GVT (10x10)', 'German Volume Training: 10 séries de 10 repetições com 60s de descanso.', true),
  ('ISOMETRIA', 'Manter a contração muscular em posição estática por tempo determinado.', true);
