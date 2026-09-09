ALTER TABLE public.occurrences ALTER COLUMN created_by SET DEFAULT auth.uid();

DROP FUNCTION IF EXISTS public.occurrence_list(uuid, date, date);

CREATE OR REPLACE FUNCTION public.occurrence_list(_unit_id uuid DEFAULT NULL::uuid, _from date DEFAULT NULL::date, _to date DEFAULT NULL::date)
 RETURNS TABLE(id uuid, client_id integer, client_name text, unit_id uuid, type text, severity text, title text, description text, status text, owner_id uuid, owner_name text, created_by uuid, created_by_name text, resolved_by uuid, resolved_by_name text, resolution_note text, resolved_at timestamp with time zone, source_table text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT o.id, o.client_id, cl.name, o.unit_id, o.type, o.severity, o.title, o.description,
         o.status, o.owner_id, co.full_name,
         o.created_by,
         COALESCE(cb.full_name, cbu.email::text),
         o.resolved_by,
         COALESCE(rb.full_name, rbu.email::text),
         o.resolution_note, o.resolved_at, o.source_table, o.created_at
    FROM public.occurrences o
    LEFT JOIN public.clients cl ON cl.id = o.client_id
    LEFT JOIN public.collaborators co ON co.id = o.owner_id
    LEFT JOIN public.collaborators cb ON cb.auth_user_id = o.created_by
    LEFT JOIN auth.users cbu ON cbu.id = o.created_by
    LEFT JOIN public.collaborators rb ON rb.auth_user_id = o.resolved_by
    LEFT JOIN auth.users rbu ON rbu.id = o.resolved_by
   WHERE public.is_staff(auth.uid())
     AND (_unit_id IS NULL OR COALESCE(o.unit_id, cl.unit_id) = _unit_id)
     AND (_from IS NULL OR o.created_at::date >= _from)
     AND (_to IS NULL OR o.created_at::date <= _to)
   ORDER BY (o.status = 'resolvida'), o.created_at DESC
$function$;