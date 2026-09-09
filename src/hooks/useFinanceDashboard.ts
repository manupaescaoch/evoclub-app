import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { monthRange, variation } from "@/lib/finance";

export type FinTx = {
  id: string;
  date: string;
  due_date: string | null;
  paid_at: string | null;
  description: string | null;
  kind: string;
  amount: number;
  category_id: string | null;
  category_name: string | null;
  payment_method: string | null;
  status: string;
  unit_id: string | null;
  client_id: number | null;
  cost_center: string | null;
  reference: string | null;
  notes: string | null;
};

/** lançamentos cancelados nunca entram em nenhum cálculo */
const CANCELLED = ["cancelled", "canceled", "cancelado", "void", "estornado"];
/** transferências entre contas não são receita nem despesa */
const TRANSFER_RE = /transfer[eê]ncia|transfer|entre contas/i;
/** entradas/saídas não operacionais (empréstimos, aportes, investimentos) */
const NONOPER_RE = /empr[eé]stimo|financiamento|investiment|aporte|s[oó]cio|transfer[eê]ncia|entre contas/i;
/** receita recorrente de mensalidade — base oficial do ticket médio */
const MENSALIDADE_RE = /mensalidade|plano|recorr[eê]nc|assinatura|matr[ií]cula recorrente/i;
/** estornos reduzem o lado de origem em vez de somar do outro lado */
const ESTORNO_RE = /estorno|reembolso|devolu[cç][aã]o|chargeback/i;

const txt = (r: FinTx) => `${r.category_name || ""} ${r.description || ""} ${r.notes || ""}`;
/** competência: usa a data de vencimento quando configurada, senão a data do lançamento */
export const competence = (r: FinTx) => r.due_date || r.date;
const isTransfer = (r: FinTx) => TRANSFER_RE.test(txt(r));
const signed = (r: FinTx) => (ESTORNO_RE.test(txt(r)) ? -1 : 1) * (Number(r.amount) || 0);

export type Agg = {
  income: number;
  expense: number;
  incomeCount: number;
  expenseCount: number;
  operIncome: number;
  operExpense: number;
  balance: number;
  ticket: number;
  ticketStudents: number;
  ticketRevenue: number;
};

const emptyAgg: Agg = {
  income: 0, expense: 0, incomeCount: 0, expenseCount: 0,
  operIncome: 0, operExpense: 0, balance: 0, ticket: 0, ticketStudents: 0, ticketRevenue: 0,
};

export const aggregate = (list: FinTx[]): Agg => {
  const a = { ...emptyAgg };
  const students = new Set<number>();
  list.forEach((r) => {
    if (isTransfer(r)) return;
    const v = signed(r);
    const oper = !NONOPER_RE.test(txt(r));
    if (r.kind === "income") {
      a.income += v; a.incomeCount++;
      if (oper) a.operIncome += v;
      if (oper && MENSALIDADE_RE.test(txt(r))) {
        a.ticketRevenue += v;
        if (r.client_id) students.add(r.client_id);
      }
    } else {
      a.expense += v; a.expenseCount++;
      if (oper) a.operExpense += v;
    }
  });
  a.balance = a.income - a.expense;
  a.ticketStudents = students.size;
  a.ticket = students.size ? a.ticketRevenue / students.size : 0;
  return a;
};

export type MonthPoint = {
  key: number;
  m: string;
  Entradas: number;
  Saídas: number;
  saldo: number;
  varSaldo: number;
  accEntradas: number;
  accSaídas: number;
  accSaldo: number;
};

export type CategorySlice = {
  name: string;
  value: number;
  count: number;
  pct: number;
  color: string;
  isOther?: boolean;
};

const PALETTE = ["#0057FF", "#dc2626", "#f59e0b", "#0ea5e9", "#8b5cf6", "#94a3b8"];

export const useFinanceDashboard = (unitId: string | null, year: number, month: number) => {
  const [rows, setRows] = useState<FinTx[]>([]);
  const [conciliation, setConciliation] = useState<Record<string, { status: string; account: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    let q = supabase
      .from("transactions")
      .select("*")
      .gte("date", `${year - 1}-01-01`)
      .lte("date", `${year}-12-31`)
      .order("date", { ascending: false })
      .limit(5000);
    if (unitId) q = q.eq("unit_id", unitId);
    const { data, error: e } = await q;
    if (e) { setError(e.message); setRows([]); setLoading(false); return; }
    const clean = ((data || []) as FinTx[]).filter(
      (r) => !CANCELLED.includes(String(r.status || "").toLowerCase()),
    );
    setRows(clean);

    // status de conciliação vindo do extrato bancário (quando houver)
    const ids = clean.slice(0, 200).map((r) => r.id);
    if (ids.length) {
      const [{ data: bt }, { data: accs }] = await Promise.all([
        supabase.from("bank_transactions").select("match_id,status,bank_account_id").in("match_id", ids),
        supabase.from("bank_accounts").select("id,name"),
      ]);
      const accName: Record<string, string> = {};
      (accs || []).forEach((a: any) => { accName[a.id] = a.name; });
      const map: Record<string, { status: string; account: string | null }> = {};
      (bt || []).forEach((b: any) => {
        if (b.match_id) map[b.match_id] = { status: b.status, account: accName[b.bank_account_id] || null };
      });
      setConciliation(map);
    } else {
      setConciliation({});
    }
    setLoading(false);
  }, [unitId, year]);

  useEffect(() => { load(); }, [load]);

  const inRange = (r: FinTx, s: string, e: string) => {
    const d = competence(r);
    return d >= s && d <= e;
  };

  const data = useMemo(() => {
    const mr = monthRange(year, month);
    const prev = month === 0 ? monthRange(year - 1, 11) : monthRange(year, month - 1);

    const monthRows = rows.filter((r) => inRange(r, mr.start, mr.end));
    const prevRows = rows.filter((r) => inRange(r, prev.start, prev.end));
    const yearRows = rows.filter((r) => inRange(r, `${year}-01-01`, `${year}-12-31`));
    const prevYearRows = rows.filter((r) => inRange(r, `${year - 1}-01-01`, `${year - 1}-12-31`));

    const cur = aggregate(monthRows);
    const prevAgg = aggregate(prevRows);
    const yearAgg = aggregate(yearRows);
    const prevYearAgg = aggregate(prevYearRows);

    // série mensal do ano selecionado, com acumulado e variação mês a mês
    const base = Array.from({ length: 12 }, (_, i) => {
      const r = monthRange(year, i);
      const a = aggregate(rows.filter((t) => inRange(t, r.start, r.end)));
      return { i, income: a.income, expense: a.expense, balance: a.balance };
    });
    let accIn = 0, accOut = 0;
    const series: MonthPoint[] = base.map((b, i) => {
      accIn += b.income; accOut += b.expense;
      const prevBal = i > 0 ? base[i - 1].balance : 0;
      return {
        key: b.i,
        m: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][b.i],
        Entradas: b.income,
        Saídas: b.expense,
        saldo: b.balance,
        varSaldo: i > 0 ? variation(b.balance, prevBal) : 0,
        accEntradas: accIn,
        accSaídas: accOut,
        accSaldo: accIn - accOut,
      };
    });

    // despesas por categoria no mês selecionado
    const expenses = monthRows.filter((r) => r.kind === "expense" && !isTransfer(r));
    const uncategorized = expenses.filter((r) => !r.category_name && !r.category_id);
    const grouped = new Map<string, { value: number; count: number }>();
    expenses.forEach((r) => {
      const name = r.category_name || "Sem categoria";
      const g = grouped.get(name) || { value: 0, count: 0 };
      g.value += signed(r); g.count++;
      grouped.set(name, g);
    });
    const sorted = [...grouped.entries()]
      .map(([name, g]) => ({ name, ...g }))
      .sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    const totalExpense = sorted.reduce((s, c) => s + c.value, 0);
    const categories: CategorySlice[] = top.map((c, i) => ({
      name: c.name,
      value: c.value,
      count: c.count,
      pct: totalExpense ? (c.value / totalExpense) * 100 : 0,
      color: PALETTE[i % PALETTE.length],
    }));
    if (rest.length) {
      const value = rest.reduce((s, c) => s + c.value, 0);
      categories.push({
        name: "Outros",
        value,
        count: rest.reduce((s, c) => s + c.count, 0),
        pct: totalExpense ? (value / totalExpense) * 100 : 0,
        color: PALETTE[5],
        isOther: true,
      });
    }

    const latest = [...monthRows]
      .sort((a, b) => (competence(b) > competence(a) ? 1 : -1))
      .slice(0, 5);

    return {
      cur, prevAgg, yearAgg, prevYearAgg, series, categories,
      uncategorizedCount: uncategorized.length,
      monthCount: monthRows.length,
      yearCount: yearRows.length,
      latest,
      totalExpense,
    };
  }, [rows, year, month]);

  return { loading, error, reload: load, conciliation, ...data };
};
