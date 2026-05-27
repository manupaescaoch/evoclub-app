CREATE TABLE IF NOT EXISTS public.training_set_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  set_type text NOT NULL DEFAULT 'reps_load',
  sets jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_set_presets TO authenticated;
GRANT ALL ON public.training_set_presets TO service_role;

ALTER TABLE public.training_set_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read presets" ON public.training_set_presets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write presets" ON public.training_set_presets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_training_set_presets_updated_at
  BEFORE UPDATE ON public.training_set_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();