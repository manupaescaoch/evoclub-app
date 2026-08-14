REVOKE ALL ON FUNCTION public.client_attendance_stats(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_attendance_stats(integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.client_timeline(integer, text[], integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_timeline(integer, text[], integer, integer) TO authenticated, service_role;