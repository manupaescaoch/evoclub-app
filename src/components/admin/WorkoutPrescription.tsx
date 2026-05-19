import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Plus, Settings, Copy, Trash2, ChevronDown, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import NewSessionDialog from "./NewSessionDialog";
import AddExerciseDialog from "./AddExerciseDialog";

type SessionExercise = {
  id?: string;
  name: string;
  sets: number;
  reps: string;
  load: string;
  rest_seconds: number;
  notes: string;
  sort_order: number;
};

type Session = {
  id?: string;
  name: string;
  day_label: string | null;
  duration_min: number | null;
  notes: string;
  sort_order: number;
  exercises: SessionExercise[];
};

type Props = {
  clientId: number;
  clientName: string;
  workoutId?: string; // if editing existing
  onBack: () => void;
  onSaved: () => void;
};

const WorkoutPrescription = ({ clientId, clientName, workoutId, onBack, onSaved }: Props) => {
  const [planName, setPlanName] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [startsAt, setStartsAt] = useState<string>(new Date().toISOString().split("T")[0]);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expandedSession, setExpandedSession] = useState<number | null>(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [addExerciseIdx, setAddExerciseIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workoutId) loadExisting();
  }, [workoutId]);

  const loadExisting = async () => {
    if (!workoutId) return;
    const { data: workout } = await supabase.from("workouts").select("*").eq("id", workoutId).single();
    if (workout) {
      setPlanName(workout.name);
      setPlanDesc(workout.description || "");
      if (workout.starts_at) setStartsAt(workout.starts_at);
      if (workout.expires_at) setExpiresAt(workout.expires_at);
    }
    const { data: sessionsData } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("workout_id", workoutId)
      .order("sort_order");

    if (sessionsData && sessionsData.length > 0) {
      const sessionIds = sessionsData.map(s => s.id);
      const { data: exData } = await supabase
        .from("workout_exercises")
        .select("*")
        .in("session_id", sessionIds)
        .order("sort_order");

      const exBySession: Record<string, SessionExercise[]> = {};
      (exData || []).forEach((e: any) => {
        if (!exBySession[e.session_id]) exBySession[e.session_id] = [];
        exBySession[e.session_id].push({
          id: e.id, name: e.name, sets: e.sets || 3, reps: e.reps || "12",
          load: e.load || "", rest_seconds: e.rest_seconds || 60, notes: e.notes || "",
          sort_order: e.sort_order || 0,
        });
      });

      setSessions(sessionsData.map(s => ({
        id: s.id, name: s.name, day_label: s.day_label, duration_min: s.duration_min,
        notes: s.notes || "", sort_order: s.sort_order || 0,
        exercises: exBySession[s.id] || [],
      })));
    }
  };

  const handleAddSession = (session: { name: string; day_label: string; duration_min: number | null; notes: string }) => {
    setSessions([...sessions, { ...session, sort_order: sessions.length, exercises: [] }]);
    setShowNewSession(false);
    setExpandedSession(sessions.length);
  };

  const handleDeleteSession = (idx: number) => {
    setSessions(sessions.filter((_, i) => i !== idx));
  };

  const handleDuplicateSession = (idx: number) => {
    const s = sessions[idx];
    const copy: Session = {
      ...s, id: undefined, name: s.name + " (Cópia)", sort_order: sessions.length,
      exercises: s.exercises.map(e => ({ ...e, id: undefined })),
    };
    setSessions([...sessions, copy]);
  };

  const handleAddExercise = (idx: number, exercise: SessionExercise) => {
    const updated = [...sessions];
    updated[idx].exercises.push({ ...exercise, sort_order: updated[idx].exercises.length });
    setSessions(updated);
    setAddExerciseIdx(null);
  };

  const handleDeleteExercise = (sessionIdx: number, exerciseIdx: number) => {
    const updated = [...sessions];
    updated[sessionIdx].exercises.splice(exerciseIdx, 1);
    setSessions(updated);
  };

  const handleSave = async () => {
    if (!planName.trim()) { toast.error("Preencha o nome do plano"); return; }
    if (sessions.length === 0) { toast.error("Adicione pelo menos uma sessão"); return; }

    setSaving(true);
    try {
      // Create or update workout
      let wId = workoutId;
      if (!wId) {
        const { data, error } = await supabase.from("workouts").insert({
          client_id: clientId, name: planName, description: planDesc || null,
          status: "active",
          starts_at: startsAt || new Date().toISOString().split("T")[0],
          expires_at: expiresAt || null,
        }).select("id").single();
        if (error) throw error;
        wId = data.id;
      } else {
        await supabase.from("workouts").update({
          name: planName,
          description: planDesc || null,
          starts_at: startsAt || null,
          expires_at: expiresAt || null,
        }).eq("id", wId);
        // Delete old sessions (cascade deletes exercises)
        await supabase.from("workout_sessions").delete().eq("workout_id", wId);
      }

      // Insert sessions
      for (let i = 0; i < sessions.length; i++) {
        const s = sessions[i];
        const { data: sData, error: sErr } = await supabase.from("workout_sessions").insert({
          workout_id: wId, name: s.name, day_label: s.day_label,
          duration_min: s.duration_min, notes: s.notes || null, sort_order: i,
        }).select("id").single();
        if (sErr) throw sErr;

        // Insert exercises for this session
        if (s.exercises.length > 0) {
          const exInserts = s.exercises.map((e, ei) => ({
            workout_id: wId!, session_id: sData.id, name: e.name,
            sets: e.sets, reps: e.reps, load: e.load || null,
            rest_seconds: e.rest_seconds, notes: e.notes || null, sort_order: ei,
          }));
          const { error: eErr } = await supabase.from("workout_exercises").insert(exInserts);
          if (eErr) throw eErr;
        }
      }

      toast.success("Plano de treino salvo!");
      onSaved();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const getDayLabel = (d: string | null) => {
    if (!d) return "";
    const map: Record<string, string> = {
      segunda: "Segunda", terca: "Terça", quarta: "Quarta", quinta: "Quinta",
      sexta: "Sexta", sabado: "Sábado", domingo: "Domingo",
    };
    return map[d] || `Dia ${d}`;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="font-barlow font-bold text-xl text-foreground">Prescrever Treino</h1>
            <p className="text-xs font-dm text-muted-foreground">{clientName}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="font-dm">
          {saving ? "Salvando..." : "Salvar Plano"}
        </Button>
      </div>

      {/* Plan info */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
        <div>
          <label className="text-xs font-dm font-semibold text-muted-foreground mb-1 block">Nome do Plano *</label>
          <input
            value={planName} onChange={e => setPlanName(e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Ex: Meso 01 - Adaptação"
          />
        </div>
        <div>
          <label className="text-xs font-dm font-semibold text-muted-foreground mb-1 block">Descrição</label>
          <input
            value={planDesc} onChange={e => setPlanDesc(e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Ex: Foco em adaptação neural e mobilidade"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-dm font-semibold text-muted-foreground mb-1 block">Início</label>
            <input
              type="date" value={startsAt} onChange={e => setStartsAt(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-dm font-semibold text-muted-foreground mb-1 block">Validade *</label>
            <input
              type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
              min={startsAt || undefined}
              className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div className="space-y-3 mb-4">
        {sessions.map((s, idx) => (
          <div key={idx} className="bg-card border border-border rounded-xl overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50"
              onClick={() => setExpandedSession(expandedSession === idx ? null : idx)}
            >
              <div className="flex items-center gap-2">
                <Dumbbell size={16} className="text-primary" />
                <span className="font-dm font-bold text-sm text-foreground">{s.name}</span>
                {s.day_label && (
                  <span className="text-[10px] font-dm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {getDayLabel(s.day_label)}
                  </span>
                )}
                {s.duration_min && (
                  <span className="text-[10px] font-dm text-muted-foreground">{s.duration_min}min</span>
                )}
                <span className="text-[10px] font-dm text-muted-foreground">
                  ({s.exercises.length} exercício{s.exercises.length !== 1 ? "s" : ""})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={e => { e.stopPropagation(); handleDuplicateSession(idx); }} className="p-1 hover:bg-muted rounded">
                  <Copy size={13} className="text-muted-foreground" />
                </button>
                <button onClick={e => { e.stopPropagation(); handleDeleteSession(idx); }} className="p-1 hover:bg-red-50 rounded">
                  <Trash2 size={13} className="text-red-400" />
                </button>
                <ChevronDown size={16} className={`text-muted-foreground transition-transform ${expandedSession === idx ? "rotate-180" : ""}`} />
              </div>
            </div>

            {expandedSession === idx && (
              <div className="border-t border-border px-4 py-3">
                {s.exercises.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-dm py-2 text-center">Nenhum exercício adicionado.</p>
                ) : (
                  <table className="w-full text-xs font-dm mb-3">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-1.5 w-8">#</th>
                        <th className="text-left py-1.5">Exercício</th>
                        <th className="text-right py-1.5">Séries × Reps</th>
                        <th className="text-right py-1.5">Carga</th>
                        <th className="text-right py-1.5">Interv.</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.exercises.map((e, ei) => (
                        <tr key={ei} className="border-b border-border last:border-0">
                          <td className="py-2 text-muted-foreground">{ei + 1}</td>
                          <td className="py-2 font-medium text-foreground">{e.name}</td>
                          <td className="py-2 text-right">{e.sets} × {e.reps}</td>
                          <td className="py-2 text-right text-muted-foreground">{e.load || "—"}</td>
                          <td className="py-2 text-right text-muted-foreground">{e.rest_seconds}s</td>
                          <td className="py-2 text-right">
                            <button onClick={() => handleDeleteExercise(idx, ei)} className="text-red-400 hover:text-red-600">
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <Button
                  size="sm" variant="outline"
                  className="gap-1.5 font-dm text-xs w-full"
                  onClick={() => setAddExerciseIdx(idx)}
                >
                  <Plus size={14} /> Adicionar Exercício
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add session button */}
      <button
        onClick={() => setShowNewSession(true)}
        className="w-full border-2 border-dashed border-primary/30 text-primary rounded-xl py-4 flex items-center justify-center gap-2 font-dm font-semibold text-sm hover:bg-primary/5 transition-colors"
      >
        <Plus size={18} /> Adicionar Sessão de Treino
      </button>

      {/* Dialogs */}
      <NewSessionDialog open={showNewSession} onClose={() => setShowNewSession(false)} onSave={handleAddSession} />

      {addExerciseIdx !== null && (
        <AddExerciseDialog
          open={true}
          onClose={() => setAddExerciseIdx(null)}
          onSave={(ex) => handleAddExercise(addExerciseIdx, { ...ex, sort_order: 0 })}
        />
      )}
    </div>
  );
};

export default WorkoutPrescription;
