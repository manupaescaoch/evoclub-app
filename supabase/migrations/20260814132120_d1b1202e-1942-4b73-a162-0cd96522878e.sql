CREATE TABLE IF NOT EXISTS public.client_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  unit_id uuid,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text,
  plan text,
  plan_value numeric,
  starts_at date,
  ends_at date,
  status text NOT NULL DEFAULT 'pending',
  signed_at timestamptz,
  signature_name text,
  signature_cpf text,
  signature_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_contracts TO authenticated;
GRANT ALL ON public.client_contracts TO service_role;

ALTER TABLE public.client_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_contracts own select" ON public.client_contracts;
CREATE POLICY "client_contracts own select" ON public.client_contracts
  FOR SELECT TO authenticated
  USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));

DROP POLICY IF EXISTS "client_contracts staff write" ON public.client_contracts;
CREATE POLICY "client_contracts staff write" ON public.client_contracts
  FOR ALL TO authenticated
  USING (public.can_manage_training(auth.uid()))
  WITH CHECK (public.can_manage_training(auth.uid()));

DROP TRIGGER IF EXISTS update_client_contracts_updated_at ON public.client_contracts;
CREATE TRIGGER update_client_contracts_updated_at
  BEFORE UPDATE ON public.client_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_client_contracts_client ON public.client_contracts(client_id);

-- Assinatura digital pelo aluno
CREATE OR REPLACE FUNCTION public.sign_contract(_contract uuid, _name text, _cpf text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client integer := public.current_client_id();
  _row record;
BEGIN
  IF _client IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_client'); END IF;
  IF coalesce(trim(_name), '') = '' THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_name'); END IF;

  SELECT * INTO _row FROM public.client_contracts WHERE id = _contract AND client_id = _client;
  IF _row IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _row.status = 'signed' THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_signed'); END IF;

  UPDATE public.client_contracts
     SET status = 'signed',
         signed_at = now(),
         signature_name = trim(_name),
         signature_cpf = nullif(trim(coalesce(_cpf, '')), ''),
         signature_hash = encode(digest(_contract::text || _client::text || trim(_name) || now()::text, 'sha256'), 'hex')
   WHERE id = _contract;

  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN undefined_function THEN
  UPDATE public.client_contracts
     SET status = 'signed', signed_at = now(), signature_name = trim(_name),
         signature_cpf = nullif(trim(coalesce(_cpf, '')), ''),
         signature_hash = md5(_contract::text || _client::text || trim(_name) || now()::text)
   WHERE id = _contract;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.sign_contract(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.sign_contract(uuid, text, text) TO authenticated;

-- Situação do plano (plano irregular)
CREATE OR REPLACE FUNCTION public.plan_state()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client integer := public.current_client_id();
  _c record;
  _grace integer := 5;
  _left integer;
  _state text;
BEGIN
  IF _client IS NULL THEN RETURN jsonb_build_object('state', 'unknown', 'blocked', false); END IF;
  SELECT status, contract_end INTO _c FROM public.clients WHERE id = _client;
  _left := CASE WHEN _c.contract_end IS NULL THEN NULL
                ELSE (_c.contract_end - (public.br_now())::date) END;

  IF coalesce(_c.status, 'active') <> 'active' THEN
    _state := 'blocked';
  ELSIF _left IS NULL THEN
    _state := 'ok';
  ELSIF _left < -_grace THEN
    _state := 'blocked';
  ELSIF _left < 0 THEN
    _state := 'overdue';
  ELSIF _left <= 7 THEN
    _state := 'expiring';
  ELSE
    _state := 'ok';
  END IF;

  RETURN jsonb_build_object('state', _state, 'blocked', _state = 'blocked', 'days_left', _left, 'grace_days', _grace);
END;
$$;

REVOKE ALL ON FUNCTION public.plan_state() FROM anon;
GRANT EXECUTE ON FUNCTION public.plan_state() TO authenticated;

CREATE OR REPLACE FUNCTION public.plan_blocked(_client integer)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT coalesce(c.status, 'active') <> 'active'
         OR (c.contract_end IS NOT NULL AND (c.contract_end - (public.br_now())::date) < -5)
       FROM public.clients c WHERE c.id = _client),
    false);
$$;

-- Bloqueio de agendamento para plano irregular
CREATE OR REPLACE FUNCTION public.book_class(_class_id uuid, _class_date date, _muscle_group text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client integer := public.current_client_id();
  _c record;
  _start timestamp;
  _now timestamp := public.br_now();
  _taken integer;
BEGIN
  IF _client IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_client'); END IF;
  IF public.plan_blocked(_client) THEN RETURN jsonb_build_object('ok', false, 'reason', 'plan_irregular'); END IF;
  SELECT * INTO _c FROM public.classes WHERE id = _class_id;
  IF _c IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _c.day_of_week IS NOT NULL AND _c.day_of_week <> EXTRACT(DOW FROM _class_date)::int THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'wrong_day');
  END IF;

  _start := _class_date + _c.start_time;
  IF _start - _now > interval '12 hours' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'window_closed');
  END IF;
  IF _start - _now < interval '20 minutes' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'too_late');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.class_bookings
    WHERE client_id = _client AND class_date = _class_date AND COALESCE(status,'confirmed') <> 'cancelled'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_booked_today');
  END IF;

  SELECT count(*) INTO _taken FROM public.class_bookings
   WHERE class_id = _class_id AND class_date = _class_date AND COALESCE(status,'confirmed') <> 'cancelled';
  IF _taken >= COALESCE(_c.max_slots, 14) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'full');
  END IF;

  INSERT INTO public.class_bookings (class_id, client_id, class_date, muscle_group, status, kind, booked_at, student_name)
  VALUES (_class_id, _client, _class_date, _muscle_group, 'confirmed', 'agendamento', now(),
          (SELECT name FROM public.clients WHERE id = _client));

  DELETE FROM public.class_waitlist WHERE client_id = _client AND class_date = _class_date;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.join_waitlist(_class_id uuid, _class_date date, _muscle_group text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client integer := public.current_client_id();
  _n integer;
BEGIN
  IF _client IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_client'); END IF;
  IF public.plan_blocked(_client) THEN RETURN jsonb_build_object('ok', false, 'reason', 'plan_irregular'); END IF;
  IF EXISTS (
    SELECT 1 FROM public.class_bookings
    WHERE client_id = _client AND class_date = _class_date AND COALESCE(status,'confirmed') <> 'cancelled'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_booked_today');
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.class_waitlist
    WHERE client_id = _client AND class_date = _class_date AND status = 'waiting'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_waiting');
  END IF;

  SELECT count(*) INTO _n FROM public.class_waitlist
   WHERE class_id = _class_id AND class_date = _class_date AND status = 'waiting';
  IF _n >= 5 THEN RETURN jsonb_build_object('ok', false, 'reason', 'waitlist_full'); END IF;

  INSERT INTO public.class_waitlist (class_id, client_id, class_date, muscle_group, position)
  VALUES (_class_id, _client, _class_date, _muscle_group, _n + 1);
  RETURN jsonb_build_object('ok', true, 'position', _n + 1);
END;
$$;

REVOKE ALL ON FUNCTION public.book_class(uuid, date, text) FROM anon;
REVOKE ALL ON FUNCTION public.join_waitlist(uuid, date, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.book_class(uuid, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_waitlist(uuid, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.plan_blocked(integer) TO authenticated;