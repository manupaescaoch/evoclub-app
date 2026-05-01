
-- 1. CONTRACTS
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contract_type TEXT,
  unit_id UUID,
  linked_plan TEXT,
  body TEXT,
  renewal_rules TEXT,
  cancellation_rules TEXT,
  penalty_value NUMERIC,
  validity_months INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage contracts" ON public.contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_contracts_updated BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. GRADE ACTIVITIES
CREATE TABLE public.grade_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  activity_group TEXT,
  color TEXT DEFAULT '#1400FF',
  duration_min INTEGER DEFAULT 60,
  max_capacity INTEGER DEFAULT 14,
  description TEXT,
  unit_id UUID,
  allow_booking BOOLEAN NOT NULL DEFAULT true,
  visible_to_student BOOLEAN NOT NULL DEFAULT true,
  internal_notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.grade_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage grade_activities" ON public.grade_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_grade_activities_updated BEFORE UPDATE ON public.grade_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. PERMISSION PROFILES (criar antes de collaborators para FK)
CREATE TABLE public.permission_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  modules JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.permission_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage permission_profiles" ON public.permission_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_permission_profiles_updated BEFORE UPDATE ON public.permission_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. COLLABORATORS
CREATE TABLE public.collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  photo_url TEXT,
  email TEXT,
  phone TEXT,
  cpf TEXT,
  role_title TEXT,
  permission_profile_id UUID REFERENCES public.permission_profiles(id) ON DELETE SET NULL,
  unit_id UUID,
  hired_at DATE,
  internal_notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage collaborators" ON public.collaborators FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_collaborators_updated BEFORE UPDATE ON public.collaborators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. SUPPLIERS
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT,
  category TEXT,
  zip_code TEXT,
  address TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  responsible TEXT,
  email TEXT,
  website TEXT,
  bank TEXT,
  bank_agency TEXT,
  bank_account TEXT,
  pix_key TEXT,
  commission NUMERIC,
  min_delivery_days INTEGER,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. SERVICES
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  category TEXT,
  default_value NUMERIC DEFAULT 0,
  financial_nature TEXT,
  revenue_center TEXT,
  accounting_code TEXT,
  tax_type TEXT,
  show_on_receipt BOOLEAN NOT NULL DEFAULT true,
  receipt_only BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage services" ON public.services FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. DISCOUNT COUPONS
CREATE TABLE public.discount_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  coupon_type TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  valid_from DATE,
  valid_to DATE,
  quantity_available INTEGER,
  quantity_used INTEGER NOT NULL DEFAULT 0,
  unit_id UUID,
  linked_plan TEXT,
  linked_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage discount_coupons" ON public.discount_coupons FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_discount_coupons_updated BEFORE UPDATE ON public.discount_coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed permission profiles
INSERT INTO public.permission_profiles (name, description, modules) VALUES
  ('Acesso Total', 'Acesso completo a todos os módulos', '{"dashboard":["view","create","edit","delete","export","approve"],"clientes":["view","create","edit","delete","export","approve"],"grade":["view","create","edit","delete","export","approve"],"agenda":["view","create","edit","delete","export","approve"],"crm":["view","create","edit","delete","export","approve"],"financeiro":["view","create","edit","delete","export","approve"],"gerencial":["view","create","edit","delete","export","approve"],"treinos":["view","create","edit","delete","export","approve"],"avaliacao":["view","create","edit","delete","export","approve"],"administrativo":["view","create","edit","delete","export","approve"],"configuracoes":["view","create","edit","delete","export","approve"]}'::jsonb),
  ('Consultor', 'Consultor comercial', '{"dashboard":["view"],"clientes":["view","create","edit"],"crm":["view","create","edit"]}'::jsonb),
  ('Coordenador Técnico', 'Coordenação técnica de treinos', '{"dashboard":["view"],"clientes":["view"],"treinos":["view","create","edit","delete","approve"],"avaliacao":["view","create","edit"]}'::jsonb),
  ('Coordenador de Vendas', 'Coordenação comercial', '{"dashboard":["view"],"clientes":["view","create","edit","export"],"crm":["view","create","edit","export","approve"],"financeiro":["view"]}'::jsonb),
  ('Financeiro', 'Equipe financeira', '{"dashboard":["view"],"financeiro":["view","create","edit","delete","export","approve"],"clientes":["view"]}'::jsonb),
  ('Professor', 'Professor / treinador', '{"dashboard":["view"],"clientes":["view"],"treinos":["view","create","edit"],"grade":["view"],"avaliacao":["view","create","edit"]}'::jsonb),
  ('Recepção', 'Recepção da unidade', '{"dashboard":["view"],"clientes":["view","create","edit"],"grade":["view"],"agenda":["view","create","edit"]}'::jsonb),
  ('Estagiário', 'Acesso restrito', '{"dashboard":["view"],"clientes":["view"],"treinos":["view"]}'::jsonb);
