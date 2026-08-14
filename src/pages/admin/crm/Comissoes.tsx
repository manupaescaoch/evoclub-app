import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageShell, { SummaryCard } from "@/components/admin/gerencial/PageShell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useUnit } from "@/contexts/UnitContext";

type Entry = {
  entry_id: string; conversion_id: string; role: string; rule: string;
  collaborator_id: string | null; collaborator_name: string | null;
  client_id: number | null; client_name: string | null;
  unit_id: string | null; base_value: number; amount: number; reference_date: string;
};

const ROLE_LABEL: Record<string, string> = {
  professor: "Professor da experimental",
  registrar: "Cadastrador",
  seller: "Vendedor",
};

export default function Comissoes() {
  const now = new Date();
  const { filterId } = useUnit();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      const from = `${year}-${String(month).padStart(2, "0")}-01`;
      const to = new Date(year, month, 0);
      const toISO = `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, "0")}-${String(to.getDate()).padStart(2, "0")}`;
      const { data, error: err } = await supabase.rpc("commission_report" as any, {
        _from: from, _to: toISO, _unit_id: filterId,
      });
      if (err) setError(err.message);
      setEntries(((data || []) as Entry[]));
      setLoading(false);
    })();
  }, [month, year, filterId]);

  const conversions = useMemo(() => new Set(entries.map(e => e.conversion_id)), [entries]);
  const byRole = (role: string) => entries.filter(e => e.role === role);

  const sum = (list: Entry[]) => list.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalMatriculas = conversions.size;
  const baseTotal = Array.from(conversions).reduce((s, id) => {
    const e = entries.find(x => x.conversion_id === id);
    return s + Number(e?.base_value || 0);
  }, 0);
  const ticket = totalMatriculas ? baseTotal / totalMatriculas : 0;
  const cad = sum(byRole("registrar"));
  const fec = sum(byRole("seller"));
  const bonus = sum(byRole("professor"));
  const total = cad + fec + bonus;

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const grouped = (role: string) => {
    const map: Record<string, { name: string; count: number; amount: number }> = {};
    byRole(role).forEach(e => {
      const key = e.collaborator_id || "sem";
      const g = (map[key] ||= { name: e.collaborator_name || "Não informado", count: 0, amount: 0 });
      g.count += 1;
      g.amount += Number(e.amount || 0);
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  };

  const exportCsv = () => {
    const head = ["Data", "Papel", "Regra", "Responsável", "Aluno", "Base", "Valor"];
    const rows = entries.map(e => [
      e.reference_date, ROLE_LABEL[e.role] || e.role, e.rule,
      e.collaborator_name || "", e.client_name || "",
      String(e.base_value ?? ""), String(e.amount ?? ""),
    ]);
    const csv = [head, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `comissoes-${year}-${String(month).padStart(2, "0")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filters = (
    <>
      <select value={month} onChange={e => setMonth(Number(e.target.value))} className="px-3 py-1.5 border rounded-lg text-sm font-dm bg-background">
        {Array.from({ length: 12 }).map((_, i) => <option key={i+1} value={i+1}>{String(i+1).padStart(2,"0")}</option>)}
      </select>
      <select value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-1.5 border rounded-lg text-sm font-dm bg-background">
        {[year-1, year, year+1].map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </>
  );

  return (
    <PageShell
      title="COMISSÕES"
      description="Lançamentos gerados na conversão de experimentais: professor R$ 20,00, cadastrador 3% e vendedor 2% da primeira mensalidade."
      primaryAction={<Button variant="outline" className="gap-2" onClick={exportCsv} disabled={!entries.length}><Download size={14} /> Exportar</Button>}
      filters={filters}
    >
      {loading && <p className="text-sm font-dm text-muted-foreground">Carregando comissões...</p>}
      {error && <p className="text-sm font-dm text-red-600">Não foi possível carregar: {error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <SummaryCard label="Matrículas" value={totalMatriculas} />
        <SummaryCard label="Ticket Médio" value={fmtBRL(ticket)} />
        <SummaryCard label="Cadastrador 3%" value={fmtBRL(cad)} accent="blue" />
        <SummaryCard label="Vendedor 2%" value={fmtBRL(fec)} accent="blue" />
        <SummaryCard label="Professor R$ 20" value={fmtBRL(bonus)} accent="yellow" />
        <SummaryCard label="Total Comissões" value={fmtBRL(total)} accent="green" />
      </div>

      {(["registrar", "seller", "professor"] as const).map(role => (
        <section key={role} className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b font-barlow font-bold text-foreground">
            {role === "registrar" ? "Comissão do Cadastrador (3%)" : role === "seller" ? "Comissão do Vendedor (2%)" : "Bônus do Professor da Experimental (R$ 20,00)"}
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Responsável</TableHead><TableHead>Conversões</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {grouped(role).length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8 font-dm">Nenhum lançamento no período.</TableCell></TableRow>
              ) : grouped(role).map(g => (
                <TableRow key={g.name}>
                  <TableCell className="font-dm">{g.name}</TableCell>
                  <TableCell className="font-dm">{g.count}</TableCell>
                  <TableCell className="text-right font-dm">{fmtBRL(g.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ))}

      <section className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b font-barlow font-bold text-foreground">Lançamentos do período</div>
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Aluno</TableHead><TableHead>Papel</TableHead><TableHead>Responsável</TableHead><TableHead>Base</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8 font-dm">Nenhuma conversão registrada neste período.</TableCell></TableRow>
            ) : entries.map(e => (
              <TableRow key={e.entry_id}>
                <TableCell className="font-dm">{new Date(`${e.reference_date}T12:00:00`).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="font-dm">{e.client_name || "—"}</TableCell>
                <TableCell className="font-dm">{ROLE_LABEL[e.role] || e.role}</TableCell>
                <TableCell className="font-dm">{e.collaborator_name || "—"}</TableCell>
                <TableCell className="font-dm">{fmtBRL(Number(e.base_value || 0))}</TableCell>
                <TableCell className="text-right font-dm">{fmtBRL(Number(e.amount || 0))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </PageShell>
  );
}
