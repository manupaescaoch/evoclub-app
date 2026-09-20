ALTER TABLE public.assessment_bioimpedance
  ADD COLUMN IF NOT EXISTS reference_ranges jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS segmental_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.physical_assessments
  ADD COLUMN IF NOT EXISTS evo_pdf_path text,
  ADD COLUMN IF NOT EXISTS evo_pdf_name text,
  ADD COLUMN IF NOT EXISTS evo_pdf_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS evo_pdf_version integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.assessment_delete(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _client integer;
BEGIN
  IF NOT public.can_module(auth.uid(), 'avaliacao', 'delete') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;
  SELECT client_id INTO _client FROM public.physical_assessments WHERE id = _id;
  IF _client IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  DELETE FROM public.physical_assessments WHERE id = _id;
  RETURN jsonb_build_object('ok', true, 'client_id', _client);
END;
$$;
GRANT EXECUTE ON FUNCTION public.assessment_delete(uuid) TO authenticated;

CREATE POLICY "avaliacoes staff update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avaliacoes' AND public.can_manage_training(auth.uid()))
WITH CHECK (bucket_id = 'avaliacoes' AND public.can_manage_training(auth.uid()));