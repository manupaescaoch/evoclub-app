import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageShell, { SummaryCard } from "@/components/admin/gerencial/PageShell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

type Sale = { id: string; value: number; type: string | null; created_at: string | null };

export default function Comissoes() {
  const now = new Date();
  const [sales, setSales] = useState<Sale[]>([]);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sales").select("id,value,type,created_at");
      setSales((data as Sale[]) || []);
    })();
  }, []);

  const filtered = useMemo(() => sales.filter(s => {
    if (!s.created_at) return false;
    const d = new Date(s.created_at);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  }), [sales, month, year]);

  const totalMatriculas = filtered.length;
  const totalRevenue = filtered.reduce((sum, s) => sum + Number(s.value || 0), 0);
  const ticket = totalMatriculas ? totalRevenue / totalMatriculas : 0;
  const cad = totalRevenue * 0.03;
  const fec = totalRevenue * 0.02;
  const bonus = 0; // depende de cadastro de treinador responsável por aluno
  const total = cad + fec + bonus;

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const filters = (
    <>
      <select value={month} onChange={e => setMonth(Number(e.target.value))} className="px-3 py-1.5 border rounded-lg text-sm font-dm bg-background">
        {Array.from({ length: 12 }).map((_, i) => <option key={i+1} value={i+1}>{String(i+1).padStart(2,"0")}</option>)}
      </select>
      <select value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-1.5 border rounded-lg text-sm font-dm bg-background">
        {[year-1, year, year+1].map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <select className="px-3 py-1.5 border rounded-lg text-sm font-dm bg-background"><option>Todas as unidades</option></select>
      <select className="px-3 py-1.5 border rounded-lg text-sm font-dm bg-background"><option>Todos funcionários</option></select>
    </>
  );

  return (
    <PageShell
      title="COMISSÕES"
      description="Cálculo automático de comissões de cadastrador (3%), fechador (2%) e bônus do treinador."
      primaryAction={<Button variant="outline" className="gap-2"><Download size={14} /> Exportar</Button>}
      filters={filters}
    >
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <SummaryCard label="Matrículas" value={totalMatriculas} />
        <SummaryCard label="Ticket Médio" value={fmtBRL(ticket)} />
        <SummaryCard label="Cadastrador 3%" value={fmtBRL(cad)} accent="blue" />
        <SummaryCard label="Fechador 2%" value={fmtBRL(fec)} accent="blue" />
        <SummaryCard label="Bônus Treinador" value={fmtBRL(bonus)} accent="yellow" />
        <SummaryCard label="Total Comissões" value={fmtBRL(total)} accent="green" />
      </div>

      <section className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b font-barlow font-bold text-foreground">Comissão do Cadastrador (3%)</div>
        <Table>
          <TableHeader><TableRow><TableHead>Cadastrador</TableHead><TableHead>Matrículas</TableHead><TableHead className="text-right">Comissão 3%</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8 font-dm">Vincule um cadastrador às vendas para visualizar.</TableCell></TableRow>
          </TableBody>
        </Table>
      </section>

      <section className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b font-barlow font-bold text-foreground">Comissão do Fechador (2%)</div>
        <Table>
          <TableHeader><TableRow><TableHead>Responsável</TableHead><TableHead>Matrículas</TableHead><TableHead className="text-right">Comissão 2%</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8 font-dm">Vincule um fechador às vendas para visualizar.</TableCell></TableRow>
          </TableBody>
        </Table>
      </section>

      <section className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b font-barlow font-bold text-foreground">Bônus por Treinador Responsável</div>
        <div className="p-4 grid md:grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/30 p-3"><p className="text-xs font-dm text-muted-foreground">Total matrículas fechadas</p><p className="font-barlow font-bold text-2xl">0</p></div>
          <div className="rounded-lg bg-muted/30 p-3"><p className="text-xs font-dm text-muted-foreground">Total bônus a pagar</p><p className="font-barlow font-bold text-2xl">{fmtBRL(0)}</p></div>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Treinador</TableHead><TableHead>Aulas</TableHead><TableHead>Matrículas</TableHead><TableHead>Conversão</TableHead><TableHead>Bônus/aluno</TableHead><TableHead className="text-right">Bônus total</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8 font-dm">Vincule um treinador responsável aos alunos para calcular bônus.</TableCell></TableRow>
          </TableBody>
        </Table>
        <div className="px-4 py-2 border-t bg-muted/20 text-[11px] font-dm text-muted-foreground">
          Tabela: 1–4 alunos = R$ 20 · 5–7 = R$ 25 · 8–10 = R$ 30 · 11+ = R$ 40
        </div>
      </section>
    </PageShell>
  );
}
