-- ENUMS
DO $$ BEGIN
  CREATE TYPE public.lead_status_funil AS ENUM ('novo','contato_inicial','aula_agendada','aula_realizada','follow_up','negociacao','convertido','perdido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.lead_nivel_interesse AS ENUM ('alto','medio','baixo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.lead_taxa_status AS ENUM ('pendente','pago','isento');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- LEADS
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  email text,
  telefone text,
  telefone_normalizado text GENERATED ALWAYS AS (regexp_replace(coalesce(telefone,''), '[^0-9]', '', 'g')) STORED,
  origem text,
  status_funil public.lead_status_funil NOT NULL DEFAULT 'novo',
  nivel_interesse public.lead_nivel_interesse,
  data_aula_experimental timestamptz,
  hora_aula_experimental time,
  status_taxa_experimental public.lead_taxa_status,
  cadastrado_por text,
  atendido_por text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX leads_unidade_telefone_uniq
  ON public.leads (unidade_id, telefone_normalizado)
  WHERE telefone_normalizado <> '';
CREATE INDEX leads_unidade_created_idx ON public.leads (unidade_id, created_at DESC);
CREATE INDEX leads_status_idx ON public.leads (unidade_id, status_funil);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads staff select" ON public.leads FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR (public.is_staff(auth.uid()) AND (
    coalesce(array_length(public.allowed_unit_ids(auth.uid()),1),0) = 0
    OR unidade_id = ANY (public.allowed_unit_ids(auth.uid()))
  ))
);
CREATE POLICY "leads staff insert" ON public.leads FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR (public.is_staff(auth.uid()) AND (
    coalesce(array_length(public.allowed_unit_ids(auth.uid()),1),0) = 0
    OR unidade_id = ANY (public.allowed_unit_ids(auth.uid()))
  ))
);
CREATE POLICY "leads staff update" ON public.leads FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR (public.is_staff(auth.uid()) AND (
    coalesce(array_length(public.allowed_unit_ids(auth.uid()),1),0) = 0
    OR unidade_id = ANY (public.allowed_unit_ids(auth.uid()))
  ))
);
CREATE POLICY "leads admin delete" ON public.leads FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER leads_set_updated_at BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- INTERACOES
CREATE TABLE public.interacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  unidade_id uuid NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  tipo text NOT NULL DEFAULT 'contato',
  descricao text,
  agendou_experimental boolean NOT NULL DEFAULT false,
  data_experimental date,
  hora_experimental time,
  compareceu boolean,
  fechou_matricula boolean NOT NULL DEFAULT false,
  data_fechamento date,
  valor_plano numeric(12,2),
  plano_escolhido text,
  atendido_por text,
  cadastrado_por text,
  quem_agendou text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX interacoes_lead_idx ON public.interacoes (lead_id, created_at DESC);
CREATE INDEX interacoes_exp_idx ON public.interacoes (unidade_id, data_experimental);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interacoes TO authenticated;
GRANT ALL ON public.interacoes TO service_role;
ALTER TABLE public.interacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interacoes staff select" ON public.interacoes FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR (public.is_staff(auth.uid()) AND (
    coalesce(array_length(public.allowed_unit_ids(auth.uid()),1),0) = 0
    OR unidade_id = ANY (public.allowed_unit_ids(auth.uid()))
  ))
);
CREATE POLICY "interacoes staff insert" ON public.interacoes FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR (public.is_staff(auth.uid()) AND (
    coalesce(array_length(public.allowed_unit_ids(auth.uid()),1),0) = 0
    OR unidade_id = ANY (public.allowed_unit_ids(auth.uid()))
  ))
);
CREATE POLICY "interacoes staff update" ON public.interacoes FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR (public.is_staff(auth.uid()) AND (
    coalesce(array_length(public.allowed_unit_ids(auth.uid()),1),0) = 0
    OR unidade_id = ANY (public.allowed_unit_ids(auth.uid()))
  ))
);
CREATE POLICY "interacoes staff delete" ON public.interacoes FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR (public.is_staff(auth.uid()) AND created_by = auth.uid())
);

CREATE TRIGGER interacoes_set_updated_at BEFORE UPDATE ON public.interacoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- METAS
CREATE TABLE public.metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  mes_referencia date NOT NULL,
  meta_matriculas integer NOT NULL DEFAULT 0,
  meta_experimentais integer NOT NULL DEFAULT 0,
  alunos_ativos integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unidade_id, mes_referencia)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas TO authenticated;
GRANT ALL ON public.metas TO service_role;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metas staff select" ON public.metas FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR (public.is_staff(auth.uid()) AND (
    coalesce(array_length(public.allowed_unit_ids(auth.uid()),1),0) = 0
    OR unidade_id = ANY (public.allowed_unit_ids(auth.uid()))
  ))
);
CREATE POLICY "metas staff write" ON public.metas FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER metas_set_updated_at BEFORE UPDATE ON public.metas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();