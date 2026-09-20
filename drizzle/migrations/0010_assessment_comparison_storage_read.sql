CREATE POLICY "avaliacoes staff comparisons read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avaliacoes' AND (storage.foldername(name))[1] = 'comparativos' AND public.can_manage_training(auth.uid()));
CREATE POLICY "avaliacoes staff comparisons delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avaliacoes' AND (storage.foldername(name))[1] = 'comparativos' AND public.can_module(auth.uid(), 'avaliacao', 'delete'));