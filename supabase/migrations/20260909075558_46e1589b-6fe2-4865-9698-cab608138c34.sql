CREATE POLICY "operacao_files_select_staff" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'operacao' AND public.is_staff(auth.uid()));

CREATE POLICY "operacao_files_insert_staff" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'operacao' AND public.is_staff(auth.uid()));

CREATE POLICY "operacao_files_update_staff" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'operacao' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'operacao' AND public.is_staff(auth.uid()));

CREATE POLICY "operacao_files_delete_staff" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'operacao' AND public.is_staff(auth.uid()));