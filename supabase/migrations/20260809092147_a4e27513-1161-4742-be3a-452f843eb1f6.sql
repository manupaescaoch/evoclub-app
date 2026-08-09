-- PESO
CREATE TABLE public.health_weights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  value numeric NOT NULL,
  measured_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual',
  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.health_weights TO authenticated;
GRANT ALL ON public.health_weights TO service_role;
ALTER TABLE public.health_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weights select" ON public.health_weights FOR SELECT TO authenticated
  USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));
CREATE POLICY "weights insert" ON public.health_weights FOR INSERT TO authenticated
  WITH CHECK (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));
CREATE POLICY "weights update" ON public.health_weights FOR UPDATE TO authenticated
  USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()))
  WITH CHECK (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));
CREATE TRIGGER trg_health_weights_updated BEFORE UPDATE ON public.health_weights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.health_weight_edits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  weight_id uuid NOT NULL REFERENCES public.health_weights(id) ON DELETE CASCADE,
  client_id integer NOT NULL,
  old_value numeric,
  new_value numeric,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.health_weight_edits TO authenticated;
GRANT ALL ON public.health_weight_edits TO service_role;
ALTER TABLE public.health_weight_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weight edits select" ON public.health_weight_edits FOR SELECT TO authenticated
  USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_weight_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.value IS DISTINCT FROM OLD.value THEN
    INSERT INTO public.health_weight_edits (weight_id, client_id, old_value, new_value, changed_by)
    VALUES (NEW.id, NEW.client_id, OLD.value, NEW.value, auth.uid());
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_log_weight_edit AFTER UPDATE ON public.health_weights
  FOR EACH ROW EXECUTE FUNCTION public.log_weight_edit();

-- META DE PESO
CREATE TABLE public.weight_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  target numeric NOT NULL,
  start_value numeric,
  active boolean NOT NULL DEFAULT true,
  achieved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.weight_goals TO authenticated;
GRANT ALL ON public.weight_goals TO service_role;
ALTER TABLE public.weight_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals select" ON public.weight_goals FOR SELECT TO authenticated
  USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));
CREATE POLICY "goals insert" ON public.weight_goals FOR INSERT TO authenticated
  WITH CHECK (client_id = public.current_client_id());
CREATE POLICY "goals update" ON public.weight_goals FOR UPDATE TO authenticated
  USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()))
  WITH CHECK (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));

-- PRESSÃO ARTERIAL
CREATE TABLE public.health_blood_pressure (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  systolic integer NOT NULL,
  diastolic integer NOT NULL,
  measured_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual',
  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.health_blood_pressure TO authenticated;
GRANT ALL ON public.health_blood_pressure TO service_role;
ALTER TABLE public.health_blood_pressure ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bp select" ON public.health_blood_pressure FOR SELECT TO authenticated
  USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));
CREATE POLICY "bp insert" ON public.health_blood_pressure FOR INSERT TO authenticated
  WITH CHECK (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));
CREATE POLICY "bp update" ON public.health_blood_pressure FOR UPDATE TO authenticated
  USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()))
  WITH CHECK (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));
CREATE TRIGGER trg_bp_updated BEFORE UPDATE ON public.health_blood_pressure
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- OUTROS INDICADORES
CREATE TABLE public.health_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  metric text NOT NULL,
  value numeric NOT NULL,
  measured_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_health_metrics_client ON public.health_metrics (client_id, metric, measured_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.health_metrics TO authenticated;
GRANT ALL ON public.health_metrics TO service_role;
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics select" ON public.health_metrics FOR SELECT TO authenticated
  USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));
CREATE POLICY "metrics insert" ON public.health_metrics FOR INSERT TO authenticated
  WITH CHECK (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));
CREATE POLICY "metrics update" ON public.health_metrics FOR UPDATE TO authenticated
  USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()))
  WITH CHECK (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));

-- AVALIAÇÕES FÍSICAS
CREATE TABLE public.physical_assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  scheduled_at timestamptz,
  performed_at timestamptz,
  professional_name text,
  status text NOT NULL DEFAULT 'agendada',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.physical_assessments TO authenticated;
GRANT ALL ON public.physical_assessments TO service_role;
ALTER TABLE public.physical_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessments select" ON public.physical_assessments FOR SELECT TO authenticated
  USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));
CREATE POLICY "assessments insert" ON public.physical_assessments FOR INSERT TO authenticated
  WITH CHECK (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));
CREATE POLICY "assessments update" ON public.physical_assessments FOR UPDATE TO authenticated
  USING (public.can_manage_training(auth.uid()) OR client_id = public.current_client_id())
  WITH CHECK (public.can_manage_training(auth.uid()) OR client_id = public.current_client_id());
CREATE TRIGGER trg_assessments_updated BEFORE UPDATE ON public.physical_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.assessment_measures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id uuid NOT NULL REFERENCES public.physical_assessments(id) ON DELETE CASCADE,
  measure_key text NOT NULL,
  value numeric,
  UNIQUE (assessment_id, measure_key)
);
GRANT SELECT, INSERT, UPDATE ON public.assessment_measures TO authenticated;
GRANT ALL ON public.assessment_measures TO service_role;
ALTER TABLE public.assessment_measures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "measures select" ON public.assessment_measures FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.physical_assessments a WHERE a.id = assessment_id
    AND (a.client_id = public.current_client_id() OR public.can_manage_training(auth.uid()))));
CREATE POLICY "measures write" ON public.assessment_measures FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_training(auth.uid()));
CREATE POLICY "measures update" ON public.assessment_measures FOR UPDATE TO authenticated
  USING (public.can_manage_training(auth.uid())) WITH CHECK (public.can_manage_training(auth.uid()));

CREATE TABLE public.assessment_bioimpedance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id uuid NOT NULL REFERENCES public.physical_assessments(id) ON DELETE CASCADE UNIQUE,
  weight numeric,
  body_fat_pct numeric,
  fat_mass numeric,
  muscle_mass numeric,
  lean_mass numeric,
  body_water numeric,
  visceral_fat numeric,
  basal_metabolism numeric,
  bmi numeric,
  origin text NOT NULL DEFAULT 'MANUAL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.assessment_bioimpedance TO authenticated;
GRANT ALL ON public.assessment_bioimpedance TO service_role;
ALTER TABLE public.assessment_bioimpedance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bio select" ON public.assessment_bioimpedance FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.physical_assessments a WHERE a.id = assessment_id
    AND (a.client_id = public.current_client_id() OR public.can_manage_training(auth.uid()))));
CREATE POLICY "bio write" ON public.assessment_bioimpedance FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_training(auth.uid()));
CREATE POLICY "bio update" ON public.assessment_bioimpedance FOR UPDATE TO authenticated
  USING (public.can_manage_training(auth.uid())) WITH CHECK (public.can_manage_training(auth.uid()));
CREATE TRIGGER trg_bio_updated BEFORE UPDATE ON public.assessment_bioimpedance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FOTOS DE EVOLUÇÃO (privadas)
CREATE TABLE public.evolution_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  pose text NOT NULL,
  storage_path text NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.evolution_photos TO authenticated;
GRANT ALL ON public.evolution_photos TO service_role;
ALTER TABLE public.evolution_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos own select" ON public.evolution_photos FOR SELECT TO authenticated
  USING (client_id = public.current_client_id());
CREATE POLICY "photos own insert" ON public.evolution_photos FOR INSERT TO authenticated
  WITH CHECK (client_id = public.current_client_id());
CREATE POLICY "photos own delete" ON public.evolution_photos FOR DELETE TO authenticated
  USING (client_id = public.current_client_id());

-- PREFERÊNCIAS DO ALUNO
CREATE TABLE public.student_preferences (
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_preferences TO authenticated;
GRANT ALL ON public.student_preferences TO service_role;
ALTER TABLE public.student_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs own all" ON public.student_preferences FOR ALL TO authenticated
  USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()))
  WITH CHECK (client_id = public.current_client_id());
CREATE TRIGGER trg_prefs_updated BEFORE UPDATE ON public.student_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DISPOSITIVOS CONECTADOS
CREATE TABLE public.connected_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  provider text NOT NULL,
  label text,
  active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connected_devices TO authenticated;
GRANT ALL ON public.connected_devices TO service_role;
ALTER TABLE public.connected_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "devices own all" ON public.connected_devices FOR ALL TO authenticated
  USING (client_id = public.current_client_id())
  WITH CHECK (client_id = public.current_client_id());
CREATE TRIGGER trg_devices_updated BEFORE UPDATE ON public.connected_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();