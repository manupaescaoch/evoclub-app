CREATE POLICY "avaliacoes staff read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avaliacoes' AND public.can_manage_training(auth.uid()));

CREATE POLICY "avaliacoes staff write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avaliacoes' AND public.can_manage_training(auth.uid()));

CREATE POLICY "avaliacoes staff delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avaliacoes' AND public.can_manage_training(auth.uid()));