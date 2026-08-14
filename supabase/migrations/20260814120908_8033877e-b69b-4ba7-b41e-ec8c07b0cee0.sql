ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_reason text,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS post_blocked_until timestamptz;

ALTER TABLE public.club_redemptions
  ADD COLUMN IF NOT EXISTS benefit_label text;

CREATE UNIQUE INDEX IF NOT EXISTS community_reports_unique_reporter
  ON public.community_reports (post_id, client_id);

CREATE OR REPLACE FUNCTION public.handle_community_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _n integer;
  _author integer;
  _hidden boolean;
BEGIN
  SELECT count(DISTINCT client_id) INTO _n
    FROM public.community_reports WHERE post_id = NEW.post_id;

  SELECT client_id, hidden INTO _author, _hidden
    FROM public.community_posts WHERE id = NEW.post_id;

  IF _n >= 3 AND COALESCE(_hidden, false) = false THEN
    UPDATE public.community_posts
       SET hidden = true, hidden_reason = 'denuncias'
     WHERE id = NEW.post_id;

    IF _author IS NOT NULL THEN
      UPDATE public.clients
         SET post_blocked_until = now() + interval '24 hours'
       WHERE id = _author;

      INSERT INTO public.notifications (client_id, title, body, kind, url)
      VALUES (_author, 'Post removido do feed',
              'Seu post foi ocultado após denúncias da comunidade. Você pode ler e curtir, mas ficará 24 horas sem publicar.',
              'comunidade', 'tab:comunidade');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_report ON public.community_reports;
CREATE TRIGGER trg_community_report
AFTER INSERT ON public.community_reports
FOR EACH ROW EXECUTE FUNCTION public.handle_community_report();

DROP POLICY IF EXISTS posts_select_auth ON public.community_posts;
DROP POLICY IF EXISTS posts_select_unit ON public.community_posts;
CREATE POLICY posts_select_unit ON public.community_posts
FOR SELECT TO authenticated
USING (
  can_manage_training(auth.uid())
  OR client_id = current_client_id()
  OR (
    hidden = false
    AND (
      unit_id IS NULL
      OR unit_id = (SELECT unit_id FROM public.clients WHERE id = current_client_id())
    )
  )
);

DROP POLICY IF EXISTS posts_insert_own ON public.community_posts;
CREATE POLICY posts_insert_own ON public.community_posts
FOR INSERT TO authenticated
WITH CHECK (
  client_id = current_client_id()
  AND NOT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = current_client_id()
      AND c.post_blocked_until IS NOT NULL
      AND c.post_blocked_until > now()
  )
);

DROP POLICY IF EXISTS likes_select_auth ON public.community_post_likes;
CREATE POLICY likes_select_auth ON public.community_post_likes
FOR SELECT TO authenticated USING (true);

DROP FUNCTION IF EXISTS public.ranking_scores(uuid, date);
CREATE FUNCTION public.ranking_scores(_unit_id uuid DEFAULT NULL::uuid, _from date DEFAULT '1970-01-01'::date)
RETURNS TABLE(client_id integer, name text, unit_id uuid, class_checkins bigint, workouts bigint, daily_checkins bigint, posts bigint, points bigint, streak integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH base AS (
    SELECT c.id, c.name, c.unit_id
    FROM public.clients c
    WHERE (_unit_id IS NULL OR c.unit_id = _unit_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.student_preferences p
        WHERE p.client_id = c.id AND p.key = 'ranking_opt_out'
          AND COALESCE((p.value->>'value')::boolean, false)
      )
  ),
  cb AS (
    SELECT b.client_id, count(*)::bigint AS n
    FROM public.class_bookings b
    WHERE b.checked_in_at IS NOT NULL AND b.client_id IS NOT NULL
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
  ),
  act AS (
    SELECT client_id, workout_date AS d FROM public.workout_logs
      WHERE status = 'completed' AND client_id IS NOT NULL
    UNION
    SELECT client_id, checked_in_at::date FROM public.class_bookings
      WHERE checked_in_at IS NOT NULL AND client_id IS NOT NULL
  ),
  grp AS (
    SELECT client_id, d, d - (row_number() OVER (PARTITION BY client_id ORDER BY d))::int AS g
    FROM (SELECT DISTINCT client_id, d FROM act) x
  ),
  runs AS (
    SELECT client_id, count(*)::int AS len, max(d) AS last_day
    FROM grp GROUP BY client_id, g
  ),
  st AS (
    SELECT client_id, max(len) AS streak
    FROM runs
    WHERE last_day >= (public.br_now()::date - 1)
    GROUP BY client_id
  )
  SELECT base.id, base.name, base.unit_id,
    COALESCE(cb.n,0), COALESCE(wl.n,0), COALESCE(dc.n,0), COALESCE(po.n,0),
    (COALESCE(cb.n,0)*10 + COALESCE(wl.n,0)*15 + COALESCE(dc.n,0)*5 + COALESCE(po.n,0)*5)::bigint,
    COALESCE(st.streak, 0)
  FROM base
  LEFT JOIN cb ON cb.client_id = base.id
  LEFT JOIN wl ON wl.client_id = base.id
  LEFT JOIN dc ON dc.client_id = base.id
  LEFT JOIN po ON po.client_id = base.id
  LEFT JOIN st ON st.client_id = base.id
  ORDER BY 8 DESC, base.name
$$;