CREATE OR REPLACE FUNCTION public.student_xp(_client_id integer, _from date DEFAULT '1970-01-01'::date, _to date DEFAULT '2999-12-31'::date)
 RETURNS TABLE(key text, label text, points integer, occurrences bigint, total bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH b AS (
    SELECT COALESCE(_from, '1970-01-01'::date) AS d_from,
           COALESCE(_to, '2999-12-31'::date) AS d_to
  ),
  r AS (SELECT * FROM public.xp_rules WHERE active),
  occ AS (
    SELECT 'class_checkin'::text AS key, count(*)::bigint AS n
      FROM public.class_bookings bk, b
      WHERE bk.client_id = _client_id AND bk.checked_in_at IS NOT NULL
        AND bk.checked_in_at::date BETWEEN b.d_from AND b.d_to
    UNION ALL
    SELECT 'workout', count(*)::bigint
      FROM public.workout_logs w, b
      WHERE w.client_id = _client_id AND w.status = 'completed'
        AND w.workout_date BETWEEN b.d_from AND b.d_to
    UNION ALL
    SELECT 'daily_checkin', count(*)::bigint
      FROM public.daily_checkins d, b
      WHERE d.client_id = _client_id AND d.checkin_date BETWEEN b.d_from AND b.d_to
    UNION ALL
    SELECT 'post', count(*)::bigint
      FROM public.community_posts p, b
      WHERE p.client_id = _client_id AND p.created_at::date BETWEEN b.d_from AND b.d_to
  )
  SELECT r.key, r.label, r.points, COALESCE(occ.n, 0),
         (r.points * COALESCE(occ.n, 0))::bigint
  FROM r LEFT JOIN occ ON occ.key = r.key
  ORDER BY r.key
$function$;