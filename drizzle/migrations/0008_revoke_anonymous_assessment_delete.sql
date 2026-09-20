REVOKE EXECUTE ON FUNCTION public.assessment_delete(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assessment_delete(uuid) TO authenticated;