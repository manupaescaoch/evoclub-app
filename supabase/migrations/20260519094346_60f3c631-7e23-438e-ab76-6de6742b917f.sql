
-- Financial groups
CREATE TABLE public.financial_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'expense', -- income | expense
  color text DEFAULT '#1400FF',
  unit_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.financial_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage financial_groups" ON public.financial_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Financial categories
CREATE TABLE public.financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'expense',
  group_id uuid REFERENCES public.financial_groups(id) ON DELETE SET NULL,
  color text DEFAULT '#1400FF',
  unit_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage financial_categories" ON public.financial_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Accounts payable
CREATE TABLE public.accounts_payable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name text,
  category_id uuid REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  category_name text,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  paid_at date,
  priority text DEFAULT 'medium', -- low | medium | high
  status text NOT NULL DEFAULT 'pending', -- pending | paid | overdue | cancelled
  payment_method text,
  recurrence text, -- none | monthly | weekly | yearly
  notes text,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage accounts_payable" ON public.accounts_payable FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_ap_unit ON public.accounts_payable(unit_id);
CREATE INDEX idx_ap_due ON public.accounts_payable(due_date);
CREATE INDEX idx_ap_status ON public.accounts_payable(status);

-- Transactions
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid,
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  kind text NOT NULL DEFAULT 'income', -- income | expense
  group_id uuid REFERENCES public.financial_groups(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  category_name text,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  status text NOT NULL DEFAULT 'paid', -- paid | pending | scheduled | cancelled
  reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage transactions" ON public.transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_tx_unit ON public.transactions(unit_id);
CREATE INDEX idx_tx_date ON public.transactions(date);
CREATE INDEX idx_tx_kind ON public.transactions(kind);

-- Payroll runs
CREATE TABLE public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid,
  month int NOT NULL,
  year int NOT NULL,
  status text NOT NULL DEFAULT 'draft', -- draft | validated | approved | paid
  total_gross numeric DEFAULT 0,
  total_net numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage payroll_runs" ON public.payroll_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Payroll items
CREATE TABLE public.payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  collaborator_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL,
  name text NOT NULL,
  cpf text,
  contract_type text,
  salary numeric DEFAULT 0,
  commission numeric DEFAULT 0,
  bonus numeric DEFAULT 0,
  discounts numeric DEFAULT 0,
  advances numeric DEFAULT 0,
  net_value numeric DEFAULT 0,
  payment_method text,
  pix_key text,
  bank_info text,
  status text NOT NULL DEFAULT 'pending', -- pending | paid
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage payroll_items" ON public.payroll_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_pi_run ON public.payroll_items(run_id);

-- Triggers updated_at
CREATE TRIGGER trg_fg_upd BEFORE UPDATE ON public.financial_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fc_upd BEFORE UPDATE ON public.financial_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ap_upd BEFORE UPDATE ON public.accounts_payable FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tx_upd BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pr_upd BEFORE UPDATE ON public.payroll_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pi_upd BEFORE UPDATE ON public.payroll_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
