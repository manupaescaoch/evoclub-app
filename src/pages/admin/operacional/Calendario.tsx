import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageShell, { LoadingState } from "@/components/admin/gerencial/PageShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { useUnit } from "@/contexts/UnitContext";
import { brToday } from "@/contexts/PeriodContext";
import NovaAtividadeDialog from "@/components/admin/operacional/NovaAtividadeDialog";

type Task = {
  id: string; title: string; sector: string | null; category: string | null;
  responsible_name: string | null; unit_id: string | null; recurrence: string | null;
  status: string; priority: string; due_date: string | null; due_time: string | null;
  description?: string | null;
};

type View = "dia" | "semana" | "mes";

const STATUS_LABEL: Record<string, string> = {
  todo: "A fazer", in_progress: "Em andamento", waiting: "Aguardando", done: "Concluída",
};
const DOW = ["Dom.", "Seg.", "Ter.", "Qua.", "Qui.", "Sex.", "Sáb."];

const START_HOUR = 5;
const END_HOUR = 23;
const ROW_H = 48; // px por hora

const iso = (d: Date) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sundayOf = (d: Date) => addDays(d, -d.getDay());
const minutesOf = (t: string | null) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

export default function OperacionalCalendario() {
  const { filterId, units } = useUnit();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("semana");
  const [cursor, setCursor] = useState<Date>(() => brToday());
  const [detail, setDetail] = useState<Task | null>(null);

  const range = useMemo(() => {
    if (view === "dia") return { days: [cursor], from: cursor, to: cursor };
    if (view === "semana") {
      const s = sundayOf(cursor);
      const days = Array.from({ length: 7 }, (_, i) => addDays(s, i));
      return { days, from: days[0], to: days[6] };
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const gridStart = sundayOf(first);
    const total = Math.ceil((last.getDate() + first.getDay()) / 7) * 7;
    const days = Array.from({ length: total }, (_, i) => addDays(gridStart, i));
    return { days, from: days[0], to: days[days.length - 1] };
  }, [view, cursor]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      let q = supabase.from("crm_tasks").select("*").eq("archived", false)
        .gte("due_date", iso(range.from)).lte("due_date", iso(range.to))
        .order("due_time", { nullsFirst: true });
      if (filterId) q = q.eq("unit_id", filterId);
      const { data, error } = await q;
      if (!alive) return;
      if (error) toast.error("Erro ao carregar o calendário: " + error.message);
      setTasks((data as Task[]) || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [filterId, view, range.from.getTime(), range.to.getTime()]);

  const unitName = (id: string | null) => units.find(u => u.id === id)?.name || "—";
  const byDay = (d: Date) => tasks.filter(t => t.due_date === iso(d));

  const move = (dir: number) => {
    if (view === "dia") setCursor(addDays(cursor, dir));
    else if (view === "semana") setCursor(addDays(cursor, dir * 7));
    else setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
  };

  const label = useMemo(() => {
    if (view === "dia")
      return cursor.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    if (view === "semana") {
      const a = range.days[0], b = range.days[6];
      const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      return `${fmt(a)} — ${fmt(b)} de ${b.getFullYear()}`;
    }
    return cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [view, cursor, range.days]);

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const todayIso = iso(brToday());

  const eventColor = (t: Task) =>
    t.status === "done" ? "bg-emerald-500/90 border-emerald-600"
      : t.priority === "urgent" ? "bg-red-500/90 border-red-600"
      : t.priority === "high" ? "bg-amber-500/90 border-amber-600"
      : "bg-primary/90 border-primary";

  const TimedEvent = ({ t }: { t: Task }) => {
    const start = minutesOf(t.due_time) ?? START_HOUR * 60;
    const top = ((start - START_HOUR * 60) / 60) * ROW_H;
    return (
      <button
        onClick={() => setDetail(t)}
        style={{ top: Math.max(top, 0), height: ROW_H - 6 }}
        className={`absolute left-1 right-1 rounded-md border px-1.5 py-1 text-left text-[10px] leading-tight text-white overflow-hidden ${eventColor(t)}`}
      >
        <span className="block font-barlow font-bold uppercase truncate">{t.title}</span>
        <span className="block truncate opacity-90">{(t.due_time || "").slice(0, 5)}</span>
      </button>
    );
  };

  const AllDayRow = ({ days }: { days: Date[] }) => {
    const any = days.some(d => byDay(d).some(t => !t.due_time));
    if (!any) return null;
    return (
      <div className="flex border-b bg-muted/30">
        <div className="w-14 shrink-0 py-1 pr-2 text-right text-[10px] font-dm text-muted-foreground">Dia</div>
        {days.map((d, i) => (
          <div key={i} className="flex-1 min-w-0 border-l p-1 space-y-1">
            {byDay(d).filter(t => !t.due_time).map(t => (
              <button key={t.id} onClick={() => setDetail(t)}
                className={`block w-full rounded-md border px-1.5 py-0.5 text-left text-[10px] font-barlow font-bold uppercase text-white truncate ${eventColor(t)}`}>
                {t.title}
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const TimeGrid = ({ days }: { days: Date[] }) => (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* cabeçalho */}
      <div className="flex border-b bg-muted/40">
        <div className="w-14 shrink-0 py-2 text-center text-[10px] font-dm text-muted-foreground">GMT-03</div>
        {days.map((d, i) => {
          const isToday = iso(d) === todayIso;
          return (
            <div key={i} className={`flex-1 min-w-0 border-l py-2 text-center ${isToday ? "bg-primary/5" : ""}`}>
              <div className="text-[10px] font-dm uppercase text-muted-foreground">{DOW[d.getDay()]}</div>
              <div className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full font-barlow text-sm font-bold ${
                isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <AllDayRow days={days} />

      {/* grade de horários */}
      <div className="max-h-[62vh] overflow-y-auto">
        <div className="flex">
          <div className="w-14 shrink-0">
            {hours.map(h => (
              <div key={h} style={{ height: ROW_H }} className="relative">
                <span className="absolute -top-1.5 right-2 text-[10px] font-dm text-muted-foreground">
                  {String(h).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>
          {days.map((d, i) => (
            <div key={i} className={`relative flex-1 min-w-0 border-l ${iso(d) === todayIso ? "bg-primary/[0.03]" : ""}`}>
              {hours.map(h => <div key={h} style={{ height: ROW_H }} className="border-b border-border/60" />)}
              {byDay(d).filter(t => t.due_time).map(t => <TimedEvent key={t.id} t={t} />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const MonthGrid = () => (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {DOW.map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-dm uppercase text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {range.days.map((d, i) => {
          const list = byDay(d);
          const outside = d.getMonth() !== cursor.getMonth();
          const isToday = iso(d) === todayIso;
          return (
            <div key={i} className={`min-h-[96px] border-b border-l p-1 space-y-1 ${outside ? "bg-muted/20" : ""}`}>
              <div className="flex justify-end">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full font-barlow text-xs font-bold ${
                  isToday ? "bg-primary text-primary-foreground" : outside ? "text-muted-foreground" : "text-foreground"}`}>
                  {d.getDate()}
                </span>
              </div>
              {list.slice(0, 3).map(t => (
                <button key={t.id} onClick={() => setDetail(t)}
                  className={`block w-full rounded border px-1 py-0.5 text-left text-[10px] font-dm text-white truncate ${eventColor(t)}`}>
                  {(t.due_time || "").slice(0, 5)} {t.title}
                </button>
              ))}
              {list.length > 3 && (
                <button onClick={() => { setCursor(d); setView("dia"); }}
                  className="text-[10px] font-dm text-primary">+{list.length - 3} mais</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <PageShell
      title="CALENDÁRIO"
      description="Agenda operacional em dia, semana e mês. Os dados vêm do módulo Tarefas, sem cadastro duplicado."
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setCursor(brToday())}>Hoje</Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => move(-1)}><ChevronLeft size={14} /></Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => move(1)}><ChevronRight size={14} /></Button>
          <span className="font-barlow text-sm font-bold uppercase">{label}</span>
          <div className="ml-auto flex rounded-lg border p-0.5">
            {(["dia", "semana", "mes"] as View[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`rounded-md px-3 py-1 text-xs font-dm capitalize ${
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {v === "mes" ? "Mês" : v}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {loading ? <LoadingState /> : (
        view === "mes" ? <MonthGrid /> : <TimeGrid days={range.days} />
      )}

      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-barlow uppercase">{detail?.title}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm font-dm">
              <p><span className="text-muted-foreground">Quando: </span>
                {detail.due_date ? new Date(`${detail.due_date}T12:00:00`).toLocaleDateString("pt-BR") : "—"}
                {detail.due_time ? ` às ${detail.due_time.slice(0, 5)}` : " (sem horário)"}</p>
              <p><span className="text-muted-foreground">Setor: </span>{detail.sector || detail.category || "—"}</p>
              <p><span className="text-muted-foreground">Responsável: </span>{detail.responsible_name || "Sem responsável"}</p>
              <p><span className="text-muted-foreground">Unidade: </span>{unitName(detail.unit_id)}</p>
              <p><span className="text-muted-foreground">Recorrência: </span>{detail.recurrence || "Única"}</p>
              <p><span className="text-muted-foreground">Status: </span>{STATUS_LABEL[detail.status] || detail.status}</p>
              {detail.description && <p className="rounded-lg bg-muted/40 p-2 whitespace-pre-wrap">{detail.description}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
