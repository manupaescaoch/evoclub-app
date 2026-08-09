CREATE POLICY "evolution own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'evolution' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "evolution own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evolution' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "evolution own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'evolution' AND (storage.foldername(name))[1] = auth.uid()::text);