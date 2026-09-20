ALTER POLICY "assessments update" ON public.physical_assessments
USING (public.can_manage_training(auth.uid()))
WITH CHECK (public.can_manage_training(auth.uid()));

REVOKE ALL ON FUNCTION public.assessment_delete(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assessment_delete(uuid) TO authenticated;