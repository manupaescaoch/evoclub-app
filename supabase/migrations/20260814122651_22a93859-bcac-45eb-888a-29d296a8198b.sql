ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS birth_date date;

CREATE TABLE IF NOT EXISTS public.renewal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  unit_id uuid,
  desired_plan text,
  payment_method text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.renewal_requests TO authenticated;
GRANT ALL ON public.renewal_requests TO service_role;

ALTER TABLE public.renewal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "renewal own select" ON public.renewal_requests
  FOR SELECT TO authenticated
  USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));

CREATE POLICY "renewal own insert" ON public.renewal_requests
  FOR INSERT TO authenticated
  WITH CHECK (client_id = public.current_client_id());

CREATE POLICY "renewal staff update" ON public.renewal_requests
  FOR UPDATE TO authenticated
  USING (public.can_manage_training(auth.uid()));

CREATE TRIGGER update_renewal_requests_updated_at
  BEFORE UPDATE ON public.renewal_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "contracts student read" ON public.contracts
  FOR SELECT TO authenticated
  USING (status = 'active');

CREATE OR REPLACE FUNCTION public.create_indication(_name text, _phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cid integer;
  _me record;
BEGIN
  _cid := public.current_client_id();
  IF _cid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cadastro de aluno não encontrado');
  END IF;
  IF coalesce(trim(_name), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Informe o nome do indicado');
  END IF;

  SELECT name, unit_id INTO _me FROM public.clients WHERE id = _cid;

  INSERT INTO public.crm_indications
    (indicator_student_id, indicator_name, indicated_name, indicated_phone, unit_id, origin, status, discount_percent)
  VALUES
    (_cid, _me.name, trim(_name), nullif(trim(coalesce(_phone, '')), ''), _me.unit_id, 'app_aluno', 'new', 10);

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE POLICY "avatars own read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars own insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars own update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars own delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);