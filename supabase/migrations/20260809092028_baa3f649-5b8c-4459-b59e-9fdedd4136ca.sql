-- 1. BOOKINGS: data da aula, tipo e cancelamento
ALTER TABLE public.class_bookings
  ADD COLUMN IF NOT EXISTS class_date date,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'agendamento',
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

UPDATE public.class_bookings SET class_date = COALESCE(class_date, booked_at::date, now()::date);

CREATE INDEX IF NOT EXISTS idx_class_bookings_class_date ON public.class_bookings (class_id, class_date);
CREATE INDEX IF NOT EXISTS idx_class_bookings_client_date ON public.class_bookings (client_id, class_date);

-- 2. LISTA DE ESPERA
CREATE TABLE public.class_waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  class_date date NOT NULL,
  muscle_group text,
  position integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, class_date, client_id)
);
GRANT SELECT, INSERT, DELETE ON public.class_waitlist TO authenticated;
GRANT ALL ON public.class_waitlist TO service_role;
ALTER TABLE public.class_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "waitlist select" ON public.class_waitlist
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "waitlist own delete" ON public.class_waitlist
  FOR DELETE TO authenticated
  USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));

-- 3. FUNÇÕES DE AGENDAMENTO
CREATE OR REPLACE FUNCTION public.br_now()
RETURNS timestamp
LANGUAGE sql STABLE
SET search_path = public
AS $$ SELECT (now() AT TIME ZONE 'America/Sao_Paulo') $$;

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

CREATE OR REPLACE FUNCTION public.cancel_booking(_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client integer := public.current_client_id();
  _b record;
  _c record;
  _start timestamp;
  _next record;
BEGIN
  SELECT * INTO _b FROM public.class_bookings WHERE id = _booking_id;
  IF _b IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _b.client_id IS DISTINCT FROM _client AND NOT public.can_manage_training(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  SELECT * INTO _c FROM public.classes WHERE id = _b.class_id;
  _start := COALESCE(_b.class_date, now()::date) + _c.start_time;
  IF _start - public.br_now() < interval '20 minutes' AND NOT public.can_manage_training(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'too_late');
  END IF;

  UPDATE public.class_bookings
     SET status = 'cancelled', cancelled_at = now()
   WHERE id = _booking_id;

  SELECT * INTO _next FROM public.class_waitlist
   WHERE class_id = _b.class_id AND class_date = _b.class_date AND status = 'waiting'
   ORDER BY created_at LIMIT 1;

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

CREATE OR REPLACE FUNCTION public.leave_waitlist(_class_id uuid, _class_date date)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _client integer := public.current_client_id();
BEGIN
  DELETE FROM public.class_waitlist
   WHERE class_id = _class_id AND class_date = _class_date AND client_id = _client;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 4. VISÃO DO DIA PARA O ALUNO
CREATE OR REPLACE FUNCTION public.class_day_status(_class_date date)
RETURNS TABLE(
  class_id uuid, booked integer, waiting integer,
  my_booking_id uuid, my_muscle_group text, my_waitlist_position integer
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (SELECT public.current_client_id() AS cid),
  c AS (
    SELECT cl.id FROM public.classes cl
    WHERE cl.day_of_week IS NULL OR cl.day_of_week = EXTRACT(DOW FROM _class_date)::int
  )
  SELECT c.id,
    (SELECT count(*)::int FROM public.class_bookings b
      WHERE b.class_id = c.id AND b.class_date = _class_date AND COALESCE(b.status,'confirmed') <> 'cancelled'),
    (SELECT count(*)::int FROM public.class_waitlist w
      WHERE w.class_id = c.id AND w.class_date = _class_date AND w.status = 'waiting'),
    (SELECT b.id FROM public.class_bookings b, me
      WHERE b.class_id = c.id AND b.class_date = _class_date AND b.client_id = me.cid
        AND COALESCE(b.status,'confirmed') <> 'cancelled' LIMIT 1),
    (SELECT b.muscle_group FROM public.class_bookings b, me
      WHERE b.class_id = c.id AND b.class_date = _class_date AND b.client_id = me.cid
        AND COALESCE(b.status,'confirmed') <> 'cancelled' LIMIT 1),
    (SELECT (row_number() OVER (ORDER BY w.created_at))::int
       FROM public.class_waitlist w, me
      WHERE w.class_id = c.id AND w.class_date = _class_date AND w.status = 'waiting' AND w.client_id = me.cid
      LIMIT 1)
  FROM c
$$;

REVOKE ALL ON FUNCTION public.book_class(uuid, date, text) FROM anon;
REVOKE ALL ON FUNCTION public.cancel_booking(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.join_waitlist(uuid, date, text) FROM anon;
REVOKE ALL ON FUNCTION public.leave_waitlist(uuid, date) FROM anon;
REVOKE ALL ON FUNCTION public.class_day_status(date) FROM anon;