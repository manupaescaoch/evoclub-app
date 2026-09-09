CREATE TABLE public.turnstile_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  name text NOT NULL,
  vendor text NOT NULL DEFAULT 'Relsystem',
  model text,
  endpoint text,
  agent_key text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.turnstile_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES public.turnstile_devices(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  client_id bigint REFERENCES public.clients(id) ON DELETE SET NULL,
  identifier text,
  direction text NOT NULL DEFAULT 'in',
  method text,
  allowed boolean NOT NULL DEFAULT true,
  reason text,
  event_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tae_unit_time ON public.turnstile_access_events (unit_id, event_at DESC);
CREATE INDEX idx_tae_client_time ON public.turnstile_access_events (client_id, event_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.turnstile_devices TO authenticated;
GRANT ALL ON public.turnstile_devices TO service_role;
GRANT SELECT, INSERT ON public.turnstile_access_events TO authenticated;
GRANT ALL ON public.turnstile_access_events TO service_role;

ALTER TABLE public.turnstile_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnstile_access_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "devices_read" ON public.turnstile_devices FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.can_module(_user_id => auth.uid(), _module => 'gerencial', _action => 'view'));

CREATE POLICY "devices_write" ON public.turnstile_devices FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.can_module(_user_id => auth.uid(), _module => 'gerencial', _action => 'edit'))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.can_module(_user_id => auth.uid(), _module => 'gerencial', _action => 'edit'));

CREATE POLICY "access_events_read" ON public.turnstile_access_events FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()) OR client_id = public.current_client_id());

CREATE POLICY "access_events_insert" ON public.turnstile_access_events FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.turnstile_roster(_unit uuid)
RETURNS TABLE (client_id bigint, name text, cpf text, allowed boolean, reason text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id,
         c.name,
         c.cpf,
         (coalesce(c.status,'ativo') = 'ativo' AND NOT public.plan_blocked(c.id)) AS allowed,
         CASE WHEN coalesce(c.status,'ativo') <> 'ativo' THEN 'inativo'
              WHEN public.plan_blocked(c.id) THEN 'plano vencido'
              ELSE NULL END
  FROM public.clients c
  WHERE (_unit IS NULL OR c.unit_id = _unit)
$$;

REVOKE ALL ON FUNCTION public.turnstile_roster(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.turnstile_roster(uuid) TO authenticated, service_role;