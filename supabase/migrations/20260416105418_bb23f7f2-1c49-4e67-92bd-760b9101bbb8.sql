
-- Units
CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage units" ON public.units FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Clients
CREATE TABLE public.clients (
  id serial PRIMARY KEY,
  name text NOT NULL,
  email text,
  cpf text,
  phone text,
  status text CHECK (status IN ('AT','OP','SU','CA')) DEFAULT 'OP',
  plan text,
  plan_value numeric,
  contract_start date,
  contract_end date,
  unit_id uuid REFERENCES public.units(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage clients" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Classes (grade)
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text DEFAULT 'Musculação',
  trainer text,
  start_time time NOT NULL,
  end_time time NOT NULL,
  day_of_week int CHECK (day_of_week BETWEEN 0 AND 6),
  max_slots int DEFAULT 14,
  unit_id uuid REFERENCES public.units(id)
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage classes" ON public.classes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Class bookings
CREATE TABLE public.class_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES public.classes(id),
  client_id int REFERENCES public.clients(id),
  booked_at timestamptz DEFAULT now(),
  status text DEFAULT 'confirmed'
);
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage bookings" ON public.class_bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CRM automations
CREATE TABLE public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_rule text,
  segment text,
  active boolean DEFAULT true,
  unit_id uuid REFERENCES public.units(id)
);
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage automations" ON public.automations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sales / transactions
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id int REFERENCES public.clients(id),
  value numeric NOT NULL,
  type text CHECK (type IN ('matricula','renovacao','avulso')),
  payment_method text,
  installments int DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  unit_id uuid REFERENCES public.units(id)
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage sales" ON public.sales FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Cancellations
CREATE TABLE public.cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id int REFERENCES public.clients(id),
  reason text CHECK (reason IN ('financeiro','transferencia','tempo','outro')),
  cancelled_at timestamptz DEFAULT now(),
  unit_id uuid REFERENCES public.units(id)
);
ALTER TABLE public.cancellations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage cancellations" ON public.cancellations FOR ALL TO authenticated USING (true) WITH CHECK (true);
