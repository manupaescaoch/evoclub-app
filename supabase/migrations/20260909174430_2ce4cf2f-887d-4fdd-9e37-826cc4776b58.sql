DO $$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='retro_review_save';
  d := replace(d, 'SELECT name INTO nm FROM public.collaborators', 'SELECT full_name INTO nm FROM public.collaborators');
  EXECUTE d;

  SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='renewal_log_event';
  d := replace(d, 'SELECT name INTO _name FROM public.collaborators', 'SELECT full_name INTO _name FROM public.collaborators');
  EXECUTE d;
END $$;