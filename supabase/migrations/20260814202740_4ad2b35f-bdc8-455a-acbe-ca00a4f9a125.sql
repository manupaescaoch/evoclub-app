-- ============ 1. RENOVAÇÕES ============
ALTER TABLE public.renewal_requests
  ADD COLUMN IF NOT EXISTS cycle_end date,
  ADD COLUMN IF NOT EXISTS current_plan text,
  ADD COLUMN IF NOT EXISTS current_value numeric,
  ADD COLUMN IF NOT EXISTS proposal_plan text,
  ADD COLUMN IF NOT EXISTS proposal_value numeric,
  ADD COLUMN IF NOT EXISTS next_cycle_start date,
  ADD COLUMN IF NOT EXISTS next_cycle_end date,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.collaborators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS retro_link_id uuid REFERENCES public.form_links(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposal_link_id uuid REFERENCES public.form_links(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.client_contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_action_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

ALTER TABLE public.renewal_requests ALTER COLUMN status SET DEFAULT 'not_started';

CREATE UNIQUE INDEX IF NOT EXISTS renewal_requests_client_cycle_key
  ON public.renewal_requests (client_id, cycle_end) WHERE cycle_end IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.renewal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_id uuid NOT NULL REFERENCES public.renewal_requests(id) ON DELETE CASCADE,
  status text,
  actor_id uuid,
  actor_name text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.renewal_events TO authenticated;
GRANT ALL ON public.renewal_events TO service_role;
ALTER TABLE public.renewal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "renewal_events_staff_read" ON public.renewal_events
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "renewal_events_staff_write" ON public.renewal_events
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS renewal_events_renewal_idx ON public.renewal_events(renewal_id, created_at DESC);

CREATE POLICY "renewal_requests_staff_all" ON public.renewal_requests
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.renewal_log_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  IF TG_OP = 'UPDATE' AND coalesce(NEW.status,'') = coalesce(OLD.status,'') THEN RETURN NEW; END IF;
  SELECT name INTO _name FROM public.collaborators WHERE auth_user_id = auth.uid() LIMIT 1;
  INSERT INTO public.renewal_events (renewal_id, status, actor_id, actor_name)
  VALUES (NEW.id, NEW.status, auth.uid(), _name);
  IF TG_OP = 'UPDATE' AND NEW.first_action_at IS NULL AND NEW.status <> 'not_started' THEN
    NEW.first_action_at := now();
  END IF;
  IF NEW.status = 'renewed' AND NEW.closed_at IS NULL THEN NEW.closed_at := now(); END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_renewal_log ON public.renewal_requests;
CREATE TRIGGER trg_renewal_log AFTER INSERT ON public.renewal_requests
  FOR EACH ROW EXECUTE FUNCTION public.renewal_log_event();

DROP TRIGGER IF EXISTS trg_renewal_log_upd ON public.renewal_requests;
CREATE TRIGGER trg_renewal_log_upd BEFORE UPDATE ON public.renewal_requests
  FOR EACH ROW EXECUTE FUNCTION public.renewal_log_event();

DROP TRIGGER IF EXISTS trg_renewal_updated ON public.renewal_requests;
CREATE TRIGGER trg_renewal_updated BEFORE UPDATE ON public.renewal_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 2. LINKS RASTREÁVEIS ============
ALTER TABLE public.form_links DROP CONSTRAINT IF EXISTS form_links_kind_check;
ALTER TABLE public.form_links ADD CONSTRAINT form_links_kind_check
  CHECK (kind = ANY (ARRAY['form','anamnese','nps','retrospectiva','proposta','contrato']));
ALTER TABLE public.form_links
  ADD COLUMN IF NOT EXISTS renewal_id uuid REFERENCES public.renewal_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.client_contracts(id) ON DELETE SET NULL;

-- ============ 3. CONTRATOS EMITIDOS ============
ALTER TABLE public.client_contracts
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS supersedes_id uuid REFERENCES public.client_contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_by uuid,
  ADD COLUMN IF NOT EXISTS sent_by_name text,
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at date,
  ADD COLUMN IF NOT EXISTS renewal_id uuid REFERENCES public.renewal_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evidence jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE POLICY "client_contracts_staff_all" ON public.client_contracts
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.guard_signed_contract()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status = 'signed' THEN
    IF NEW.body IS DISTINCT FROM OLD.body
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.plan IS DISTINCT FROM OLD.plan
       OR NEW.plan_value IS DISTINCT FROM OLD.plan_value
       OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
       OR NEW.ends_at IS DISTINCT FROM OLD.ends_at
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.signed_at IS DISTINCT FROM OLD.signed_at
       OR NEW.signature_name IS DISTINCT FROM OLD.signature_name
       OR NEW.signature_hash IS DISTINCT FROM OLD.signature_hash THEN
      RAISE EXCEPTION 'Contrato assinado não pode ser alterado. Gere uma nova versão.';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_signed_contract ON public.client_contracts;
CREATE TRIGGER trg_guard_signed_contract BEFORE UPDATE ON public.client_contracts
  FOR EACH ROW EXECUTE FUNCTION public.guard_signed_contract();

DROP TRIGGER IF EXISTS trg_client_contracts_updated ON public.client_contracts;
CREATE TRIGGER trg_client_contracts_updated BEFORE UPDATE ON public.client_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.contract_new_version(_contract uuid, _body text DEFAULT NULL, _title text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old public.client_contracts; _new uuid;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not_allowed'; END IF;
  SELECT * INTO _old FROM public.client_contracts WHERE id = _contract;
  IF _old.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;

  INSERT INTO public.client_contracts (client_id, unit_id, contract_id, title, body, plan, plan_value,
    starts_at, ends_at, status, version, supersedes_id, renewal_id, expires_at)
  VALUES (_old.client_id, _old.unit_id, _old.contract_id,
    coalesce(_title, _old.title), coalesce(_body, _old.body), _old.plan, _old.plan_value,
    _old.starts_at, _old.ends_at, 'pending', _old.version + 1, _old.id, _old.renewal_id, _old.expires_at)
  RETURNING id INTO _new;

  IF _old.status <> 'signed' THEN
    UPDATE public.client_contracts SET status = 'expired' WHERE id = _old.id;
  END IF;
  RETURN _new;
END; $$;

CREATE OR REPLACE FUNCTION public.contracts_expire_overdue()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  UPDATE public.client_contracts
     SET status = 'expired'
   WHERE status IN ('pending','sent','viewed')
     AND expires_at IS NOT NULL AND expires_at < (public.br_now())::date;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END; $$;

CREATE OR REPLACE FUNCTION public.contract_send_link(_contract uuid, _channel text DEFAULT 'whatsapp', _days integer DEFAULT 7)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c public.client_contracts; _cl record; _link public.form_links; _name text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not_allowed'; END IF;
  SELECT * INTO _c FROM public.client_contracts WHERE id = _contract;
  IF _c.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _c.status = 'signed' THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_signed'); END IF;
  SELECT name, phone INTO _cl FROM public.clients WHERE id = _c.client_id;
  SELECT name INTO _name FROM public.collaborators WHERE auth_user_id = auth.uid() LIMIT 1;

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
END; $$;

CREATE OR REPLACE FUNCTION public.contract_sign_link(p_token text, p_name text, p_cpf text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _l public.form_links; _c public.client_contracts; _hash text;
BEGIN
  SELECT * INTO _l FROM public.form_links WHERE token = p_token AND kind = 'contrato';
  IF _l.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF coalesce(trim(p_name), '') = '' THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_name'); END IF;
  SELECT * INTO _c FROM public.client_contracts WHERE id = _l.contract_id;
  IF _c.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _c.status = 'signed' THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_signed'); END IF;
  IF _c.status = 'expired' THEN RETURN jsonb_build_object('ok', false, 'reason', 'expired'); END IF;

  _hash := md5(_c.id::text || coalesce(_c.client_id, 0)::text || trim(p_name) || now()::text);

  UPDATE public.client_contracts
     SET status = 'signed', signed_at = now(), signature_name = trim(p_name),
         signature_cpf = nullif(trim(coalesce(p_cpf, '')), ''),
         signature_hash = _hash,
         evidence = evidence || jsonb_build_object('channel', 'link', 'token', p_token, 'signed_at', now())
   WHERE id = _c.id;

  UPDATE public.form_links SET status = 'answered', answered_at = now(),
         response = jsonb_build_object('signature_name', trim(p_name))
   WHERE id = _l.id;

  IF _l.renewal_id IS NOT NULL THEN
    UPDATE public.renewal_requests SET status = 'contract_signed' WHERE id = _l.renewal_id AND status <> 'renewed';
  END IF;

  RETURN jsonb_build_object('ok', true, 'hash', _hash);
END; $$;
GRANT EXECUTE ON FUNCTION public.contract_sign_link(text, text, text) TO anon, authenticated;

-- ============ 4. ROTINA E AÇÕES DE RENOVAÇÃO ============
CREATE OR REPLACE FUNCTION public.renewal_ruler()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _today date := (public.br_now())::date; _created integer := 0; _alerts integer := 0; r record;
BEGIN
  FOR r IN
    SELECT c.id, c.unit_id, c.plan, c.plan_value, c.contract_end
      FROM public.clients c
     WHERE c.contract_end IS NOT NULL
       AND c.contract_end BETWEEN _today - 5 AND _today + 30
       AND coalesce(c.status, 'active') = 'active'
  LOOP
    INSERT INTO public.renewal_requests
      (client_id, unit_id, cycle_end, current_plan, current_value, status,
       next_cycle_start, next_cycle_end)
    VALUES (r.id, r.unit_id, r.contract_end, r.plan, r.plan_value, 'retro_available',
            r.contract_end + 1, r.contract_end + 31)
    ON CONFLICT (client_id, cycle_end) DO UPDATE
      SET current_plan = excluded.current_plan,
          current_value = excluded.current_value,
          status = CASE WHEN public.renewal_requests.status = 'not_started'
                        THEN 'retro_available' ELSE public.renewal_requests.status END;
    _created := _created + 1;
  END LOOP;

  FOR r IN
    SELECT rr.id, rr.client_id, rr.assigned_to, rr.cycle_end, c.name,
           (rr.cycle_end - _today) AS days_left
      FROM public.renewal_requests rr
      JOIN public.clients c ON c.id = rr.client_id
     WHERE rr.status <> 'renewed'
       AND rr.cycle_end IS NOT NULL
       AND (rr.cycle_end - _today) IN (21, 14, 7)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.renewal_reminders
       WHERE client_id = r.client_id AND cycle_end = r.cycle_end AND milestone = r.days_left
    ) THEN
      INSERT INTO public.renewal_reminders (client_id, cycle_end, milestone)
      VALUES (r.client_id, r.cycle_end, r.days_left);

      IF r.assigned_to IS NOT NULL THEN
        INSERT INTO public.staff_notifications (collaborator_id, title, body, kind)
        VALUES (r.assigned_to, 'Renovação em ' || r.days_left || ' dias',
                r.name || ' vence em ' || to_char(r.cycle_end, 'DD/MM') || '. Trate a renovação.', 'renovacao');
      END IF;
      _alerts := _alerts + 1;
    END IF;
  END LOOP;

  PERFORM public.contracts_expire_overdue();
  RETURN jsonb_build_object('renewals', _created, 'alerts', _alerts);
END; $$;

CREATE OR REPLACE FUNCTION public.renewal_set_status(_id uuid, _status text, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cl integer; _end date;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not_allowed'; END IF;
  IF _status NOT IN ('not_started','retro_available','retro_viewed','proposal_sent','proposal_viewed',
                     'contract_sent','contract_signed','payment_pending','renewed') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_status');
  END IF;

  UPDATE public.renewal_requests SET status = _status WHERE id = _id
  RETURNING client_id, next_cycle_end INTO _cl, _end;
  IF _cl IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  IF _note IS NOT NULL AND trim(_note) <> '' THEN
    INSERT INTO public.renewal_events (renewal_id, status, actor_id, note)
    VALUES (_id, _status, auth.uid(), trim(_note));
  END IF;

  IF _status = 'renewed' AND _end IS NOT NULL THEN
    UPDATE public.clients SET contract_end = _end WHERE id = _cl;
  END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.renewal_assign(_id uuid, _collaborator uuid, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not_allowed'; END IF;
  SELECT name INTO _name FROM public.collaborators WHERE id = _collaborator;
  UPDATE public.renewal_requests SET assigned_to = _collaborator WHERE id = _id;
  INSERT INTO public.renewal_events (renewal_id, status, actor_id, note)
  VALUES (_id, NULL, auth.uid(), coalesce(_note, 'Renovação atribuída a ' || coalesce(_name, 'colaborador')));
  IF _collaborator IS NOT NULL THEN
    INSERT INTO public.staff_notifications (collaborator_id, title, body, kind)
    VALUES (_collaborator, 'Nova renovação atribuída', 'Você é responsável por uma renovação.', 'renovacao');
  END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.renewal_link(_id uuid, _kind text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r public.renewal_requests; _cl record; _link public.form_links;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not_allowed'; END IF;
  IF _kind NOT IN ('retrospectiva','proposta') THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_kind'); END IF;
  SELECT * INTO _r FROM public.renewal_requests WHERE id = _id;
  IF _r.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  SELECT name, phone INTO _cl FROM public.clients WHERE id = _r.client_id;

  INSERT INTO public.form_links (kind, client_id, lead_name, phone, unit_id, renewal_id)
  VALUES (_kind, _r.client_id, _cl.name, _cl.phone, _r.unit_id, _r.id)
  RETURNING * INTO _link;

  IF _kind = 'retrospectiva' THEN
    UPDATE public.renewal_requests SET retro_link_id = _link.id,
      status = CASE WHEN status = 'not_started' THEN 'retro_available' ELSE status END
     WHERE id = _id;
  ELSE
    UPDATE public.renewal_requests SET proposal_link_id = _link.id,
      status = CASE WHEN status IN ('not_started','retro_available','retro_viewed')
                    THEN 'proposal_sent' ELSE status END
     WHERE id = _id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'token', _link.token, 'phone', _cl.phone, 'name', _cl.name);
END; $$;

CREATE OR REPLACE FUNCTION public.renewal_link_open(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _l public.form_links; _r public.renewal_requests; _c public.client_contracts; _stats jsonb;
BEGIN
  SELECT * INTO _l FROM public.form_links WHERE token = p_token;
  IF _l.id IS NULL THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF _l.status = 'sent' THEN
    UPDATE public.form_links SET status = 'viewed', viewed_at = now() WHERE id = _l.id;
    _l.status := 'viewed';
  END IF;

  IF _l.renewal_id IS NOT NULL THEN
    SELECT * INTO _r FROM public.renewal_requests WHERE id = _l.renewal_id;
    IF _l.kind = 'retrospectiva' THEN
      UPDATE public.renewal_requests SET status = 'retro_viewed'
       WHERE id = _r.id AND status IN ('not_started','retro_available');
    ELSIF _l.kind = 'proposta' THEN
      UPDATE public.renewal_requests SET status = 'proposal_viewed'
       WHERE id = _r.id AND status IN ('proposal_sent','retro_available','retro_viewed');
    END IF;
  END IF;

  IF _l.kind = 'retrospectiva' AND _r.client_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'checkins', (SELECT count(*) FROM public.class_bookings b
                    WHERE b.client_id = _r.client_id AND b.attended = true),
      'workouts', (SELECT count(*) FROM public.workout_logs w WHERE w.client_id = _r.client_id),
      'assessments', (SELECT count(*) FROM public.physical_assessments a WHERE a.client_id = _r.client_id)
    ) INTO _stats;
  END IF;

  IF _l.kind = 'contrato' AND _l.contract_id IS NOT NULL THEN
    SELECT * INTO _c FROM public.client_contracts WHERE id = _l.contract_id;
    IF _c.status = 'sent' THEN
      UPDATE public.client_contracts SET status = 'viewed', viewed_at = coalesce(viewed_at, now())
       WHERE id = _c.id;
      _c.status := 'viewed';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'kind', _l.kind, 'status', _l.status, 'name', _l.lead_name,
    'answered', _l.answered_at IS NOT NULL,
    'stats', _stats,
    'renewal', CASE WHEN _r.id IS NULL THEN NULL ELSE jsonb_build_object(
      'cycle_end', _r.cycle_end, 'current_plan', _r.current_plan, 'current_value', _r.current_value,
      'proposal_plan', _r.proposal_plan, 'proposal_value', _r.proposal_value,
      'next_cycle_start', _r.next_cycle_start, 'next_cycle_end', _r.next_cycle_end) END,
    'contract', CASE WHEN _c.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', _c.id, 'title', _c.title, 'body', _c.body, 'plan', _c.plan, 'plan_value', _c.plan_value,
      'starts_at', _c.starts_at, 'ends_at', _c.ends_at, 'status', _c.status, 'version', _c.version,
      'signed_at', _c.signed_at, 'signature_name', _c.signature_name, 'signature_hash', _c.signature_hash) END
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.renewal_link_open(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.renewal_dashboard(_unit uuid DEFAULT NULL, _from date DEFAULT NULL, _to date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
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
    SELECT co.name AS collaborator,
           count(*) FILTER (WHERE rr.status = 'renewed') AS renewed,
           count(*) AS total,
           round(avg(EXTRACT(EPOCH FROM (rr.closed_at - coalesce(rr.first_action_at, rr.created_at))) / 86400)
                 FILTER (WHERE rr.closed_at IS NOT NULL), 1) AS avg_days
      FROM public.renewal_requests rr
      JOIN public.collaborators co ON co.id = rr.assigned_to
     WHERE rr.cycle_end BETWEEN _f AND _t AND (_unit IS NULL OR rr.unit_id = _unit)
     GROUP BY co.name ORDER BY 2 DESC
  ) x;

  RETURN jsonb_build_object('total', _total, 'renewed', _renewed,
    'rate', CASE WHEN _total = 0 THEN 0 ELSE round(_renewed::numeric * 100 / _total, 1) END,
    'by_collaborator', _by);
END; $$;
