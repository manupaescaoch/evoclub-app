import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Lock, Settings2, Users, AlertTriangle } from "lucide-react";
import { useAccess } from "@/contexts/AccessContext";
import { logSensitive } from "@/lib/audit";
import {
  GradeSlot, GradeStudent, STATUS_LABEL, STATUS_STYLE, RPC_REASONS,
  brToday, minutesUntil, useGradeDay,
} from "@/hooks/useGradeDay";
import SlotOverrideDialog from "./SlotOverrideDialog";
import DistribuirDialog from "./DistribuirDialog";
import StudentQuickSheet from "./StudentQuickSheet";

const shift = (iso: string, days: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

const STATUSES = ["agendado", "presente", "faltou", "cancelou"] as const;

export default function GradeDia({ unitId }: { unitId: string | null }) {
  const { can } = useAccess();
  const [dateISO, setDateISO] = useState(brToday());
  const [filter, setFilter] = useState<"todos" | "manha" | "tarde" | "noite">("todos");
  const { slots, roster, professors, loading, error, reload } = useGradeDay(dateISO, unitId);

  const [overrideSlot, setOverrideSlot] = useState<GradeSlot | null>(null);
  const [distSlot, setDistSlot] = useState<GradeSlot | null>(null);
  const [quickStudent, setQuickStudent] = useState<GradeStudent | null>(null);

  const canManage = can("grade", "edit");
  const canSensitive = can("grade", "sensitive");

  const byClass = useMemo(() => {
    const map: Record<string, GradeStudent[]> = {};
    roster.forEach(s => { (map[s.class_id] ||= []).push(s); });
    return map;
  }, [roster]);

  const visible = slots.filter(s => {
    const h = parseInt(s.start_time.slice(0, 2), 10);
    if (filter === "manha") return h >= 5 && h < 12;
    if (filter === "tarde") return h >= 12 && h < 18;
    if (filter === "noite") return h >= 18;
    return true;
  });

  const setStatus = async (s: GradeStudent, status: string, slot: GradeSlot) => {
    const { data, error: err } = await supabase.rpc("set_attendance" as any, { _booking_id: s.booking_id, _status: status });
    if (err) { toast.error(err.message); return; }
    const res = (data || {}) as { ok?: boolean; reason?: string };
    if (!res.ok) { toast.error(RPC_REASONS[res.reason || ""] || "Não foi possível atualizar."); return; }
    await logSensitive({
      entity: "class_bookings", entity_id: s.booking_id, module: "grade", unit_id: slot.unit_id,
      description: `Status de ${s.student_name} no horário ${slot.start_time.slice(0, 5)} (${dateISO})`,
      before: { attendance_status: s.attendance_status }, after: { attendance_status: status },
    });
    toast.success(`${s.student_name}: ${STATUS_LABEL[status]}`);
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["todos", "manha", "tarde", "noite"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded text-xs font-dm font-bold uppercase tracking-wide ${filter === f ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}>
              {f === "todos" ? "TODOS" : f === "manha" ? "MANHÃ" : f === "tarde" ? "TARDE" : "NOITE"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDateISO(d => shift(d, -1))}><ChevronLeft size={16} /></Button>
          <Input type="date" value={dateISO} onChange={e => setDateISO(e.target.value)} className="h-8 w-[150px] text-xs" />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDateISO(d => shift(d, 1))}><ChevronRight size={16} /></Button>
          <Button variant="outline" size="sm" className="text-xs font-dm font-bold" onClick={() => setDateISO(brToday())}>HOJE</Button>
        </div>
      </div>

      {loading && <div className="h-40 flex items-center justify-center text-muted-foreground font-dm">Carregando grade do dia...</div>}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-dm text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} /> Não foi possível carregar a grade: {error}
          <Button size="sm" variant="outline" className="ml-auto" onClick={reload}>Tentar de novo</Button>
        </div>
      )}
      {!loading && !error && visible.length === 0 && (
        <div className="rounded-xl border bg-card p-10 text-center text-sm font-dm text-muted-foreground">
          Nenhum horário cadastrado para este dia.
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map(slot => {
          const list = byClass[slot.class_id] || [];
          const confirmed = list.filter(s => !s.waitlisted);
          const waiting = list.filter(s => s.waitlisted);
          const mins = minutesUntil(dateISO, slot.start_time);
          const distOpen = mins <= 20;
          const full = slot.booked >= slot.capacity;
          return (
            <div key={slot.class_id}
              className={`rounded-xl border bg-card p-3 ${slot.blocked ? "border-red-300 bg-red-50/40" : full ? "border-l-4 border-l-red-500" : "border-l-4 border-l-green-500"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-barlow font-bold text-lg leading-none">
                    {slot.start_time.slice(0, 5)} <span className="text-muted-foreground text-sm font-dm font-normal">– {slot.end_time.slice(0, 5)}</span>
                  </p>
                  <p className="text-xs font-dm text-muted-foreground">
                    {slot.name || "Musculação"}{slot.trainer ? ` · Prof. ${slot.trainer}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-barlow font-bold px-2 py-0.5 rounded-full ${full ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                    {slot.booked}/{slot.capacity}
                  </span>
                  {slot.capacity_override != null && (
                    <span className="text-[9px] font-barlow font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">AJUSTADO</span>
                  )}
                  {slot.blocked && (
                    <span className="flex items-center gap-1 text-[9px] font-barlow font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                      <Lock size={9} /> BLOQUEADO
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] font-dm text-muted-foreground">
                <span>Presentes {slot.present}</span>
                <span>Faltas {slot.absent}</span>
                <span>Espera {slot.waiting}</span>
                {slot.trials > 0 && <span className="text-amber-700 font-semibold">Experimentais {slot.trials}</span>}
              </div>
              {slot.blocked && slot.reason && (
                <p className="text-[11px] font-dm text-red-700 mt-1">Motivo: {slot.reason}</p>
              )}

              <div className="flex gap-2 mt-2">
                {canSensitive && (
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => setOverrideSlot(slot)}>
                    <Settings2 size={12} /> Vagas / bloqueio
                  </Button>
                )}
                {canManage && (
                  <Button size="sm" variant={distOpen ? "default" : "outline"} className="h-7 gap-1 text-[11px]"
                    onClick={() => distOpen ? setDistSlot(slot) : toast.info(RPC_REASONS.distribution_not_open)}>
                    <Users size={12} /> Distribuir
                  </Button>
                )}
              </div>

              <div className="mt-3 space-y-1.5">
                {confirmed.length === 0 && (
                  <p className="text-[11px] font-dm text-muted-foreground">Nenhum aluno agendado neste horário.</p>
                )}
                {confirmed.map(s => (
                  <div key={s.booking_id} className="flex items-center gap-2 rounded-lg bg-muted/30 px-2 py-1.5">
                    <button type="button" onClick={() => setQuickStudent(s)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
                      {s.avatar_url ? (
                        <img src={s.avatar_url} alt={`Foto de ${s.student_name}`} className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary font-barlow font-bold text-[11px] flex items-center justify-center">
                          {s.student_name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block text-xs font-dm font-semibold truncate">
                          {s.student_name}
                          {s.is_trial && <span className="ml-1.5 text-[9px] font-barlow font-bold bg-amber-100 text-amber-700 px-1 rounded">EXPERIMENTAL</span>}
                        </span>
                        <span className="block text-[10px] font-dm text-muted-foreground">
                          {s.muscle_group ? (s.muscle_group === "inferior" ? "Inferior" : "Superior") : "—"}
                          {s.professor_name ? ` · ${s.professor_name}` : ""}
                          {s.locked ? " · em treino" : ""}
                        </span>
                      </span>
                    </button>
                    {canManage ? (
                      <select value={s.attendance_status} onChange={e => setStatus(s, e.target.value, slot)}
                        className={`text-[10px] font-dm font-semibold rounded px-1.5 py-1 border-0 ${STATUS_STYLE[s.attendance_status] || "bg-muted"}`}>
                        {STATUSES.map(st => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
                      </select>
                    ) : (
                      <span className={`text-[10px] font-dm font-semibold px-2 py-0.5 rounded ${STATUS_STYLE[s.attendance_status] || "bg-muted"}`}>
                        {STATUS_LABEL[s.attendance_status] || s.attendance_status}
                      </span>
                    )}
                  </div>
                ))}

                {waiting.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-[10px] font-barlow font-bold text-muted-foreground mb-1">LISTA DE ESPERA (entra na distribuição só após confirmação)</p>
                    {waiting.map(s => (
                      <div key={s.booking_id} className="flex items-center justify-between gap-2 px-2 py-1">
                        <span className="text-[11px] font-dm truncate">{s.waitlist_position}º · {s.student_name}</span>
                        <span className="text-[10px] font-dm px-1.5 rounded bg-amber-50 text-amber-700">Aguardando</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <SlotOverrideDialog open={!!overrideSlot} onOpenChange={v => !v && setOverrideSlot(null)}
        slot={overrideSlot} dateISO={dateISO} onSaved={reload} />
      <DistribuirDialog open={!!distSlot} onOpenChange={v => !v && setDistSlot(null)}
        slot={distSlot} dateISO={dateISO} professors={professors}
        students={distSlot ? (byClass[distSlot.class_id] || []) : []} onChanged={reload} />
      <StudentQuickSheet open={!!quickStudent} onOpenChange={v => !v && setQuickStudent(null)}
        student={quickStudent} onChanged={reload} />
    </div>
  );
}