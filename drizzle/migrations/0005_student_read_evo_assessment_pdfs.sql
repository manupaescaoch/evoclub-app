CREATE POLICY "avaliacoes student evo pdf read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avaliacoes'
  AND (storage.foldername(name))[1] = 'pdf'
  AND ((storage.foldername(name))[2])::integer = public.current_client_id()
);