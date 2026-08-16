-- ============ helpers ============
CREATE OR REPLACE FUNCTION public.is_top_management(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR EXISTS (
        SELECT 1 FROM public.collaborators c
          JOIN public.permission_profiles pp ON pp.id = c.permission_profile_id
         WHERE c.auth_user_id = _user_id
           AND COALESCE(c.status,'active') = 'active'
           AND COALESCE(pp.status,'active') = 'active'
           AND (pp.modules -> 'gerencial') ? 'delete'
           AND (pp.modules -> 'configuracoes') ? 'edit'
      )
$$;

-- ============ FINANCEIRO GERAL ============
DROP POLICY IF EXISTS "Auth manage accounts_payable" ON public.accounts_payable;
CREATE POLICY "ap_select" ON public.accounts_payable FOR SELECT TO authenticated USING (public.can_module(auth.uid(),'financeiro','view'));
CREATE POLICY "ap_insert" ON public.accounts_payable FOR INSERT TO authenticated WITH CHECK (public.can_module(auth.uid(),'financeiro','edit'));
CREATE POLICY "ap_update" ON public.accounts_payable FOR UPDATE TO authenticated USING (public.can_module(auth.uid(),'financeiro','edit')) WITH CHECK (public.can_module(auth.uid(),'financeiro','edit'));
CREATE POLICY "ap_delete" ON public.accounts_payable FOR DELETE TO authenticated USING (public.can_module(auth.uid(),'financeiro','delete') AND public.has_financial_release(auth.uid()));

DROP POLICY IF EXISTS "Auth manage transactions" ON public.transactions;
CREATE POLICY "tx_select" ON public.transactions FOR SELECT TO authenticated USING (public.can_module(auth.uid(),'financeiro','view'));
CREATE POLICY "tx_insert" ON public.transactions FOR INSERT TO authenticated WITH CHECK (public.can_module(auth.uid(),'financeiro','edit'));
CREATE POLICY "tx_update" ON public.transactions FOR UPDATE TO authenticated USING (public.can_module(auth.uid(),'financeiro','edit')) WITH CHECK (public.can_module(auth.uid(),'financeiro','edit'));
CREATE POLICY "tx_delete" ON public.transactions FOR DELETE TO authenticated USING (public.can_module(auth.uid(),'financeiro','delete') AND public.has_financial_release(auth.uid()));

DROP TRIGGER IF EXISTS trg_tx_financial_release ON public.transactions;
CREATE TRIGGER trg_tx_financial_release BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.guard_financial_release();

DROP POLICY IF EXISTS "Auth manage financial_categories" ON public.financial_categories;
CREATE POLICY "fincat_select" ON public.financial_categories FOR SELECT TO authenticated USING (public.can_module(auth.uid(),'financeiro','view'));
CREATE POLICY "fincat_write" ON public.financial_categories FOR ALL TO authenticated USING (public.can_module(auth.uid(),'financeiro','edit')) WITH CHECK (public.can_module(auth.uid(),'financeiro','edit'));

DROP POLICY IF EXISTS "Auth manage financial_groups" ON public.financial_groups;
CREATE POLICY "fingrp_select" ON public.financial_groups FOR SELECT TO authenticated USING (public.can_module(auth.uid(),'financeiro','view'));
CREATE POLICY "fingrp_write" ON public.financial_groups FOR ALL TO authenticated USING (public.can_module(auth.uid(),'financeiro','edit')) WITH CHECK (public.can_module(auth.uid(),'financeiro','edit'));

DROP POLICY IF EXISTS "Authenticated users can manage sales" ON public.sales;
CREATE POLICY "sales_select" ON public.sales FOR SELECT TO authenticated USING (public.can_module(auth.uid(),'financeiro','view'));
CREATE POLICY "sales_write" ON public.sales FOR ALL TO authenticated USING (public.can_module(auth.uid(),'financeiro','edit')) WITH CHECK (public.can_module(auth.uid(),'financeiro','edit'));

DROP POLICY IF EXISTS "Auth manage discount_coupons" ON public.discount_coupons;
CREATE POLICY "coupons_select" ON public.discount_coupons FOR SELECT TO authenticated USING (public.can_module(auth.uid(),'financeiro','view') OR public.can_module(auth.uid(),'gerencial','view') OR public.can_module(auth.uid(),'crm','view'));
CREATE POLICY "coupons_write" ON public.discount_coupons FOR ALL TO authenticated USING (public.can_module(auth.uid(),'financeiro','edit') OR public.can_module(auth.uid(),'gerencial','edit')) WITH CHECK (public.can_module(auth.uid(),'financeiro','edit') OR public.can_module(auth.uid(),'gerencial','edit'));

DROP POLICY IF EXISTS "Auth manage suppliers" ON public.suppliers;
CREATE POLICY "suppliers_select" ON public.suppliers FOR SELECT TO authenticated USING (public.can_module(auth.uid(),'financeiro','view') OR public.can_module(auth.uid(),'gerencial','view'));
CREATE POLICY "suppliers_write" ON public.suppliers FOR ALL TO authenticated USING (public.can_module(auth.uid(),'financeiro','edit') OR public.can_module(auth.uid(),'gerencial','edit')) WITH CHECK (public.can_module(auth.uid(),'financeiro','edit') OR public.can_module(auth.uid(),'gerencial','edit'));

-- ============ FOLHA DE PAGAMENTO ============
DROP POLICY IF EXISTS "Auth manage payroll_items" ON public.payroll_items;
CREATE POLICY "payroll_items_all" ON public.payroll_items FOR ALL TO authenticated
USING (public.can_module(auth.uid(),'equipe','edit') AND public.has_financial_release(auth.uid()))
WITH CHECK (public.can_module(auth.uid(),'equipe','edit') AND public.has_financial_release(auth.uid()));

DROP POLICY IF EXISTS "Auth manage payroll_runs" ON public.payroll_runs;
CREATE POLICY "payroll_runs_all" ON public.payroll_runs FOR ALL TO authenticated
USING (public.can_module(auth.uid(),'equipe','edit') AND public.has_financial_release(auth.uid()))
WITH CHECK (public.can_module(auth.uid(),'equipe','edit') AND public.has_financial_release(auth.uid()));

-- ============ CONTRATOS (modelos) ============
DROP POLICY IF EXISTS "Auth manage contracts" ON public.contracts;
CREATE POLICY "contracts_staff_select" ON public.contracts FOR SELECT TO authenticated USING (public.can_module(auth.uid(),'clientes','view') OR public.can_module(auth.uid(),'gerencial','view'));
CREATE POLICY "contracts_staff_write" ON public.contracts FOR ALL TO authenticated USING (public.can_module(auth.uid(),'clientes','edit') OR public.can_module(auth.uid(),'gerencial','edit')) WITH CHECK (public.can_module(auth.uid(),'clientes','edit') OR public.can_module(auth.uid(),'gerencial','edit'));

-- ============ COLABORADORES ============
DROP POLICY IF EXISTS "Auth manage collaborators" ON public.collaborators;
CREATE POLICY "collab_staff_select" ON public.collaborators FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR auth_user_id = auth.uid());
CREATE POLICY "collab_insert" ON public.collaborators FOR INSERT TO authenticated WITH CHECK (public.can_module(auth.uid(),'equipe','edit'));
CREATE POLICY "collab_update" ON public.collaborators FOR UPDATE TO authenticated USING (public.can_module(auth.uid(),'equipe','edit')) WITH CHECK (public.can_module(auth.uid(),'equipe','edit'));
CREATE POLICY "collab_delete" ON public.collaborators FOR DELETE TO authenticated USING (public.can_module(auth.uid(),'equipe','delete'));

CREATE OR REPLACE FUNCTION public.guard_collaborator_sensitive()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF (NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
      OR NEW.permission_profile_id IS DISTINCT FROM OLD.permission_profile_id
      OR NEW.financial_release IS DISTINCT FROM OLD.financial_release
      OR NEW.allow_consolidated IS DISTINCT FROM OLD.allow_consolidated)
     AND NOT (public.can_module(auth.uid(),'equipe','delete') OR public.is_top_management(auth.uid())) THEN
    RAISE EXCEPTION 'Sem permissão para alterar acesso, perfil de permissão ou liberações do colaborador';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_collab_sensitive ON public.collaborators;
CREATE TRIGGER trg_collab_sensitive BEFORE UPDATE ON public.collaborators
FOR EACH ROW EXECUTE FUNCTION public.guard_collaborator_sensitive();

-- ============ PERMISSION PROFILES ============
DROP POLICY IF EXISTS "Auth manage permission_profiles" ON public.permission_profiles;
CREATE POLICY "pp_select" ON public.permission_profiles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "pp_insert" ON public.permission_profiles FOR INSERT TO authenticated WITH CHECK (public.is_top_management(auth.uid()));
CREATE POLICY "pp_update" ON public.permission_profiles FOR UPDATE TO authenticated USING (public.is_top_management(auth.uid())) WITH CHECK (public.is_top_management(auth.uid()));
CREATE POLICY "pp_delete" ON public.permission_profiles FOR DELETE TO authenticated USING (public.is_top_management(auth.uid()));

-- ============ CRM ============
DROP POLICY IF EXISTS "Auth manage crm_indications" ON public.crm_indications;
CREATE POLICY "crm_ind_select" ON public.crm_indications FOR SELECT TO authenticated USING (public.can_module(auth.uid(),'crm','view'));
CREATE POLICY "crm_ind_write" ON public.crm_indications FOR ALL TO authenticated USING (public.can_module(auth.uid(),'crm','edit')) WITH CHECK (public.can_module(auth.uid(),'crm','edit'));

DROP POLICY IF EXISTS "Auth manage crm_tasks" ON public.crm_tasks;
CREATE POLICY "crm_tasks_select" ON public.crm_tasks FOR SELECT TO authenticated USING (public.can_module(auth.uid(),'crm','view'));
CREATE POLICY "crm_tasks_write" ON public.crm_tasks FOR ALL TO authenticated USING (public.can_module(auth.uid(),'crm','edit')) WITH CHECK (public.can_module(auth.uid(),'crm','edit'));

DROP POLICY IF EXISTS "Auth manage crm_task_comments" ON public.crm_task_comments;
CREATE POLICY "crm_tc_select" ON public.crm_task_comments FOR SELECT TO authenticated USING (public.can_module(auth.uid(),'crm','view'));
CREATE POLICY "crm_tc_write" ON public.crm_task_comments FOR ALL TO authenticated USING (public.can_module(auth.uid(),'crm','edit')) WITH CHECK (public.can_module(auth.uid(),'crm','edit'));

DROP POLICY IF EXISTS "Auth manage crm_task_checklist_items" ON public.crm_task_checklist_items;
CREATE POLICY "crm_ci_select" ON public.crm_task_checklist_items FOR SELECT TO authenticated USING (public.can_module(auth.uid(),'crm','view'));
CREATE POLICY "crm_ci_write" ON public.crm_task_checklist_items FOR ALL TO authenticated USING (public.can_module(auth.uid(),'crm','edit')) WITH CHECK (public.can_module(auth.uid(),'crm','edit'));

-- ============ STAFF SCHEDULES (mesma correção) ============
DROP POLICY IF EXISTS "Auth manage staff_schedules" ON public.staff_schedules;
CREATE POLICY "staff_sched_select" ON public.staff_schedules FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff_sched_write" ON public.staff_schedules FOR ALL TO authenticated USING (public.can_module(auth.uid(),'equipe','edit')) WITH CHECK (public.can_module(auth.uid(),'equipe','edit'));