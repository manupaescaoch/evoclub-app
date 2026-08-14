CREATE POLICY "indications own read" ON public.crm_indications
  FOR SELECT TO authenticated
  USING (indicator_student_id = public.current_client_id());