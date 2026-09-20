-- Campos extras de bioimpedância (laudos InBody)
ALTER TABLE public.assessment_bioimpedance
  ADD COLUMN IF NOT EXISTS protein numeric,
  ADD COLUMN IF NOT EXISTS minerals numeric,
  ADD COLUMN IF NOT EXISTS skeletal_muscle_mass numeric,
  ADD COLUMN IF NOT EXISTS total_body_water numeric,
  ADD COLUMN IF NOT EXISTS waist_hip_ratio numeric,
  ADD COLUMN IF NOT EXISTS obesity_degree numeric,
  ADD COLUMN IF NOT EXISTS inbody_score numeric,
  ADD COLUMN IF NOT EXISTS ideal_weight numeric,
  ADD COLUMN IF NOT EXISTS weight_control numeric,
  ADD COLUMN IF NOT EXISTS fat_control numeric,
  ADD COLUMN IF NOT EXISTS muscle_control numeric,
  ADD COLUMN IF NOT EXISTS lean_arm_left numeric,
  ADD COLUMN IF NOT EXISTS lean_arm_right numeric,
  ADD COLUMN IF NOT EXISTS lean_trunk numeric,
  ADD COLUMN IF NOT EXISTS lean_leg_left numeric,
  ADD COLUMN IF NOT EXISTS lean_leg_right numeric,
  ADD COLUMN IF NOT EXISTS fat_arm_left numeric,
  ADD COLUMN IF NOT EXISTS fat_arm_right numeric,
  ADD COLUMN IF NOT EXISTS fat_trunk numeric,
  ADD COLUMN IF NOT EXISTS fat_leg_left numeric,
  ADD COLUMN IF NOT EXISTS fat_leg_right numeric,
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS age numeric,
  ADD COLUMN IF NOT EXISTS sex text,
  ADD COLUMN IF NOT EXISTS device_model text,
  ADD COLUMN IF NOT EXISTS device_client_id text,
  ADD COLUMN IF NOT EXISTS measured_at timestamptz;

-- Arquivo original e rastreio de importação
ALTER TABLE public.physical_assessments
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_mime text,
  ADD COLUMN IF NOT EXISTS file_size integer,
  ADD COLUMN IF NOT EXISTS imported_by uuid,
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS import_meta jsonb;

CREATE OR REPLACE FUNCTION public.assessment_import_save(
  _client_id integer,
  _performed_at timestamptz,
  _notes text,
  _bio jsonb,
  _measures jsonb,
  _file jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _unit uuid;
  _name text;
  _k text;
  _v numeric;
BEGIN
  IF NOT public.can_manage_training(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  SELECT unit_id INTO _unit FROM public.clients WHERE id = _client_id;
  SELECT name INTO _name FROM public.collaborators WHERE user_id = auth.uid() LIMIT 1;

  INSERT INTO public.physical_assessments (
    client_id, unit_id, scheduled_at, performed_at, published_at, status, origin,
    professional_id, professional_name, notes,
    file_path, file_name, file_mime, file_size, imported_by, imported_at, import_meta
  ) VALUES (
    _client_id, _unit, _performed_at, _performed_at, now(), 'realizada', 'importado',
    auth.uid(), COALESCE(_name, 'Equipe EVO'), _notes,
    _file->>'path', _file->>'name', _file->>'mime', NULLIF(_file->>'size','')::int,
    auth.uid(), now(), _file
  ) RETURNING id INTO _id;

  INSERT INTO public.assessment_bioimpedance (
    assessment_id, origin, weight, body_fat_pct, fat_mass, muscle_mass, lean_mass,
    body_water, visceral_fat, basal_metabolism, bmi,
    protein, minerals, skeletal_muscle_mass, total_body_water, waist_hip_ratio,
    obesity_degree, inbody_score, ideal_weight, weight_control, fat_control, muscle_control,
    lean_arm_left, lean_arm_right, lean_trunk, lean_leg_left, lean_leg_right,
    fat_arm_left, fat_arm_right, fat_trunk, fat_leg_left, fat_leg_right,
    height_cm, age, sex, device_model, device_client_id, measured_at
  ) VALUES (
    _id, 'importado',
    NULLIF(_bio->>'weight','')::numeric, NULLIF(_bio->>'body_fat_pct','')::numeric,
    NULLIF(_bio->>'fat_mass','')::numeric, NULLIF(_bio->>'muscle_mass','')::numeric,
    NULLIF(_bio->>'lean_mass','')::numeric, NULLIF(_bio->>'body_water','')::numeric,
    NULLIF(_bio->>'visceral_fat','')::numeric, NULLIF(_bio->>'basal_metabolism','')::numeric,
    NULLIF(_bio->>'bmi','')::numeric,
    NULLIF(_bio->>'protein','')::numeric, NULLIF(_bio->>'minerals','')::numeric,
    NULLIF(_bio->>'skeletal_muscle_mass','')::numeric, NULLIF(_bio->>'total_body_water','')::numeric,
    NULLIF(_bio->>'waist_hip_ratio','')::numeric, NULLIF(_bio->>'obesity_degree','')::numeric,
    NULLIF(_bio->>'inbody_score','')::numeric, NULLIF(_bio->>'ideal_weight','')::numeric,
    NULLIF(_bio->>'weight_control','')::numeric, NULLIF(_bio->>'fat_control','')::numeric,
    NULLIF(_bio->>'muscle_control','')::numeric,
    NULLIF(_bio->>'lean_arm_left','')::numeric, NULLIF(_bio->>'lean_arm_right','')::numeric,
    NULLIF(_bio->>'lean_trunk','')::numeric, NULLIF(_bio->>'lean_leg_left','')::numeric,
    NULLIF(_bio->>'lean_leg_right','')::numeric,
    NULLIF(_bio->>'fat_arm_left','')::numeric, NULLIF(_bio->>'fat_arm_right','')::numeric,
    NULLIF(_bio->>'fat_trunk','')::numeric, NULLIF(_bio->>'fat_leg_left','')::numeric,
    NULLIF(_bio->>'fat_leg_right','')::numeric,
    NULLIF(_bio->>'height_cm','')::numeric, NULLIF(_bio->>'age','')::numeric,
    NULLIF(_bio->>'sex',''), NULLIF(_bio->>'device_model',''), NULLIF(_bio->>'device_client_id',''),
    _performed_at
  );

  IF _measures IS NOT NULL THEN
    FOR _k, _v IN SELECT key, NULLIF(value,'')::numeric FROM jsonb_each_text(_measures) LOOP
      IF _v IS NOT NULL THEN
        INSERT INTO public.assessment_measures (assessment_id, measure_key, value)
        VALUES (_id, _k, _v);
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', _id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.assessment_import_save(integer, timestamptz, text, jsonb, jsonb, jsonb) TO authenticated;