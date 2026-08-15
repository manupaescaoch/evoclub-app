
CREATE TABLE IF NOT EXISTS public.cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'operacao',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_centers TO authenticated;
GRANT ALL ON public.cost_centers TO service_role;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage cost centers" ON public.cost_centers FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

INSERT INTO public.cost_centers (name)
SELECT DISTINCT cost_center FROM public.transactions
WHERE cost_center IS NOT NULL AND btrim(cost_center) <> '';

CREATE TABLE IF NOT EXISTS public.cost_allocation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  pct numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_allocation_rules TO authenticated;
GRANT ALL ON public.cost_allocation_rules TO service_role;
ALTER TABLE public.cost_allocation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage allocation rules" ON public.cost_allocation_rules FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  name text NOT NULL,
  bank_name text,
  bank_code text,
  agency text,
  account_number text,
  account_type text NOT NULL DEFAULT 'checking',
  provider text NOT NULL DEFAULT 'manual',
  provider_account_id text,
  provider_status text,
  last_sync_at timestamptz,
  opening_balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage bank accounts" ON public.bank_accounts FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.bank_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'csv',
  file_name text,
  total_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  duplicate_rows integer NOT NULL DEFAULT 0,
  auto_matched integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_import_batches TO authenticated;
GRANT ALL ON public.bank_import_batches TO service_role;
ALTER TABLE public.bank_import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage import batches" ON public.bank_import_batches FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  batch_id uuid REFERENCES public.bank_import_batches(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
  posted_at date NOT NULL,
  amount numeric NOT NULL,
  direction text NOT NULL DEFAULT 'in',
  description text,
  memo text,
  bank_ref text,
  payment_method text,
  status text NOT NULL DEFAULT 'pending',
  match_type text,
  match_id uuid,
  match_client_id integer,
  match_confidence numeric,
  matched_at timestamptz,
  matched_by uuid,
  matched_by_name text,
  notes text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS bank_transactions_ref_uniq
  ON public.bank_transactions (bank_account_id, bank_ref) WHERE bank_ref IS NOT NULL AND parent_id IS NULL;
CREATE INDEX IF NOT EXISTS bank_transactions_lookup
  ON public.bank_transactions (bank_account_id, posted_at, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transactions TO authenticated;
GRANT ALL ON public.bank_transactions TO service_role;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read bank transactions" ON public.bank_transactions FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write bank transactions" ON public.bank_transactions FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update bank transactions" ON public.bank_transactions FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "release delete bank transactions" ON public.bank_transactions FOR DELETE TO authenticated
  USING (public.has_financial_release(auth.uid()));

CREATE TABLE IF NOT EXISTS public.forecast_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  scenario text NOT NULL DEFAULT 'base',
  horizon_days integer NOT NULL DEFAULT 30,
  period_start date NOT NULL,
  period_end date NOT NULL,
  predicted_income numeric NOT NULL DEFAULT 0,
  predicted_expense numeric NOT NULL DEFAULT 0,
  contracted numeric NOT NULL DEFAULT 0,
  probable numeric NOT NULL DEFAULT 0,
  at_risk numeric NOT NULL DEFAULT 0,
  realized_income numeric,
  realized_expense numeric,
  accuracy_pct numeric,
  closed_at timestamptz,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forecast_snapshots TO authenticated;
GRANT ALL ON public.forecast_snapshots TO service_role;
ALTER TABLE public.forecast_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage forecast snapshots" ON public.forecast_snapshots FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER trg_cost_centers_updated BEFORE UPDATE ON public.cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bank_accounts_updated BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bank_transactions_updated BEFORE UPDATE ON public.bank_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.bank_match_candidates(_movement_id uuid)
RETURNS TABLE (
  target_type text, target_id uuid, client_id integer, label text,
  due_date date, amount numeric, exact boolean, confidence numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.bank_transactions;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;
  SELECT * INTO m FROM public.bank_transactions WHERE id = _movement_id;
  IF m.id IS NULL THEN RETURN; END IF;

  IF m.direction = 'in' THEN
    RETURN QUERY
    SELECT 'transaction'::text, t.id, t.client_id,
           coalesce(t.description, t.category_name, 'Recebimento'),
           coalesce(t.due_date, t.date),
           t.amount,
           (t.amount = abs(m.amount) AND coalesce(t.due_date, t.date) = m.posted_at),
           (CASE WHEN t.amount = abs(m.amount) THEN 60 ELSE greatest(0, 40 - abs(t.amount - abs(m.amount))) END
            + CASE WHEN coalesce(t.due_date, t.date) = m.posted_at THEN 40
                   ELSE greatest(0, 30 - abs(coalesce(t.due_date, t.date) - m.posted_at) * 3) END)::numeric
    FROM public.transactions t
    WHERE t.kind = 'income' AND t.status <> 'cancelled'
      AND (m.unit_id IS NULL OR t.unit_id IS NULL OR t.unit_id = m.unit_id)
      AND abs(t.amount - abs(m.amount)) <= greatest(5, abs(m.amount) * 0.05)
      AND coalesce(t.due_date, t.date) BETWEEN m.posted_at - 15 AND m.posted_at + 15
    ORDER BY 8 DESC LIMIT 20;
  ELSE
    RETURN QUERY
    SELECT 'payable'::text, p.id, NULL::integer,
           coalesce(p.description, p.supplier_name, 'Conta a pagar'),
           p.due_date, p.amount,
           (p.amount = abs(m.amount) AND p.due_date = m.posted_at),
           (CASE WHEN p.amount = abs(m.amount) THEN 60 ELSE greatest(0, 40 - abs(p.amount - abs(m.amount))) END
            + CASE WHEN p.due_date = m.posted_at THEN 40
                   ELSE greatest(0, 30 - abs(p.due_date - m.posted_at) * 3) END)::numeric
    FROM public.accounts_payable p
    WHERE p.status <> 'cancelled'
      AND (m.unit_id IS NULL OR p.unit_id IS NULL OR p.unit_id = m.unit_id)
      AND abs(p.amount - abs(m.amount)) <= greatest(5, abs(m.amount) * 0.05)
      AND p.due_date BETWEEN m.posted_at - 15 AND m.posted_at + 15
    ORDER BY 8 DESC
    LIMIT 20;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.bank_reconcile(_movement_id uuid, _target_type text, _target_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.bank_transactions; v_client integer;
BEGIN
  IF NOT public.has_financial_release(auth.uid()) THEN RAISE EXCEPTION 'Liberação financeira necessária'; END IF;
  SELECT * INTO m FROM public.bank_transactions WHERE id = _movement_id;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Movimentação não encontrada'; END IF;
  IF m.status = 'reconciled' THEN RAISE EXCEPTION 'Movimentação já conciliada'; END IF;

  IF _target_type = 'transaction' THEN
    UPDATE public.transactions
       SET status = 'paid', paid_at = m.posted_at, updated_at = now()
     WHERE id = _target_id
     RETURNING client_id INTO v_client;
  ELSIF _target_type = 'payable' THEN
    UPDATE public.accounts_payable
       SET status = 'paid', paid_at = m.posted_at, updated_at = now()
     WHERE id = _target_id;
  ELSE
    RAISE EXCEPTION 'Tipo inválido';
  END IF;

  UPDATE public.bank_transactions
     SET status = 'reconciled', match_type = _target_type, match_id = _target_id,
         match_client_id = v_client, matched_at = now(), matched_by = auth.uid(),
         updated_at = now()
   WHERE id = _movement_id;

  RETURN jsonb_build_object('ok', true, 'client_id', v_client);
END $$;

CREATE OR REPLACE FUNCTION public.bank_set_status(_movement_id uuid, _status text, _notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_financial_release(auth.uid()) THEN RAISE EXCEPTION 'Liberação financeira necessária'; END IF;
  IF _status NOT IN ('pending','ignored') THEN RAISE EXCEPTION 'Status inválido'; END IF;
  UPDATE public.bank_transactions
     SET status = _status, notes = coalesce(_notes, notes),
         match_type = NULL, match_id = NULL, matched_at = NULL, updated_at = now()
   WHERE id = _movement_id;
END $$;

CREATE OR REPLACE FUNCTION public.bank_split(_movement_id uuid, _parts numeric[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.bank_transactions; s numeric := 0; p numeric; n integer := 0;
BEGIN
  IF NOT public.has_financial_release(auth.uid()) THEN RAISE EXCEPTION 'Liberação financeira necessária'; END IF;
  SELECT * INTO m FROM public.bank_transactions WHERE id = _movement_id;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Movimentação não encontrada'; END IF;
  IF m.status = 'reconciled' THEN RAISE EXCEPTION 'Movimentação já conciliada'; END IF;
  SELECT sum(x) INTO s FROM unnest(_parts) x;
  IF s IS NULL OR round(s, 2) <> round(abs(m.amount), 2) THEN
    RAISE EXCEPTION 'A soma das partes deve ser igual ao valor da movimentação';
  END IF;
  FOREACH p IN ARRAY _parts LOOP
    n := n + 1;
    INSERT INTO public.bank_transactions (
      bank_account_id, unit_id, batch_id, parent_id, posted_at, amount, direction,
      description, memo, payment_method, status, raw
    ) VALUES (
      m.bank_account_id, m.unit_id, m.batch_id, m.id, m.posted_at,
      CASE WHEN m.amount < 0 THEN -p ELSE p END, m.direction,
      coalesce(m.description, 'Movimentação') || ' (parte ' || n || ')',
      m.memo, m.payment_method, 'pending', m.raw
    );
  END LOOP;
  UPDATE public.bank_transactions SET status = 'split', updated_at = now() WHERE id = _movement_id;
  RETURN jsonb_build_object('ok', true, 'parts', n);
END $$;

CREATE OR REPLACE FUNCTION public.bank_create_entry(
  _movement_id uuid, _category_name text, _cost_center text DEFAULT NULL,
  _client_id integer DEFAULT NULL, _description text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.bank_transactions; new_id uuid;
BEGIN
  IF NOT public.has_financial_release(auth.uid()) THEN RAISE EXCEPTION 'Liberação financeira necessária'; END IF;
  SELECT * INTO m FROM public.bank_transactions WHERE id = _movement_id;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Movimentação não encontrada'; END IF;

  INSERT INTO public.transactions (
    unit_id, date, due_date, paid_at, description, kind, category_name,
    amount, payment_method, status, reference, client_id, cost_center
  ) VALUES (
    m.unit_id, m.posted_at, m.posted_at, m.posted_at,
    coalesce(_description, m.description, 'Lançamento conciliado'),
    CASE WHEN m.direction = 'in' THEN 'income' ELSE 'expense' END,
    _category_name, abs(m.amount), coalesce(m.payment_method, 'transfer'),
    'paid', m.bank_ref, _client_id, _cost_center
  ) RETURNING id INTO new_id;

  UPDATE public.bank_transactions
     SET status = 'reconciled', match_type = 'transaction', match_id = new_id,
         match_client_id = _client_id, matched_at = now(), matched_by = auth.uid(), updated_at = now()
   WHERE id = _movement_id;

  RETURN jsonb_build_object('ok', true, 'transaction_id', new_id);
END $$;

CREATE OR REPLACE FUNCTION public.bank_auto_match(_bank_account_id uuid, _batch_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; c record; auto integer := 0; sugg integer := 0;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;
  FOR r IN
    SELECT * FROM public.bank_transactions
     WHERE bank_account_id = _bank_account_id
       AND status = 'pending'
       AND (_batch_id IS NULL OR batch_id = _batch_id)
  LOOP
    SELECT * INTO c FROM public.bank_match_candidates(r.id) LIMIT 1;
    IF c.target_id IS NULL THEN CONTINUE; END IF;
    IF c.exact THEN
      PERFORM public.bank_reconcile(r.id, c.target_type, c.target_id);
      auto := auto + 1;
    ELSE
      UPDATE public.bank_transactions
         SET status = 'suggested', match_type = c.target_type, match_id = c.target_id,
             match_client_id = c.client_id, match_confidence = c.confidence, updated_at = now()
       WHERE id = r.id;
      sugg := sugg + 1;
    END IF;
  END LOOP;
  IF _batch_id IS NOT NULL THEN
    UPDATE public.bank_import_batches SET auto_matched = auto WHERE id = _batch_id;
  END IF;
  RETURN jsonb_build_object('auto', auto, 'suggested', sugg);
END $$;

CREATE OR REPLACE FUNCTION public.fin_forecast(_unit_id uuid, _from date, _to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_contracted numeric := 0; v_probable numeric := 0; v_risk numeric := 0;
  v_expense numeric := 0; v_overdue numeric := 0; v_days jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;

  SELECT coalesce(sum(amount), 0) INTO v_contracted
    FROM public.transactions
   WHERE kind = 'income' AND status IN ('pending','scheduled','paid')
     AND coalesce(due_date, date) BETWEEN _from AND _to
     AND (_unit_id IS NULL OR unit_id = _unit_id);

  SELECT coalesce(sum(coalesce(proposal_value, current_value, 0)), 0) INTO v_probable
    FROM public.renewal_requests
   WHERE status NOT IN ('renovado','perdido','cancelado')
     AND coalesce(next_cycle_start, cycle_end) BETWEEN _from AND _to
     AND (_unit_id IS NULL OR unit_id = _unit_id);

  SELECT coalesce(sum(c.plan_value), 0) INTO v_risk
    FROM public.client_contracts c
   WHERE c.status = 'signed' AND c.ends_at BETWEEN _from AND _to
     AND (_unit_id IS NULL OR c.unit_id = _unit_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.renewal_requests r
        WHERE r.client_id = c.client_id AND r.status NOT IN ('perdido','cancelado')
     );

  SELECT coalesce(sum(amount), 0) INTO v_overdue
    FROM public.transactions
   WHERE kind = 'income' AND status IN ('pending','overdue')
     AND coalesce(due_date, date) < _from
     AND (_unit_id IS NULL OR unit_id = _unit_id);

  SELECT coalesce(sum(amount), 0) INTO v_expense
    FROM (
      SELECT amount FROM public.transactions
       WHERE kind = 'expense' AND status <> 'cancelled'
         AND coalesce(due_date, date) BETWEEN _from AND _to
         AND (_unit_id IS NULL OR unit_id = _unit_id)
      UNION ALL
      SELECT amount FROM public.accounts_payable
       WHERE status IN ('pending','overdue','scheduled')
         AND due_date BETWEEN _from AND _to
         AND (_unit_id IS NULL OR unit_id = _unit_id)
    ) s;

  SELECT coalesce(jsonb_agg(x ORDER BY x->>'day'), '[]'::jsonb) INTO v_days FROM (
    SELECT jsonb_build_object(
      'day', d::date::text,
      'income', (SELECT coalesce(sum(amount),0) FROM public.transactions
                  WHERE kind='income' AND status <> 'cancelled'
                    AND coalesce(due_date,date) = d::date AND (_unit_id IS NULL OR unit_id = _unit_id)),
      'expense', (SELECT coalesce(sum(amount),0) FROM public.transactions
                   WHERE kind='expense' AND status <> 'cancelled'
                     AND coalesce(due_date,date) = d::date AND (_unit_id IS NULL OR unit_id = _unit_id))
                + (SELECT coalesce(sum(amount),0) FROM public.accounts_payable
                    WHERE status IN ('pending','overdue','scheduled')
                      AND due_date = d::date AND (_unit_id IS NULL OR unit_id = _unit_id))
    ) x
    FROM generate_series(_from::timestamp, _to::timestamp, interval '1 day') d
  ) q;

  RETURN jsonb_build_object(
    'from', _from, 'to', _to,
    'contracted', v_contracted, 'probable', v_probable, 'at_risk', v_risk,
    'overdue', v_overdue, 'expense', v_expense, 'days', v_days
  );
END $$;

CREATE OR REPLACE FUNCTION public.forecast_settle(_snapshot_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.forecast_snapshots; ri numeric := 0; re numeric := 0; acc numeric;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;
  SELECT * INTO s FROM public.forecast_snapshots WHERE id = _snapshot_id;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Snapshot não encontrado'; END IF;

  SELECT coalesce(sum(amount),0) INTO ri FROM public.transactions
   WHERE kind='income' AND status='paid' AND coalesce(paid_at, date) BETWEEN s.period_start AND s.period_end
     AND (s.unit_id IS NULL OR unit_id = s.unit_id);
  SELECT coalesce(sum(amount),0) INTO re FROM public.transactions
   WHERE kind='expense' AND status='paid' AND coalesce(paid_at, date) BETWEEN s.period_start AND s.period_end
     AND (s.unit_id IS NULL OR unit_id = s.unit_id);

  acc := CASE WHEN s.predicted_income > 0
              THEN greatest(0, 100 - abs(ri - s.predicted_income) / s.predicted_income * 100)
              ELSE NULL END;

  UPDATE public.forecast_snapshots
     SET realized_income = ri, realized_expense = re, accuracy_pct = acc, closed_at = now()
   WHERE id = _snapshot_id;

  RETURN jsonb_build_object('realized_income', ri, 'realized_expense', re, 'accuracy_pct', acc);
END $$;
