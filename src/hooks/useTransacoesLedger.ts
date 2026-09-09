import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { monthRange } from "@/lib/finance";
import { Tx, competence, countsForResult, isPaid, isOpen, effStatus, signed } from "@/lib/txUtils";

export type Ref = { id: string; name: string };
export type Cat = { id: string; name: string; kind: string | null; group_id: string | null };

export type LedgerAgg = {
  income: number;
  expense: number;
  incomeCount: number;
  expenseCount: number;
  balance: number;
};

const emptyAgg: LedgerAgg = { income: 0, expense: 0, incomeCount: 0, expenseCount: 0, balance: 0 };

/** soma apenas o que foi efetivamente pago, ignorando cancelados e transferências */
export const aggPaid = (list: Tx[]): LedgerAgg => {
  const a = { ...emptyAgg };
  list.forEach((r) => {
    if (!countsForResult(r) || !isPaid(r)) return;
    const v = signed(r);
    if (r.kind === "income") { a.income += v; a.incomeCount++; }
    else { a.expense += v; a.expenseCount++; }
  });
  a.balance = a.income - a.expense;
  return a;
};

export const useTransacoesLedger = (unitId: string | null, year: number, month: number) => {
  const [rows, setRows] = useState<Tx[]>([]);
  const [groups, setGroups] = useState<Ref[]>([]);
  const [categories, setCategories] = useState<Cat[]>([]);
  const [accounts, setAccounts] = useState<(Ref & { provider: string | null; last_sync_at: string | null })[]>([]);
  const [suppliers, setSuppliers] = useState<Ref[]>([]);
  const [clients, setClients] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRefs = useCallback(async () => {
    const [g, c, a, s] = await Promise.all([
      supabase.from("financial_groups").select("id,name").order("name"),
      supabase.from("financial_categories").select("id,name,kind,group_id").order("name"),
      supabase.from("bank_accounts").select("id,name,provider,last_sync_at").order("name"),
      supabase.from("suppliers").select("id,name").order("name").limit(500),
    ]);
    setGroups((g.data as Ref[]) || []);
    setCategories((c.data as Cat[]) || []);
    setAccounts((a.data as any[]) || []);
    setSuppliers((s.data as Ref[]) || []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let q = supabase
      .from("transactions")
      .select("*")
      .is("deleted_at", null)
      .gte("date", `${year - 1}-01-01`)
      .lte("date", `${year}-12-31`)
      .order("date", { ascending: false })
      .limit(5000);
    if (unitId) q = q.eq("unit_id", unitId);
    const { data, error: e } = await q;
    if (e) { setError(e.message); setRows([]); setLoading(false); return; }
    const list = (data || []) as unknown as Tx[];
    setRows(list);
    const ids = [...new Set(list.map((r) => r.client_id).filter(Boolean))] as number[];
    if (ids.length) {
      const { data: cl } = await supabase.from("clients").select("id,name").in("id", ids.slice(0, 500));
      const map: Record<number, string> = {};
      (cl || []).forEach((c: any) => { map[c.id] = c.name; });
      setClients(map);
    } else setClients({});
    setLoading(false);
  }, [unitId, year]);

  useEffect(() => { loadRefs(); }, [loadRefs]);
  useEffect(() => { load(); }, [load]);

  const inRange = (r: Tx, s: string, e: string) => {
    const d = competence(r);
    return d >= s && d <= e;
  };

  const period = useMemo(() => {
    const mr = monthRange(year, month);
    const prev = month === 0 ? monthRange(year - 1, 11) : monthRange(year, month - 1);
    const monthRows = rows.filter((r) => inRange(r, mr.start, mr.end));
    const prevRows = rows.filter((r) => inRange(r, prev.start, prev.end));
    const yearRows = rows.filter((r) => inRange(r, `${year}-01-01`, `${year}-12-31`));
    const pending = monthRows.filter(
      (r) => r.kind === "expense" && isOpen(r) && countsForResult(r),
    );
    return {
      monthRows,
      cur: aggPaid(monthRows),
      prev: aggPaid(prevRows),
      yearAgg: aggPaid(yearRows),
      pendingTotal: pending.reduce((s, r) => s + (Number(r.amount) || 0), 0),
      pendingCount: pending.length,
      overdueCount: monthRows.filter((r) => effStatus(r) === "overdue").length,
      uncategorized: monthRows.filter((r) => !r.category_id && !r.category_name).length,
      range: mr,
    };
  }, [rows, year, month]);

  return {
    loading, error, reload: load,
    rows, groups, categories, accounts, suppliers, clients,
    ...period,
  };
};
