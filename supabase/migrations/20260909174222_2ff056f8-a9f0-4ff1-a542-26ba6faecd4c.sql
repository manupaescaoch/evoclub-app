CREATE OR REPLACE FUNCTION public.retro_share_create(_id uuid, _days integer DEFAULT 30, _allow_photos boolean DEFAULT false, _allow_health boolean DEFAULT false, _social boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE tok text; consent boolean;
BEGIN
  IF NOT public.can_module(auth.uid(), 'clientes', 'edit') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_permissao');
  END IF;
  SELECT COALESCE(rc.allow_photos, false) INTO consent
    FROM public.retrospectives r LEFT JOIN public.retro_consents rc ON rc.client_id = r.client_id
   WHERE r.id = _id;
  tok := replace(gen_random_uuid()::text, '-', '') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  INSERT INTO public.retro_share_links (retrospective_id, token, expires_at, allow_photos, allow_health, social_mode)
  VALUES (_id, tok, CASE WHEN _days IS NULL THEN NULL ELSE now() + (_days || ' days')::interval END,
          _allow_photos AND COALESCE(consent, false), _allow_health, _social);
  INSERT INTO public.retro_events (retrospective_id, kind, actor) VALUES (_id, 'link_criado', auth.uid());
  RETURN jsonb_build_object('ok', true, 'token', tok);
END;
$function$;