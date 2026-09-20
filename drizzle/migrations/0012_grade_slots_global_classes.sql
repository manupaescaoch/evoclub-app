CREATE OR REPLACE FUNCTION public.grade_day_slots(_class_date date, _unit_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(class_id uuid, name text, trainer text, start_time time without time zone, end_time time without time zone, unit_id uuid, capacity integer, booked integer, present integer, absent integer, trials integer, waiting integer, blocked boolean, reason text, capacity_override integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND (_unit_id IS NULL OR c.unit_id IS NULL OR c.unit_id = _unit_id)
  ORDER BY c.start_time
$function$;

CREATE OR REPLACE FUNCTION public.grade_day_roster(_class_date date, _unit_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(booking_id uuid, class_id uuid, client_id integer, student_name text, avatar_url text, muscle_group text, attendance_status text, kind text, is_trial boolean, collaborator_id uuid, professor_name text, started_at timestamp with time zone, locked boolean, waitlisted boolean, waitlist_position integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
     AND (_unit_id IS NULL OR c.unit_id IS NULL OR c.unit_id = _unit_id)
  UNION ALL
  SELECT w.id, w.class_id, w.client_id, COALESCE(cl.name,'Aluno'), cl.avatar_url, w.muscle_group,
         'espera', 'espera', false, NULL::uuid, NULL::text, NULL::timestamptz, false, true, w.position
    FROM public.class_waitlist w
    JOIN public.classes c ON c.id = w.class_id
    LEFT JOIN public.clients cl ON cl.id = w.client_id
   WHERE public.is_staff(auth.uid())
     AND w.class_date = _class_date AND w.status = 'waiting'
     AND (_unit_id IS NULL OR c.unit_id IS NULL OR c.unit_id = _unit_id)
$function$;