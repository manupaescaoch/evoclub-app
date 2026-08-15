import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { fmtBRL, fmtBRLShort, monthName, yearRange } from "@/lib/finance";
import StatCard from "@/components/admin/StatCard";
import { ChevronDown, ChevronRight } from "lucide-react";

type Agg = { income: number; expense: number; tax: number };

const DRE = () => {
  const { filterId, units, isConsolidated } = useUnit();
  const [year, setYear] = useState(new Date().getFullYear());
  const [view, setView] = useState<"month" | "quarter" | "year">("month");
  const [tx, setTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [costCenter, setCostCenter] = useState("all");
  const [allocate, setAllocate] = useState(false);
  const [drill, setDrill] = useState<null | "income" | "expense" | "tax">(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const yr = yearRange(year);
      const cols = "date,kind,amount,unit_id,category_name,cost_center";
      let q = supabase.from("transactions").select(cols).gte("date", yr.start).lte("date", yr.end);
      if (filterId) q = q.eq("unit_id", filterId);
      const { data } = await q;
      let rows: any[] = (data || []).map((r: any) => ({ ...r, amount: Number(r.amount), _share: 1 }));

      // Rateio: despesas consolidadas (sem unidade) distribuídas pela participação da receita
      if (filterId && allocate) {
        const [{ data: shared }, { data: allIncome }] = await Promise.all([
          supabase.from("transactions").select(cols).is("unit_id", null).gte("date", yr.start).lte("date", yr.end),
          supabase.from("transactions").select("amount,unit_id").eq("kind", "income").not("unit_id", "is", null).gte("date", yr.start).lte("date", yr.end),
        ]);
        const total = (allIncome || []).reduce((s: number, r: any) => s + Number(r.amount), 0);
        const mine = (allIncome || []).filter((r: any) => r.unit_id === filterId).reduce((s: number, r: any) => s + Number(r.amount), 0);
        const share = total > 0 ? mine / total : 0;
        rows = rows.concat((shared || []).map((r: any) => ({
          ...r, amount: Number(r.amount) * share, _share: share,
          category_name: `${r.category_name || "Sem categoria"} (rateio)`,
        })));
      }
      setTx(rows);
      setLoading(false);
    };
    run();
  }, [filterId, year, allocate]);

  const costCenters = useMemo(
    () => [...new Set(tx.map(t => t.cost_center).filter(Boolean))] as string[],
    [tx]
  );

  const rowsFiltered = useMemo(
    () => tx.filter(t => costCenter === "all" || (t.cost_center || "Não rateado") === costCenter),
    [tx, costCenter]
  );

  const lineOf = (t: any): keyof Agg =>
    t.kind === "income" ? "income" : (t.category_name || "").toLowerCase().includes("imposto") ? "tax" : "expense";

  const periods = useMemo(() => {
    if (view === "year") return [{ label: String(year), keys: Array.from({ length: 12 }, (_, i) => i) }];
    if (view === "quarter") return [0, 1, 2, 3].map(q => ({ label: `T${q + 1}`, keys: [q * 3, q * 3 + 1, q * 3 + 2] }));
    return Array.from({ length: 12 }, (_, i) => ({ label: monthName(i), keys: [i] }));
  }, [view, year]);

  const agg = useMemo(() => {
    const map = new Map<string, Agg>();
    periods.forEach(p => map.set(p.label, { income: 0, expense: 0, tax: 0 }));
    rowsFiltered.forEach(t => {
      const mi = new Date(t.date).getMonth();
      const p = periods.find(pp => pp.keys.includes(mi));
      if (!p) return;
      const cur = map.get(p.label)!;
      const amt = Number(t.amount);
      cur[lineOf(t)] += amt;
    });
    return map;
  }, [rowsFiltered, periods]);

  // Drill-down: categorias da linha aberta, por período
  const drillRows = useMemo(() => {
    if (!drill) return [];
    const m = new Map<string, Map<string, number>>();
    rowsFiltered.forEach(t => {
      if (lineOf(t) !== drill) return;
      const mi = new Date(t.date).getMonth();
      const p = periods.find(pp => pp.keys.includes(mi));
      if (!p) return;
      const cat = t.category_name || "Sem categoria";
      if (!m.has(cat)) m.set(cat, new Map());
      const inner = m.get(cat)!;
      inner.set(p.label, (inner.get(p.label) || 0) + Number(t.amount));
    });
    return [...m.entries()]
      .map(([cat, inner]) => ({
        cat,
        values: inner,
        total: [...inner.values()].reduce((s, v) => s + v, 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [drill, rowsFiltered, periods]);

  const byCostCenter = useMemo(() => {
    const m = new Map<string, { income: number; expense: number }>();
    rowsFiltered.forEach(t => {
      const k = t.cost_center || "Não rateado";
      if (!m.has(k)) m.set(k, { income: 0, expense: 0 });
      const c = m.get(k)!;
      if (t.kind === "income") c.income += Number(t.amount); else c.expense += Number(t.amount);
    });
    return [...m.entries()].map(([name, v]) => ({ name, ...v, net: v.income - v.expense }));
  }, [rowsFiltered]);

  const totals = useMemo(() => {
    const t = { income: 0, expense: 0, tax: 0 };
    agg.forEach(v => { t.income += v.income; t.expense += v.expense; t.tax += v.tax; });
    return t;
  }, [agg]);

  const net = totals.income - totals.expense - totals.tax;
  const margin = totals.income ? (net / totals.income) * 100 : 0;

  // by unit (only when consolidated)
  const byUnit = useMemo(() => {
    if (!isConsolidated) return [];
    const m = new Map<string, { name: string; income: number; expense: number }>();
    units.forEach(u => m.set(u.id, { name: u.name, income: 0, expense: 0 }));
    rowsFiltered.forEach(t => {
      if (!t.unit_id) return;
      const c = m.get(t.unit_id); if (!c) return;
      if (t.kind === "income") c.income += Number(t.amount); else c.expense += Number(t.amount);
    });
    return [...m.values()].map(v => ({ ...v, net: v.income - v.expense, margin: v.income ? ((v.income - v.expense) / v.income) * 100 : 0 }));
  }, [rowsFiltered, units, isConsolidated]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs font-dm text-muted-foreground">Ano:</label>
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-9 w-24 rounded-lg border border-border bg-card px-3 text-sm font-dm" />
        <select value={view} onChange={(e) => setView(e.target.value as any)} className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-dm">
          <option value="month">Mensal</option><option value="quarter">Trimestral</option><option value="year">Anual</option>
        </select>
        <select value={costCenter} onChange={(e) => setCostCenter(e.target.value)} className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-dm">
          <option value="all">Todos os centros de custo</option>
          {costCenters.map(c => <option key={c} value={c}>{c}</option>)}
          <option value="Não rateado">Não rateado</option>
        </select>
        {!isConsolidated && (
          <label className="flex items-center gap-2 text-xs font-dm text-muted-foreground">
            <input type="checkbox" checked={allocate} onChange={(e) => setAllocate(e.target.checked)} />
            Ratear despesas consolidadas
          </label>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Receita total" value={fmtBRLShort(totals.income)} accent />
        <StatCard label="Despesas" value={fmtBRLShort(totals.expense)} />
        <StatCard label="Impostos" value={fmtBRLShort(totals.tax)} />
        <StatCard label="Resultado líquido" value={fmtBRLShort(net)} trend={net >= 0 ? "up" : "down"} trendValue={`${margin.toFixed(1)}%`} />
      </div>

      <div className="bg-card rounded-xl card-shadow overflow-x-auto">
        <div className="px-4 py-3 border-b border-border"><p className="text-sm font-dm font-semibold text-foreground">DRE — {view === "month" ? "por mês" : view === "quarter" ? "por trimestre" : "anual"}</p></div>
        {loading ? <div className="p-6 text-center text-muted-foreground text-sm">Carregando...</div> :
        <table className="w-full text-xs font-dm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-3 py-2 text-muted-foreground font-medium">Linha</th>
              {periods.map(p => <th key={p.label} className="px-3 py-2 text-right text-muted-foreground font-medium">{p.label}</th>)}
              <th className="px-3 py-2 text-right text-muted-foreground font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {[
              { key: "income", label: "Receita", className: "text-green-600" },
              { key: "expense", label: "(-) Despesas", className: "text-red-500" },
              { key: "tax", label: "(-) Impostos", className: "text-red-500" },
            ].map(row => {
              const total = periods.reduce((s, p) => s + (agg.get(p.label)?.[row.key as keyof Agg] || 0), 0);
              const isOpen = drill === row.key;
              return (
                <>
                  <tr key={row.key} className="border-b border-border cursor-pointer hover:bg-background"
                      onClick={() => setDrill(isOpen ? null : (row.key as "income" | "expense" | "tax"))}>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1">
                        {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}{row.label}
                      </span>
                    </td>
                    {periods.map(p => <td key={p.label} className={`px-3 py-2 text-right ${row.className}`}>{fmtBRL(agg.get(p.label)?.[row.key as keyof Agg] || 0)}</td>)}
                    <td className={`px-3 py-2 text-right font-semibold ${row.className}`}>{fmtBRL(total)}</td>
                  </tr>
                  {isOpen && drillRows.map(d => (
                    <tr key={`${row.key}-${d.cat}`} className="border-b border-border bg-background/50">
                      <td className="px-3 py-1.5 pl-8 text-muted-foreground">{d.cat}</td>
                      {periods.map(p => <td key={p.label} className="px-3 py-1.5 text-right text-muted-foreground">{fmtBRL(d.values.get(p.label) || 0)}</td>)}
                      <td className="px-3 py-1.5 text-right text-muted-foreground">{fmtBRL(d.total)}</td>
                    </tr>
                  ))}
                  {isOpen && drillRows.length === 0 && (
                    <tr key={`${row.key}-empty`} className="border-b border-border bg-background/50">
                      <td colSpan={periods.length + 2} className="px-3 py-2 pl-8 text-muted-foreground">Sem lançamentos nesta linha</td>
                    </tr>
                  )}
                </>
              );
            })}
            <tr className="bg-background">
              <td className="px-3 py-2 font-semibold">Resultado</td>
              {periods.map(p => {
                const v = agg.get(p.label)!;
                const r = v.income - v.expense - v.tax;
                return <td key={p.label} className={`px-3 py-2 text-right font-semibold ${r < 0 ? "text-red-500" : "text-foreground"}`}>{fmtBRL(r)}</td>;
              })}
              <td className={`px-3 py-2 text-right font-bold ${net < 0 ? "text-red-500" : "text-primary"}`}>{fmtBRL(net)}</td>
            </tr>
          </tbody>
        </table>}
      </div>

      {isConsolidated && byUnit.length > 0 && (
        <div className="bg-card rounded-xl card-shadow overflow-x-auto">
          <div className="px-4 py-3 border-b border-border"><p className="text-sm font-dm font-semibold text-foreground">Comparativo por unidade</p></div>
          <table className="w-full text-xs font-dm">
            <thead><tr className="border-b border-border text-left"><th className="px-3 py-2 text-muted-foreground font-medium">Unidade</th><th className="px-3 py-2 text-right text-muted-foreground font-medium">Receita</th><th className="px-3 py-2 text-right text-muted-foreground font-medium">Despesa</th><th className="px-3 py-2 text-right text-muted-foreground font-medium">Resultado</th><th className="px-3 py-2 text-right text-muted-foreground font-medium">Margem</th></tr></thead>
            <tbody>{byUnit.map(u => <tr key={u.name} className="border-b border-border"><td className="px-3 py-2">{u.name}</td><td className="px-3 py-2 text-right text-green-600">{fmtBRL(u.income)}</td><td className="px-3 py-2 text-right text-red-500">{fmtBRL(u.expense)}</td><td className={`px-3 py-2 text-right font-semibold ${u.net < 0 ? "text-red-500" : "text-foreground"}`}>{fmtBRL(u.net)}</td><td className="px-3 py-2 text-right">{u.margin.toFixed(1)}%</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DRE;