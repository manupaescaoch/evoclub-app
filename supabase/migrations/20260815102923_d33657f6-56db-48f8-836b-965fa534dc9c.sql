-- 1. transactions: client link, due/paid dates, cost center
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS client_id integer REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS paid_at date,
  ADD COLUMN IF NOT EXISTS cost_center text;

UPDATE public.transactions SET due_date = date WHERE due_date IS NULL;
UPDATE public.transactions SET paid_at = date WHERE paid_at IS NULL AND status = 'paid';

CREATE INDEX IF NOT EXISTS transactions_due_status_idx ON public.transactions(due_date, status);
CREATE INDEX IF NOT EXISTS transactions_client_idx ON public.transactions(client_id);

-- 2. Descontos / Estornos
CREATE TABLE IF NOT EXISTS public.financial_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  client_id integer REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text,
  kind text NOT NULL DEFAULT 'discount',           -- discount | refund | chargeback | writeoff
  amount numeric NOT NULL DEFAULT 0,
  reason text,
  coupon text,
  status text NOT NULL DEFAULT 'applied',          -- applied | cancelled
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_adjustments TO authenticated;
GRANT ALL ON public.financial_adjustments TO service_role;
ALTER TABLE public.financial_adjustments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fin_adj_read ON public.financial_adjustments;
CREATE POLICY fin_adj_read ON public.financial_adjustments FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS fin_adj_write ON public.financial_adjustments;
CREATE POLICY fin_adj_write ON public.financial_adjustments FOR ALL TO authenticated
  USING (public.has_financial_release(auth.uid()))
  WITH CHECK (public.has_financial_release(auth.uid()));

-- 3. Fechamentos
CREATE TABLE IF NOT EXISTS public.financial_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'closed',           -- closed | reopened
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  closed_by uuid,
  closed_by_name text,
  closed_at timestamptz NOT NULL DEFAULT now(),
  reopened_by_name text,
  reopened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS financial_closings_uniq
  ON public.financial_closings(COALESCE(unit_id,'00000000-0000-0000-0000-000000000000'::uuid), period_start, period_end);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_closings TO authenticated;
GRANT ALL ON public.financial_closings TO service_role;
ALTER TABLE public.financial_closings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fin_clos_read ON public.financial_closings;
CREATE POLICY fin_clos_read ON public.financial_closings FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS fin_clos_write ON public.financial_closings;
CREATE POLICY fin_clos_write ON public.financial_closings FOR ALL TO authenticated
  USING (public.has_financial_release(auth.uid()))
  WITH CHECK (public.has_financial_release(auth.uid()));

-- guard: no movement inside a closed period
CREATE OR REPLACE FUNCTION public.guard_closed_period()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _d date; _u uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  _d := COALESCE(NEW.date, OLD.date);
  _u := COALESCE(NEW.unit_id, OLD.unit_id);
  IF EXISTS (
    SELECT 1 FROM public.financial_closings c
     WHERE c.status = 'closed'
       AND _d BETWEEN c.period_start AND c.period_end
       AND (c.unit_id IS NULL OR c.unit_id = _u)
  ) THEN
    RAISE EXCEPTION 'Período já fechado. Reabra o fechamento para alterar lançamentos desta data.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;
DROP TRIGGER IF EXISTS trg_transactions_closed_period ON public.transactions;
CREATE TRIGGER trg_transactions_closed_period
  BEFORE INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.guard_closed_period();

-- 4. Forecast com cenários
CREATE TABLE IF NOT EXISTS public.forecast_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  name text NOT NULL,
  year integer NOT NULL,
  base_revenue numeric NOT NULL DEFAULT 0,
  growth_pct numeric NOT NULL DEFAULT 0,
  churn_pct numeric NOT NULL DEFAULT 0,
  ticket numeric NOT NULL DEFAULT 0,
  variable_cost_pct numeric NOT NULL DEFAULT 0,
  fixed_cost numeric NOT NULL DEFAULT 0,
  tax_pct numeric NOT NULL DEFAULT 0,
  notes text,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forecast_scenarios TO authenticated;
GRANT ALL ON public.forecast_scenarios TO service_role;
ALTER TABLE public.forecast_scenarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fin_fc_read ON public.forecast_scenarios;
CREATE POLICY fin_fc_read ON public.forecast_scenarios FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS fin_fc_write ON public.forecast_scenarios;
CREATE POLICY fin_fc_write ON public.forecast_scenarios FOR ALL TO authenticated
  USING (public.can_module(auth.uid(),'financeiro','edit'))
  WITH CHECK (public.can_module(auth.uid(),'financeiro','edit'));

-- 5. Inadimplência
CREATE OR REPLACE FUNCTION public.fin_delinquency(_unit uuid DEFAULT NULL, _ref date DEFAULT NULL)
RETURNS TABLE (
  id uuid, unit_id uuid, unit_name text, client_id integer, client_name text,
  description text, amount numeric, due_date date, days_late integer, bucket text,
  phone text, status text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH ref AS (SELECT COALESCE(_ref, (public.br_now())::date) AS d)
  SELECT t.id, t.unit_id, u.name,
         t.client_id, COALESCE(c.name, t.description) AS client_name,
         t.description, t.amount, COALESCE(t.due_date, t.date) AS due_date,
         GREATEST(0, ((SELECT d FROM ref) - COALESCE(t.due_date, t.date)))::int AS days_late,
         CASE
           WHEN ((SELECT d FROM ref) - COALESCE(t.due_date, t.date)) <= 5 THEN '1-5'
           WHEN ((SELECT d FROM ref) - COALESCE(t.due_date, t.date)) <= 15 THEN '6-15'
           WHEN ((SELECT d FROM ref) - COALESCE(t.due_date, t.date)) <= 30 THEN '16-30'
           WHEN ((SELECT d FROM ref) - COALESCE(t.due_date, t.date)) <= 60 THEN '31-60'
           ELSE '60+'
         END AS bucket,
         c.phone, t.status
    FROM public.transactions t
    LEFT JOIN public.clients c ON c.id = t.client_id
    LEFT JOIN public.units u ON u.id = t.unit_id
   WHERE t.kind = 'income'
     AND COALESCE(t.status,'pending') NOT IN ('paid','cancelled')
     AND COALESCE(t.due_date, t.date) < (SELECT d FROM ref)
     AND (_unit IS NULL OR t.unit_id = _unit)
     AND public.is_staff(auth.uid())
   ORDER BY COALESCE(t.due_date, t.date) ASC
$$;

-- 6. Fechar / reabrir período
CREATE OR REPLACE FUNCTION public.fin_close_period(_unit uuid, _start date, _end date, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _t jsonb; _id uuid; _name text;
BEGIN
  IF NOT public.has_financial_release(auth.uid()) THEN
    RAISE EXCEPTION 'Sem LIBERAÇÃO FINANCEIRA para fechar período';
  END IF;
  SELECT jsonb_build_object(
           'income', COALESCE(SUM(CASE WHEN kind='income' AND status='paid' THEN amount END),0),
           'expense', COALESCE(SUM(CASE WHEN kind='expense' AND status='paid' THEN amount END),0),
           'pending', COALESCE(SUM(CASE WHEN status <> 'paid' THEN amount END),0),
           'count', COUNT(*))
    INTO _t
    FROM public.transactions
   WHERE date BETWEEN _start AND _end AND (_unit IS NULL OR unit_id = _unit);

  SELECT COALESCE(name, email) INTO _name FROM public.collaborators WHERE auth_user_id = auth.uid() LIMIT 1;

  INSERT INTO public.financial_closings(unit_id, period_start, period_end, status, totals, notes, closed_by, closed_by_name)
  VALUES (_unit, _start, _end, 'closed', _t, _notes, auth.uid(), _name)
  ON CONFLICT (COALESCE(unit_id,'00000000-0000-0000-0000-000000000000'::uuid), period_start, period_end)
  DO UPDATE SET status='closed', totals=EXCLUDED.totals, notes=COALESCE(EXCLUDED.notes, financial_closings.notes),
                closed_by=auth.uid(), closed_by_name=EXCLUDED.closed_by_name, closed_at=now(),
                reopened_at=NULL, reopened_by_name=NULL
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.fin_reopen_period(_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _name text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Somente a gerência (admin) pode reabrir um fechamento';
  END IF;
  SELECT COALESCE(name, email) INTO _name FROM public.collaborators WHERE auth_user_id = auth.uid() LIMIT 1;
  UPDATE public.financial_closings
     SET status='reopened', reopened_at=now(), reopened_by_name=_name,
         notes = COALESCE(notes,'') || CASE WHEN _reason IS NULL THEN '' ELSE ' | reabertura: ' || _reason END
   WHERE id = _id;
END; $$;

-- 7. Aplicar desconto / estorno
CREATE OR REPLACE FUNCTION public.fin_adjust(
  _transaction_id uuid, _kind text, _amount numeric, _reason text DEFAULT NULL, _coupon text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _t public.transactions; _id uuid; _name text; _cname text;
BEGIN
  IF NOT public.has_financial_release(auth.uid()) THEN
    RAISE EXCEPTION 'Sem LIBERAÇÃO FINANCEIRA para lançar desconto ou estorno';
  END IF;
  SELECT * INTO _t FROM public.transactions WHERE id = _transaction_id;
  IF _t.id IS NULL THEN RAISE EXCEPTION 'Lançamento não encontrado'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  IF _amount > _t.amount THEN RAISE EXCEPTION 'Valor maior que o lançamento'; END IF;

  SELECT COALESCE(name, email) INTO _name FROM public.collaborators WHERE auth_user_id = auth.uid() LIMIT 1;
  SELECT name INTO _cname FROM public.clients WHERE id = _t.client_id;

  INSERT INTO public.financial_adjustments(unit_id, transaction_id, client_id, client_name, kind, amount, reason, coupon, created_by, created_by_name)
  VALUES (_t.unit_id, _t.id, _t.client_id, _cname, _kind, _amount, _reason, _coupon, auth.uid(), _name)
  RETURNING id INTO _id;

  IF _kind = 'discount' THEN
    UPDATE public.transactions SET amount = amount - _amount, updated_at = now() WHERE id = _t.id;
  ELSIF _kind IN ('refund','chargeback') THEN
    INSERT INTO public.transactions(unit_id, date, description, kind, category_name, amount, payment_method, status, reference, client_id, due_date, paid_at, cost_center, notes)
    VALUES (_t.unit_id, (public.br_now())::date,
            'Estorno — ' || COALESCE(_t.description,''), 'expense', 'Estornos', _amount,
            _t.payment_method, 'paid', _t.id::text, _t.client_id, (public.br_now())::date, (public.br_now())::date, _t.cost_center, _reason);
  ELSIF _kind = 'writeoff' THEN
    UPDATE public.transactions SET status = 'cancelled', notes = COALESCE(notes,'') || ' | baixa por perda', updated_at = now() WHERE id = _t.id;
  END IF;

  RETURN _id;
END; $$;

-- 8. DRE com drill-down, centro de custo e rateio
CREATE OR REPLACE FUNCTION public.fin_dre(_unit uuid DEFAULT NULL, _start date DEFAULT NULL, _end date DEFAULT NULL, _allocate boolean DEFAULT false)
RETURNS TABLE (
  kind text, group_name text, category_name text, cost_center text,
  unit_id uuid, unit_name text, month integer, amount numeric, allocated numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _share jsonb; _total numeric;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Sem acesso'; END IF;

  SELECT COALESCE(SUM(amount),0) INTO _total FROM public.transactions
   WHERE kind='income' AND unit_id IS NOT NULL AND date BETWEEN COALESCE(_start,'1900-01-01') AND COALESCE(_end,'2999-12-31');

  RETURN QUERY
  WITH base AS (
    SELECT t.kind, COALESCE(g.name,'Sem grupo') AS group_name,
           COALESCE(t.category_name,'Sem categoria') AS category_name,
           COALESCE(t.cost_center,'Não rateado') AS cost_center,
           t.unit_id, u.name AS unit_name,
           EXTRACT(MONTH FROM t.date)::int AS month,
           SUM(t.amount) AS amount
      FROM public.transactions t
      LEFT JOIN public.financial_groups g ON g.id = t.group_id
      LEFT JOIN public.units u ON u.id = t.unit_id
     WHERE t.date BETWEEN COALESCE(_start,'1900-01-01') AND COALESCE(_end,'2999-12-31')
       AND (_unit IS NULL OR t.unit_id = _unit OR (_allocate AND t.unit_id IS NULL))
     GROUP BY 1,2,3,4,5,6,7
  ),
  rev AS (
    SELECT t.unit_id, SUM(t.amount) AS r FROM public.transactions t
     WHERE t.kind='income' AND t.unit_id IS NOT NULL
       AND t.date BETWEEN COALESCE(_start,'1900-01-01') AND COALESCE(_end,'2999-12-31')
     GROUP BY 1
  )
  SELECT b.kind, b.group_name, b.category_name, b.cost_center, b.unit_id, b.unit_name, b.month, b.amount,
         CASE
           WHEN _allocate AND b.unit_id IS NULL AND _unit IS NOT NULL AND _total > 0
             THEN b.amount * COALESCE((SELECT r FROM rev WHERE rev.unit_id = _unit),0) / _total
           ELSE b.amount
         END AS allocated
    FROM base b;
END; $$;