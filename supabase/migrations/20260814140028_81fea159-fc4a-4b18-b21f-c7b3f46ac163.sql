REVOKE EXECUTE ON FUNCTION public.current_collaborator_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.module_actions(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_module(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_financial_release(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.allowed_unit_ids(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_consolidated(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.my_admin_access()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _mods text[] := ARRAY['dashboard','clientes','grade','crm','financeiro','gerencial','treinos','avaliacao','equipe','operacional','ocorrencias','club','comunidade','configuracoes'];
  _m text;
  _perms jsonb := '{}'::jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('authenticated', false);
  END IF;
  FOREACH _m IN ARRAY _mods LOOP
    _perms := _perms || jsonb_build_object(_m, to_jsonb(public.module_actions(_uid, _m)));
  END LOOP;
  RETURN jsonb_build_object(
    'authenticated', true,
    'is_admin', public.has_role(_uid, 'admin'),
    'collaborator_id', public.current_collaborator_id(),
    'financial_release', public.has_financial_release(_uid),
    'can_consolidated', public.can_consolidated(_uid),
    'unit_ids', to_jsonb(public.allowed_unit_ids(_uid)),
    'modules', _perms
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.my_admin_access() FROM anon;