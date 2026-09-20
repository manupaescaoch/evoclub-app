CREATE TABLE public.assessment_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id),
  assessment_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  file_path text,
  file_name text,
  generated_by uuid REFERENCES auth.users(id),
  generated_by_name text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assessment_comparisons_count CHECK (jsonb_array_length(assessment_ids) BETWEEN 2 AND 5)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_comparisons TO authenticated;
GRANT ALL ON public.assessment_comparisons TO service_role;
ALTER TABLE public.assessment_comparisons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessment comparisons staff read" ON public.assessment_comparisons FOR SELECT TO authenticated
USING (public.can_manage_training(auth.uid()));
CREATE POLICY "assessment comparisons staff insert" ON public.assessment_comparisons FOR INSERT TO authenticated
WITH CHECK (public.can_manage_training(auth.uid()) AND generated_by = auth.uid());
CREATE POLICY "assessment comparisons staff update" ON public.assessment_comparisons FOR UPDATE TO authenticated
USING (public.can_manage_training(auth.uid())) WITH CHECK (public.can_manage_training(auth.uid()));
CREATE POLICY "assessment comparisons staff delete" ON public.assessment_comparisons FOR DELETE TO authenticated
USING (public.can_module(auth.uid(), 'avaliacao', 'delete'));
CREATE POLICY "avaliacoes staff comparisons write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avaliacoes' AND (storage.foldername(name))[1] = 'comparativos' AND public.can_manage_training(auth.uid()));
CREATE POLICY "avaliacoes staff comparisons update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avaliacoes' AND (storage.foldername(name))[1] = 'comparativos' AND public.can_manage_training(auth.uid()))
WITH CHECK (bucket_id = 'avaliacoes' AND (storage.foldername(name))[1] = 'comparativos' AND public.can_manage_training(auth.uid()));