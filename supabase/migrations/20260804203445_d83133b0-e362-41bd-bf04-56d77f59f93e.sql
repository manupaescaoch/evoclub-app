CREATE TABLE public.daily_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id integer REFERENCES public.clients(id) ON DELETE SET NULL,
  student_name text NOT NULL,
  checkin_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  sleep_hours numeric NOT NULL,
  sleep_quality integer NOT NULL CHECK (sleep_quality BETWEEN 1 AND 5),
  energy integer NOT NULL CHECK (energy BETWEEN 1 AND 5),
  mood integer NOT NULL CHECK (mood BETWEEN 1 AND 5),
  stress_level integer NOT NULL CHECK (stress_level BETWEEN 1 AND 5),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (student_name, checkin_date)
);

GRANT SELECT, INSERT, UPDATE ON public.daily_checkins TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_checkins TO authenticated;
GRANT ALL ON public.daily_checkins TO service_role;

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view daily checkins" ON public.daily_checkins FOR SELECT USING (true);
CREATE POLICY "Public can insert daily checkins" ON public.daily_checkins FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update daily checkins" ON public.daily_checkins FOR UPDATE USING (true);
CREATE POLICY "Staff can delete daily checkins" ON public.daily_checkins FOR DELETE TO authenticated USING (public.can_manage_training(auth.uid()));

CREATE TRIGGER trg_daily_checkins_updated BEFORE UPDATE ON public.daily_checkins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();