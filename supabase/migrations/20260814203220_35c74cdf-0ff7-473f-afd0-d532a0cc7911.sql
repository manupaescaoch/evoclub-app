-- 1. fix collaborator name column usage
CREATE OR REPLACE FUNCTION public.renewal_assign(_id uuid, _collaborator uuid, _note text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _name text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not_allowed'; END IF;
  SELECT full_name INTO _name FROM public.collaborators WHERE id = _collaborator;
  UPDATE public.renewal_requests SET assigned_to = _collaborator WHERE id = _id;
  INSERT INTO public.renewal_events (renewal_id, status, actor_id, note)
  VALUES (_id, NULL, auth.uid(), coalesce(_note, 'Renovação atribuída a ' || coalesce(_name, 'colaborador')));
  IF _collaborator IS NOT NULL THEN
    INSERT INTO public.staff_notifications (collaborator_id, title, body, kind)
    VALUES (_collaborator, 'Nova renovação atribuída', 'Você é responsável por uma renovação.', 'renovacao');
  END IF;
  RETURN jsonb_build_object('ok', true);
END; $function$;

CREATE OR REPLACE FUNCTION public.renewal_dashboard(_unit uuid DEFAULT NULL::uuid, _from date DEFAULT NULL::date, _to date DEFAULT NULL::date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _f date := coalesce(_from, (public.br_now())::date - 30);
        _t date := coalesce(_to, (public.br_now())::date);
        _total integer; _renewed integer; _by jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not_allowed'; END IF;

  SELECT count(*) INTO _total FROM public.renewal_requests rr
   WHERE rr.cycle_end BETWEEN _f AND _t AND (_unit IS NULL OR rr.unit_id = _unit);
  SELECT count(*) INTO _renewed FROM public.renewal_requests rr
   WHERE rr.cycle_end BETWEEN _f AND _t AND rr.status = 'renewed' AND (_unit IS NULL OR rr.unit_id = _unit);

  SELECT coalesce(jsonb_agg(x), '[]'::jsonb) INTO _by FROM (
    SELECT co.full_name AS collaborator,
           count(*) FILTER (WHERE rr.status = 'renewed') AS renewed,
           count(*) AS total,
           round(avg(EXTRACT(EPOCH FROM (rr.closed_at - coalesce(rr.first_action_at, rr.created_at))) / 86400)
                 FILTER (WHERE rr.closed_at IS NOT NULL), 1) AS avg_days
      FROM public.renewal_requests rr
      JOIN public.collaborators co ON co.id = rr.assigned_to
     WHERE rr.cycle_end BETWEEN _f AND _t AND (_unit IS NULL OR rr.unit_id = _unit)
     GROUP BY co.full_name ORDER BY 2 DESC
  ) x;

  RETURN jsonb_build_object('total', _total, 'renewed', _renewed,
    'rate', CASE WHEN _total = 0 THEN 0 ELSE round(_renewed::numeric * 100 / _total, 1) END,
    'by_collaborator', _by);
END; $function$;

CREATE OR REPLACE FUNCTION public.contract_send_link(_contract uuid, _channel text DEFAULT 'whatsapp'::text, _days integer DEFAULT 7)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _c public.client_contracts; _cl record; _link public.form_links; _name text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not_allowed'; END IF;
  SELECT * INTO _c FROM public.client_contracts WHERE id = _contract;
  IF _c.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _c.status = 'signed' THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_signed'); END IF;
  SELECT name, phone INTO _cl FROM public.clients WHERE id = _c.client_id;
  SELECT full_name INTO _name FROM public.collaborators WHERE auth_user_id = auth.uid() LIMIT 1;

  INSERT INTO public.form_links (kind, client_id, lead_name, phone, unit_id, contract_id, renewal_id)
  VALUES ('contrato', _c.client_id, _cl.name, _cl.phone, _c.unit_id, _c.id, _c.renewal_id)
  RETURNING * INTO _link;

  UPDATE public.client_contracts
     SET status = CASE WHEN status = 'pending' THEN 'sent' ELSE status END,
         sent_at = now(), sent_by = auth.uid(), sent_by_name = _name,
         channel = _channel,
         expires_at = coalesce(expires_at, ((public.br_now())::date + coalesce(_days, 7)))
   WHERE id = _c.id;

  IF _c.renewal_id IS NOT NULL THEN
    UPDATE public.renewal_requests SET status = 'contract_sent', contract_id = _c.id
     WHERE id = _c.renewal_id AND status <> 'renewed';
  END IF;

  RETURN jsonb_build_object('ok', true, 'token', _link.token, 'phone', _cl.phone, 'name', _cl.name);
END; $function$;

-- 2. public link: understand retrospectiva / proposta / contrato
CREATE OR REPLACE FUNCTION public.form_link_open(p_token text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE l public.form_links; f public.operational_forms;
        r public.renewal_requests; c public.client_contracts; doc jsonb := NULL;
BEGIN
  SELECT * INTO l FROM public.form_links WHERE token = p_token;
  IF l.id IS NULL THEN RETURN json_build_object('error','not_found'); END IF;
  IF l.status = 'sent' THEN
    UPDATE public.form_links SET status = 'viewed', viewed_at = now() WHERE id = l.id;
    l.status := 'viewed';
  END IF;
  IF l.form_id IS NOT NULL THEN SELECT * INTO f FROM public.operational_forms WHERE id = l.form_id; END IF;

  IF l.kind IN ('retrospectiva','proposta') AND l.renewal_id IS NOT NULL THEN
    SELECT * INTO r FROM public.renewal_requests WHERE id = l.renewal_id;
    IF l.kind = 'retrospectiva' THEN
      UPDATE public.renewal_requests SET status = 'retro_viewed'
       WHERE id = r.id AND status IN ('not_started','retro_available');
      doc := jsonb_build_object(
        'cycle_end', r.cycle_end, 'current_plan', r.current_plan, 'current_value', r.current_value,
        'stats', public.client_attendance_stats(r.client_id));
    ELSE
      UPDATE public.renewal_requests SET status = 'proposal_viewed'
       WHERE id = r.id AND status IN ('not_started','retro_available','retro_viewed','proposal_sent');
      doc := jsonb_build_object(
        'cycle_end', r.cycle_end, 'current_plan', r.current_plan, 'current_value', r.current_value,
        'proposal_plan', r.proposal_plan, 'proposal_value', r.proposal_value,
        'next_cycle_start', r.next_cycle_start, 'next_cycle_end', r.next_cycle_end, 'notes', r.notes);
    END IF;
  ELSIF l.kind = 'contrato' AND l.contract_id IS NOT NULL THEN
    SELECT * INTO c FROM public.client_contracts WHERE id = l.contract_id;
    UPDATE public.client_contracts SET status = 'viewed', viewed_at = coalesce(viewed_at, now())
     WHERE id = c.id AND status IN ('pending','sent');
    doc := jsonb_build_object(
      'contract_id', c.id, 'title', c.title, 'body', c.body, 'plan', c.plan, 'plan_value', c.plan_value,
      'starts_at', c.starts_at, 'ends_at', c.ends_at, 'version', c.version,
      'status', c.status, 'signed_at', c.signed_at, 'signature_name', c.signature_name,
      'signature_hash', c.signature_hash, 'expires_at', c.expires_at);
  END IF;

  RETURN json_build_object(
    'kind', l.kind, 'status', l.status, 'lead_name', l.lead_name,
    'answered', l.answered_at IS NOT NULL,
    'form_name', f.name, 'form_fields', f.fields, 'doc', doc
  );
END; $function$;

-- 3. public signing through the secure link
CREATE OR REPLACE FUNCTION public.contract_sign_public(p_token text, p_name text, p_cpf text DEFAULT NULL, p_agent text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE l public.form_links; c public.client_contracts; _hash text;
BEGIN
  SELECT * INTO l FROM public.form_links WHERE token = p_token AND kind = 'contrato';
  IF l.id IS NULL OR l.contract_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF coalesce(trim(p_name), '') = '' THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_name'); END IF;

  SELECT * INTO c FROM public.client_contracts WHERE id = l.contract_id;
  IF c.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF c.status = 'signed' THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_signed'); END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < (public.br_now())::date THEN
    UPDATE public.client_contracts SET status = 'expired' WHERE id = c.id;
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  _hash := encode(digest(c.id::text || trim(p_name) || coalesce(p_cpf,'') || now()::text, 'sha256'), 'hex');

  UPDATE public.client_contracts
     SET status = 'signed', signed_at = now(),
         signature_name = trim(p_name), signature_cpf = nullif(trim(coalesce(p_cpf,'')), ''),
         signature_hash = _hash,
         signature_evidence = jsonb_build_object('channel', coalesce(c.channel, 'link'),
           'token', l.token, 'agent', p_agent, 'signed_at', now())
   WHERE id = c.id;

  UPDATE public.form_links SET status = 'answered', answered_at = now() WHERE id = l.id;

  IF c.renewal_id IS NOT NULL THEN
    UPDATE public.renewal_requests SET status = 'contract_signed'
     WHERE id = c.renewal_id AND status <> 'renewed';
  END IF;

  RETURN jsonb_build_object('ok', true, 'hash', _hash);
END; $function$;

GRANT EXECUTE ON FUNCTION public.contract_sign_public(text, text, text, text) TO anon, authenticated;