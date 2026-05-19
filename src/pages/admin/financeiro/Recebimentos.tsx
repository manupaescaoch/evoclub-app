import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import StatCard from "@/components/admin/StatCard";
import { fmtBRL, fmtBRLShort, monthRange } from "@/lib/finance";

const Recebimentos = () => {
  const { filterId, isConsolidated, units } = useUnit();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [rows, setRows] = useState<{ unit: string; expected: number; received: number }[]>([]);
  const [daily, setDaily] = useState<{ date: string; received: number }[]>([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const mr = monthRange(period.y, period.m);
      // expected = transactions with status pending/scheduled income + sales
      let q = supabase.from("transactions").select("date,kind,amount,status,unit_id").gte("date", mr.start).lte("date", mr.end).eq("kind", "income");
      if (filterId) q = q.eq("unit_id", filterId);
      const { data } = await q;
      const all = data || [];

      const unitMap = new Map<string, { expected: number; received: number; name: string }>();
      const targets = isConsolidated ? units : units.filter(u => u.id === filterId);
      targets.forEach(u => unitMap.set(u.id, { expected: 0, received: 0, name: u.name }));
      unitMap.set("__none__", { expected: 0, received: 0, name: "Sem unidade" });

      all.forEach(t => {
        const key = t.unit_id || "__none__";
        const cur = unitMap.get(key) || { expected: 0, received: 0, name: "?" };
        cur.expected += Number(t.amount);
        if (t.status === "paid") cur.received += Number(t.amount);
        unitMap.set(key, cur);
      });

      const out = [...unitMap.values()].filter(v => v.expected || v.received).map(v => ({ unit: v.name, expected: v.expected, received: v.received }));
      setRows(out);

      const byDate = new Map<string, number>();
      all.filter(t => t.status === "paid").forEach(t => byDate.set(t.date, (byDate.get(t.date) || 0) + Number(t.amount)));
      setDaily([...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, received]) => ({ date, received })));
      setLoading(false);
    };
    run();
  }, [filterId, isConsolidated, units, period]);

  const totals = rows.reduce((a, r) => ({ expected: a.expected + r.expected, received: a.received + r.received }), { expected: 0, received: 0 });
  const diff = totals.received - totals.expected;
  const pct = totals.expected ? (totals.received / totals.expected) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs font-dm text-muted-foreground">Mês:</label>
        <input type="month" value={`${period.y}-${String(period.m + 1).padStart(2, "0")}`}
          onChange={(e) => { const [y, m] = e.target.value.split("-"); setPeriod({ y: Number(y), m: Number(m) - 1 }); }}
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-dm" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Previsto" value={fmtBRLShort(totals.expected)} />
        <StatCard label="Recebido" value={fmtBRLShort(totals.received)} accent />
        <StatCard label="Diferença" value={fmtBRLShort(diff)} trend={diff >= 0 ? "up" : "down"} trendValue={diff >= 0 ? "Acima" : "Abaixo"} />
        <StatCard label="Performance" value={`${pct.toFixed(1)}%`} />
      </div>

      <div className="bg-card rounded-xl card-shadow overflow-x-auto">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-dm font-semibold text-foreground">Por unidade</p>
        </div>
        <table className="w-full text-xs font-dm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-2 text-muted-foreground font-medium">Unidade</th>
              <th className="px-4 py-2 text-right text-muted-foreground font-medium">Previsto</th>
              <th className="px-4 py-2 text-right text-muted-foreground font-medium">Recebido</th>
              <th className="px-4 py-2 text-right text-muted-foreground font-medium">Diferença</th>
              <th className="px-4 py-2 text-right text-muted-foreground font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Carregando...</td></tr> :
              rows.length === 0 ? <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Sem dados</td></tr> :
              rows.map(r => {
                const d = r.received - r.expected;
                const p = r.expected ? (r.received / r.expected) * 100 : 0;
                return (
                  <tr key={r.unit} className="border-b border-border">
                    <td className="px-4 py-2">{r.unit}</td>
                    <td className="px-4 py-2 text-right">{fmtBRL(r.expected)}</td>
                    <td className="px-4 py-2 text-right text-green-600">{fmtBRL(r.received)}</td>
                    <td className={`px-4 py-2 text-right ${d < 0 ? "text-red-500" : "text-green-600"}`}>{fmtBRL(d)}</td>
                    <td className="px-4 py-2 text-right">{p.toFixed(1)}%</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="bg-card rounded-xl card-shadow overflow-x-auto">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-dm font-semibold text-foreground">Recebimentos por dia</p>
        </div>
        <table className="w-full text-xs font-dm">
          <thead><tr className="border-b border-border text-left"><th className="px-4 py-2 text-muted-foreground font-medium">Data</th><th className="px-4 py-2 text-right text-muted-foreground font-medium">Recebido</th></tr></thead>
          <tbody>
            {daily.length === 0 ? <tr><td colSpan={2} className="py-6 text-center text-muted-foreground">Sem recebimentos</td></tr> :
              daily.map(d => <tr key={d.date} className="border-b border-border"><td className="px-4 py-2">{new Date(d.date).toLocaleDateString("pt-BR")}</td><td className="px-4 py-2 text-right text-green-600">{fmtBRL(d.received)}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Recebimentos;