import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logSensitive } from "@/lib/audit";
import { GradeSlot, GradeStudent, Professor, RPC_REASONS } from "@/hooks/useGradeDay";
import { Lock, UserMinus, Play } from "lucide-react";

export default function DistribuirDialog({
  open, onOpenChange, slot, dateISO, students, professors, onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slot: GradeSlot | null;
  dateISO: string;
  students: GradeStudent[];
  professors: Professor[];
  onChanged: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pending = useMemo(
    () => students.filter(s => !s.waitlisted && s.attendance_status !== "cancelou"),
    [students]
  );

  const byProf = useMemo(() => {
    const map: Record<string, GradeStudent[]> = {};
    pending.forEach(s => { if (s.collaborator_id) (map[s.collaborator_id] ||= []).push(s); });
    return map;
  }, [pending]);

  const unassigned = pending.filter(s => !s.collaborator_id);

  if (!slot) return null;

  const runRpc = async (fn: string, args: any, okMsg: string, audit: string, before: any, after: any) => {
    setBusy(true);
    const { data, error } = await supabase.rpc(fn as any, args);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const res = (data || {}) as { ok?: boolean; reason?: string };
    if (!res.ok) { toast.error(RPC_REASONS[res.reason || ""] || "Não foi possível concluir."); return; }
    await logSensitive({
      entity: "class_assignments", entity_id: args._booking_id, module: "grade",
      unit_id: slot.unit_id, description: audit, before, after,
    });
    toast.success(okMsg);
    setPicked(null);
    onChanged();
  };

  const assign = (bookingId: string, collaboratorId: string, studentName: string, profName: string, prevProf: string | null) =>
    runRpc("assign_professor", { _booking_id: bookingId, _collaborator_id: collaboratorId },
      "Aluno distribuído.", `Distribuição de ${studentName} para ${profName} (${slot.start_time.slice(0, 5)} · ${dateISO})`,
      { professor: prevProf }, { professor: profName });

  const unassign = (s: GradeStudent) =>
    runRpc("unassign_professor", { _booking_id: s.booking_id },
      "Distribuição removida.", `Remoção da distribuição de ${s.student_name} (${slot.start_time.slice(0, 5)} · ${dateISO})`,
      { professor: s.professor_name }, { professor: null });

  const startSession = (s: GradeStudent) =>
    runRpc("start_assigned_session", { _booking_id: s.booking_id },
      "Treino iniciado — professor travado na sessão.",
      `Início de treino de ${s.student_name} com ${s.professor_name} (${slot.start_time.slice(0, 5)} · ${dateISO})`,
      { started: false }, { started: true });

  const onDropTo = (collaboratorId: string, name: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const bookingId = e.dataTransfer.getData("text/booking");
    const s = pending.find(p => p.booking_id === bookingId);
    if (!s) return;
    assign(s.booking_id, collaboratorId, s.student_name, name, s.professor_name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-barlow">DISTRIBUIÇÃO POR PROFESSOR · {slot.start_time.slice(0, 5)}</DialogTitle>
          <DialogDescription className="font-dm text-xs">
            Arraste o aluno para o professor ou selecione o aluno e toque no professor. Máximo de 2 alunos por professor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section>
            <p className="text-xs font-barlow font-bold text-muted-foreground mb-2">SEM PROFESSOR ({unassigned.length})</p>
            {unassigned.length === 0 ? (
              <p className="text-xs font-dm text-muted-foreground">Todos os alunos deste horário já estão distribuídos.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {unassigned.map(s => (
                  <button key={s.booking_id} type="button" draggable
                    onDragStart={e => e.dataTransfer.setData("text/booking", s.booking_id)}
                    onClick={() => setPicked(picked === s.booking_id ? null : s.booking_id)}
                    className={`px-3 py-2 rounded-lg border text-xs font-dm text-left ${picked === s.booking_id ? "border-primary bg-primary/5" : "bg-card"}`}>
                    <span className="font-semibold">{s.student_name}</span>
                    {s.is_trial && <span className="ml-2 text-[9px] font-barlow font-bold bg-amber-100 text-amber-700 px-1.5 rounded">EXPERIMENTAL</span>}
                    {s.muscle_group && <span className="ml-2 text-[10px] text-muted-foreground uppercase">{s.muscle_group === "inferior" ? "INF" : "SUP"}</span>}
                  </button>
                ))}
              </div>
            )}
          </section>

          <div className="grid sm:grid-cols-2 gap-3">
            {professors.length === 0 && (
              <p className="text-xs font-dm text-muted-foreground">Cadastre colaboradores ativos para distribuir alunos.</p>
            )}
            {professors.map(p => {
              const list = byProf[p.id] || [];
              const full = list.length >= 2;
              return (
                <div key={p.id}
                  onDragOver={e => e.preventDefault()}
                  onDrop={onDropTo(p.id, p.full_name)}
                  onClick={() => {
                    if (!picked) return;
                    const s = pending.find(x => x.booking_id === picked);
                    if (!s) return;
                    if (full) { toast.error(RPC_REASONS.professor_full); return; }
                    assign(s.booking_id, p.id, s.student_name, p.full_name, s.professor_name);
                  }}
                  className={`rounded-xl border p-3 ${full ? "bg-muted/40" : "bg-card"} ${picked && !full ? "border-primary/60 cursor-pointer" : ""}`}>
                  <div className="flex items-center justify-between">
                    <p className="font-dm font-semibold text-sm">{p.full_name}</p>
                    <span className={`text-[10px] font-barlow font-bold px-2 py-0.5 rounded-full ${full ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                      {list.length}/2
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-dm">{p.role_title || "Colaborador"}</p>
                  <div className="mt-2 space-y-1.5">
                    {list.length === 0 && <p className="text-[11px] font-dm text-muted-foreground">Nenhum aluno atribuído.</p>}
                    {list.map(s => (
                      <div key={s.booking_id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1.5">
                        <span className="text-xs font-dm truncate">
                          {s.student_name}
                          {s.is_trial && <span className="ml-1.5 text-[9px] font-barlow font-bold bg-amber-100 text-amber-700 px-1 rounded">EXP</span>}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {s.locked || s.started_at ? (
                            <span className="flex items-center gap-1 text-[10px] font-dm text-muted-foreground"><Lock size={11} /> em treino</span>
                          ) : (
                            <>
                              <Button size="icon" variant="ghost" className="h-6 w-6" disabled={busy}
                                onClick={e => { e.stopPropagation(); startSession(s); }} title="Iniciar treino">
                                <Play size={12} />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" disabled={busy}
                                onClick={e => { e.stopPropagation(); unassign(s); }} title="Remover">
                                <UserMinus size={12} />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}