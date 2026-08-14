import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PageShell, { SummaryCard, LoadingState } from "@/components/admin/gerencial/PageShell";
import { Button } from "@/components/ui/button";
import { useUnit } from "@/contexts/UnitContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { toast } from "sonner";
import {
  CalendarDays, ListTodo, FileText, ClipboardCheck, Inbox, Workflow, RefreshCw,
} from "lucide-react";

type Dash = {
  tasks_today: number; tasks_done: number; tasks_pending: number; tasks_late: number;
  forms_pending: number; nps_avg: number | null; nps_count: number;
  nps_detractors: number; nps_promoters: number; anamnesis_count: number;
  closures_today: number; closures_pending: number;
};

const shortcuts = [
  { label: "Calendário", icon: CalendarDays, path: "/admin/operacional/calendario", desc: "Semana, dia e lista" },
  { label: "Tarefas", icon: ListTodo, path: "/admin/crm/tarefas", desc: "Kanban e responsáveis" },
  { label: "Formulários", icon: FileText, path: "/admin/operacional/formularios", desc: "Links rastreáveis" },
  { label: "Encerramento de Turno", icon: ClipboardCheck, path: "/admin/operacional/encerramento", desc: "Setor e passagem" },
  { label: "Respostas e Pendências", icon: Inbox, path: "/admin/operacional/respostas", desc: "NPS e anamneses" },
  { label: "Automações", icon: Workflow, path: "/admin/operacional/automacoes", desc: "Rotinas recorrentes" },
];

export default function OperacionalIndex() {
  const { filterId } = useUnit();
  const { from, to, label } = usePeriod();
  const [data, setData] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: d, error } = await supabase.rpc("operational_dashboard", {
      _unit_id: filterId, _from: from, _to: to,
    });
    if (error) toast.error("Erro ao carregar indicadores: " + error.message);
    setData((d as unknown as Dash) || null);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filterId, from, to]);

  const runRuler = async () => {
    setRunning(true);
    const { data: r, error } = await supabase.rpc("operational_ruler");
    setRunning(false);
    if (error) return toast.error(error.message);
    const res = r as any;
    toast.success(`Régua executada: ${res?.pendencias ?? 0} pendências, ${res?.avisos ?? 0} avisos`);
    load();
  };

  return (
    <PageShell
      title="OPERACIONAL"
      description={`Central da operação diária — período: ${label}`}
      primaryAction={
        <Button variant="outline" className="gap-2" onClick={runRuler} disabled={running}>
          <RefreshCw size={14} className={running ? "animate-spin" : ""} /> Rodar régua de avisos
        </Button>
      }
      summary={
        <>
          <SummaryCard label="Tarefas de hoje" value={data?.tasks_today ?? "—"} />
          <SummaryCard label="Concluídas" value={data?.tasks_done ?? "—"} accent="green" />
          <SummaryCard label="Pendentes" value={data?.tasks_pending ?? "—"} accent="yellow" />
          <SummaryCard label="Atrasadas" value={data?.tasks_late ?? "—"} accent="red" />
        </>
      }
    >
      {loading ? <LoadingState /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Formulários pendentes" value={data?.forms_pending ?? 0} accent="yellow" />
            <SummaryCard label="NPS do período" value={data?.nps_avg != null ? `${data.nps_avg}` : "—"} accent="blue" />
            <SummaryCard label="Anamneses do período" value={data?.anamnesis_count ?? 0} />
            <SummaryCard label="Encerramentos de hoje" value={data?.closures_today ?? 0} accent="green" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Respostas de NPS" value={data?.nps_count ?? 0} />
            <SummaryCard label="Detratores" value={data?.nps_detractors ?? 0} accent="red" />
            <SummaryCard label="Promotores" value={data?.nps_promoters ?? 0} accent="green" />
            <SummaryCard label="Encerramentos pendentes" value={data?.closures_pending ?? 0} accent="red" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {shortcuts.map(s => (
              <Link key={s.path} to={s.path}
                className="rounded-xl border bg-card p-4 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2">
                  <s.icon size={16} className="text-primary" />
                  <span className="font-barlow font-bold text-sm uppercase">{s.label}</span>
                </div>
                <p className="text-xs text-muted-foreground font-dm mt-1">{s.desc}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}