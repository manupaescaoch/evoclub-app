ALTER TABLE public.crm_tasks
  ADD COLUMN IF NOT EXISTS requires_evidence boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by uuid,
  ADD COLUMN IF NOT EXISTS completion_note text,
  ADD COLUMN IF NOT EXISTS evidence_url text;

CREATE TABLE IF NOT EXISTS public.contact_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  client_id bigint REFERENCES public.clients(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  channel text NOT NULL,
  result text NOT NULL,
  note text,
  next_action text,
  next_follow_up_at date,
  owner_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_logs TO authenticated;
GRANT ALL ON public.contact_logs TO service_role;

ALTER TABLE public.contact_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_logs_select_staff" ON public.contact_logs
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) AND (unit_id IS NULL OR unit_id = ANY (public.allowed_unit_ids(auth.uid()))));

CREATE POLICY "contact_logs_insert_staff" ON public.contact_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND (unit_id IS NULL OR unit_id = ANY (public.allowed_unit_ids(auth.uid()))));

CREATE POLICY "contact_logs_update_staff" ON public.contact_logs
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()) AND (unit_id IS NULL OR unit_id = ANY (public.allowed_unit_ids(auth.uid()))))
  WITH CHECK (public.is_staff(auth.uid()) AND (unit_id IS NULL OR unit_id = ANY (public.allowed_unit_ids(auth.uid()))));

CREATE INDEX IF NOT EXISTS contact_logs_client_idx ON public.contact_logs (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS contact_logs_lead_idx ON public.contact_logs (lead_id, created_at DESC);