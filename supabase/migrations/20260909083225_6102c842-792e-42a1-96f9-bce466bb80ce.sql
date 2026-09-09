CREATE POLICY "financeiro_receipts_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'financeiro' AND public.can_module(auth.uid(), 'financeiro', 'view'));

CREATE POLICY "financeiro_receipts_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'financeiro' AND public.can_module(auth.uid(), 'financeiro', 'edit'));

CREATE POLICY "financeiro_receipts_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'financeiro' AND public.can_module(auth.uid(), 'financeiro', 'edit'))
WITH CHECK (bucket_id = 'financeiro' AND public.can_module(auth.uid(), 'financeiro', 'edit'));

CREATE POLICY "financeiro_receipts_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'financeiro' AND public.can_module(auth.uid(), 'financeiro', 'delete'));