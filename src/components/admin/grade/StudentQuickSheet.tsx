import { useCallback, useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logSensitive } from "@/lib/audit";
import { GradeStudent, RPC_REASONS, STATUS_LABEL } from "@/hooks/useGradeDay";
import { useAccess } from "@/contexts/AccessContext";
import ConversaoDialog from "./ConversaoDialog";
import { AlertTriangle, Check } from "lucide-react";

type Summary = {
  client: any;
  is_trial: boolean;
  anamnesis: { type: string | null; content: string | null; created_at: string }[];
  pains: { created_at: string; region: string | null; level: number | null; notes: string | null }[];
  checkin: { sleep_hours: number | null; sleep_quality: number | null; energy: number | null; mood: number | null } | null;
  readiness: "alta" | "moderada" | "baixa" | "sem_checkin";
  training_plan: { id: string; name: string | null; starts_at: string | null; expires_at: string | null } | null;
  alerts: { id: string; new_value: string | null; source: string; created_at: string; acknowledged_at: string | null }[];
  error?: string;
};

const READINESS: Record<string, { label: string; cls: string }> = {
  alta: { label: "ALTA", cls: "bg-green-50 text-green-700" },
  moderada: { label: "MODERADA", cls: "bg-amber-50 text-amber-700" },
  baixa: { label: "BAIXA", cls: "bg-red-50 text-red-700" },
  sem_checkin: { label: "SEM CHECK-IN", cls: "bg-muted text-muted-foreground" },
};

export default function StudentQuickSheet({
  student, open, onOpenChange, onChanged,
}: {
  student: GradeStudent | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChanged: () => void;
}) {
  const { can } = useAccess();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitations, setLimitations] = useState("");
  const [savingLim, setSavingLim] = useState(false);
  const [convOpen, setConvOpen] = useState(false);

  const load = useCallback(async () => {
    if (!student?.client_id) return;
    setLoading(true); setError(null);
    const { data: res, error: err } = await supabase.rpc("student_quick_summary" as any, { _client_id: student.client_id });
    setLoading(false);
    if (err) { setError(err.message); return; }
    const s = res as unknown as Summary;
    if (s?.error) { setError("Sem permissão para ver este resumo."); return; }
    setData(s);
    setLimitations(s?.client?.limitations || "");
  }, [student?.client_id]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const saveLimitations = async () => {
    if (!student?.client_id) return;
    setSavingLim(true);
    const { data: res, error: err } = await supabase.rpc("update_limitations" as any, {
      _client_id: student.client_id, _limitations: limitations,
    });
    setSavingLim(false);
    if (err) { toast.error(err.message); return; }
    const r = (res || {}) as { ok?: boolean; reason?: string; changed?: boolean };
    if (!r.ok) { toast.error(RPC_REASONS[r.reason || ""] || "Não foi possível salvar."); return; }
    if (r.changed) {
      await logSensitive({
        entity: "clients", entity_id: student.client_id, module: "grade",
        description: `Atualização de limitações de ${student.student_name} pela Grade`,
        before: { limitations: data?.client?.limitations || null }, after: { limitations },
      });
      toast.success("Limitações atualizadas. Coordenação e professor foram alertados.");
    } else {
      toast.info("Nada mudou.");
    }
    load();
    onChanged();
  };

  const ack = async (id: string) => {
    const { error: err } = await supabase.rpc("ack_limitation_alert" as any, { _alert_id: id });
    if (err) { toast.error(err.message); return; }
    toast.success("Alerta marcado como visualizado.");
    load();
  };

  const c = data?.client;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-barlow">{student?.student_name || "Aluno"}</SheetTitle>
          <SheetDescription className="font-dm text-xs">
            Resumo rápido do atendimento · {student?.is_trial ? "Experimental" : "Aluno ativo"}
          </SheetDescription>
        </SheetHeader>

        {loading && <p className="text-sm font-dm text-muted-foreground py-8">Carregando resumo...</p>}
        {error && <p className="text-sm font-dm text-red-600 py-8">{error}</p>}
        {!loading && !error && !data && <p className="text-sm font-dm text-muted-foreground py-8">Nenhum dado disponível.</p>}

        {data && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-3">
              <div className={`px-2.5 py-1 rounded-full text-[10px] font-barlow font-bold ${READINESS[data.readiness].cls}`}>
                PRONTIDÃO {READINESS[data.readiness].label}
              </div>
              {student?.is_trial && (
                <span className="text-[10px] font-barlow font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">EXPERIMENTAL</span>
              )}
              {student?.attendance_status && (
                <span className="text-[10px] font-dm text-muted-foreground">{STATUS_LABEL[student.attendance_status] || student.attendance_status}</span>
              )}
            </div>
            <p className="text-[10px] font-dm text-muted-foreground -mt-2">
              Indicador de bem-estar do check-in do dia. Não é avaliação médica.
            </p>

            {data.checkin ? (
              <div className="grid grid-cols-4 gap-2">
                {[
                  ["Sono", data.checkin.sleep_hours != null ? `${data.checkin.sleep_hours}h` : "—"],
                  ["Qualidade", data.checkin.sleep_quality ?? "—"],
                  ["Energia", data.checkin.energy ?? "—"],
                  ["Humor", data.checkin.mood ?? "—"],
                ].map(([k, v]) => (
                  <div key={String(k)} className="rounded-lg bg-muted/40 p-2 text-center">
                    <p className="text-[10px] font-dm text-muted-foreground">{k}</p>
                    <p className="font-barlow font-bold text-base">{String(v)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-dm text-muted-foreground">Aluno ainda não fez o check-in de hoje.</p>
            )}

            <div className="space-y-2">
              <Field label="Objetivo" value={c?.objective} />
              {student?.is_trial ? (
                <>
                  <Field label="Anamnese / primeiro atendimento"
                    value={data.anamnesis.map(a => `${a.type || "geral"}: ${a.content || ""}`).join(" · ") || null} />
                  <Field label="Dores e lesões relatadas"
                    value={data.pains.map(p => `${p.region || "—"}${p.level ? ` (nível ${p.level})` : ""}`).join(" · ") || null} />
                </>
              ) : (
                <>
                  <Field label="Observações técnicas" value={c?.observations} />
                  <Field label="Treino atual"
                    value={data.training_plan ? `${data.training_plan.name || "Plano ativo"}${data.training_plan.expires_at ? ` · válido até ${new Date(data.training_plan.expires_at).toLocaleDateString("pt-BR")}` : ""}` : null} />
                  <Field label="Dores recentes"
                    value={data.pains.map(p => `${p.region || "—"}${p.level ? ` (nível ${p.level})` : ""}`).join(" · ") || null} />
                </>
              )}
            </div>

            {data.alerts.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-barlow font-bold text-amber-800">
                  <AlertTriangle size={13} /> ALERTAS TÉCNICOS
                </p>
                {data.alerts.map(a => (
                  <div key={a.id} className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-dm text-amber-900">
                      Nova limitação ({a.source}) em {new Date(a.created_at).toLocaleString("pt-BR")}: {a.new_value || "—"}
                    </p>
                    <Button size="sm" variant="outline" className="h-6 gap-1 text-[10px]" onClick={() => ack(a.id)}>
                      <Check size={11} /> Visualizei
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <Label className="text-xs">Limitações</Label>
              <Textarea rows={3} value={limitations} onChange={e => setLimitations(e.target.value)}
                placeholder="Nenhuma limitação registrada" />
              <Button size="sm" className="mt-2" onClick={saveLimitations} disabled={savingLim}>
                {savingLim ? "Salvando..." : "Salvar limitações"}
              </Button>
            </div>

            {student?.is_trial && can("crm", "create") && (
              <div className="rounded-xl border p-3">
                <p className="text-xs font-barlow font-bold text-foreground">CONVERSÃO DA EXPERIMENTAL</p>
                <p className="text-[11px] font-dm text-muted-foreground mb-2">
                  Professor que conduziu: {student.professor_name || "não distribuído"}.
                </p>
                <Button size="sm" variant="outline" onClick={() => setConvOpen(true)}>Registrar matrícula</Button>
              </div>
            )}
          </div>
        )}

        <ConversaoDialog
          open={convOpen}
          onOpenChange={setConvOpen}
          clientId={student?.client_id ?? null}
          clientName={student?.student_name || ""}
          trialBookingId={student?.booking_id ?? null}
          trialProfessorId={student?.collaborator_id ?? null}
          onSaved={() => { onChanged(); load(); }}
        />
      </SheetContent>
    </Sheet>
  );
}

const Field = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="text-[10px] font-barlow font-bold text-muted-foreground uppercase">{label}</p>
    <p className="text-xs font-dm text-foreground">{value || "—"}</p>
  </div>
);