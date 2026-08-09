-- 1. NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  kind text NOT NULL DEFAULT 'geral',
  url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_client_created ON public.notifications (client_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students read own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));
CREATE POLICY "students update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (client_id = public.current_client_id())
  WITH CHECK (client_id = public.current_client_id());
CREATE POLICY "students delete own notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (client_id = public.current_client_id());
CREATE POLICY "staff insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_training(auth.uid()));

-- 2. DAILY CHECKIN SKIPS
CREATE TABLE public.daily_checkin_skips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  skip_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, skip_date)
);
GRANT SELECT, INSERT ON public.daily_checkin_skips TO authenticated;
GRANT ALL ON public.daily_checkin_skips TO service_role;
ALTER TABLE public.daily_checkin_skips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own skips select" ON public.daily_checkin_skips
  FOR SELECT TO authenticated
  USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));
CREATE POLICY "own skips insert" ON public.daily_checkin_skips
  FOR INSERT TO authenticated
  WITH CHECK (client_id = public.current_client_id());

-- 3. XP RULES
CREATE TABLE public.xp_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.xp_rules TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.xp_rules TO authenticated;
GRANT ALL ON public.xp_rules TO service_role;
ALTER TABLE public.xp_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp rules readable" ON public.xp_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "xp rules staff manage" ON public.xp_rules
  FOR ALL TO authenticated
  USING (public.can_manage_training(auth.uid()))
  WITH CHECK (public.can_manage_training(auth.uid()));
CREATE TRIGGER trg_xp_rules_updated BEFORE UPDATE ON public.xp_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.xp_rules (key, label, points) VALUES
  ('class_checkin', 'Presença em aula', 10),
  ('workout', 'Treino concluído', 15),
  ('daily_checkin', 'Check-in diário', 5),
  ('post', 'Publicação na comunidade', 5);

-- 4. DAILY CHECKIN: stress opcional + imutável
ALTER TABLE public.daily_checkins ALTER COLUMN stress_level DROP NOT NULL;
ALTER TABLE public.daily_checkins ALTER COLUMN stress_level DROP DEFAULT;

DROP POLICY IF EXISTS "students update own checkins" ON public.daily_checkins;
DROP POLICY IF EXISTS "students delete own checkins" ON public.daily_checkins;
DROP POLICY IF EXISTS "own checkins update" ON public.daily_checkins;
DROP POLICY IF EXISTS "own checkins delete" ON public.daily_checkins;

-- 5. XP FUNCTION
CREATE OR REPLACE FUNCTION public.student_xp(_client_id integer, _from date DEFAULT '1970-01-01'::date, _to date DEFAULT '2999-12-31'::date)
RETURNS TABLE(key text, label text, points integer, occurrences bigint, total bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH r AS (SELECT * FROM public.xp_rules WHERE active),
  occ AS (
    SELECT 'class_checkin'::text AS key, count(*)::bigint AS n
      FROM public.class_bookings b
      WHERE b.client_id = _client_id AND b.checked_in_at IS NOT NULL
        AND b.checked_in_at::date BETWEEN _from AND _to
    UNION ALL
    SELECT 'workout', count(*)::bigint
      FROM public.workout_logs w
      WHERE w.client_id = _client_id AND w.status = 'completed'
        AND w.workout_date BETWEEN _from AND _to
    UNION ALL
    SELECT 'daily_checkin', count(*)::bigint
      FROM public.daily_checkins d
      WHERE d.client_id = _client_id AND d.checkin_date BETWEEN _from AND _to
    UNION ALL
    SELECT 'post', count(*)::bigint
      FROM public.community_posts p
      WHERE p.client_id = _client_id AND p.created_at::date BETWEEN _from AND _to
  )
  SELECT r.key, r.label, r.points, COALESCE(occ.n, 0),
         (r.points * COALESCE(occ.n, 0))::bigint
  FROM r LEFT JOIN occ ON occ.key = r.key
  ORDER BY r.key
$$;

-- 6. LIMPEZA DE NOTIFICAÇÕES ANTIGAS
CREATE OR REPLACE FUNCTION public.purge_old_notifications()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.notifications WHERE created_at < now() - interval '90 days'
$$;