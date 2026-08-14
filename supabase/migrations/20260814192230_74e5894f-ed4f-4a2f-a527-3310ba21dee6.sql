
CREATE POLICY "timeclock upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'timeclock' AND owner = auth.uid());

CREATE POLICY "timeclock read team or own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'timeclock' AND (owner = auth.uid() OR public.can_module(auth.uid(), 'equipe', 'view')));
