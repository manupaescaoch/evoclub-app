CREATE TABLE public.evo_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  cycle_start date,
  cycle_end date NOT NULL,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, cycle_end)
);
GRANT SELECT, INSERT, UPDATE ON public.evo_cycles TO authenticated;
GRANT ALL ON public.evo_cycles TO service_role;
ALTER TABLE public.evo_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aluno ve seus ciclos" ON public.evo_cycles FOR SELECT TO authenticated
USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));
CREATE POLICY "Aluno atualiza seus ciclos" ON public.evo_cycles FOR UPDATE TO authenticated
USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()))
WITH CHECK (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));
CREATE TRIGGER update_evo_cycles_updated_at BEFORE UPDATE ON public.evo_cycles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.renewal_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'available',
  delivered_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.renewal_benefits TO authenticated;
GRANT ALL ON public.renewal_benefits TO service_role;
ALTER TABLE public.renewal_benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aluno ve seus beneficios" ON public.renewal_benefits FOR SELECT TO authenticated
USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));
CREATE POLICY "Equipe gerencia beneficios" ON public.renewal_benefits FOR ALL TO authenticated
USING (public.can_manage_training(auth.uid()))
WITH CHECK (public.can_manage_training(auth.uid()));
CREATE TRIGGER update_renewal_benefits_updated_at BEFORE UPDATE ON public.renewal_benefits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.renewal_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  cycle_end date NOT NULL,
  milestone integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, cycle_end, milestone)
);
GRANT SELECT ON public.renewal_reminders TO authenticated;
GRANT ALL ON public.renewal_reminders TO service_role;
ALTER TABLE public.renewal_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe ve avisos de renovacao" ON public.renewal_reminders FOR SELECT TO authenticated
USING (public.can_manage_training(auth.uid()));

CREATE OR REPLACE FUNCTION public.evo_cycle_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client integer := public.current_client_id();
  _start date;
  _end date;
  _left integer;
  _stats jsonb;
  _row public.evo_cycles;
BEGIN
  IF _client IS NULL THEN RETURN jsonb_build_object('available', false); END IF;
  SELECT contract_start, contract_end INTO _start, _end FROM public.clients WHERE id = _client;
  IF _end IS NULL THEN RETURN jsonb_build_object('available', false); END IF;
  _left := _end - (public.br_now())::date;
  IF _left > 30 THEN RETURN jsonb_build_object('available', false, 'days_left', _left); END IF;

  SELECT jsonb_build_object(
    'workouts', (SELECT count(*) FROM public.workout_logs wl WHERE wl.client_id = _client AND wl.created_at::date >= COALESCE(_start, _end - 30)),
    'class_checkins', (SELECT count(*) FROM public.class_bookings b WHERE b.client_id = _client AND b.class_date >= COALESCE(_start, _end - 30)),
    'daily_checkins', (SELECT count(*) FROM public.daily_checkins d WHERE d.client_id = _client AND d.created_at::date >= COALESCE(_start, _end - 30)),
    'posts', (SELECT count(*) FROM public.community_posts p WHERE p.client_id = _client AND p.created_at::date >= COALESCE(_start, _end - 30))
  ) INTO _stats;

  SELECT * INTO _row FROM public.evo_cycles WHERE client_id = _client AND cycle_end = _end;

  RETURN jsonb_build_object(
    'available', true,
    'days_left', _left,
    'cycle_start', COALESCE(_start, _end - 30),
    'cycle_end', _end,
    'stats', _stats,
    'completed', _row.completed_at IS NOT NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_evo_cycle(_stats jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client integer := public.current_client_id();
  _start date;
  _end date;
BEGIN
  IF _client IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  SELECT contract_start, contract_end INTO _start, _end FROM public.clients WHERE id = _client;
  IF _end IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  INSERT INTO public.evo_cycles (client_id, cycle_start, cycle_end, stats, completed_at)
  VALUES (_client, COALESCE(_start, _end - 30), _end, _stats, now())
  ON CONFLICT (client_id, cycle_end)
  DO UPDATE SET completed_at = now(), stats = EXCLUDED.stats, updated_at = now();
  RETURN jsonb_build_object('ok', true);
END;
$$;