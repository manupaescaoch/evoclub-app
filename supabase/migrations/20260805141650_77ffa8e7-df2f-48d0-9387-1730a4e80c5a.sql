
CREATE TABLE public.community_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id integer REFERENCES public.clients(id) ON DELETE SET NULL,
  author_name text,
  unit_id uuid,
  content text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_select_auth" ON public.community_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "posts_insert_own" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (client_id = public.current_client_id());
CREATE POLICY "posts_update_own" ON public.community_posts FOR UPDATE TO authenticated USING (client_id = public.current_client_id());
CREATE POLICY "posts_delete_own_or_staff" ON public.community_posts FOR DELETE TO authenticated
  USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_community_posts_updated BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.community_post_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, client_id)
);
GRANT SELECT, INSERT, DELETE ON public.community_post_likes TO authenticated;
GRANT ALL ON public.community_post_likes TO service_role;
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_select_auth" ON public.community_post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "likes_insert_own" ON public.community_post_likes FOR INSERT TO authenticated WITH CHECK (client_id = public.current_client_id());
CREATE POLICY "likes_delete_own" ON public.community_post_likes FOR DELETE TO authenticated USING (client_id = public.current_client_id());

CREATE TABLE public.community_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  client_id integer REFERENCES public.clients(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.community_reports TO authenticated;
GRANT ALL ON public.community_reports TO service_role;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_insert_own" ON public.community_reports FOR INSERT TO authenticated WITH CHECK (client_id = public.current_client_id());
CREATE POLICY "reports_select_staff" ON public.community_reports FOR SELECT TO authenticated
  USING (public.can_manage_training(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "reports_delete_staff" ON public.community_reports FOR DELETE TO authenticated
  USING (public.can_manage_training(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.community_announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  body text,
  unit_id uuid,
  pinned boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_announcements TO authenticated;
GRANT ALL ON public.community_announcements TO service_role;
ALTER TABLE public.community_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ann_select_auth" ON public.community_announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "ann_manage_staff" ON public.community_announcements FOR ALL TO authenticated
  USING (public.can_manage_training(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.can_manage_training(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_community_ann_updated BEFORE UPDATE ON public.community_announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.ranking_scores(_unit_id uuid DEFAULT NULL, _from date DEFAULT '1970-01-01')
RETURNS TABLE(client_id integer, name text, unit_id uuid, class_checkins bigint, workouts bigint, daily_checkins bigint, posts bigint, points bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT c.id, c.name, c.unit_id
    FROM public.clients c
    WHERE (_unit_id IS NULL OR c.unit_id = _unit_id)
  ),
  cb AS (
    SELECT b.client_id, count(*)::bigint AS n
    FROM public.class_bookings b
    WHERE b.checked_in_at IS NOT NULL
      AND b.client_id IS NOT NULL
      AND b.checked_in_at::date >= _from
    GROUP BY b.client_id
  ),
  wl AS (
    SELECT w.client_id, count(*)::bigint AS n
    FROM public.workout_logs w
    WHERE w.status = 'completed' AND w.workout_date >= _from
    GROUP BY w.client_id
  ),
  dc AS (
    SELECT d.client_id, count(*)::bigint AS n
    FROM public.daily_checkins d
    WHERE d.client_id IS NOT NULL AND d.checkin_date >= _from
    GROUP BY d.client_id
  ),
  po AS (
    SELECT p.client_id, count(*)::bigint AS n
    FROM public.community_posts p
    WHERE p.client_id IS NOT NULL AND p.created_at::date >= _from
    GROUP BY p.client_id
  )
  SELECT base.id, base.name, base.unit_id,
    COALESCE(cb.n,0), COALESCE(wl.n,0), COALESCE(dc.n,0), COALESCE(po.n,0),
    (COALESCE(cb.n,0)*10 + COALESCE(wl.n,0)*15 + COALESCE(dc.n,0)*5 + COALESCE(po.n,0)*5)::bigint
  FROM base
  LEFT JOIN cb ON cb.client_id = base.id
  LEFT JOIN wl ON wl.client_id = base.id
  LEFT JOIN dc ON dc.client_id = base.id
  LEFT JOIN po ON po.client_id = base.id
  ORDER BY 8 DESC, base.name
$$;
GRANT EXECUTE ON FUNCTION public.ranking_scores(uuid, date) TO authenticated;
