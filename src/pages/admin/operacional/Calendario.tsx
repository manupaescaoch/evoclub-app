import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageShell, { EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useUnit } from "@/contexts/UnitContext";
import { brToday } from "@/contexts/PeriodContext";

type Task = {
  id: string; title: string; sector: string | null; category: string | null;
  responsible_name: string | null; unit_id: string | null; recurrence: string | null;
  status: string; priority: string; due_date: string | null; due_time: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  todo: "A fazer", in_progress: "Em andamento", waiting: "Aguardando", done: "Concluída",
};
const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const iso = (d: Date) => d.toISOString().slice(0, 10);

function mondayOf(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export default function OperacionalCalendario() {
  const { filterId, units } = useUnit();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchor, setAnchor] = useState<Date>(() => mondayOf(brToday()));
  const [day, setDay] = useState<string>(() => iso(brToday()));

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => { const d = new Date(anchor); d.setDate(anchor.getDate() + i); return d; }),
    [anchor]
  );

  const load = async () => {
    setLoading(true);
    let q = supabase.from("crm_tasks").select("*").eq("archived", false)
      .gte("due_date", iso(weekDays[0])).lte("due_date", iso(weekDays[6]))
      .order("due_time", { nullsFirst: false });
    if (filterId) q = q.eq("unit_id", filterId);
    const { data, error } = await q;
    if (error) toast.error("Erro ao carregar o calendário: " + error.message);
    setTasks((data as Task[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filterId, anchor]);

  const unitName = (id: string | null) => units.find(u => u.id === id)?.name || "—";

  const byDay = (d: string) => tasks.filter(t => t.due_date === d);

  const card = (t: Task) => (
    <div key={t.id} className={`rounded-md border px-2 py-1 text-[11px] font-dm ${
      t.status === "done" ? "bg-green-50 border-green-200" :
      t.priority === "urgent" ? "bg-red-50 border-red-200" : "bg-accent/40 border-accent"
    }`}>
      <div className="font-barlow font-bold text-foreground truncate">{t.title}</div>
      <div className="text-muted-foreground truncate">
        {(t.due_time || "").slice(0, 5)} {t.sector || t.category || ""}
      </div>
      <div className="text-muted-foreground truncate">{t.responsible_name || "Sem responsável"}</div>
    </div>
  );

  const listTable = (rows: Task[]) => rows.length === 0 ? <EmptyState message="Nenhuma tarefa no período." /> : (
    <Table>
      <TableHeader><TableRow>
        <TableHead>Data</TableHead><TableHead>Horário</TableHead><TableHead>Tarefa</TableHead>
        <TableHead>Setor</TableHead><TableHead>Responsável</TableHead><TableHead>Unidade</TableHead>
        <TableHead>Recorrência</TableHead><TableHead>Status</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {rows.map(t => (
          <TableRow key={t.id}>
            <TableCell>{t.due_date ? new Date(`${t.due_date}T12:00:00`).toLocaleDateString("pt-BR") : "—"}</TableCell>
            <TableCell>{t.due_time?.slice(0, 5) || "—"}</TableCell>
            <TableCell className="font-medium">{t.title}</TableCell>
            <TableCell>{t.sector || t.category || "—"}</TableCell>
            <TableCell>{t.responsible_name || "—"}</TableCell>
            <TableCell>{unitName(t.unit_id)}</TableCell>
            <TableCell>{t.recurrence || "Única"}</TableCell>
            <TableCell>{STATUS_LABEL[t.status] || t.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const move = (dir: number) => {
    const d = new Date(anchor); d.setDate(anchor.getDate() + dir * 7); setAnchor(d);
  };

  return (
    <PageShell
      title="CALENDÁRIO"
      description="Visão semanal, diária e em lista das tarefas operacionais. Os dados vêm do módulo Tarefas, sem cadastro duplicado."
      filters={
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => move(-1)}><ChevronLeft size={14} /></Button>
          <span className="text-xs font-dm text-muted-foreground">
            {weekDays[0].toLocaleDateString("pt-BR")} — {weekDays[6].toLocaleDateString("pt-BR")}
          </span>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => move(1)}><ChevronRight size={14} /></Button>
          <Button size="sm" variant="ghost" onClick={() => setAnchor(mondayOf(brToday()))}>Semana atual</Button>
        </div>
      }
    >
      {loading ? <LoadingState /> : (
        <Tabs defaultValue="semana">
          <TabsList>
            <TabsTrigger value="semana">Semana</TabsTrigger>
            <TabsTrigger value="dia">Dia</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>

          <TabsContent value="semana">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
              {weekDays.map((d, i) => (
                <div key={i} className="rounded-xl border bg-card p-2 min-h-[160px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-barlow font-bold text-xs uppercase">{DAYS[i]}</span>
                    <span className="text-[10px] text-muted-foreground font-dm">{d.toLocaleDateString("pt-BR").slice(0, 5)}</span>
                  </div>
                  {byDay(iso(d)).length === 0
                    ? <p className="text-[10px] text-muted-foreground font-dm">—</p>
                    : byDay(iso(d)).map(card)}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="dia" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {weekDays.map((d, i) => (
                <Button key={i} size="sm" variant={iso(d) === day ? "default" : "outline"} onClick={() => setDay(iso(d))}>
                  {DAYS[i]} {d.toLocaleDateString("pt-BR").slice(0, 5)}
                </Button>
              ))}
            </div>
            {listTable(byDay(day))}
          </TabsContent>

          <TabsContent value="lista">{listTable(tasks)}</TabsContent>
        </Tabs>
      )}
    </PageShell>
  );
}