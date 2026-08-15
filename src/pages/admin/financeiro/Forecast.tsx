import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import StatCard from "@/components/admin/StatCard";
import { fmtBRL, fmtBRLShort, monthName, yearRange } from "@/lib/finance";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Scenario = {
  id: string; unit_id: string | null; name: string; year: number;
  base_revenue: number; growth_pct: number; churn_pct: number; ticket: number;
  variable_cost_pct: number; fixed_cost: number; tax_pct: number; notes: string | null;
};

const empty = (year: number) => ({
  name: "", year, base_revenue: 0, growth_pct: 3, churn_pct: 2, ticket: 0,
  variable_cost_pct: 20, fixed_cost: 0, tax_pct: 6, notes: "",
});

const project = (s: Omit<Scenario, "id" | "unit_id">) =>
  Array.from({ length: 12 }, (_, i) => {
    const factor = Math.pow(1 + (Number(s.growth_pct) - Number(s.churn_pct)) / 100, i);
    const revenue = Number(s.base_revenue) * factor;
    const variable = revenue * (Number(s.variable_cost_pct) / 100);
    const tax = revenue * (Number(s.tax_pct) / 100);
    const result = revenue - variable - tax - Number(s.fixed_cost);
    return { month: monthName(i), revenue, cost: variable + Number(s.fixed_cost) + tax, result };
  });

const Forecast = () => {
  const { filterId } = useUnit();
  const year = new Date().getFullYear();
  const [rows, setRows] = useState<Scenario[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState(empty(year));
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [realBase, setRealBase] = useState(0);

  const load = useCallback(async () => {
    let q = supabase.from("forecast_scenarios").select("*").order("created_at", { ascending: false });
    if (filterId) q = q.eq("unit_id", filterId);
    const { data } = await q;
    const list = ((data || []) as any[]).map(r => ({ ...r, base_revenue: Number(r.base_revenue) })) as Scenario[];
    setRows(list);
    setActiveId(prev => prev && list.some(l => l.id === prev) ? prev : list[0]?.id ?? null);

    const yr = yearRange(year);
    let tq = supabase.from("transactions").select("amount, date").eq("kind", "income").eq("status", "paid").gte("date", yr.start).lte("date", yr.end);
    if (filterId) tq = tq.eq("unit_id", filterId);
    const { data: t } = await tq;
    const months = new Set((t || []).map((x: any) => x.date.slice(0, 7)));
    const total = (t || []).reduce((s: number, x: any) => s + Number(x.amount), 0);
    setRealBase(months.size ? total / months.size : 0);
  }, [filterId, year]);

  useEffect(() => { load(); }, [load]);

  const active = rows.find(r => r.id === activeId) || null;
  const series = useMemo(() => (active ? project(active) : []), [active]);
  const totals = useMemo(() => ({
    revenue: series.reduce((s, r) => s + r.revenue, 0),
    cost: series.reduce((s, r) => s + r.cost, 0),
    result: series.reduce((s, r) => s + r.result, 0),
  }), [series]);

  const save = async () => {
    if (!form.name.trim()) { toast.error("Dê um nome ao cenário"); return; }
    setSaving(true);
    const { error } = await supabase.from("forecast_scenarios").insert({ ...form, unit_id: filterId || null } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    logAudit({ action: "create", module: "financeiro", entity: "forecast_scenarios", description: `Cenário de forecast criado — ${form.name}`, unit_id: filterId, after: form as any });
    toast.success("Cenário criado");
    setOpen(false); setForm(empty(year)); load();
  };

  const remove = async (s: Scenario) => {
    if (!confirm(`Excluir o cenário "${s.name}"?`)) return;
    const { error } = await supabase.from("forecast_scenarios").delete().eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    logAudit({ action: "delete", module: "financeiro", entity: "forecast_scenarios", entity_id: s.id, description: `Cenário de forecast excluído — ${s.name}`, unit_id: s.unit_id });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={activeId ?? ""} onChange={e => setActiveId(e.target.value || null)} className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-dm min-w-[200px]">
          {rows.length === 0 && <option value="">Nenhum cenário</option>}
          {rows.map(r => <option key={r.id} value={r.id}>{r.name} · {r.year}</option>)}
        </select>
        <button onClick={() => setOpen(true)} className="h-9 px-3 rounded-lg bg-primary text-white text-sm font-dm flex items-center gap-1.5"><Plus size={14} /> Novo cenário</button>
        {active && (
          <button onClick={() => remove(active)} className="h-9 px-3 rounded-lg border border-border text-sm font-dm flex items-center gap-1.5 hover:bg-background"><Trash2 size={14} /> Excluir</button>
        )}
        <span className="text-[11px] font-dm text-muted-foreground ml-auto">Receita média realizada: {fmtBRL(realBase)}/mês</span>
      </div>

      {!active ? (
        <div className="bg-card rounded-xl p-8 card-shadow text-center text-sm font-dm text-muted-foreground">
          Crie um cenário para projetar receita, custos e resultado dos próximos 12 meses.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Receita projetada (12m)" value={fmtBRLShort(totals.revenue)} accent />
            <StatCard label="Custos projetados" value={fmtBRLShort(totals.cost)} />
            <StatCard label="Resultado projetado" value={fmtBRLShort(totals.result)} trend={totals.result >= 0 ? "up" : "down"} trendValue={`${totals.revenue ? ((totals.result / totals.revenue) * 100).toFixed(1) : "0"}%`} />
            <StatCard label="Crescimento líquido" value={`${(Number(active.growth_pct) - Number(active.churn_pct)).toFixed(1)}%`} sub="por mês" />
          </div>

          <div className="bg-card rounded-xl p-4 card-shadow">
            <p className="text-sm font-dm font-semibold text-foreground mb-3">Projeção 12 meses</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtBRLShort(Number(v))} width={80} />
                  <Tooltip formatter={(v) => fmtBRL(Number(v))} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Receita" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="cost" name="Custos" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="result" name="Resultado" stroke="#16a34a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card rounded-xl card-shadow overflow-x-auto">
            <div className="px-4 py-3 border-b border-border"><p className="text-sm font-dm font-semibold text-foreground">Detalhe mês a mês</p></div>
            <table className="w-full text-xs font-dm">
              <thead><tr className="border-b border-border text-left">{["Mês", "Receita", "Custos", "Resultado", "Margem"].map(h => <th key={h} className="px-4 py-2 text-muted-foreground font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {series.map(r => (
                  <tr key={r.month} className="border-b border-border">
                    <td className="px-4 py-2 text-foreground">{r.month}</td>
                    <td className="px-4 py-2 text-green-600">{fmtBRL(r.revenue)}</td>
                    <td className="px-4 py-2 text-red-500">{fmtBRL(r.cost)}</td>
                    <td className={`px-4 py-2 font-semibold ${r.result < 0 ? "text-red-500" : "text-foreground"}`}>{fmtBRL(r.result)}</td>
                    <td className="px-4 py-2">{r.revenue ? ((r.result / r.revenue) * 100).toFixed(1) : "0"}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-card rounded-2xl w-full max-w-lg p-5 space-y-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="font-barlow font-bold text-xl text-foreground">NOVO CENÁRIO</h2>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome do cenário (ex: Conservador)" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm font-dm" />
            <div className="grid grid-cols-2 gap-3">
              {([
                ["base_revenue", "Receita base mensal (R$)"],
                ["ticket", "Ticket médio (R$)"],
                ["growth_pct", "Crescimento mensal (%)"],
                ["churn_pct", "Churn mensal (%)"],
                ["variable_cost_pct", "Custo variável (%)"],
                ["fixed_cost", "Custo fixo mensal (R$)"],
                ["tax_pct", "Impostos (%)"],
                ["year", "Ano"],
              ] as const).map(([k, label]) => (
                <label key={k} className="text-[11px] font-dm text-muted-foreground">
                  {label}
                  <input type="number" step="0.01" value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: Number(e.target.value) } as any)}
                    className="mt-1 w-full h-10 rounded-lg border border-border bg-background px-3 text-sm font-dm text-foreground" />
                </label>
              ))}
            </div>
            <button onClick={() => setForm({ ...form, base_revenue: Math.round(realBase) })} className="h-9 px-3 rounded-lg border border-border text-xs font-dm flex items-center gap-1.5"><Wand2 size={13} /> Usar receita média realizada</button>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Premissas / observações" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-dm" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="h-9 px-4 rounded-lg border border-border text-sm font-dm">Cancelar</button>
              <button disabled={saving} onClick={save} className="h-9 px-4 rounded-lg bg-primary text-white text-sm font-dm disabled:opacity-50">{saving ? "Salvando..." : "Criar cenário"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Forecast;
