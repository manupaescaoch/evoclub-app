import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { fmtBRL, fmtBRLShort, monthName, yearRange } from "@/lib/finance";
import StatCard from "@/components/admin/StatCard";

type Agg = { income: number; expense: number; tax: number };

const DRE = () => {
  const { filterId, units, isConsolidated } = useUnit();
  const [year, setYear] = useState(new Date().getFullYear());
  const [view, setView] = useState<"month" | "quarter" | "year">("month");
  const [tx, setTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const yr = yearRange(year);
      let q = supabase.from("transactions").select("date,kind,amount,unit_id,category_name").gte("date", yr.start).lte("date", yr.end);
      if (filterId) q = q.eq("unit_id", filterId);
      const { data } = await q;
      setTx(data || []);
      setLoading(false);
    };
    run();
  }, [filterId, year]);

  const periods = useMemo(() => {
    if (view === "year") return [{ label: String(year), keys: Array.from({ length: 12 }, (_, i) => i) }];
    if (view === "quarter") return [0, 1, 2, 3].map(q => ({ label: `T${q + 1}`, keys: [q * 3, q * 3 + 1, q * 3 + 2] }));
    return Array.from({ length: 12 }, (_, i) => ({ label: monthName(i), keys: [i] }));
  }, [view, year]);

  const agg = useMemo(() => {
    const map = new Map<string, Agg>();
    periods.forEach(p => map.set(p.label, { income: 0, expense: 0, tax: 0 }));
    tx.forEach(t => {
      const mi = new Date(t.date).getMonth();
      const p = periods.find(pp => pp.keys.includes(mi));
      if (!p) return;
      const cur = map.get(p.label)!;
      const amt = Number(t.amount);
      if (t.kind === "income") cur.income += amt;
      else if ((t.category_name || "").toLowerCase().includes("imposto")) cur.tax += amt;
      else cur.expense += amt;
    });
    return map;
  }, [tx, periods]);

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
    tx.forEach(t => {
      if (!t.unit_id) return;
      const c = m.get(t.unit_id); if (!c) return;
      if (t.kind === "income") c.income += Number(t.amount); else c.expense += Number(t.amount);
    });
    return [...m.values()].map(v => ({ ...v, net: v.income - v.expense, margin: v.income ? ((v.income - v.expense) / v.income) * 100 : 0 }));
  }, [tx, units, isConsolidated]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs font-dm text-muted-foreground">Ano:</label>
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-9 w-24 rounded-lg border border-border bg-card px-3 text-sm font-dm" />
        <select value={view} onChange={(e) => setView(e.target.value as any)} className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-dm">
          <option value="month">Mensal</option><option value="quarter">Trimestral</option><option value="year">Anual</option>
        </select>
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
              return (
                <tr key={row.key} className="border-b border-border">
                  <td className="px-3 py-2">{row.label}</td>
                  {periods.map(p => <td key={p.label} className={`px-3 py-2 text-right ${row.className}`}>{fmtBRL(agg.get(p.label)?.[row.key as keyof Agg] || 0)}</td>)}
                  <td className={`px-3 py-2 text-right font-semibold ${row.className}`}>{fmtBRL(total)}</td>
                </tr>
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