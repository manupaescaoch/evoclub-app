import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { GradeStudent } from "@/hooks/useGradeDay";
import { useAccess } from "@/contexts/AccessContext";
import { AlertTriangle, ClipboardEdit, Dumbbell, FileText, RefreshCw } from "lucide-react";
import { useWorkoutHistory } from "@/hooks/useWorkoutHistory";
import { LastWorkoutCard, WorkoutLogItem } from "@/components/shared/WorkoutHistoryViews";

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
  alta: { label: "PRONTIDÃO ALTA", cls: "bg-green-50 text-green-700" },
  moderada: { label: "PRONTIDÃO MODERADA", cls: "bg-amber-50 text-amber-700" },
  baixa: { label: "PRONTIDÃO BAIXA", cls: "bg-red-50 text-red-700" },
  sem_checkin: { label: "SEM CHECK-IN HOJE", cls: "bg-muted text-muted-foreground" },
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-muted/50 px-3 py-2">
    <p className="font-barlow font-bold text-lg leading-none">{value}</p>
    <p className="font-dm text-[10px] text-muted-foreground mt-1">{label}</p>
  </div>
);

export default function ProStudentSheet({
  student, open, onOpenChange, planName,
}: {
  student: GradeStudent | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  planName?: string | null;
}) {
  const navigate = useNavigate();
  const { can } = useAccess();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const history = useWorkoutHistory(open ? student?.client_id : null, 8);

  const load = useCallback(async () => {
    if (!student?.client_id) return;
    setLoading(true); setError(null); setData(null);
    const { data: res, error: err } = await supabase.rpc("student_quick_summary" as any, { _client_id: student.client_id });
    setLoading(false);
    if (err) { setError(err.message); return; }
    const s = res as unknown as Summary;
    if (s?.error) { setError("Sem permissão para ver este resumo."); return; }
    setData(s);
  }, [student?.client_id]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const canPrescribe = can("treinos", "edit");
  const r = data ? READINESS[data.readiness] : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-barlow text-xl">{student?.student_name || "Aluno"}</SheetTitle>
          <SheetDescription className="font-dm text-xs">
            {student?.muscle_group ? (student.muscle_group === "inferior" ? "Treino de inferior hoje" : "Treino de superior hoje") : "Grupo muscular não informado"}
            {planName ? ` · ${planName}` : ""}
          </SheetDescription>
        </SheetHeader>

        {loading && <p className="py-8 text-center font-dm text-sm text-muted-foreground">Carregando resumo...</p>}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-dm text-sm text-red-700 mt-4">
            <p className="flex items-center gap-2"><AlertTriangle size={16} /> {error}</p>
            <button onClick={load} className="mt-3 h-10 w-full rounded-lg bg-white border border-red-200 font-semibold flex items-center justify-center gap-2">
              <RefreshCw size={14} /> Tentar de novo
            </button>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-4 mt-4">
            {r && (
              <span className={`inline-block text-[10px] font-barlow font-bold px-2.5 py-1 rounded-full ${r.cls}`}>{r.label}</span>
            )}

            <div>
              <p className="font-barlow font-bold text-sm mb-2">CHECK-IN DE HOJE</p>
              {data.checkin ? (
                <div className="grid grid-cols-4 gap-2">
                  <Metric label="Sono (h)" value={data.checkin.sleep_hours != null ? String(data.checkin.sleep_hours) : "—"} />
                  <Metric label="Qual. sono" value={data.checkin.sleep_quality != null ? `${data.checkin.sleep_quality}` : "—"} />
                  <Metric label="Energia" value={data.checkin.energy != null ? `${data.checkin.energy}` : "—"} />
                  <Metric label="Humor" value={data.checkin.mood != null ? `${data.checkin.mood}` : "—"} />
                </div>
              ) : (
                <p className="font-dm text-xs text-muted-foreground">O aluno ainda não fez o check-in de hoje.</p>
              )}
            </div>

            <div>
              <p className="font-barlow font-bold text-sm mb-2">LIMITAÇÕES</p>
              <p className="font-dm text-xs text-muted-foreground whitespace-pre-wrap">
                {data.client?.limitations?.trim() || "Nenhuma limitação registrada."}
              </p>
              {data.alerts?.filter(a => !a.acknowledged_at).length > 0 && (
                <p className="mt-2 rounded-lg bg-amber-50 text-amber-800 font-dm text-[11px] px-3 py-2">
                  Limitação atualizada recentemente — confira antes de iniciar o treino.
                </p>
              )}
            </div>

            {data.pains?.length > 0 && (
              <div>
                <p className="font-barlow font-bold text-sm mb-2">DORES RECENTES</p>
                <div className="space-y-1.5">
                  {data.pains.slice(0, 3).map((p, i) => (
                    <p key={i} className="font-dm text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")} · {p.region || "região não informada"}
                      {p.level != null ? ` · nível ${p.level}` : ""}{p.notes ? ` · ${p.notes}` : ""}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="font-barlow font-bold text-sm mb-2 flex items-center gap-1.5">
                <FileText size={14} /> ANAMNESE
              </p>
              {data.anamnesis?.length ? (
                <div className="space-y-2">
                  {data.anamnesis.slice(0, 3).map((a, i) => (
                    <div key={i} className="rounded-xl bg-muted/50 px-3 py-2">
                      <p className="font-dm text-[11px] font-semibold">
                        {a.type || "Anamnese"} · {new Date(a.created_at).toLocaleDateString("pt-BR")}
                      </p>
                      <p className="font-dm text-[11px] text-muted-foreground whitespace-pre-wrap mt-1">
                        {a.content?.trim() || "Sem conteúdo registrado."}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-dm text-xs text-muted-foreground">
                  {data.is_trial ? "Experimental sem anamnese respondida. Envie o formulário pela recepção." : "Nenhuma anamnese registrada."}
                </p>
              )}
            </div>

            <div>
              <p className="font-barlow font-bold text-sm mb-2">FICHA ATIVA</p>
              {data.training_plan ? (
                <p className="font-dm text-xs text-muted-foreground">
                  {data.training_plan.name || "Ficha"}
                  {data.training_plan.expires_at ? ` · válida até ${new Date(`${data.training_plan.expires_at}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}
                </p>
              ) : (
                <p className="font-dm text-xs text-muted-foreground">Nenhuma ficha ativa.</p>
              )}
            </div>

            <div>
              <p className="font-barlow font-bold text-sm mb-2 flex items-center gap-1.5">
                <Dumbbell size={14} /> ÚLTIMO TREINO REALIZADO
              </p>
              {history.loading ? (
                <p className="font-dm text-xs text-muted-foreground">Carregando histórico...</p>
              ) : history.error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="font-dm text-xs text-red-700">Não foi possível carregar o histórico de treinos.</p>
                  <button onClick={history.reload} className="mt-2 h-9 w-full rounded-lg bg-white border border-red-200 font-dm text-xs font-semibold flex items-center justify-center gap-2">
                    <RefreshCw size={13} /> Tentar de novo
                  </button>
                </div>
              ) : history.lastCompleted ? (
                <>
                  <LastWorkoutCard log={history.lastCompleted} maxExercises={8} />
                  {history.logs.length > 1 && (
                    <>
                      <p className="font-barlow font-bold text-xs text-muted-foreground mt-3 mb-1.5">TREINOS ANTERIORES</p>
                      <div className="space-y-1.5">
                        {history.logs.filter(l => l.id !== history.lastCompleted!.id).slice(0, 5).map(l => (
                          <WorkoutLogItem key={l.id} log={l} className="bg-card" />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="font-dm text-xs text-muted-foreground">Nenhum treino executado registrado ainda.</p>
              )}
            </div>

            {canPrescribe && student?.client_id && (
              <button
                onClick={() => navigate(`/admin/treinos/prescrever/${student.client_id}`)}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-dm font-bold flex items-center justify-center gap-2">
                <ClipboardEdit size={18} /> Montar treino
              </button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
