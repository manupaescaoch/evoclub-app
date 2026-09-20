ALTER POLICY "avaliacoes student evo pdf read" ON storage.objects
USING (
  bucket_id = 'avaliacoes'
  AND (storage.foldername(name))[1] = 'pdf'
  AND (storage.foldername(name))[2] = public.current_client_id()::text
);