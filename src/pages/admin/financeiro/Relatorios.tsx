import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { fmtBRL, fmtBRLShort } from "@/lib/finance";
import StatCard from "@/components/admin/StatCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const Relatorios = () => {
  const { filterId } = useUnit();
  const [view, setView] = useState<"week" | "month" | "year">("month");
  const [ref, setRef] = useState(() => new Date().toISOString().slice(0, 10));
  const [tx, setTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const period = useMemo(() => {
    const d = new Date(ref);
    if (view === "week") {
      const day = d.getDay();
      const start = new Date(d); start.setDate(d.getDate() - day);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
    }
    if (view === "month") {
      const s = new Date(d.getFullYear(), d.getMonth(), 1);
      const e = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return { start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10) };
    }
    return { start: `${d.getFullYear()}-01-01`, end: `${d.getFullYear()}-12-31` };
  }, [view, ref]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      let q = supabase.from("transactions").select("date,kind,amount,category_name,description").gte("date", period.start).lte("date", period.end);
      if (filterId) q = q.eq("unit_id", filterId);
      const { data } = await q;
      setTx(data || []);
      setLoading(false);
    };
    run();
  }, [filterId, period]);

  const totalIn = tx.filter(t => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = tx.filter(t => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalIn - totalOut;

  const byCat = (kind: string) => {
    const m = new Map<string, number>();
    tx.filter(t => t.kind === kind).forEach(t => m.set(t.category_name || "Sem categoria", (m.get(t.category_name || "Sem categoria") || 0) + Number(t.amount)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, v]) => ({ name, value: v }));
  };
  const topIn = byCat("income");
  const topOut = byCat("expense");

  const dailyChart = useMemo(() => {
    const m = new Map<string, { date: string; in: number; out: number }>();
    tx.forEach(t => {
      const cur = m.get(t.date) || { date: t.date, in: 0, out: 0 };
      if (t.kind === "income") cur.in += Number(t.amount); else cur.out += Number(t.amount);
      m.set(t.date, cur);
    });
    return [...m.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [tx]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <select value={view} onChange={(e) => setView(e.target.value as any)} className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-dm">
          <option value="week">Semanal</option><option value="month">Mensal</option><option value="year">Anual</option>
        </select>
        <input type="date" value={ref} onChange={(e) => setRef(e.target.value)} className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-dm" />
        <span className="text-xs font-dm text-muted-foreground">{new Date(period.start).toLocaleDateString("pt-BR")} → {new Date(period.end).toLocaleDateString("pt-BR")}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Entradas" value={fmtBRLShort(totalIn)} accent />
        <StatCard label="Saídas" value={fmtBRLShort(totalOut)} />
        <StatCard label="Saldo do período" value={fmtBRLShort(balance)} trend={balance >= 0 ? "up" : "down"} />
      </div>

      <div className="bg-card rounded-xl p-5 card-shadow">
        <p className="text-sm font-dm font-semibold text-foreground mb-4">Entradas vs Saídas</p>
        {loading ? <div className="h-64 animate-pulse bg-background rounded-lg" /> :
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                <Legend />
                <Bar dataKey="in" name="Entradas" fill="#16a34a" />
                <Bar dataKey="out" name="Saídas" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl card-shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><p className="text-sm font-dm font-semibold text-foreground">Principais receitas</p></div>
          <table className="w-full text-xs font-dm">
            <tbody>
              {topIn.length === 0 ? <tr><td className="py-6 text-center text-muted-foreground">Sem dados</td></tr> :
                topIn.map(c => <tr key={c.name} className="border-b border-border"><td className="px-4 py-2">{c.name}</td><td className="px-4 py-2 text-right text-green-600 font-semibold">{fmtBRL(c.value)}</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="bg-card rounded-xl card-shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><p className="text-sm font-dm font-semibold text-foreground">Principais despesas</p></div>
          <table className="w-full text-xs font-dm">
            <tbody>
              {topOut.length === 0 ? <tr><td className="py-6 text-center text-muted-foreground">Sem dados</td></tr> :
                topOut.map(c => <tr key={c.name} className="border-b border-border"><td className="px-4 py-2">{c.name}</td><td className="px-4 py-2 text-right text-red-500 font-semibold">{fmtBRL(c.value)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;