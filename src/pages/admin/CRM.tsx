import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, CheckCircle2, CalendarClock } from "lucide-react";
import PageShell, { SummaryCard } from "@/components/admin/gerencial/PageShell";

type ClientRow = { id: number; status: string | null; contract_start: string | null; contract_end: string | null; created_at: string | null };
type Cancel = { id: string; cancelled_at: string | null };

function startOfWeek(d: Date) { const x = new Date(d); const day = x.getDay(); x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x; }
function fmtDate(d: Date) { return d.toISOString().split("T")[0]; }

export default function CRM() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [cancels, setCancels] = useState<Cancel[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"all" | "month" | "week">("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: cs }, { data: cc }] = await Promise.all([
        supabase.from("clients").select("id,status,contract_start,contract_end,created_at"),
        supabase.from("cancellations").select("id,cancelled_at"),
      ]);
      setClients((cs as ClientRow[]) || []);
      setCancels((cc as Cancel[]) || []);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const today = fmtDate(now);
    const weekStart = startOfWeek(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const inPeriod = (dateStr?: string | null) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (period === "week") return d >= weekStart;
      if (period === "month") return d >= monthStart;
      return true;
    };

    const totalLeads = clients.length;
    const newEnrollments = clients.filter(c => inPeriod(c.contract_start || c.created_at) && (c.status === "active" || c.status === "ativo" || c.status === "OP")).length;
    const expiring = clients.filter(c => {
      if (!c.contract_end) return false;
      const d = new Date(c.contract_end);
      const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    }).length;
    const expired = clients.filter(c => c.contract_end && new Date(c.contract_end) < now).length;

    return {
      totalLeads,
      scheduled: 0,
      experimentalWeek: 0,
      attendances: 0,
      sameDayClose: "—",
      newEnrollments,
      pendingFollowups: 0,
      expiring: `${expiring}`,
      expiredCount: expired,
      noShows: 0,
      attendanceRate: "—",
    };
  }, [clients, cancels, period]);

  const filters = (
    <>
      <select className="px-3 py-1.5 border rounded-lg text-sm font-dm bg-background">
        <option>Todas as unidades</option>
      </select>
      <select
        value={period}
        onChange={e => setPeriod(e.target.value as any)}
        className="px-3 py-1.5 border rounded-lg text-sm font-dm bg-background"
      >
        <option value="all">Todo histórico</option>
        <option value="month">Este mês</option>
        <option value="week">Esta semana</option>
      </select>
      <span className="inline-flex items-center gap-1 text-[11px] text-green-700 bg-green-100 rounded-full px-2 py-1 font-dm">
        <span className="w-1.5 h-1.5 bg-green-600 rounded-full" /> Sincronizado agora
      </span>
    </>
  );

  return (
    <PageShell
      title="CRM — DASHBOARD"
      description="Visão consolidada de leads, agendamentos, conversões e operação comercial."
      filters={filters}
    >
      {/* Cards principais */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Total de Leads" value={loading ? "…" : stats.totalLeads} />
        <SummaryCard label="Aulas Agendadas" value={stats.scheduled} />
        <SummaryCard label="Experimentais" value={stats.experimentalWeek} />
        <SummaryCard label="Comparecimentos" value={stats.attendances} accent="green" />
        <SummaryCard label="Fechamento no Dia" value={stats.sameDayClose} accent="blue" />
        <SummaryCard label="Matrículas no Período" value={stats.newEnrollments} accent="green" />
        <SummaryCard label="Follow-ups Pendentes" value={stats.pendingFollowups} accent="yellow" />
        <SummaryCard label="Planos Vencendo" value={stats.expiring} accent="yellow" />
        <SummaryCard label="Não Compareceram" value={stats.noShows} accent="red" />
        <SummaryCard label="Taxa Comparecimento" value={stats.attendanceRate} />
      </div>

      <Tabs defaultValue="diario" className="w-full">
        <TabsList>
          <TabsTrigger value="diario">Controle Diário</TabsTrigger>
          <TabsTrigger value="periodo">Visão do Período</TabsTrigger>
        </TabsList>

        <TabsContent value="diario" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-barlow font-bold text-foreground">Eventos de Hoje</h3>
                <Badge variant="secondary">0</Badge>
              </div>
              <p className="text-sm text-muted-foreground font-dm py-6 text-center">
                Nenhum evento agendado para hoje
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-barlow font-bold text-foreground">Confirmações para Amanhã</h3>
                <Badge variant="secondary">0</Badge>
              </div>
              <div className="space-y-2">
                <div className="rounded-lg border p-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <p className="font-barlow font-bold text-sm">FELIPE SCHUMACHER</p>
                    <span className="text-xs font-dm text-muted-foreground">20:00</span>
                  </div>
                  <p className="text-xs font-dm text-primary mt-0.5">Experimental</p>
                  <p className="text-[11px] font-dm text-muted-foreground mt-1">Experimental agendada no cadastro do lead</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Button size="sm" variant="outline" className="h-7 text-[11px]"><Send size={12} /> Lembrete</Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px]"><CheckCircle2 size={12} /> Confirmar</Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px]"><CalendarClock size={12} /> Reagendar</Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-barlow font-bold text-foreground">Pendências do Dia</h3>
                <Badge>0</Badge>
              </div>
              <ul className="space-y-1.5 text-sm font-dm">
                {[
                  "Confirmar experimental",
                  "Follow-up D+1",
                  "Follow-up D+7",
                  "Plano vencendo",
                  "Plano vencido",
                  "Reagendar não comparecimento",
                  "Retomar lead parado",
                  "Cobrança pendente",
                ].map(p => (
                  <li key={p} className="flex items-center gap-2 text-muted-foreground">
                    <Bell size={12} className="text-amber-500" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="periodo">
          <div className="grid md:grid-cols-2 gap-4">
            {[
              "Funil comercial",
              "Leads por origem",
              "Experimentais agendadas vs realizadas",
              "Não comparecimentos",
              "Matrículas fechadas",
              "Taxa de conversão",
              "Evolução semanal/mensal",
              "Ranking por responsável",
            ].map(t => (
              <div key={t} className="rounded-xl border bg-card p-4 h-32 flex flex-col">
                <p className="font-barlow font-bold text-sm text-foreground">{t}</p>
                <p className="text-xs text-muted-foreground font-dm mt-auto">Aguardando dados do período.</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
