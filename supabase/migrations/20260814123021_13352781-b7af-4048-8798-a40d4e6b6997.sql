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
    (_cid, _me.name, trim(_name), nullif(trim(coalesce(_phone, '')), ''), _me.unit_id, 'app_aluno', 'registered', 5);

  RETURN jsonb_build_object('ok', true);
END;
$$;