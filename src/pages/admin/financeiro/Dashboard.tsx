import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/admin/StatCard";
import { useUnit } from "@/contexts/UnitContext";
import { fmtBRLShort, monthName, monthRange, yearRange } from "@/lib/finance";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const FinDashboard = () => {
  const { filterId } = useUnit();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ monthIn: 0, monthOut: 0, yearIn: 0, yearOut: 0 });
  const [series, setSeries] = useState<any[]>([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const yr = yearRange(y);

      let q = supabase.from("transactions").select("date,kind,amount").gte("date", yr.start).lte("date", yr.end);
      if (filterId) q = q.eq("unit_id", filterId);
      const { data } = await q;
      const rows = data || [];

      const mr = monthRange(y, m);
      const monthIn = rows.filter(r => r.kind === "income" && r.date >= mr.start && r.date <= mr.end).reduce((s, r) => s + Number(r.amount), 0);
      const monthOut = rows.filter(r => r.kind === "expense" && r.date >= mr.start && r.date <= mr.end).reduce((s, r) => s + Number(r.amount), 0);
      const yearIn = rows.filter(r => r.kind === "income").reduce((s, r) => s + Number(r.amount), 0);
      const yearOut = rows.filter(r => r.kind === "expense").reduce((s, r) => s + Number(r.amount), 0);

      const monthly = Array.from({ length: 12 }, (_, i) => ({ m: monthName(i), Entradas: 0, Saídas: 0 }));
      rows.forEach(r => {
        const mi = new Date(r.date).getMonth();
        if (r.kind === "income") monthly[mi].Entradas += Number(r.amount);
        else monthly[mi].Saídas += Number(r.amount);
      });

      setStats({ monthIn, monthOut, yearIn, yearOut });
      setSeries(monthly);
      setLoading(false);
    };
    run();
  }, [filterId]);

  const monthBalance = stats.monthIn - stats.monthOut;
  const yearBalance = stats.yearIn - stats.yearOut;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Saldo do mês" value={fmtBRLShort(monthBalance)} accent trend={monthBalance >= 0 ? "up" : "down"} trendValue={monthBalance >= 0 ? "Positivo" : "Negativo"} />
        <StatCard label="Saldo do ano" value={fmtBRLShort(yearBalance)} trend={yearBalance >= 0 ? "up" : "down"} trendValue={yearBalance >= 0 ? "Positivo" : "Negativo"} />
        <StatCard label="Receitas do mês" value={fmtBRLShort(stats.monthIn)} />
        <StatCard label="Despesas do mês" value={fmtBRLShort(stats.monthOut)} />
      </div>

      <div className="bg-card rounded-xl p-5 card-shadow">
        <p className="text-sm font-dm font-semibold text-foreground mb-4">Faturamento mensal — Entradas vs Saídas</p>
        {loading ? (
          <div className="h-72 animate-pulse bg-background rounded-lg" />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="m" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => fmtBRLShort(Number(v))} />
                <Legend />
                <Bar dataKey="Entradas" fill="#16a34a" />
                <Bar dataKey="Saídas" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinDashboard;