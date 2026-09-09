import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CheckInDialog from "./CheckInDialog";
import { useStudentName } from "@/hooks/useStudentName";
import { usePlanState, planMessage } from "@/hooks/usePlanState";
import { useStudentUnit } from "@/hooks/useStudentUnit";

type ClassRow = {
  id: string;
  name: string | null;
  trainer: string | null;
  start_time: string;
  end_time: string;
  day_of_week: number | null;
  max_slots: number | null;
};

type Status = {
  class_id: string;
  booked: number;
  waiting: number;
  my_booking_id: string | null;
  my_muscle_group: string | null;
  my_waitlist_position: number | null;
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const brNow = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const REASONS: Record<string, string> = {
  window_closed: "Agendamento abre 12h antes da aula.",
  too_late: "Fora do prazo. Fale com a recepção.",
  already_booked_today: "Você já tem um treino agendado neste dia.",
  already_waiting: "Você já está na lista de espera deste dia.",
  waitlist_full: "Lista de espera cheia (máx. 5).",
  full: "Turma lotada.",
  wrong_day: "Aula não acontece neste dia.",
  no_client: "Cadastro não encontrado.",
  plan_irregular: "Plano irregular. Regularize na recepção para agendar.",
  forbidden: "Ação não permitida.",
  not_found: "Registro não encontrado.",
};

const GradeTab = () => {
  const { name: authName, clientId } = useStudentName();
  const { plan } = usePlanState();
  const [offset, setOffset] = useState(0);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [waitMode, setWaitMode] = useState(false);
  const [activeClass, setActiveClass] = useState<ClassRow | null>(null);

  const days = useMemo(() => {
    const base = brNow();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, []);

  const selected = days[offset];
  const selectedISO = toISODate(selected);
  const dbDay = selected.getDay();

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: cls }, { data: st }] = await Promise.all([
      supabase.from("classes").select("*").eq("day_of_week", dbDay).order("start_time"),
      supabase.rpc("class_day_status", { _class_date: selectedISO }),
    ]);
    setClasses((cls || []) as ClassRow[]);
    const map: Record<string, Status> = {};
    ((st || []) as Status[]).forEach((r) => { map[r.class_id] = r; });
    setStatus(map);
    setLoading(false);
  }, [dbDay, selectedISO]);

  useEffect(() => { load(); }, [load, clientId]);

  const startMinutes = (c: ClassRow) =>
    parseInt(c.start_time.slice(0, 2), 10) * 60 + (parseInt(c.start_time.slice(3, 5), 10) || 0);

  const minutesUntil = (c: ClassRow) => {
    const now = brNow();
    const start = new Date(selected);
    start.setHours(0, 0, 0, 0);
    start.setMinutes(startMinutes(c));
    return Math.round((start.getTime() - now.getTime()) / 60000);
  };

  const openBooking = (c: ClassRow, waitlist: boolean) => {
    setActiveClass(c);
    setWaitMode(waitlist);
    setDialogOpen(true);
  };

  const handleConfirm = async ({ muscleGroup }: { muscleGroup: "inferior" | "superior" }) => {
    if (!activeClass) return;
    const fn = waitMode ? "join_waitlist" : "book_class";
    const { data, error } = await supabase.rpc(fn, {
      _class_id: activeClass.id,
      _class_date: selectedISO,
      _muscle_group: muscleGroup,
    });
    if (error) { toast.error(error.message); return; }
    const res = (data || {}) as { ok?: boolean; reason?: string; position?: number };
    if (!res.ok) { toast.error(REASONS[res.reason || ""] || "Não foi possível concluir."); return; }
    toast.success(waitMode ? `Você está na lista de espera (${res.position}º).` : "Agendamento confirmado!");
    load();
  };

  const cancelBooking = async (bookingId: string) => {
    const { data, error } = await supabase.rpc("cancel_booking", { _booking_id: bookingId });
    if (error) { toast.error(error.message); return; }
    const res = (data || {}) as { ok?: boolean; reason?: string };
    if (!res.ok) { toast.error(REASONS[res.reason || ""] || "Não foi possível cancelar."); return; }
    toast.success("Agendamento cancelado.");
    load();
  };

  const leaveWaitlist = async (c: ClassRow) => {
    const { error } = await supabase.rpc("leave_waitlist", { _class_id: c.id, _class_date: selectedISO });
    if (error) { toast.error(error.message); return; }
    toast.success("Você saiu da lista de espera.");
    load();
  };

  const hasBookingToday = Object.values(status).some((s) => s.my_booking_id);
  const inWaitlistToday = Object.values(status).some((s) => s.my_waitlist_position);
  const planBlocked = plan.blocked;

  return (
    <div>
      <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-3 border-b border-border">
        <h1 className="font-barlow font-bold text-xl text-foreground">GRADE DE AULAS</h1>
        <p className="text-xs text-muted font-dm">EVO Club · agende seu treino</p>
      </div>

      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        {days.map((d, i) => (
          <button
            key={i}
            onClick={() => setOffset(i)}
            className={`px-3 py-1.5 rounded-full text-xs font-dm font-semibold shrink-0 transition-colors
              ${i === offset ? "bg-primary text-white cta-shadow" : "bg-white text-muted card-shadow"}`}
          >
            {i === 0 ? "Hoje" : `${WEEKDAYS[d.getDay()]} ${d.getDate()}`}
          </button>
        ))}
      </div>

      {authName && (
        <div className="px-4 pb-2">
          <div className="bg-white card-shadow rounded-xl px-3 py-2 text-xs font-dm">
            <span className="text-muted-foreground">Aluno: </span>
            <span className="font-semibold text-foreground">{authName}</span>
          </div>
        </div>
      )}

      {(plan.state === "blocked" || plan.state === "overdue") && (
        <div className="px-4 pb-2">
          <div className={`rounded-xl px-3 py-2.5 text-[11px] font-dm font-semibold ${planBlocked ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
            {planMessage(plan)}
          </div>
        </div>
      )}

      <div className="px-4 pb-4">
        {loading && <p className="text-xs text-muted font-dm py-4">Carregando...</p>}
        {!loading && classes.length === 0 && (
          <p className="text-xs text-muted font-dm py-6 text-center">Nenhuma aula neste dia.</p>
        )}
        {classes.map((c) => {
          const s = status[c.id];
          const max = c.max_slots ?? unit?.default_capacity ?? null;
          const booked = s?.booked ?? 0;
          const remaining = max === null ? null : Math.max(0, max - booked);
          const full = remaining !== null && remaining === 0;
          const mine = s?.my_booking_id || null;
          const myWait = s?.my_waitlist_position || null;
          const mins = minutesUntil(c);
          const hour = parseInt(c.start_time.slice(0, 2), 10);
          const isCurrent = offset === 0 && hour === brNow().getHours();
          const closedPast = mins < 20;
          const notOpenYet = mins > 12 * 60;
          

          let label = "Agendar";
          let action: (() => void) | null = () => openBooking(c, false);
          let disabled = false;
          let tag: string | null = null;

          if (mine) {
            label = "Cancelar";
            action = () => cancelBooking(mine);
            tag = "AGENDADO";
          } else if (myWait) {
            label = "Sair da fila";
            action = () => leaveWaitlist(c);
            tag = `ESPERA ${myWait}º`;
          } else if (closedPast) {
            label = "Encerrado"; disabled = true; action = null; tag = "ENCERRADO";
          } else if (notOpenYet) {
            label = "Abre em 12h"; disabled = true; action = null;
          } else if (hasBookingToday || inWaitlistToday) {
            label = "1 treino/dia"; disabled = true; action = null;
          } else if (full) {
            label = "Lista de espera";
            action = () => openBooking(c, true);
            tag = "LOTADO";
          }

          if (planBlocked && !mine && !myWait) {
            label = "Plano irregular"; disabled = true; action = null;
          }

          return (
            <div key={c.id} className="flex gap-3 mb-3">
              <div className="flex flex-col items-center w-12 shrink-0">
                <span className="text-[11px] font-barlow font-bold text-muted">{c.start_time.slice(0, 5)}</span>
                <div className={`flex-1 w-0.5 mt-1 ${isCurrent ? "bg-primary" : "bg-border"}`} />
              </div>
              <div className={`flex-1 rounded-2xl p-3 card-shadow ${mine ? "bg-primary/5 border-l-4 border-l-primary" : closedPast ? "bg-muted/40 opacity-60" : "bg-white"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-dm font-semibold text-sm text-foreground">{c.name || "Musculação"}</p>
                      {tag && (
                        <span className="text-[9px] font-barlow font-bold tracking-[1px] uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">{tag}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted font-dm mt-0.5">
                      {c.trainer ? `Prof. ${c.trainer}` : "Sem professor"}
                      {mine && s?.my_muscle_group ? ` · ${s.my_muscle_group === "inferior" ? "Inferior" : "Superior"}` : ""}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <div className={`w-2 h-2 rounded-full ${full ? "bg-red-500" : "bg-green-500"}`} />
                      <span className={`text-[11px] font-dm ${full ? "text-red-600" : "text-green-600"}`}>
                        {full ? `Lotada · ${s?.waiting ?? 0}/5 na espera` : remaining === null ? `${booked} agendados` : `${remaining} vagas`}
                      </span>
                    </div>
                  </div>
                  <button
                    disabled={disabled}
                    onClick={() => action?.()}
                    className={`text-[11px] font-dm font-semibold px-3 py-1.5 rounded-lg shrink-0 disabled:opacity-40 ${
                      mine || myWait ? "bg-white border border-primary text-primary" : "bg-primary text-white cta-shadow"
                    }`}
                  >
                    {label}
                  </button>
                </div>
                {closedPast && !mine && (
                  <p className="text-[10px] text-muted-foreground font-dm mt-2">Fale com a recepção para encaixe.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CheckInDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        classInfo={activeClass ? { ...activeClass, name: activeClass.name || "Musculação" } : null}
        defaultName={authName}
        title={waitMode ? "ENTRAR NA LISTA DE ESPERA" : "CONFIRMAR AGENDAMENTO"}
        confirmLabel={waitMode ? "Entrar na fila" : "Confirmar agendamento"}
        onConfirm={handleConfirm}
      />
    </div>
  );
};

export default GradeTab;
