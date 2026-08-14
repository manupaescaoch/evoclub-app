-- ============ 1. Presença nos agendamentos ============
ALTER TABLE public.class_bookings
  ADD COLUMN IF NOT EXISTS attendance_status text NOT NULL DEFAULT 'agendado',
  ADD COLUMN IF NOT EXISTS attendance_marked_by uuid,
  ADD COLUMN IF NOT EXISTS attendance_marked_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.class_bookings
    ADD CONSTRAINT class_bookings_attendance_status_chk
    CHECK (attendance_status IN ('agendado','presente','faltou','cancelou'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE public.class_bookings SET attendance_status = 'cancelou'
 WHERE status = 'cancelled' AND attendance_status = 'agendado';

-- ============ 2. Ajustes de capacidade / bloqueio por horário e data ============
CREATE TABLE IF NOT EXISTS public.class_slot_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  class_date date NOT NULL,
  unit_id uuid,
  capacity_override integer,
  blocked boolean NOT NULL DEFAULT false,
  reason text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, class_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_slot_overrides TO authenticated;
GRANT ALL ON public.class_slot_overrides TO service_role;
ALTER TABLE public.class_slot_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff manage slot overrides" ON public.class_slot_overrides;
CREATE POLICY "staff manage slot overrides" ON public.class_slot_overrides
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "students read slot overrides" ON public.class_slot_overrides;
CREATE POLICY "students read slot overrides" ON public.class_slot_overrides
  FOR SELECT TO authenticated USING (true);
DROP TRIGGER IF EXISTS trg_slot_overrides_updated ON public.class_slot_overrides;
CREATE TRIGGER trg_slot_overrides_updated BEFORE UPDATE ON public.class_slot_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 3. Distribuição por professor ============
CREATE TABLE IF NOT EXISTS public.class_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.class_bookings(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  class_date date NOT NULL,
  collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  locked boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_assignments TO authenticated;
GRANT ALL ON public.class_assignments TO service_role;
ALTER TABLE public.class_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read assignments" ON public.class_assignments;
CREATE POLICY "staff read assignments" ON public.class_assignments
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "coordinators manage assignments" ON public.class_assignments;
CREATE POLICY "coordinators manage assignments" ON public.class_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.can_module(auth.uid(),'grade','sensitive'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.can_module(auth.uid(),'grade','sensitive'));
DROP TRIGGER IF EXISTS trg_assignments_updated ON public.class_assignments;
CREATE TRIGGER trg_assignments_updated BEFORE UPDATE ON public.class_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_assignment_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  SELECT count(*) INTO _n FROM public.class_assignments a
   WHERE a.collaborator_id = NEW.collaborator_id
     AND a.class_id = NEW.class_id
     AND a.class_date = NEW.class_date
     AND a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  IF _n >= 2 THEN
    RAISE EXCEPTION 'professor_limit_reached' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_assignment_limit ON public.class_assignments;
CREATE TRIGGER trg_assignment_limit BEFORE INSERT OR UPDATE ON public.class_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_assignment_limit();

-- ============ 4. Alertas de limitação ============
CREATE TABLE IF NOT EXISTS public.limitation_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  unit_id uuid,
  old_value text,
  new_value text,
  source text NOT NULL DEFAULT 'aluno',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_by uuid,
  acknowledged_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.limitation_alerts TO authenticated;
GRANT ALL ON public.limitation_alerts TO service_role;
ALTER TABLE public.limitation_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff manage limitation alerts" ON public.limitation_alerts;
CREATE POLICY "staff manage limitation alerts" ON public.limitation_alerts
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "student sees own limitation alerts" ON public.limitation_alerts;
CREATE POLICY "student sees own limitation alerts" ON public.limitation_alerts
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());

-- ============ 5. Conversões de experimental + comissões ============
CREATE TABLE IF NOT EXISTS public.enrollment_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  unit_id uuid,
  trial_booking_id uuid REFERENCES public.class_bookings(id) ON DELETE SET NULL,
  trial_professor_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL,
  registrar_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL,
  seller_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL,
  first_monthly_value numeric NOT NULL DEFAULT 0,
  enrollment_date date NOT NULL DEFAULT (public.br_now())::date,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollment_conversions TO authenticated;
GRANT ALL ON public.enrollment_conversions TO service_role;
ALTER TABLE public.enrollment_conversions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff manage conversions" ON public.enrollment_conversions;
CREATE POLICY "staff manage conversions" ON public.enrollment_conversions
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP TRIGGER IF EXISTS trg_conversions_updated ON public.enrollment_conversions;
CREATE TRIGGER trg_conversions_updated BEFORE UPDATE ON public.enrollment_conversions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.commission_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_id uuid NOT NULL REFERENCES public.enrollment_conversions(id) ON DELETE CASCADE,
  role text NOT NULL,
  rule text NOT NULL,
  collaborator_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL,
  unit_id uuid,
  base_value numeric NOT NULL DEFAULT 0,
  rate numeric,
  amount numeric NOT NULL DEFAULT 0,
  reference_date date NOT NULL DEFAULT (public.br_now())::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversion_id, role)
);
DO $$ BEGIN
  ALTER TABLE public.commission_entries
    ADD CONSTRAINT commission_entries_role_chk CHECK (role IN ('professor','cadastrador','vendedor'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_entries TO authenticated;
GRANT ALL ON public.commission_entries TO service_role;
ALTER TABLE public.commission_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff manage commissions" ON public.commission_entries;
CREATE POLICY "staff manage commissions" ON public.commission_entries
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ 6. Capacidade efetiva e respeito ao bloqueio ============
CREATE OR REPLACE FUNCTION public.effective_capacity(_class_id uuid, _class_date date)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT o.capacity_override FROM public.class_slot_overrides o
      WHERE o.class_id = _class_id AND o.class_date = _class_date),
    (SELECT c.max_slots FROM public.classes c WHERE c.id = _class_id),
    14);
$$;

CREATE OR REPLACE FUNCTION public.slot_blocked(_class_id uuid, _class_date date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT o.blocked FROM public.class_slot_overrides o
     WHERE o.class_id = _class_id AND o.class_date = _class_date), false);
$$;

CREATE OR REPLACE FUNCTION public.book_class(_class_id uuid, _class_date date, _muscle_group text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  _client integer := public.current_client_id();
  _c record; _start timestamp; _now timestamp := public.br_now(); _taken integer;
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
  IF _start - _now > interval '12 hours' THEN RETURN jsonb_build_object('ok', false, 'reason', 'window_closed'); END IF;
  IF _start - _now < interval '20 minutes' THEN RETURN jsonb_build_object('ok', false, 'reason', 'too_late'); END IF;

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
END; $function$;

CREATE OR REPLACE FUNCTION public.join_waitlist(_class_id uuid, _class_date date, _muscle_group text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE _client integer := public.current_client_id(); _n integer;
BEGIN
  IF _client IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_client'); END IF;
  IF public.plan_blocked(_client) THEN RETURN jsonb_build_object('ok', false, 'reason', 'plan_irregular'); END IF;
  IF public.slot_blocked(_class_id, _class_date) THEN RETURN jsonb_build_object('ok', false, 'reason', 'slot_blocked'); END IF;
  IF EXISTS (SELECT 1 FROM public.class_bookings
    WHERE client_id = _client AND class_date = _class_date AND COALESCE(status,'confirmed') <> 'cancelled') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_booked_today');
  END IF;
  IF EXISTS (SELECT 1 FROM public.class_waitlist
    WHERE client_id = _client AND class_date = _class_date AND status = 'waiting') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_waiting');
  END IF;
  SELECT count(*) INTO _n FROM public.class_waitlist
   WHERE class_id = _class_id AND class_date = _class_date AND status = 'waiting';
  IF _n >= 5 THEN RETURN jsonb_build_object('ok', false, 'reason', 'waitlist_full'); END IF;
  INSERT INTO public.class_waitlist (class_id, client_id, class_date, muscle_group, position)
  VALUES (_class_id, _client, _class_date, _muscle_group, _n + 1);
  RETURN jsonb_build_object('ok', true, 'position', _n + 1);
END; $function$;

-- ============ 7. Grade da equipe ============
CREATE OR REPLACE FUNCTION public.grade_day_slots(_class_date date, _unit_id uuid DEFAULT NULL)
RETURNS TABLE(class_id uuid, name text, trainer text, start_time time, end_time time, unit_id uuid,
              capacity integer, booked integer, present integer, absent integer, trials integer,
              waiting integer, blocked boolean, reason text, capacity_override integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name, c.trainer, c.start_time, c.end_time, c.unit_id,
    public.effective_capacity(c.id, _class_date),
    (SELECT count(*)::int FROM public.class_bookings b WHERE b.class_id=c.id AND b.class_date=_class_date AND COALESCE(b.status,'confirmed')<>'cancelled'),
    (SELECT count(*)::int FROM public.class_bookings b WHERE b.class_id=c.id AND b.class_date=_class_date AND b.attendance_status='presente'),
    (SELECT count(*)::int FROM public.class_bookings b WHERE b.class_id=c.id AND b.class_date=_class_date AND b.attendance_status='faltou'),
    (SELECT count(*)::int FROM public.class_bookings b WHERE b.class_id=c.id AND b.class_date=_class_date AND b.kind='experimental' AND COALESCE(b.status,'confirmed')<>'cancelled'),
    (SELECT count(*)::int FROM public.class_waitlist w WHERE w.class_id=c.id AND w.class_date=_class_date AND w.status='waiting'),
    public.slot_blocked(c.id, _class_date),
    (SELECT o.reason FROM public.class_slot_overrides o WHERE o.class_id=c.id AND o.class_date=_class_date),
    (SELECT o.capacity_override FROM public.class_slot_overrides o WHERE o.class_id=c.id AND o.class_date=_class_date)
  FROM public.classes c
  WHERE public.is_staff(auth.uid())
    AND (c.day_of_week IS NULL OR c.day_of_week = EXTRACT(DOW FROM _class_date)::int)
    AND (_unit_id IS NULL OR c.unit_id = _unit_id)
  ORDER BY c.start_time
$$;
REVOKE EXECUTE ON FUNCTION public.grade_day_slots(date, uuid) FROM public, anon;

CREATE OR REPLACE FUNCTION public.grade_day_roster(_class_date date, _unit_id uuid DEFAULT NULL)
RETURNS TABLE(booking_id uuid, class_id uuid, client_id integer, student_name text, avatar_url text,
              muscle_group text, attendance_status text, kind text, is_trial boolean,
              collaborator_id uuid, professor_name text, started_at timestamptz, locked boolean,
              waitlisted boolean, waitlist_position integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.class_id, b.client_id,
         COALESCE(cl.name, b.student_name, 'Aluno'), cl.avatar_url, b.muscle_group,
         COALESCE(b.attendance_status,'agendado'), b.kind, b.kind = 'experimental',
         a.collaborator_id, co.full_name, a.started_at, COALESCE(a.locked,false),
         false, NULL::int
    FROM public.class_bookings b
    JOIN public.classes c ON c.id = b.class_id
    LEFT JOIN public.clients cl ON cl.id = b.client_id
    LEFT JOIN public.class_assignments a ON a.booking_id = b.id
    LEFT JOIN public.collaborators co ON co.id = a.collaborator_id
   WHERE public.is_staff(auth.uid())
     AND b.class_date = _class_date
     AND COALESCE(b.status,'confirmed') <> 'cancelled'
     AND (_unit_id IS NULL OR c.unit_id = _unit_id)
  UNION ALL
  SELECT w.id, w.class_id, w.client_id, COALESCE(cl.name,'Aluno'), cl.avatar_url, w.muscle_group,
         'espera', 'espera', false, NULL::uuid, NULL::text, NULL::timestamptz, false, true, w.position
    FROM public.class_waitlist w
    JOIN public.classes c ON c.id = w.class_id
    LEFT JOIN public.clients cl ON cl.id = w.client_id
   WHERE public.is_staff(auth.uid())
     AND w.class_date = _class_date AND w.status = 'waiting'
     AND (_unit_id IS NULL OR c.unit_id = _unit_id)
$$;
REVOKE EXECUTE ON FUNCTION public.grade_day_roster(date, uuid) FROM public, anon;

-- ============ 8. Ações da equipe ============
CREATE OR REPLACE FUNCTION public.set_slot_override(_class_id uuid, _class_date date, _capacity integer, _blocked boolean, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid; _booked integer;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.can_module(auth.uid(),'grade','edit')) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RETURN jsonb_build_object('ok', false, 'reason', 'reason_required'); END IF;
  SELECT unit_id INTO _u FROM public.classes WHERE id = _class_id;
  SELECT count(*) INTO _booked FROM public.class_bookings
   WHERE class_id=_class_id AND class_date=_class_date AND COALESCE(status,'confirmed')<>'cancelled';
  IF _capacity IS NOT NULL AND _capacity < _booked THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'below_booked', 'booked', _booked);
  END IF;
  INSERT INTO public.class_slot_overrides (class_id, class_date, unit_id, capacity_override, blocked, reason, created_by)
  VALUES (_class_id, _class_date, _u, _capacity, COALESCE(_blocked,false), _reason, auth.uid())
  ON CONFLICT (class_id, class_date) DO UPDATE
    SET capacity_override = EXCLUDED.capacity_override,
        blocked = EXCLUDED.blocked, reason = EXCLUDED.reason,
        created_by = auth.uid(), updated_at = now();
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.clear_slot_override(_class_id uuid, _class_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.can_module(auth.uid(),'grade','edit')) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;
  DELETE FROM public.class_slot_overrides WHERE class_id=_class_id AND class_date=_class_date;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.set_attendance(_booking_id uuid, _status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.can_module(auth.uid(),'grade','edit')) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;
  IF _status NOT IN ('agendado','presente','faltou','cancelou') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_status');
  END IF;
  UPDATE public.class_bookings
     SET attendance_status = _status,
         attendance_marked_by = auth.uid(),
         attendance_marked_at = now(),
         checked_in_at = CASE WHEN _status = 'presente' THEN COALESCE(checked_in_at, now()) ELSE checked_in_at END,
         status = CASE WHEN _status = 'cancelou' THEN 'cancelled' ELSE 'confirmed' END,
         cancelled_at = CASE WHEN _status = 'cancelou' THEN now() ELSE NULL END
   WHERE id = _booking_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.assign_professor(_booking_id uuid, _collaborator_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _b record; _c record; _start timestamp; _existing record; _n integer;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.can_module(auth.uid(),'grade','sensitive')) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;
  SELECT * INTO _b FROM public.class_bookings WHERE id = _booking_id;
  IF _b IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  SELECT * INTO _c FROM public.classes WHERE id = _b.class_id;
  _start := _b.class_date + _c.start_time;
  IF _start - public.br_now() > interval '20 minutes' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'distribution_not_open');
  END IF;

  SELECT * INTO _existing FROM public.class_assignments WHERE booking_id = _booking_id;
  IF _existing.id IS NOT NULL AND (_existing.locked OR _existing.started_at IS NOT NULL) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'session_locked');
  END IF;

  SELECT count(*) INTO _n FROM public.class_assignments
   WHERE collaborator_id = _collaborator_id AND class_id = _b.class_id AND class_date = _b.class_date
     AND booking_id <> _booking_id;
  IF _n >= 2 THEN RETURN jsonb_build_object('ok', false, 'reason', 'professor_full'); END IF;

  INSERT INTO public.class_assignments (booking_id, class_id, class_date, collaborator_id, assigned_by)
  VALUES (_booking_id, _b.class_id, _b.class_date, _collaborator_id, auth.uid())
  ON CONFLICT (booking_id) DO UPDATE
    SET collaborator_id = EXCLUDED.collaborator_id, assigned_by = auth.uid(), assigned_at = now(), updated_at = now();
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.unassign_professor(_booking_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _a record;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.can_module(auth.uid(),'grade','sensitive')) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;
  SELECT * INTO _a FROM public.class_assignments WHERE booking_id = _booking_id;
  IF _a IS NULL THEN RETURN jsonb_build_object('ok', true); END IF;
  IF _a.locked OR _a.started_at IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'session_locked'); END IF;
  DELETE FROM public.class_assignments WHERE booking_id = _booking_id;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.start_assigned_session(_booking_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  UPDATE public.class_assignments
     SET started_at = COALESCE(started_at, now()), locked = true, updated_at = now()
   WHERE booking_id = _booking_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  UPDATE public.class_bookings SET attendance_status = 'presente',
         attendance_marked_by = auth.uid(), attendance_marked_at = now(),
         checked_in_at = COALESCE(checked_in_at, now())
   WHERE id = _booking_id;
  RETURN jsonb_build_object('ok', true);
END; $$;

-- ============ 9. Resumo rápido do aluno ============
CREATE OR REPLACE FUNCTION public.student_quick_summary(_client_id integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _c record; _chk record; _score numeric; _readiness text; _plan record;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RETURN jsonb_build_object('error','forbidden'); END IF;
  SELECT * INTO _c FROM public.clients WHERE id = _client_id;
  IF _c IS NULL THEN RETURN jsonb_build_object('error','not_found'); END IF;

  SELECT * INTO _chk FROM public.daily_checkins
   WHERE client_id = _client_id AND checkin_date = (public.br_now())::date LIMIT 1;

  IF _chk.id IS NOT NULL THEN
    _score := (COALESCE(_chk.sleep_quality,3) + COALESCE(_chk.energy,3) + COALESCE(_chk.mood,3)) / 3.0
              + CASE WHEN COALESCE(_chk.sleep_hours,7) >= 7 THEN 0.5
                     WHEN COALESCE(_chk.sleep_hours,7) < 5 THEN -0.5 ELSE 0 END;
    _readiness := CASE WHEN _score >= 4 THEN 'alta' WHEN _score >= 2.8 THEN 'moderada' ELSE 'baixa' END;
  END IF;

  SELECT id, name, starts_at, expires_at INTO _plan FROM public.training_plans
   WHERE client_id = _client_id AND COALESCE(status,'ativo') = 'ativo'
   ORDER BY created_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'client', jsonb_build_object('id', _c.id, 'name', _c.name, 'avatar_url', _c.avatar_url,
       'visit_type', _c.visit_type, 'status', _c.status, 'objective', _c.objective,
       'limitations', _c.limitations, 'observations', _c.observations, 'plan', _c.plan),
    'is_trial', COALESCE(_c.visit_type,'') = 'experimental',
    'anamnesis', COALESCE((SELECT jsonb_agg(jsonb_build_object('type', a.type, 'content', a.content, 'created_at', a.created_at) ORDER BY a.created_at DESC)
        FROM public.anamnesis a WHERE a.client_id = _client_id), '[]'::jsonb),
    'pains', COALESCE((SELECT jsonb_agg(jsonb_build_object('created_at', p.created_at, 'region', p.region, 'level', p.level, 'notes', p.notes) ORDER BY p.created_at DESC)
        FROM (SELECT * FROM public.pain_reports WHERE client_id = _client_id ORDER BY created_at DESC LIMIT 5) p), '[]'::jsonb),
    'checkin', CASE WHEN _chk.id IS NULL THEN NULL ELSE jsonb_build_object(
        'sleep_hours', _chk.sleep_hours, 'sleep_quality', _chk.sleep_quality,
        'energy', _chk.energy, 'mood', _chk.mood) END,
    'readiness', COALESCE(_readiness, 'sem_checkin'),
    'training_plan', CASE WHEN _plan.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', _plan.id, 'name', _plan.name, 'starts_at', _plan.starts_at, 'expires_at', _plan.expires_at) END,
    'alerts', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', l.id, 'new_value', l.new_value, 'source', l.source,
          'created_at', l.created_at, 'acknowledged_at', l.acknowledged_at) ORDER BY l.created_at DESC)
        FROM public.limitation_alerts l WHERE l.client_id = _client_id AND l.acknowledged_at IS NULL), '[]'::jsonb)
  );
END; $$;
REVOKE EXECUTE ON FUNCTION public.student_quick_summary(integer) FROM public, anon;

CREATE OR REPLACE FUNCTION public.update_limitations(_client_id integer, _limitations text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old text; _src text; _unit uuid;
BEGIN
  IF public.current_client_id() = _client_id THEN _src := 'aluno';
  ELSIF public.is_staff(auth.uid()) THEN _src := 'equipe';
  ELSE RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;

  SELECT limitations, unit_id INTO _old, _unit FROM public.clients WHERE id = _client_id;
  IF _old IS NOT DISTINCT FROM _limitations THEN RETURN jsonb_build_object('ok', true, 'changed', false); END IF;

  UPDATE public.clients SET limitations = _limitations WHERE id = _client_id;
  INSERT INTO public.limitation_alerts (client_id, unit_id, old_value, new_value, source, created_by)
  VALUES (_client_id, _unit, _old, _limitations, _src, auth.uid());
  RETURN jsonb_build_object('ok', true, 'changed', true);
END; $$;

CREATE OR REPLACE FUNCTION public.ack_limitation_alert(_alert_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  UPDATE public.limitation_alerts
     SET acknowledged_by = auth.uid(), acknowledged_at = now()
   WHERE id = _alert_id AND acknowledged_at IS NULL;
  RETURN jsonb_build_object('ok', true);
END; $$;

-- ============ 10. Conversão de experimental + comissões ============
CREATE OR REPLACE FUNCTION public.register_conversion(
  _client_id integer, _first_monthly_value numeric,
  _trial_booking_id uuid DEFAULT NULL, _trial_professor_id uuid DEFAULT NULL,
  _registrar_id uuid DEFAULT NULL, _seller_id uuid DEFAULT NULL,
  _enrollment_date date DEFAULT NULL, _unit_id uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _conv public.enrollment_conversions; _unit uuid; _date date; _prof uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.can_module(auth.uid(),'crm','create')
          OR public.can_module(auth.uid(),'clientes','create')) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  _unit := COALESCE(_unit_id, (SELECT unit_id FROM public.clients WHERE id = _client_id));
  _date := COALESCE(_enrollment_date, (public.br_now())::date);
  _prof := COALESCE(_trial_professor_id,
    (SELECT a.collaborator_id FROM public.class_assignments a
      JOIN public.class_bookings b ON b.id = a.booking_id
     WHERE b.client_id = _client_id AND b.kind = 'experimental'
     ORDER BY b.class_date DESC LIMIT 1));

  INSERT INTO public.enrollment_conversions
    (client_id, unit_id, trial_booking_id, trial_professor_id, registrar_id, seller_id,
     first_monthly_value, enrollment_date, notes, created_by)
  VALUES (_client_id, _unit, _trial_booking_id, _prof, _registrar_id, _seller_id,
     COALESCE(_first_monthly_value,0), _date, _notes, auth.uid())
  ON CONFLICT (client_id) DO UPDATE
    SET unit_id = EXCLUDED.unit_id, trial_booking_id = EXCLUDED.trial_booking_id,
        trial_professor_id = EXCLUDED.trial_professor_id, registrar_id = EXCLUDED.registrar_id,
        seller_id = EXCLUDED.seller_id, first_monthly_value = EXCLUDED.first_monthly_value,
        enrollment_date = EXCLUDED.enrollment_date, notes = EXCLUDED.notes, updated_at = now()
  RETURNING * INTO _conv;

  DELETE FROM public.commission_entries
   WHERE conversion_id = _conv.id
     AND ((role='professor' AND _conv.trial_professor_id IS NULL)
       OR (role='cadastrador' AND _conv.registrar_id IS NULL)
       OR (role='vendedor' AND _conv.seller_id IS NULL));

  IF _conv.trial_professor_id IS NOT NULL THEN
    INSERT INTO public.commission_entries (conversion_id, role, rule, collaborator_id, unit_id, base_value, rate, amount, reference_date)
    VALUES (_conv.id, 'professor', 'R$ 20,00 por fechamento convertido', _conv.trial_professor_id, _conv.unit_id, _conv.first_monthly_value, NULL, 20, _conv.enrollment_date)
    ON CONFLICT (conversion_id, role) DO UPDATE SET collaborator_id = EXCLUDED.collaborator_id,
      base_value = EXCLUDED.base_value, amount = EXCLUDED.amount, reference_date = EXCLUDED.reference_date;
  END IF;
  IF _conv.registrar_id IS NOT NULL THEN
    INSERT INTO public.commission_entries (conversion_id, role, rule, collaborator_id, unit_id, base_value, rate, amount, reference_date)
    VALUES (_conv.id, 'cadastrador', '3% da primeira mensalidade', _conv.registrar_id, _conv.unit_id, _conv.first_monthly_value, 0.03, round(_conv.first_monthly_value * 0.03, 2), _conv.enrollment_date)
    ON CONFLICT (conversion_id, role) DO UPDATE SET collaborator_id = EXCLUDED.collaborator_id,
      base_value = EXCLUDED.base_value, amount = EXCLUDED.amount, reference_date = EXCLUDED.reference_date;
  END IF;
  IF _conv.seller_id IS NOT NULL THEN
    INSERT INTO public.commission_entries (conversion_id, role, rule, collaborator_id, unit_id, base_value, rate, amount, reference_date)
    VALUES (_conv.id, 'vendedor', '2% da primeira mensalidade', _conv.seller_id, _conv.unit_id, _conv.first_monthly_value, 0.02, round(_conv.first_monthly_value * 0.02, 2), _conv.enrollment_date)
    ON CONFLICT (conversion_id, role) DO UPDATE SET collaborator_id = EXCLUDED.collaborator_id,
      base_value = EXCLUDED.base_value, amount = EXCLUDED.amount, reference_date = EXCLUDED.reference_date;
  END IF;

  RETURN jsonb_build_object('ok', true, 'conversion_id', _conv.id);
END; $$;

CREATE OR REPLACE FUNCTION public.commission_report(_from date, _to date, _unit_id uuid DEFAULT NULL)
RETURNS TABLE(entry_id uuid, conversion_id uuid, role text, rule text, collaborator_id uuid,
              collaborator_name text, client_id integer, client_name text, unit_id uuid,
              base_value numeric, amount numeric, reference_date date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.conversion_id, e.role, e.rule, e.collaborator_id, co.full_name,
         cv.client_id, cl.name, e.unit_id, e.base_value, e.amount, e.reference_date
    FROM public.commission_entries e
    JOIN public.enrollment_conversions cv ON cv.id = e.conversion_id
    LEFT JOIN public.collaborators co ON co.id = e.collaborator_id
    LEFT JOIN public.clients cl ON cl.id = cv.client_id
   WHERE public.is_staff(auth.uid())
     AND e.reference_date BETWEEN _from AND _to
     AND (_unit_id IS NULL OR e.unit_id = _unit_id)
   ORDER BY e.reference_date DESC
$$;
REVOKE EXECUTE ON FUNCTION public.commission_report(date, date, uuid) FROM public, anon;