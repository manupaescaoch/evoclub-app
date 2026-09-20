import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, AlertTriangle, Lock, RefreshCw, Radio, Users, UserRoundCheck,
  Sparkles, Shuffle, Check, CheckCheck, Copy, Send, RotateCcw, Search, Plus, Crown, History,
  UserPlus, FlaskConical, Trash2, X,
} from "lucide-react";
import { useAccess } from "@/contexts/AccessContext";
import { useUnit } from "@/contexts/UnitContext";
import {
  GradeStudent, RPC_REASONS, STATUS_LABEL, STATUS_STYLE, brToday, useGradeDay,
} from "@/hooks/useGradeDay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProStudentSheet from "@/components/pro/ProStudentSheet";
import {
  SHIFT_LABEL, SHIFT_ORDER, ShiftId, currentShift, isShiftLeader, singleShiftDay, slotInShift,
  useShiftOperations, useShiftRealtime,
} from "@/hooks/useShiftOperations";

const shiftDate = (iso: string, days: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};
const pretty = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

type PlanInfo = { name: string; sessions: string[]; expires_at: string | null };
type StudentExtra = { alerts: string[]; lastWorkout: string | null; anamnese: string[] };

const MUSCLE_LABEL: Record<string, string> = { inferior: "INFERIOR", superior: "SUPERIOR", full: "CORPO INTEIRO" };
const shortText = (v: string, max = 90) => (v.length > max ? `${v.slice(0, max).trim()}…` : v);

export default function ProHoje() {
  const { can, collaboratorId } = useAccess();
  const { filterId, currentUnit } = useUnit();
  const [dateISO, setDateISO] = useState(brToday());
  const [period, setPeriod] = useState<ShiftId>(currentShift());
  const [slotId, setSlotId] = useState<string | null>(null);
  const [scope, setScope] = useState<"meus" | "todos">("todos");
  const [plans, setPlans] = useState<Record<number, PlanInfo>>({});
  const [extras, setExtras] = useState<Record<number, StudentExtra>>({});
  const [active, setActive] = useState<GradeStudent | null>(null);
  const [busy, setBusy] = useState(false);
  const [term, setTerm] = useState("");
  const [found, setFound] = useState<{ id: number; name: string }[]>([]);
  const [adding, setAdding] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);

  const { slots, roster, loading, error, reload } = useGradeDay(dateISO, filterId);
  const shifts = useShiftOperations(dateISO, filterId);
  const refresh = useCallback(() => { reload(); shifts.reload(); }, [reload, shifts.reload]);
  const synced = useShiftRealtime(filterId, refresh);

  const canManage = can("grade", "edit");
  const singleDay = singleShiftDay(dateISO);

  useEffect(() => { if (singleDay) setPeriod("unico"); }, [singleDay]);

  const clientIds = useMemo(
    () => Array.from(new Set(roster.map(r => r.client_id).filter((v): v is number => !!v))),
    [roster],
  );

  useEffect(() => {
    if (clientIds.length === 0) { setPlans({}); setExtras({}); return; }
    let alive = true;
    (async () => {
      const [plansRes, pains, anam, logs, anamRows] = await Promise.all([
        supabase.from("training_plans")
          .select("id, name, student_id, expires_at, training_weeks(id, training_sessions(name, order_index))")
          .in("student_id", clientIds).eq("is_active", true),
        supabase.from("pain_reports").select("client_id,note,status").in("client_id", clientIds).neq("status", "resolvido"),
        supabase.from("clients").select("id,limitations").in("id", clientIds),
        supabase.from("workout_logs").select("client_id,session_name,workout_date")
          .in("client_id", clientIds).order("workout_date", { ascending: false }),
        supabase.from("anamnesis")
          .select("client_id,objective,injuries,limitations,restrictions,pain,created_at")
          .in("client_id", clientIds).order("created_at", { ascending: false }),
      ]);
      if (!alive) return;
      const planMap: Record<number, PlanInfo> = {};
      ((plansRes.data as any[]) || []).forEach(p => {
        const sessions: { name: string; order_index: number }[] = [];
        (p.training_weeks || []).forEach((w: any) => (w.training_sessions || []).forEach((s: any) => sessions.push(s)));
        sessions.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
        planMap[p.student_id] = { name: p.name, expires_at: p.expires_at, sessions: Array.from(new Set(sessions.map(s => s.name))) };
      });
      const extraMap: Record<number, StudentExtra> = {};
      clientIds.forEach(id => { extraMap[id] = { alerts: [], lastWorkout: null, anamnese: [] }; });
      const seenAnam = new Set<number>();
      ((anamRows.data as any[]) || []).forEach(row => {
        const target = extraMap[row.client_id];
        if (!target || seenAnam.has(row.client_id)) return;
        seenAnam.add(row.client_id);
        const parts: string[] = [];
        if (row.objective) parts.push(`Objetivo: ${shortText(row.objective)}`);
        if (row.injuries) parts.push(`Lesões: ${shortText(row.injuries)}`);
        if (row.limitations) parts.push(`Limitações: ${shortText(row.limitations)}`);
        if (row.restrictions) parts.push(`Restrições: ${shortText(row.restrictions)}`);
        if (row.pain) parts.push(`Dor: ${shortText(row.pain)}`);
        target.anamnese = parts;
      });
      ((pains.data as any[]) || []).forEach(row => {
        if (extraMap[row.client_id]) extraMap[row.client_id].alerts.push(`Dor relatada${row.note ? `: ${row.note}` : ""}`);
      });
      ((anam.data as any[]) || []).forEach(row => {
        if (extraMap[row.id] && row.limitations) extraMap[row.id].alerts.push(row.limitations);
      });
      ((logs.data as any[]) || []).forEach(row => {
        const target = extraMap[row.client_id];
        if (target && !target.lastWorkout && row.session_name) {
          target.lastWorkout = `${row.session_name}${row.workout_date ? ` · ${new Date(`${row.workout_date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}` : ""}`;
        }
      });
      setPlans(planMap);
      setExtras(extraMap);
    })();
    return () => { alive = false; };
  }, [clientIds.join(",")]);

  /** horários do turno selecionado */
  const periodSlots = useMemo(
    () => slots.filter(slot => slotInShift(slot.start_time, period)),
    [slots, period],
  );

  useEffect(() => {
    if (!periodSlots.length) { setSlotId(null); return; }
    if (!periodSlots.some(slot => slot.class_id === slotId)) setSlotId(periodSlots[0].class_id);
  }, [periodSlots, slotId]);

  const byClass = useMemo(() => {
    const map: Record<string, GradeStudent[]> = {};
    roster.forEach(s => { if (!s.waitlisted) (map[s.class_id] ||= []).push(s); });
    return map;
  }, [roster]);

  const slot = periodSlots.find(item => item.class_id === slotId) || null;
  const slotStudents = useMemo(() => {
    const list = slot ? byClass[slot.class_id] || [] : [];
    const seen = new Set<string>();
    return list.filter(s => (seen.has(s.booking_id) ? false : (seen.add(s.booking_id), true)));
  }, [slot, byClass]);
  const visibleStudents = scope === "meus"
    ? slotStudents.filter(s => s.collaborator_id && s.collaborator_id === collaboratorId)
    : slotStudents;
  const unassigned = slotStudents.filter(s => !s.collaborator_id && s.attendance_status !== "cancelou");

  /** carga de cada professor NESTE horário (máx. por profissional vem das configurações) */
  const slotLoads = useMemo(() => {
    const map = new Map<string, number>();
    slotStudents.forEach(s => {
      if (s.collaborator_id && s.attendance_status !== "cancelou") map.set(s.collaborator_id, (map.get(s.collaborator_id) || 0) + 1);
    });
    return map;
  }, [slotStudents]);

  const assigningStudent = useMemo(
    () => slotStudents.find(s => s.booking_id === assigningId) || null,
    [slotStudents, assigningId],
  );

  /** equipe do turno, sem quem está ausente */
  const presenceMap = useMemo(
    () => new Map(shifts.presence.map(row => [`${row.shift}:${row.collaborator_id}`, row])),
    [shifts.presence],
  );
  const team = shifts.teams[period];
  const absentIds = useMemo(
    () => new Set(team.filter(p => presenceMap.get(`${period}:${p.id}`)?.present === false).map(p => p.id)),
    [team, presenceMap, period],
  );
  const availableTeam = team.filter(person => !absentIds.has(person.id));
  const leader = team.find(isShiftLeader) || null;
  const capacity = availableTeam.length * shifts.maxPerProfessional;

  const periodStudents = useMemo(() => {
    const seen = new Set<string>();
    return periodSlots.flatMap(item => (byClass[item.class_id] || []))
      .filter(s => (seen.has(s.booking_id) ? false : (seen.add(s.booking_id), true)));
  }, [periodSlots, byClass]);
  const totalBooked = periodStudents.length;
  const totalPresent = periodStudents.filter(s => s.attendance_status === "presente").length;
  const totalTrials = periodStudents.filter(s => s.is_trial).length;

  /** atendimentos do dia por treinador (deduplicado por agendamento) */
  const attendanceByTrainer = useMemo(() => {
    const counts = new Map<string, number>();
    const seen = new Set<string>();
    roster.forEach(s => {
      if (!s.collaborator_id || s.waitlisted || seen.has(s.booking_id)) return;
      seen.add(s.booking_id);
      counts.set(s.collaborator_id, (counts.get(s.collaborator_id) || 0) + 1);
    });
    const people = new Map(shifts.collaborators.map(p => [p.id, p]));
    const ids = new Set<string>([...availableTeam.map(p => p.id), ...counts.keys()]);
    return Array.from(ids).map(id => ({
      id,
      name: people.get(id)?.full_name || "Equipe",
      role: people.get(id)?.role_title || null,
      count: counts.get(id) || 0,
    })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [roster, shifts.collaborators, availableTeam]);

  const setStatus = async (s: GradeStudent, status: string) => {
    const { data, error: err } = await supabase.rpc("set_attendance" as any, { _booking_id: s.booking_id, _status: status });
    if (err) { toast.error(err.message); return; }
    const res = (data || {}) as { ok?: boolean; reason?: string };
    if (!res.ok) { toast.error(RPC_REASONS[res.reason || ""] || "Não foi possível atualizar."); return; }
    toast.success(`${s.student_name}: ${STATUS_LABEL[status]}`);
    refresh();
  };

  const assign = async (bookingId: string, collaboratorId2: string) => {
    const { data, error: err } = await supabase.rpc("assign_professor" as any, { _booking_id: bookingId, _collaborator_id: collaboratorId2 });
    if (err) return err.message;
    const res = (data || {}) as { ok?: boolean; reason?: string };
    return res.ok ? null : (RPC_REASONS[res.reason || ""] || "Não foi possível distribuir.");
  };

  const distribute = async (redistribute = false) => {
    if (!slot || !availableTeam.length) { toast.error("Nenhum treinador disponível neste turno."); return; }
    setBusy(true);
    let pending = slotStudents.filter(s => s.attendance_status !== "cancelou");
    if (redistribute) {
      for (const s of pending) {
        if (s.collaborator_id && !s.locked && !s.started_at) {
          await supabase.rpc("unassign_professor" as any, { _booking_id: s.booking_id });
        }
      }
      pending = pending.map(s => (s.locked || s.started_at ? s : { ...s, collaborator_id: null }));
    }
    const load: Record<string, number> = {};
    availableTeam.forEach(person => { load[person.id] = 0; });
    pending.forEach(s => { if (s.collaborator_id && load[s.collaborator_id] != null) load[s.collaborator_id] += 1; });

    let assigned = 0;
    let lastError: string | null = null;
    for (const student of pending.filter(s => !s.collaborator_id)) {
      const target = availableTeam
        .filter(person => load[person.id] < shifts.maxPerProfessional)
        .sort((a, b) => load[a.id] - load[b.id])[0];
      if (!target) { lastError = "Capacidade do turno atingida."; break; }
      const failure = await assign(student.booking_id, target.id);
      if (failure) { lastError = failure; continue; }
      load[target.id] += 1;
      assigned += 1;
    }
    setBusy(false);
    if (assigned) toast.success(`${assigned} aluno(s) distribuído(s).`);
    if (lastError) toast.error(lastError);
    refresh();
  };

  const manualAssign = async (bookingId: string, collaboratorId2: string) => {
    setBusy(true);
    const failure = await assign(bookingId, collaboratorId2);
    setBusy(false);
    if (failure) toast.error(failure); else { toast.success("Professor designado."); setAssigningId(null); }
    refresh();
  };

  const unassign = async (bookingId: string) => {
    setBusy(true);
    const { error: err } = await supabase.rpc("unassign_professor" as any, { _booking_id: bookingId });
    setBusy(false);
    if (err) toast.error(err.message); else { toast.success("Professor removido."); setAssigningId(null); }
    refresh();
  };

  /** marca/desmarca o aluno como aula experimental (visit_type no cadastro) */
  const toggleTrial = async (s: GradeStudent) => {
    if (!s.client_id) return;
    setBusy(true);
    const { error: err } = await supabase
      .from("clients")
      .update({ visit_type: s.is_trial ? "aluno" : "experimental" })
      .eq("id", s.client_id);
    setBusy(false);
    if (err) toast.error("Não foi possível alterar o status experimental.");
    else toast.success(s.is_trial ? "Marcação experimental removida." : "Aula marcada como experimental.");
    refresh();
  };

  const togglePresence = async (collaboratorId2: string, present: boolean) => {
    if (!filterId) return;
    const { error: err } = await supabase.from("staff_shift_presence" as any).upsert({
      unit_id: filterId, shift_date: dateISO, shift: period, collaborator_id: collaboratorId2,
      present, confirmed_at: new Date().toISOString(),
    }, { onConflict: "unit_id,shift_date,shift,collaborator_id" });
    if (err) return toast.error(err.message);
    refresh();
  };

  const confirmAllTeam = async () => {
    if (!filterId || !team.length) return;
    const rows = team.map(person => ({
      unit_id: filterId, shift_date: dateISO, shift: period, collaborator_id: person.id,
      present: true, confirmed_at: new Date().toISOString(),
    }));
    const { error: err } = await supabase.from("staff_shift_presence" as any).upsert(rows, { onConflict: "unit_id,shift_date,shift,collaborator_id" });
    if (err) return toast.error(err.message);
    toast.success("Equipe do turno confirmada.");
    refresh();
  };

  const toggleSupport = async (collaboratorId2: string) => {
    if (!filterId) return;
    if (shifts.supportIds.includes(collaboratorId2)) {
      const { error: err } = await supabase.from("staff_shift_support" as any).delete()
        .eq("unit_id", filterId).eq("shift_date", dateISO).eq("shift", period).eq("collaborator_id", collaboratorId2);
      if (err) return toast.error(err.message);
    } else {
      const { error: err } = await supabase.from("staff_shift_support" as any)
        .insert({ unit_id: filterId, shift_date: dateISO, shift: period, collaborator_id: collaboratorId2 });
      if (err) return toast.error(err.message);
    }
    refresh();
  };

  const undoChange = async (id: string) => {
    const { error: err } = await supabase.from("staff_shift_changes" as any)
      .update({ cancelled_at: new Date().toISOString() }).eq("id", id);
    if (err) return toast.error(err.message);
    toast.success("Alteração desfeita — o registro fica no histórico.");
    refresh();
  };

  const searchStudents = async (value: string) => {
    setTerm(value);
    if (value.trim().length < 2) { setFound([]); return; }
    const query = supabase.from("clients").select("id,name").ilike("name", `%${value.trim()}%`).limit(8);
    const { data } = filterId ? await query.eq("unit_id", filterId) : await query;
    setFound(((data as any[]) || []).map(row => ({ id: row.id, name: row.name })));
  };

  const addStudent = async (client: { id: number; name: string }) => {
    if (!slot) return;
    setBusy(true);
    const { error: err } = await supabase.from("class_bookings").insert({
      class_id: slot.class_id, class_date: dateISO, client_id: client.id,
      student_name: client.name, status: "confirmed", attendance_status: "agendado", kind: "agendamento",
    });
    setBusy(false);
    if (err) return toast.error(err.message);
    toast.success(`${client.name} incluído às ${slot.start_time.slice(0, 5)}.`);
    setTerm(""); setFound([]);
    refresh();
  };

  const buildReport = () => {
    const lines = [
      `RELATÓRIO DE EXPEDIENTE — ${currentUnit?.name || "EVO CLUB"}`,
      `${new Date(`${dateISO}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })} · ${SHIFT_LABEL[period]}`,
      leader ? `Líder do turno: ${leader.full_name}` : "Líder do turno: não definido no cadastro",
      "",
      `EQUIPE PRESENTE (${availableTeam.length})`,
      ...(availableTeam.length ? availableTeam.map(p => `• ${p.full_name}${shifts.supportIds.includes(p.id) ? " (Rádio Apoio)" : ""}`) : ["• Nenhum profissional confirmado"]),
      "",
      "ATENDIMENTOS POR TREINADOR",
      ...(attendanceByTrainer.length ? attendanceByTrainer.map(p => `• ${p.name}: ${p.count}`) : ["• Nenhum atendimento registrado"]),
      "",
      `Agendados: ${totalBooked} · Presentes: ${totalPresent} · Experimentais: ${totalTrials}`,
      `Capacidade do turno: ${capacity} aluno(s) por horário`,
    ];
    setReport(lines.join("\n"));
  };

  const copyReport = async () => {
    if (!report) return;
    try { await navigator.clipboard.writeText(report); toast.success("Relatório copiado."); }
    catch { toast.error("Não foi possível copiar aqui. Use o envio pelo WhatsApp."); }
  };

  const sendReport = () => {
    if (!report) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(report)}`, "_blank", "noopener,noreferrer");
  };

  const dayChanges = shifts.changes.filter(change => change.shift === period);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0">
          <p className="font-dm text-xs font-semibold uppercase text-primary">Painel de atendimento</p>
          <h1 className="font-barlow text-2xl font-extrabold uppercase">Turno do dia</h1>
          <p className="font-dm text-xs capitalize text-muted-foreground">
            {new Date(`${dateISO}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })} · {SHIFT_LABEL[period]}
          </p>
        </div>
        <span className={`ml-auto shrink-0 rounded-full px-2 py-1 font-dm text-[10px] font-semibold ${synced ? "text-success" : "text-muted-foreground"}`}>
          ● {synced ? "Sincronizado" : "Conectando"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setDateISO(d => shiftDate(d, -1))} aria-label="Dia anterior" className="h-11 w-11 rounded-xl">
          <ChevronLeft size={20} />
        </Button>
        <Button variant="outline" onClick={() => setDateISO(brToday())} className="h-11 flex-1 rounded-xl font-barlow text-base font-bold uppercase">
          {dateISO === brToday() ? "HOJE" : pretty(dateISO)}
        </Button>
        <Button variant="outline" size="icon" onClick={() => setDateISO(d => shiftDate(d, 1))} aria-label="Próximo dia" className="h-11 w-11 rounded-xl">
          <ChevronRight size={20} />
        </Button>
      </div>

      {singleDay ? (
        <Button variant="default" className="h-10 w-full text-[11px] uppercase" disabled>
          Turno único · 08h às 14h
        </Button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {SHIFT_ORDER.map(item => (
            <Button key={item} variant={period === item ? "default" : "outline"} className="h-10 text-[11px] uppercase" onClick={() => setPeriod(item)}>
              {SHIFT_LABEL[item]}
            </Button>
          ))}
        </div>
      )}

      {singleDay && (
        <p className="rounded-xl border border-primary/30 bg-primary/5 p-3 font-dm text-[11px] text-primary">
          Fim de semana ou feriado: a unidade opera em <strong className="uppercase">turno único, das 08h às 14h</strong>.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3"><Users size={16} className="text-primary" /><strong className="mt-2 block font-barlow text-xl">{totalBooked}</strong><span className="text-[10px] text-muted-foreground">Agendados</span></div>
        <div className="rounded-xl border border-border bg-card p-3"><UserRoundCheck size={16} className="text-success" /><strong className="mt-2 block font-barlow text-xl">{totalPresent}</strong><span className="text-[10px] text-muted-foreground">Presentes</span></div>
        <div className="rounded-xl border border-border bg-card p-3"><Sparkles size={16} className="text-warning" /><strong className="mt-2 block font-barlow text-xl">{totalTrials}</strong><span className="text-[10px] text-muted-foreground">Experimentais</span></div>
      </div>

      {/* equipe do turno */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Radio size={17} className="text-primary" />
          <h2 className="font-barlow text-sm font-extrabold uppercase">Equipe do turno</h2>
          <span className="ml-auto text-[10px] text-muted-foreground">capacidade {capacity}</span>
        </div>
        <p className="mt-1 font-dm text-[11px] text-muted-foreground">
          {leader ? <><Crown size={11} className="mr-1 inline text-warning" />Líder do turno: {leader.full_name}</> : "Líder do turno não identificado no cadastro."}
        </p>
        {shifts.supportIds.length > 0 && (
          <p className="mt-1 font-dm text-[11px] text-primary">
            Rádio Apoio · turno: {shifts.supportIds.map(id => shifts.collaborators.find(p => p.id === id)?.full_name || "Equipe").join(", ")}
          </p>
        )}
        {canManage && team.length > 0 && (
          <Button variant="secondary" className="mt-3 h-10 w-full text-xs" onClick={confirmAllTeam}>
            <CheckCheck size={15} /> Confirmar todos
          </Button>
        )}
        <div className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {team.length === 0 && <p className="p-4 text-center font-dm text-xs text-muted-foreground">Nenhum profissional escalado neste turno.</p>}
          {team.map(person => {
            const row = presenceMap.get(`${period}:${person.id}`);
            const absent = row?.present === false;
            const supported = shifts.supportIds.includes(person.id);
            return (
              <div key={person.id} className="flex items-center gap-2 p-3">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${absent ? "bg-destructive" : "bg-success"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-dm text-sm font-semibold">
                    {person.full_name}{isShiftLeader(person) && <Crown size={12} className="ml-1 inline text-warning" />}
                  </span>
                  <span className="block truncate font-dm text-[10px] text-muted-foreground">{person.role_title || "Equipe"} · {absent ? "Ausente" : "Presente"}</span>
                </span>
                {canManage && (
                  <>
                    <Button size="icon" className="h-9 w-9" variant={absent ? "outline" : "default"} onClick={() => togglePresence(person.id, absent)} aria-label={`Presença de ${person.full_name}`}><Check size={15} /></Button>
                    <Button size="icon" className="h-9 w-9" variant={supported ? "default" : "outline"} onClick={() => toggleSupport(person.id)} aria-label={`Rádio Apoio ${person.full_name}`}><Radio size={15} /></Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {loading && <p className="py-10 text-center font-dm text-sm text-muted-foreground">Carregando o turno...</p>}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 font-dm text-sm text-destructive">
          <p className="flex items-center gap-2"><AlertTriangle size={16} /> Não foi possível carregar: {error}</p>
          <Button variant="outline" onClick={refresh} className="mt-3 h-10 w-full rounded-lg font-semibold"><RefreshCw size={14} /> Tentar de novo</Button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* abas de horário */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {periodSlots.length === 0 && <p className="font-dm text-xs text-muted-foreground">Nenhum horário cadastrado neste turno.</p>}
            {periodSlots.map(item => {
              const count = (byClass[item.class_id] || []).length;
              return (
                <button key={item.class_id} type="button" onClick={() => setSlotId(item.class_id)}
                  className={`shrink-0 rounded-xl border px-3 py-2 font-barlow text-sm font-bold ${slotId === item.class_id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
                  {item.start_time.slice(0, 5)} <span className="font-dm text-[10px] font-semibold">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            {(["todos", "meus"] as const).map(s => (
              <Button key={s} onClick={() => setScope(s)} variant={scope === s ? "default" : "outline"} className="h-10 flex-1 rounded-xl font-dm text-xs font-bold uppercase">
                {s === "meus" ? "Meus alunos hoje" : "Todos do horário"}
              </Button>
            ))}
          </div>

          {slot && (<>
            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <span className="font-barlow text-2xl font-black leading-none">{slot.start_time.slice(0, 5)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-dm text-xs font-semibold">{slot.name || "Musculação"}</p>
                  <p className="font-dm text-[11px] text-muted-foreground">{slotStudents.length} aluno(s) · presentes {slot.present} · faltas {slot.absent} · capacidade {capacity}</p>
                </div>
                {slot.blocked && <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-1 font-barlow text-[10px] font-bold text-destructive"><Lock size={10} className="mr-1 inline" />BLOQUEADO</span>}
              </div>

              {canManage && (
                <div className="space-y-2 border-b border-border px-4 py-3">
                  <div className="flex gap-2">
                    <Button className="h-10 flex-1 text-xs" disabled={busy || !unassigned.length} onClick={() => distribute(false)}>
                      <Users size={14} /> Distribuir ({unassigned.length})
                    </Button>
                    <Button variant="outline" className="h-10 flex-1 text-xs" disabled={busy || !slotStudents.length} onClick={() => distribute(true)}>
                      <Shuffle size={14} /> Redistribuir
                    </Button>
                  </div>
                  <Button variant={adding ? "secondary" : "default"} className="h-11 w-full text-xs font-bold uppercase"
                    onClick={() => { setAdding(!adding); setTerm(""); setFound([]); }}>
                    <Plus size={15} /> {adding ? "Fechar inclusão de aluno" : "Adicionar aluno neste horário"}
                  </Button>
                  {adding && (
                    <>
                      <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input autoFocus value={term} onChange={e => searchStudents(e.target.value)} placeholder="Digite o nome do aluno" className="h-11 pl-9" />
                      </div>
                      {found.map(client => (
                        <button key={client.id} type="button" disabled={busy} onClick={() => { setAdding(false); addStudent(client); }}
                          className="flex w-full items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-left font-dm text-xs font-semibold">
                          <Plus size={13} className="text-primary" /> {client.name}
                        </button>
                      ))}
                      {term.trim().length >= 2 && !found.length && (
                        <p className="font-dm text-[11px] text-muted-foreground">Nenhum aluno encontrado com esse nome nesta unidade.</p>
                      )}
                    </>
                  )}
                </div>
              )}

              {unassigned.length > 0 && (
                <div className="border-b border-border bg-warning/10 px-4 py-3">
                  <p className="font-barlow text-xs font-bold uppercase text-warning-foreground">Sem professor ({unassigned.length})</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {unassigned.map(s => <span key={s.booking_id} className="rounded-full bg-card px-2.5 py-1 font-dm text-[11px] font-semibold">{s.student_name}</span>)}
                  </div>
                </div>
              )}

              <div className="divide-y divide-border">
                {visibleStudents.length === 0 && (
                  <p className="px-4 py-5 font-dm text-xs text-muted-foreground">
                    {scope === "meus" ? "Nenhum aluno distribuído para você neste horário." : "Nenhum aluno neste horário."}
                  </p>
                )}
                {visibleStudents.map(s => {
                  const plan = s.client_id ? plans[s.client_id] : undefined;
                  const extra = s.client_id ? extras[s.client_id] : undefined;
                  const lastName = extra?.lastWorkout?.split(" · ")[0]?.toLowerCase() || "";
                  const lastGroup = lastName.includes("inferior") ? "INFERIOR" : lastName.includes("superior") ? "SUPERIOR" : null;
                  const nextGroup = lastGroup === "INFERIOR" ? "SUPERIOR" : lastGroup === "SUPERIOR" ? "INFERIOR" : null;
                  const lastDate = extra?.lastWorkout?.split(" · ")[1] || null;
                  const assigning = assigningId === s.booking_id;
                  const maxPer = shifts.maxPerProfessional;
                  return (
                    <div key={s.booking_id} className="px-4 py-3">
                      {/* cabeçalho do cartão */}
                      <div className="flex items-start gap-2">
                        <button type="button" onClick={() => setActive(s)} className="min-w-0 flex-1 text-left">
                          <p className="truncate font-barlow text-lg font-extrabold uppercase leading-tight">
                            {s.student_name}
                            {s.is_trial && <span className="ml-1.5 rounded bg-warning/20 px-1.5 py-0.5 align-middle font-barlow text-[9px] font-bold text-warning-foreground">EXPERIMENTAL</span>}
                          </p>
                        </button>
                        <span className={`shrink-0 rounded px-2 py-1 font-dm text-[10px] font-semibold ${STATUS_STYLE[s.attendance_status] || "bg-muted"}`}>
                          {STATUS_LABEL[s.attendance_status] || s.attendance_status}
                        </span>
                        {canManage && (
                          <button type="button" disabled={busy || s.attendance_status === "cancelou"} onClick={() => setStatus(s, "cancelou")}
                            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Remover ${s.student_name} do horário`}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      {/* treino do check-in */}
                      {s.muscle_group && (
                        <span className="mt-1.5 inline-block rounded-md bg-primary/10 px-2.5 py-1 font-barlow text-[11px] font-bold uppercase text-primary">
                          {MUSCLE_LABEL[s.muscle_group] || s.muscle_group.toUpperCase()}
                        </span>
                      )}

                      {/* resumo da anamnese (alerta âmbar) */}
                      {extra?.anamnese?.length ? (
                        <p className="mt-2 flex items-start gap-2 rounded-lg bg-warning/15 px-3 py-2 font-dm text-[12px] font-semibold text-warning-foreground">
                          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                          <span>{extra.anamnese.join(" · ")}</span>
                        </p>
                      ) : null}
                      {extra?.alerts?.length ? (
                        <p className="mt-2 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 font-dm text-[12px] font-semibold text-destructive">
                          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {extra.alerts.join(" · ")}
                        </p>
                      ) : null}

                      {/* último treino */}
                      <p className="mt-2.5 font-dm text-[13px] text-muted-foreground">
                        Último treino:{" "}
                        <span className="font-semibold text-foreground">{extra?.lastWorkout ? extra.lastWorkout.split(" · ")[0] : "Sem histórico"}</span>
                      </p>
                      {lastDate && <p className="font-dm text-[12px] text-muted-foreground">{lastDate}</p>}
                      {lastGroup && nextGroup && (
                        <p className="mt-1.5 font-dm text-[13px]">
                          Último: <span className="font-bold">{lastGroup}</span>
                          <span className="mx-2 text-muted-foreground">·</span>
                          Próximo: <span className="font-bold text-primary">{nextGroup}</span>
                        </p>
                      )}

                      {/* professor atual */}
                      <p className="mt-2 font-dm text-[13px] text-muted-foreground">
                        Professor atual:{" "}
                        {s.professor_name
                          ? <span className="font-bold text-foreground">{s.professor_name}</span>
                          : <span className="font-bold text-destructive">SEM PROFESSOR</span>}
                      </p>
                      {plan && <p className="mt-1 font-dm text-[11px] text-muted-foreground">Ficha: {plan.name}</p>}

                      {canManage && (
                        <>
                          {/* presença */}
                          <div className="mt-2.5 flex gap-2">
                            {(["presente", "faltou", "agendado"] as const).map(st => (
                              <button key={st} onClick={() => setStatus(s, st)} disabled={s.attendance_status === st}
                                className={`h-10 flex-1 rounded-xl font-dm text-xs font-bold ${s.attendance_status === st ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground"}`}>
                                {STATUS_LABEL[st]}
                              </button>
                            ))}
                          </div>

                          {/* designar professor */}
                          {!s.locked && !s.started_at && (
                            <div className="mt-2.5 space-y-2">
                              <Button type="button" variant="outline" disabled={busy}
                                onClick={() => setAssigningId(assigningId === s.booking_id ? null : s.booking_id)}
                                className="h-11 w-full rounded-xl font-dm text-xs font-bold">
                                <UserPlus size={15} /> Designar professor
                              </Button>

                              {assigning && (
                                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                                  <p className="border-b border-border px-3 py-2.5 font-dm text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                    Professores do turno · Máx. {shifts.maxPerProfessional} alunos
                                  </p>
                                  <div className="max-h-[260px] space-y-1.5 overflow-y-auto p-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                                    {availableTeam.length === 0 && (
                                      <p className="py-4 text-center font-dm text-xs text-muted-foreground">
                                        Nenhum professor presente neste turno.
                                      </p>
                                    )}
                                    {availableTeam.map(person => {
                                      const load = slotLoads.get(person.id) || 0;
                                      const current = person.id === s.collaborator_id;
                                      const full = load >= shifts.maxPerProfessional && !current;
                                      return (
                                        <button
                                          key={person.id}
                                          type="button"
                                          disabled={busy || current || full}
                                          onClick={() => manualAssign(s.booking_id, person.id)}
                                          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left font-dm text-sm font-semibold transition-colors ${
                                            current
                                              ? "border-primary bg-primary/10 text-primary"
                                              : full
                                              ? "cursor-not-allowed border-border bg-muted/30 text-muted-foreground"
                                              : "border-border bg-card hover:border-primary/60 hover:bg-primary/5"
                                          }`}
                                        >
                                          <span className="flex min-w-0 flex-1 items-center gap-2">
                                            <span className={`h-2 w-2 shrink-0 rounded-full ${absentIds.has(person.id) ? "bg-destructive" : "bg-success"}`} />
                                            <span className="min-w-0 truncate">{person.full_name}</span>
                                          </span>
                                          <span className={`ml-2 shrink-0 font-barlow text-sm font-bold ${current ? "text-primary" : full ? "text-muted-foreground" : "text-foreground"}`}>
                                            {load}/{shifts.maxPerProfessional}
                                            {current && <span className="ml-1.5 align-middle text-[10px] font-medium uppercase tracking-wide">atual</span>}
                                          </span>
                                        </button>
                                      );
                                    })}
                                    {s.collaborator_id && (
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => unassign(s.booking_id)}
                                        className="flex w-full items-center rounded-lg border border-border px-3 py-2.5 text-left font-dm text-sm font-semibold text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                                      >
                                        Sem professor
                                      </button>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => toggleTrial(s)}
                                    className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left font-dm text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                                  >
                                    <FlaskConical size={14} />
                                    {s.is_trial ? "Remover marcação experimental" : "Marcar experimental"}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
          )}

          {/* atendimentos do dia */}
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-barlow text-sm font-extrabold uppercase">Atendimentos do dia</h2>
            <div className="mt-3 space-y-2">
              {attendanceByTrainer.length === 0 && <p className="font-dm text-xs text-muted-foreground">Nenhum atendimento registrado neste dia.</p>}
              {attendanceByTrainer.map(person => (
                <div key={person.id} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate font-dm text-sm font-semibold">{person.name}</span>
                  <span className="font-barlow text-base font-bold">{person.count}</span>
                  {canManage && (
                    <Button size="icon" variant={presenceMap.get(`${period}:${person.id}`)?.present ? "default" : "outline"} className="h-8 w-8"
                      onClick={() => togglePresence(person.id, !presenceMap.get(`${period}:${person.id}`)?.present)} aria-label={`Confirmar ${person.name}`}>
                      <Check size={13} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* histórico do dia */}
          {dayChanges.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2"><History size={16} className="text-primary" /><h2 className="font-barlow text-sm font-extrabold uppercase">Alterações do dia</h2></div>
              <div className="mt-3 space-y-2">
                {dayChanges.map(change => (
                  <div key={change.id} className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 font-dm text-xs">
                    <span className="min-w-0 flex-1">
                      {shifts.collaborators.find(p => p.id === change.outgoing_collaborator_id)?.full_name || "Equipe"} → {shifts.collaborators.find(p => p.id === change.incoming_collaborator_id)?.full_name || "Substituto"}
                      {change.reason ? ` · ${change.reason}` : ""}{change.cancelled_at ? " · desfeita" : ""}
                    </span>
                    {canManage && !change.cancelled_at && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => undoChange(change.id)} aria-label="Desfazer alteração"><RotateCcw size={14} /></Button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* relatório de expediente */}
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-barlow text-sm font-extrabold uppercase">Relatório de expediente</h2>
            <Button className="mt-3 h-11 w-full text-xs" onClick={buildReport}>Gerar relatório de expediente</Button>
            {report && (
              <>
                <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/60 p-3 font-dm text-[11px]">{report}</pre>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" className="h-10 flex-1 text-xs" onClick={copyReport}><Copy size={14} /> Copiar</Button>
                  <Button className="h-10 flex-1 text-xs" onClick={sendReport}><Send size={14} /> WhatsApp</Button>
                </div>
              </>
            )}
          </section>
        </>
      )}

      <ProStudentSheet
        student={active}
        open={!!active}
        onOpenChange={v => !v && setActive(null)}
        planName={active?.client_id ? plans[active.client_id]?.name ?? null : null}
      />
    </div>
  );
}
