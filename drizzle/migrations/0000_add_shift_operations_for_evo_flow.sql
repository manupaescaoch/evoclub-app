CREATE TABLE public.operation_settings (
  unit_id uuid PRIMARY KEY REFERENCES public.units(id) ON DELETE CASCADE,
  max_students_per_professional integer NOT NULL DEFAULT 2 CHECK (max_students_per_professional BETWEEN 1 AND 6),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operation_settings TO authenticated;
GRANT ALL ON public.operation_settings TO service_role;
ALTER TABLE public.operation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read operation settings in unit" ON public.operation_settings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) AND unit_id = ANY(public.allowed_unit_ids(auth.uid())));
CREATE POLICY "team manage operation settings" ON public.operation_settings FOR ALL TO authenticated USING (public.can_module(auth.uid(), 'equipe', 'edit') AND unit_id = ANY(public.allowed_unit_ids(auth.uid()))) WITH CHECK (public.can_module(auth.uid(), 'equipe', 'edit') AND unit_id = ANY(public.allowed_unit_ids(auth.uid())));

CREATE TABLE public.staff_shift_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  shift text NOT NULL CHECK (shift IN ('manha','tarde','noite')),
  collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  present boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  break_slot time,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE(unit_id, shift_date, shift, collaborator_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_shift_presence TO authenticated;
GRANT ALL ON public.staff_shift_presence TO service_role;
ALTER TABLE public.staff_shift_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read shift presence in unit" ON public.staff_shift_presence FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) AND unit_id = ANY(public.allowed_unit_ids(auth.uid())));
CREATE POLICY "team manage shift presence" ON public.staff_shift_presence FOR ALL TO authenticated USING ((public.can_module(auth.uid(), 'equipe', 'edit') OR collaborator_id = public.current_collaborator_id()) AND unit_id = ANY(public.allowed_unit_ids(auth.uid()))) WITH CHECK ((public.can_module(auth.uid(), 'equipe', 'edit') OR collaborator_id = public.current_collaborator_id()) AND unit_id = ANY(public.allowed_unit_ids(auth.uid())));

CREATE TABLE public.staff_shift_support (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  shift text NOT NULL CHECK (shift IN ('manha','tarde','noite')),
  collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(unit_id, shift_date, shift, collaborator_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_shift_support TO authenticated;
GRANT ALL ON public.staff_shift_support TO service_role;
ALTER TABLE public.staff_shift_support ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read shift support in unit" ON public.staff_shift_support FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) AND unit_id = ANY(public.allowed_unit_ids(auth.uid())));
CREATE POLICY "team manage shift support" ON public.staff_shift_support FOR ALL TO authenticated USING (public.can_module(auth.uid(), 'equipe', 'edit') AND unit_id = ANY(public.allowed_unit_ids(auth.uid()))) WITH CHECK (public.can_module(auth.uid(), 'equipe', 'edit') AND unit_id = ANY(public.allowed_unit_ids(auth.uid())));

CREATE TABLE public.staff_shift_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  shift text NOT NULL CHECK (shift IN ('manha','tarde','noite')),
  outgoing_collaborator_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL,
  incoming_collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  cancelled_at timestamptz,
  cancelled_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_shift_changes TO authenticated;
GRANT ALL ON public.staff_shift_changes TO service_role;
ALTER TABLE public.staff_shift_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read shift changes in unit" ON public.staff_shift_changes FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) AND unit_id = ANY(public.allowed_unit_ids(auth.uid())));
CREATE POLICY "team manage shift changes" ON public.staff_shift_changes FOR ALL TO authenticated USING (public.can_module(auth.uid(), 'equipe', 'edit') AND unit_id = ANY(public.allowed_unit_ids(auth.uid()))) WITH CHECK (public.can_module(auth.uid(), 'equipe', 'edit') AND unit_id = ANY(public.allowed_unit_ids(auth.uid())));

CREATE INDEX staff_shift_presence_lookup ON public.staff_shift_presence(unit_id, shift_date, shift);
CREATE INDEX staff_shift_support_lookup ON public.staff_shift_support(unit_id, shift_date, shift);
CREATE INDEX staff_shift_changes_lookup ON public.staff_shift_changes(unit_id, shift_date, shift) WHERE cancelled_at IS NULL;

CREATE OR REPLACE FUNCTION public.assign_professor(_booking_id uuid, _collaborator_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _b record; _c record; _start timestamp; _existing record; _n integer; _limit integer;
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
  SELECT COALESCE(os.max_students_per_professional, 2) INTO _limit FROM public.operation_settings os WHERE os.unit_id = _c.unit_id;
  _limit := COALESCE(_limit, 2);
  SELECT count(*) INTO _n FROM public.class_assignments
   WHERE collaborator_id = _collaborator_id AND class_id = _b.class_id AND class_date = _b.class_date
     AND booking_id <> _booking_id;
  IF _n >= _limit THEN RETURN jsonb_build_object('ok', false, 'reason', 'professor_full'); END IF;
  INSERT INTO public.class_assignments (booking_id, class_id, class_date, collaborator_id, assigned_by)
  VALUES (_booking_id, _b.class_id, _b.class_date, _collaborator_id, auth.uid())
  ON CONFLICT (booking_id) DO UPDATE
    SET collaborator_id = EXCLUDED.collaborator_id, assigned_by = auth.uid(), assigned_at = now(), updated_at = now();
  RETURN jsonb_build_object('ok', true);
END; $function$;