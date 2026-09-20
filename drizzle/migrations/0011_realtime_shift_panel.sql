ALTER TABLE public.class_bookings REPLICA IDENTITY FULL;
ALTER TABLE public.class_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.staff_shift_presence REPLICA IDENTITY FULL;
ALTER TABLE public.staff_shift_support REPLICA IDENTITY FULL;
ALTER TABLE public.staff_shift_changes REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.class_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.class_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_shift_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_shift_support;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_shift_changes;