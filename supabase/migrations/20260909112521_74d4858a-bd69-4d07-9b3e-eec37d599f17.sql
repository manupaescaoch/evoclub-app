ALTER TABLE public.metas
  ADD COLUMN IF NOT EXISTS meta_leads integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_receita_nova numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS plataforma text,
  ADD COLUMN IF NOT EXISTS campanha text,
  ADD COLUMN IF NOT EXISTS conjunto text,
  ADD COLUMN IF NOT EXISTS anuncio text,
  ADD COLUMN IF NOT EXISTS criativo text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS primeiro_canal text,
  ADD COLUMN IF NOT EXISTS primeiro_contato_at timestamptz,
  ADD COLUMN IF NOT EXISTS primeira_resposta_at timestamptz,
  ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS qualidade text NOT NULL DEFAULT 'valido',
  ADD COLUMN IF NOT EXISTS motivo_desqualificacao text,
  ADD COLUMN IF NOT EXISTS duplicado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS matricula_client_id integer REFERENCES public.clients(id) ON DELETE SET NULL;

UPDATE public.leads SET primeiro_contato_at = created_at WHERE primeiro_contato_at IS NULL;

ALTER TABLE public.interacoes
  ADD COLUMN IF NOT EXISTS status_confirmacao text,
  ADD COLUMN IF NOT EXISTS reagendada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS responsavel_presencial text,
  ADD COLUMN IF NOT EXISTS motivo_nao_fechamento text;

CREATE TABLE IF NOT EXISTS public.ad_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  date date NOT NULL,
  platform text NOT NULL DEFAULT 'meta',
  ad_account text,
  campaign text,
  adset text,
  ad text,
  status text,
  spend numeric(12,2) NOT NULL DEFAULT 0,
  reach integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  conversations integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ad_metrics_uniq
  ON public.ad_metrics (date, platform, coalesce(unit_id,'00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(campaign,''), coalesce(adset,''), coalesce(ad,''));
CREATE INDEX IF NOT EXISTS ad_metrics_unit_date_idx ON public.ad_metrics (unit_id, date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_metrics TO authenticated;
GRANT ALL ON public.ad_metrics TO service_role;
ALTER TABLE public.ad_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ad_metrics staff select" ON public.ad_metrics;
CREATE POLICY "ad_metrics staff select" ON public.ad_metrics FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (is_staff(auth.uid()) AND (
    unit_id IS NULL
    OR coalesce(array_length(allowed_unit_ids(auth.uid()), 1), 0) = 0
    OR unit_id = ANY (allowed_unit_ids(auth.uid()))
  ))
);

DROP POLICY IF EXISTS "ad_metrics crm write" ON public.ad_metrics;
CREATE POLICY "ad_metrics crm write" ON public.ad_metrics FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR can_module(auth.uid(), 'crm', 'edit'))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR can_module(auth.uid(), 'crm', 'edit'));

DROP TRIGGER IF EXISTS ad_metrics_set_updated_at ON public.ad_metrics;
CREATE TRIGGER ad_metrics_set_updated_at BEFORE UPDATE ON public.ad_metrics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();