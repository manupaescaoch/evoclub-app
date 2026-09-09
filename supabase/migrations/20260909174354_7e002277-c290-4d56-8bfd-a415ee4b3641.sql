CREATE OR REPLACE FUNCTION public.retro_approve(_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE nm text;
BEGIN
  IF NOT public.can_module(auth.uid(), 'clientes', 'edit') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_permissao');
  END IF;
  SELECT full_name INTO nm FROM public.collaborators WHERE auth_user_id = auth.uid() LIMIT 1;
  UPDATE public.retrospectives SET status = 'revisada', reviewed_by = auth.uid(),
         reviewed_by_name = nm, reviewed_at = now()
   WHERE id = _id AND status IN ('aguardando', 'gerada', 'revisada');
  INSERT INTO public.retro_events (retrospective_id, kind, actor, actor_name) VALUES (_id, 'revisada', auth.uid(), nm);
  RETURN jsonb_build_object('ok', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.retro_mark_sent(_id uuid, _channel text DEFAULT 'whatsapp'::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE nm text;
BEGIN
  IF NOT public.can_module(auth.uid(), 'clientes', 'edit') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_permissao');
  END IF;
  SELECT full_name INTO nm FROM public.collaborators WHERE auth_user_id = auth.uid() LIMIT 1;
  UPDATE public.retrospectives SET status = 'enviada', sent_at = now(), sent_channel = _channel
   WHERE id = _id AND status IN ('gerada', 'revisada', 'enviada');
  INSERT INTO public.retro_events (retrospective_id, kind, detail, actor, actor_name)
  VALUES (_id, 'enviada', _channel, auth.uid(), nm);
  RETURN jsonb_build_object('ok', true);
END;
$function$;