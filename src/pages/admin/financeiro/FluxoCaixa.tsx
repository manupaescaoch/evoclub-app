import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { fmtBRL, fmtBRLShort, yearRange } from "@/lib/finance";
import StatCard from "@/components/admin/StatCard";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

type Row = { date: string; in: number; out: number; balance: number };

const FluxoCaixa = () => {
  const { filterId } = useUnit();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const yr = yearRange(year);
      let txQ = supabase.from("transactions").select("date,kind,amount,status").gte("date", yr.start).lte("date", yr.end);
      let apQ = supabase.from("accounts_payable").select("due_date,amount,status").gte("due_date", yr.start).lte("due_date", yr.end);
      if (filterId) { txQ = txQ.eq("unit_id", filterId); apQ = apQ.eq("unit_id", filterId); }
      const [{ data: tx }, { data: ap }] = await Promise.all([txQ, apQ]);

      const byDate = new Map<string, { in: number; out: number }>();
      (tx || []).forEach(t => {
        const d = t.date;
        const cur = byDate.get(d) || { in: 0, out: 0 };
        if (t.kind === "income") cur.in += Number(t.amount); else cur.out += Number(t.amount);
        byDate.set(d, cur);
      });
      (ap || []).filter(a => a.status === "pending").forEach(a => {
        const cur = byDate.get(a.due_date) || { in: 0, out: 0 };
        cur.out += Number(a.amount);
        byDate.set(a.due_date, cur);
      });

      const sorted = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
      let balance = 0;
      const series: Row[] = sorted.map(([date, v]) => {
        balance += v.in - v.out;
        return { date, in: v.in, out: v.out, balance };
      });
      setRows(series);
      setLoading(false);
    };
    run();
  }, [filterId, year]);

  const totals = useMemo(() => {
    const totalIn = rows.reduce((s, r) => s + r.in, 0);
    const totalOut = rows.reduce((s, r) => s + r.out, 0);
    const finalBal = rows.length ? rows[rows.length - 1].balance : 0;
    return { totalIn, totalOut, finalBal };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-xs font-dm text-muted-foreground">Ano:</label>
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-9 w-28 rounded-lg border border-border bg-card px-3 text-sm font-dm" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Saldo projetado" value={fmtBRLShort(totals.finalBal)} accent />
        <StatCard label="Entradas previstas" value={fmtBRLShort(totals.totalIn)} />
        <StatCard label="Saídas previstas" value={fmtBRLShort(totals.totalOut)} />
        <StatCard label="Dias com movimento" value={String(rows.length)} />
      </div>

      <div className="bg-card rounded-xl p-5 card-shadow">
        <p className="text-sm font-dm font-semibold text-foreground mb-4">Saldo acumulado</p>
        {loading ? (
          <div className="h-72 animate-pulse bg-background rounded-lg" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sem movimentações no período.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                <Area type="monotone" dataKey="balance" stroke="#1400FF" fill="#1400FF22" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl card-shadow overflow-x-auto">
        <table className="w-full text-xs font-dm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-muted-foreground font-medium">Data</th>
              <th className="px-4 py-3 text-muted-foreground font-medium text-right">Entradas</th>
              <th className="px-4 py-3 text-muted-foreground font-medium text-right">Saídas</th>
              <th className="px-4 py-3 text-muted-foreground font-medium text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Sem dados</td></tr>
            ) : rows.map(r => (
              <tr key={r.date} className="border-b border-border">
                <td className="px-4 py-2">{new Date(r.date).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-2 text-right text-green-600">{fmtBRL(r.in)}</td>
                <td className="px-4 py-2 text-right text-red-500">{fmtBRL(r.out)}</td>
                <td className={`px-4 py-2 text-right font-semibold ${r.balance < 0 ? "text-red-500" : "text-foreground"}`}>{fmtBRL(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FluxoCaixa;