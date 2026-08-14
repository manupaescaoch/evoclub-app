CREATE OR REPLACE FUNCTION public.post_likers(_post_id uuid)
RETURNS TABLE(client_id integer, name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.name
  FROM public.community_post_likes l
  JOIN public.clients c ON c.id = l.client_id
  WHERE l.post_id = _post_id
  ORDER BY l.created_at
$$;

REVOKE ALL ON FUNCTION public.post_likers(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.post_likers(uuid) TO authenticated;