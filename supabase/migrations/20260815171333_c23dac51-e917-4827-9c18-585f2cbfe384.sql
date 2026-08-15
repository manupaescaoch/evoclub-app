-- ============ PLANOS ============
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL DEFAULT 'mensal',
  duration_months integer NOT NULL DEFAULT 1,
  weekly_frequency integer,
  usage_rules text,
  restrict_hours boolean NOT NULL DEFAULT false,
  allowed_days integer[] NOT NULL DEFAULT '{}',
  allowed_start time,
  allowed_end time,
  payment_tolerance_days integer NOT NULL DEFAULT 5,
  unit_ids uuid[] NOT NULL DEFAULT '{}',
  service_id uuid,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans read" ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "plans write" ON public.plans FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE UNIQUE INDEX plans_name_uniq ON public.plans (lower(name));

-- ============ MODELOS DE MENSAGEM ============
CREATE TABLE public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  name text NOT NULL,
  title text,
  body text NOT NULL DEFAULT '',
  variables text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_key, channel)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_templates TO authenticated;
GRANT ALL ON public.notification_templates TO service_role;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ntpl read" ON public.notification_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "ntpl write" ON public.notification_templates FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_ntpl_updated BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ REGRAS POR UNIDADE ============
CREATE TABLE public.notification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id, event_key, channel)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_rules TO authenticated;
GRANT ALL ON public.notification_rules TO service_role;
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nrule read" ON public.notification_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "nrule write" ON public.notification_rules FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_nrule_updated BEFORE UPDATE ON public.notification_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ HELPERS DE CONFIGURAÇÃO ============
CREATE OR REPLACE FUNCTION public.cfg_num(_key text, _field text, _default numeric)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT NULLIF(value ->> _field, '')::numeric FROM public.app_settings WHERE key = _key),
    _default);
$$;

CREATE OR REPLACE FUNCTION public.cfg_bool(_key text, _field text, _default boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT NULLIF(value ->> _field, '')::boolean FROM public.app_settings WHERE key = _key),
    _default);
$$;

-- tolerância efetiva: plano do aluno > padrão configurado > 5
CREATE OR REPLACE FUNCTION public.client_grace_days(_client integer)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT p.payment_tolerance_days
       FROM public.clients c
       JOIN public.plans p ON lower(p.name) = lower(c.plan)
      WHERE c.id = _client AND p.status <> 'discontinued'
      LIMIT 1),
    public.cfg_num('plans', 'default_tolerance_days', 5)::integer,
    5);
$$;

-- ============ REGRAS QUE VIRAM CONFIGURÁVEIS ============
CREATE OR REPLACE FUNCTION public.plan_blocked(_client integer)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    (SELECT coalesce(c.status, 'active') <> 'active'
         OR (c.contract_end IS NOT NULL
             AND (c.contract_end - (public.br_now())::date) < -public.client_grace_days(_client))
       FROM public.clients c WHERE c.id = _client),
    false);
$$;

CREATE OR REPLACE FUNCTION public.plan_state()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _client integer := public.current_client_id();
  _c record; _grace integer; _left integer; _state text;
BEGIN
  IF _client IS NULL THEN RETURN jsonb_build_object('state', 'unknown', 'blocked', false); END IF;
  _grace := public.client_grace_days(_client);
  SELECT status, contract_end INTO _c FROM public.clients WHERE id = _client;
  _left := CASE WHEN _c.contract_end IS NULL THEN NULL
                ELSE (_c.contract_end - (public.br_now())::date) END;

  IF coalesce(_c.status, 'active') <> 'active' THEN _state := 'blocked';
  ELSIF _left IS NULL THEN _state := 'ok';
  ELSIF _left < -_grace THEN _state := 'blocked';
  ELSIF _left < 0 THEN _state := 'overdue';
  ELSIF _left <= 7 THEN _state := 'expiring';
  ELSE _state := 'ok';
  END IF;

  RETURN jsonb_build_object('state', _state, 'blocked', _state = 'blocked',
                            'days_left', _left, 'grace_days', _grace);
END; $$;

CREATE OR REPLACE FUNCTION public.book_class(_class_id uuid, _class_date date, _muscle_group text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _client integer := public.current_client_id();
  _c record; _start timestamp; _now timestamp := public.br_now(); _taken integer;
  _window integer := public.cfg_num('grade', 'booking_window_hours', 12)::integer;
  _lock integer := public.cfg_num('grade', 'distribution_open_minutes', 20)::integer;
BEGIN
  IF _client IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_client'); END IF;
  IF public.plan_blocked(_client) THEN RETURN jsonb_build_object('ok', false, 'reason', 'plan_irregular'); END IF;
  SELECT * INTO _c FROM public.classes WHERE id = _class_id;
  IF _c IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _c.day_of_week IS NOT NULL AND _c.day_of_week <> EXTRACT(DOW FROM _class_date)::int THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'wrong_day');
  END IF;
  IF public.slot_blocked(_class_id, _class_date) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'slot_blocked');
  END IF;

  _start := _class_date + _c.start_time;
  IF _start - _now > make_interval(hours => _window) THEN RETURN jsonb_build_object('ok', false, 'reason', 'window_closed'); END IF;
  IF _start - _now < make_interval(mins => _lock) THEN RETURN jsonb_build_object('ok', false, 'reason', 'too_late'); END IF;

  IF EXISTS (SELECT 1 FROM public.class_bookings
    WHERE client_id = _client AND class_date = _class_date AND COALESCE(status,'confirmed') <> 'cancelled') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_booked_today');
  END IF;

  SELECT count(*) INTO _taken FROM public.class_bookings
   WHERE class_id = _class_id AND class_date = _class_date AND COALESCE(status,'confirmed') <> 'cancelled';
  IF _taken >= public.effective_capacity(_class_id, _class_date) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'full');
  END IF;

  INSERT INTO public.class_bookings (class_id, client_id, class_date, muscle_group, status, kind, booked_at, student_name, attendance_status)
  VALUES (_class_id, _client, _class_date, _muscle_group, 'confirmed', 'agendamento', now(),
          (SELECT name FROM public.clients WHERE id = _client), 'agendado');

  DELETE FROM public.class_waitlist WHERE client_id = _client AND class_date = _class_date;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_booking(_booking_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _client integer := public.current_client_id();
  _b record; _c record; _start timestamp; _next record;
  _deadline integer := public.cfg_num('grade', 'cancel_min_minutes', 20)::integer;
  _autopromote boolean := public.cfg_bool('grade', 'waitlist_auto_promote', true);
BEGIN
  SELECT * INTO _b FROM public.class_bookings WHERE id = _booking_id;
  IF _b IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _b.client_id IS DISTINCT FROM _client AND NOT public.can_manage_training(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  SELECT * INTO _c FROM public.classes WHERE id = _b.class_id;
  _start := COALESCE(_b.class_date, now()::date) + _c.start_time;
  IF _start - public.br_now() < make_interval(mins => _deadline) AND NOT public.can_manage_training(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'too_late');
  END IF;

  UPDATE public.class_bookings SET status = 'cancelled', cancelled_at = now() WHERE id = _booking_id;

  IF _autopromote THEN
    SELECT * INTO _next FROM public.class_waitlist
     WHERE class_id = _b.class_id AND class_date = _b.class_date AND status = 'waiting'
     ORDER BY created_at LIMIT 1;
  END IF;

  IF _next IS NOT NULL THEN
    INSERT INTO public.class_bookings (class_id, client_id, class_date, muscle_group, status, kind, booked_at, student_name)
    VALUES (_next.class_id, _next.client_id, _next.class_date, _next.muscle_group, 'confirmed', 'agendamento', now(),
            (SELECT name FROM public.clients WHERE id = _next.client_id));
    UPDATE public.class_waitlist SET status = 'promoted' WHERE id = _next.id;
    INSERT INTO public.notifications (client_id, title, body, kind, url)
    VALUES (_next.client_id, 'Sua vaga foi liberada!',
            'Você entrou na aula de ' || to_char(_c.start_time, 'HH24:MI') || ' em ' || to_char(_next.class_date, 'DD/MM') || '.',
            'aula', 'tab:grade');
  END IF;

  RETURN jsonb_build_object('ok', true, 'promoted', _next IS NOT NULL);
END; $$;