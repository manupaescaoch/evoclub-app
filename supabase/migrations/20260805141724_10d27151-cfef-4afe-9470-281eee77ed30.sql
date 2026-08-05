
CREATE POLICY "community_read_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'community');
CREATE POLICY "community_insert_auth" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community' AND owner = auth.uid());
CREATE POLICY "community_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'community' AND owner = auth.uid());
CREATE POLICY "community_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'community' AND owner = auth.uid());
