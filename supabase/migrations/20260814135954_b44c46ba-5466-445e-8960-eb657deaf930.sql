-- 1. UNITS: capacidade, horários, raio do ponto e dados fiscais
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS default_capacity integer NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS timeclock_radius_m integer NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS state_registration text,
  ADD COLUMN IF NOT EXISTS municipal_registration text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS fiscal_address text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_units_updated ON public.units;
CREATE TRIGGER trg_units_updated BEFORE UPDATE ON public.units
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. COLABORADORES: conta de acesso, consolidado e liberação financeira
ALTER TABLE public.collaborators
  ADD COLUMN IF NOT EXISTS auth_user_id uuid,
  ADD COLUMN IF NOT EXISTS allow_consolidated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS financial_release boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS collaborators_auth_user_id_key
  ON public.collaborators(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- 3. UNIDADES DO COLABORADOR (escopo por unidade)
CREATE TABLE IF NOT EXISTS public.collaborator_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collaborator_id, unit_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborator_units TO authenticated;
GRANT ALL ON public.collaborator_units TO service_role;
ALTER TABLE public.collaborator_units ENABLE ROW LEVEL SECURITY;

-- 4. EXCEÇÕES INDIVIDUAIS DE PERMISSÃO
CREATE TABLE IF NOT EXISTS public.permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  module text NOT NULL,
  actions text[] NOT NULL DEFAULT '{}',
  mode text NOT NULL DEFAULT 'grant',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collaborator_id, module)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permission_overrides TO authenticated;
GRANT ALL ON public.permission_overrides TO service_role;
ALTER TABLE public.permission_overrides ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_permission_overrides_updated ON public.permission_overrides;
CREATE TRIGGER trg_permission_overrides_updated BEFORE UPDATE ON public.permission_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. AUDITORIA: módulo, antes/depois e dispositivo
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS module text,
  ADD COLUMN IF NOT EXISTS before_data jsonb,
  ADD COLUMN IF NOT EXISTS after_data jsonb,
  ADD COLUMN IF NOT EXISTS device text;

-- 6. FUNÇÕES DE PERMISSÃO
CREATE OR REPLACE FUNCTION public.current_collaborator_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.collaborators WHERE auth_user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _user_id AND role IN ('admin','coach','coordinator','viewer')
  ) OR EXISTS (
    SELECT 1 FROM public.collaborators
     WHERE auth_user_id = _user_id AND COALESCE(status,'active') = 'active'
  )
$$;

-- nível por módulo: retorna array de ações permitidas
CREATE OR REPLACE FUNCTION public.module_actions(_user_id uuid, _module text)
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _col record;
  _base text[] := '{}';
  _ovr record;
BEGIN
  IF public.has_role(_user_id, 'admin') THEN
    RETURN ARRAY['view','create','edit','delete','sensitive','export','approve'];
  END IF;

  SELECT c.id, c.permission_profile_id INTO _col
    FROM public.collaborators c
   WHERE c.auth_user_id = _user_id AND COALESCE(c.status,'active') = 'active'
   LIMIT 1;

  IF _col.id IS NULL THEN
    -- sem cadastro de colaborador: usa papel legado
    IF public.has_role(_user_id, 'coordinator') THEN
      RETURN ARRAY['view','create','edit','delete','sensitive'];
    ELSIF public.has_role(_user_id, 'coach') THEN
      RETURN ARRAY['view','create','edit'];
    ELSIF public.has_role(_user_id, 'viewer') THEN
      RETURN ARRAY['view'];
    END IF;
    RETURN '{}';
  END IF;

  SELECT COALESCE(
    (SELECT array_agg(x)::text[] FROM jsonb_array_elements_text(pp.modules -> _module) x),
    '{}')
    INTO _base
    FROM public.permission_profiles pp
   WHERE pp.id = _col.permission_profile_id;

  _base := COALESCE(_base, '{}');

  SELECT * INTO _ovr FROM public.permission_overrides
   WHERE collaborator_id = _col.id AND module = _module LIMIT 1;

  IF _ovr.id IS NOT NULL THEN
    IF _ovr.mode = 'revoke' THEN
      SELECT COALESCE(array_agg(a), '{}') INTO _base
        FROM unnest(_base) a WHERE NOT (a = ANY(_ovr.actions));
    ELSE
      SELECT COALESCE(array_agg(DISTINCT a), '{}') INTO _base
        FROM unnest(_base || _ovr.actions) a;
    END IF;
  END IF;

  RETURN COALESCE(_base, '{}');
END;
$$;

CREATE OR REPLACE FUNCTION public.can_module(_user_id uuid, _module text, _action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _action = ANY(public.module_actions(_user_id, _module))
$$;

CREATE OR REPLACE FUNCTION public.has_financial_release(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR EXISTS (SELECT 1 FROM public.collaborators
                  WHERE auth_user_id = _user_id
                    AND COALESCE(status,'active') = 'active'
                    AND financial_release)
$$;

CREATE OR REPLACE FUNCTION public.allowed_unit_ids(_user_id uuid)
RETURNS uuid[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _col record; _ids uuid[];
BEGIN
  IF public.has_role(_user_id, 'admin') THEN
    SELECT array_agg(id) INTO _ids FROM public.units;
    RETURN COALESCE(_ids, '{}');
  END IF;
  SELECT id, unit_id, allow_consolidated INTO _col
    FROM public.collaborators WHERE auth_user_id = _user_id LIMIT 1;
  IF _col.id IS NULL THEN
    SELECT array_agg(id) INTO _ids FROM public.units;
    RETURN COALESCE(_ids, '{}');
  END IF;
  SELECT COALESCE(array_agg(DISTINCT u), '{}') INTO _ids
    FROM (
      SELECT unit_id AS u FROM public.collaborator_units WHERE collaborator_id = _col.id
      UNION SELECT _col.unit_id WHERE _col.unit_id IS NOT NULL
    ) s WHERE u IS NOT NULL;
  RETURN COALESCE(_ids, '{}');
END;
$$;

CREATE OR REPLACE FUNCTION public.can_consolidated(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR NOT EXISTS (SELECT 1 FROM public.collaborators WHERE auth_user_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.collaborators
                  WHERE auth_user_id = _user_id AND allow_consolidated)
$$;

-- 7. RLS das novas tabelas
DROP POLICY IF EXISTS "staff read collaborator units" ON public.collaborator_units;
CREATE POLICY "staff read collaborator units" ON public.collaborator_units
FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "manage collaborator units" ON public.collaborator_units;
CREATE POLICY "manage collaborator units" ON public.collaborator_units
FOR ALL TO authenticated
USING (public.can_module(auth.uid(), 'gerencial', 'edit'))
WITH CHECK (public.can_module(auth.uid(), 'gerencial', 'edit'));

DROP POLICY IF EXISTS "staff read permission overrides" ON public.permission_overrides;
CREATE POLICY "staff read permission overrides" ON public.permission_overrides
FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "manage permission overrides" ON public.permission_overrides;
CREATE POLICY "manage permission overrides" ON public.permission_overrides
FOR ALL TO authenticated
USING (public.can_module(auth.uid(), 'gerencial', 'sensitive'))
WITH CHECK (public.can_module(auth.uid(), 'gerencial', 'sensitive'));

-- 8. LIBERAÇÃO FINANCEIRA no banco: baixa/estorno de contas a pagar
CREATE OR REPLACE FUNCTION public.guard_financial_release()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR (NEW.status IS DISTINCT FROM OLD.status AND (NEW.status = 'paid' OR OLD.status = 'paid')) THEN
    IF NOT public.has_financial_release(auth.uid()) THEN
      RAISE EXCEPTION 'Sem LIBERAÇÃO FINANCEIRA para dar baixa, estornar ou corrigir baixa';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ap_financial_release ON public.accounts_payable;
CREATE TRIGGER trg_ap_financial_release BEFORE UPDATE ON public.accounts_payable
FOR EACH ROW EXECUTE FUNCTION public.guard_financial_release();