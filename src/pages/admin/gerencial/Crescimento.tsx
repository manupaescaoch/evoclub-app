import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import PageShell, { LoadingState, SummaryCard } from "@/components/admin/gerencial/PageShell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Client = { id: number; status: string | null; plan: string | null; contract_start: string | null; contract_end: string | null; created_at: string | null; };
type Cancel = { id: string; cancelled_at: string | null; client_id: number | null; };

function monthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function monthLabel(k: string) {
  const [y, m] = k.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

export default function Crescimento() {
  const [clients, setClients] = useState<Client[]>([]);
  const [cancels, setCancels] = useState<Cancel[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [planFilter, setPlanFilter] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: cl }, { data: ca }] = await Promise.all([
        supabase.from("clients").select("id,status,plan,contract_start,contract_end,created_at"),
        supabase.from("cancellations").select("id,cancelled_at,client_id"),
      ]);
      setClients((cl || []) as any); setCancels((ca || []) as any); setLoading(false);
    })();
  }, []);

  const plans = useMemo(() => Array.from(new Set(clients.map(c => c.plan).filter(Boolean))) as string[], [clients]);

  const filteredClients = useMemo(
    () => clients.filter(c => planFilter === "all" || c.plan === planFilter),
    [clients, planFilter]
  );

  const monthlyData = useMemo(() => {
    const months: string[] = [];
    for (let m = 0; m < 12; m++) months.push(`${year}-${String(m + 1).padStart(2, "0")}`);

    return months.map(mk => {
      const [yy, mm] = mk.split("-").map(Number);
      const monthStart = new Date(yy, mm - 1, 1);
      const monthEnd = new Date(yy, mm, 0, 23, 59, 59);

      const newEntries = filteredClients.filter(c => {
        const d = c.contract_start || c.created_at;
        if (!d) return false;
        const dt = new Date(d);
        return dt >= monthStart && dt <= monthEnd;
      }).length;

      const cancelsInMonth = cancels.filter(x => {
        if (!x.cancelled_at) return false;
        const dt = new Date(x.cancelled_at);
        const inClients = filteredClients.some(c => c.id === x.client_id);
        return inClients && dt >= monthStart && dt <= monthEnd;
      }).length;

      const expired = filteredClients.filter(c => {
        if (!c.contract_end) return false;
        const dt = new Date(c.contract_end);
        return dt >= monthStart && dt <= monthEnd;
      }).length;

      const activeAtStart = filteredClients.filter(c => {
        const start = c.contract_start ? new Date(c.contract_start) : (c.created_at ? new Date(c.created_at) : null);
        const end = c.contract_end ? new Date(c.contract_end) : null;
        return start && start < monthStart && (!end || end >= monthStart);
      }).length;

      const totalIn = newEntries;
      const totalOut = cancelsInMonth + expired;
      const net = totalIn - totalOut;
      const churn = activeAtStart > 0 ? ((cancelsInMonth / activeAtStart) * 100).toFixed(1) : "0.0";
      const activeAtEnd = activeAtStart + net;

      return {
        month: mk, activeAtStart, newEntries, totalIn,
        cancels: cancelsInMonth, expired, totalOut, net, churn, activeAtEnd,
      };
    });
  }, [filteredClients, cancels, year]);

  const totals = useMemo(() => monthlyData.reduce(
    (acc, m) => ({ in: acc.in + m.totalIn, out: acc.out + m.totalOut, net: acc.net + m.net }),
    { in: 0, out: 0, net: 0 }
  ), [monthlyData]);

  const lastWithData = [...monthlyData].reverse().find(m => m.activeAtEnd > 0 || m.totalIn > 0);
  const firstWithData = monthlyData.find(m => m.activeAtStart > 0 || m.totalIn > 0);
  const avgChurn = (() => {
    const months = monthlyData.filter(m => m.activeAtStart > 0);
    if (!months.length) return "0.0";
    return (months.reduce((s, m) => s + Number(m.churn), 0) / months.length).toFixed(1);
  })();

  const exportCSV = () => {
    const headers = ["Mês","Ativos início","Novos","Entradas","Cancelados","Vencidos","Saídas","Crescimento","Churn %","Ativos final"];
    const rows = monthlyData.map(m => [
      monthLabel(m.month), m.activeAtStart, m.newEntries, m.totalIn,
      m.cancels, m.expired, m.totalOut, m.net, m.churn, m.activeAtEnd,
    ]);
    const csv = [headers, ...rows].map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `crescimento-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <PageShell
      title="Crescimento"
      description="Entradas, saídas, churn e evolução da base de clientes."
      primaryAction={<Button variant="outline" onClick={exportCSV} className="gap-2"><Download size={16} />Exportar</Button>}
      filters={
        <>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-9 w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Plano" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos planos</SelectItem>{plans.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </>
      }
      summary={
        <>
          <SummaryCard label="Total de entradas" value={totals.in} accent="green" />
          <SummaryCard label="Total de saídas" value={totals.out} accent="red" />
          <SummaryCard label="Churn médio" value={`${avgChurn}%`} accent="yellow" />
          <SummaryCard label="Crescimento líquido" value={totals.net} accent="blue" />
          <SummaryCard label="Ativos no início" value={firstWithData?.activeAtStart ?? 0} />
          <SummaryCard label="Ativos no final" value={lastWithData?.activeAtEnd ?? 0} />
        </>
      }
    >
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? <LoadingState /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-dm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2">Mês</th>
                  <th className="px-3 py-2 text-right">Ativos início</th>
                  <th className="px-3 py-2 text-right text-green-700">Novos</th>
                  <th className="px-3 py-2 text-right text-green-700">Entradas</th>
                  <th className="px-3 py-2 text-right text-red-700">Cancelados</th>
                  <th className="px-3 py-2 text-right text-red-700">Vencidos</th>
                  <th className="px-3 py-2 text-right text-red-700">Saídas</th>
                  <th className="px-3 py-2 text-right text-blue-700">Crescimento</th>
                  <th className="px-3 py-2 text-right text-amber-700">Churn %</th>
                  <th className="px-3 py-2 text-right">Ativos final</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map(m => (
                  <tr key={m.month} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium capitalize">{monthLabel(m.month)}</td>
                    <td className="px-3 py-2 text-right">{m.activeAtStart}</td>
                    <td className="px-3 py-2 text-right text-green-700">{m.newEntries}</td>
                    <td className="px-3 py-2 text-right text-green-700">{m.totalIn}</td>
                    <td className="px-3 py-2 text-right text-red-700">{m.cancels}</td>
                    <td className="px-3 py-2 text-right text-red-700">{m.expired}</td>
                    <td className="px-3 py-2 text-right text-red-700">{m.totalOut}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${m.net >= 0 ? "text-blue-700" : "text-red-700"}`}>{m.net >= 0 ? `+${m.net}` : m.net}</td>
                    <td className="px-3 py-2 text-right text-amber-700">{m.churn}%</td>
                    <td className="px-3 py-2 text-right font-semibold">{m.activeAtEnd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}