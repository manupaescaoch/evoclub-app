import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Plus, Settings, Copy, Trash2, ChevronDown, Pencil, Check, X, Dumbbell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import WorkoutPrescription from "@/components/admin/WorkoutPrescription";

type Client = {
  id: number;
  name: string;
  status: string | null;
  plan: string | null;
  observations: string | null;
};

type Workout = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  starts_at: string | null;
  expires_at: string | null;
  sessions: WorkoutSession[];
};

type WorkoutSession = {
  id: string;
  name: string;
  day_label: string | null;
  duration_min: number | null;
  exercises: Exercise[];
};

type Exercise = {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  load: string | null;
  rest_seconds: number | null;
  day_label: string | null;
  sort_order: number | null;
  notes: string | null;
};

type Anamnesis = {
  id: string;
  type: string | null;
  content: string | null;
  created_at: string | null;
};

type Props = {
  clientId: number;
  onBack: () => void;
};

const TreinosClienteDetalhe = ({ clientId, onBack }: Props) => {
  const [client, setClient] = useState<Client | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [anamnesis, setAnamnesis] = useState<Anamnesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"fichas" | "anamnese">("fichas");
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Create plan modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Prescription view
  const [prescriptionMode, setPrescriptionMode] = useState(false);
  const [editWorkoutId, setEditWorkoutId] = useState<string | undefined>(undefined);

  // New anamnesis form
  const [showNewAnamnesis, setShowNewAnamnesis] = useState(false);
  const [newAnamnesisContent, setNewAnamnesisContent] = useState("");

  // Editable observations
  const [editingObs, setEditingObs] = useState(false);
  const [obsText, setObsText] = useState("");

  useEffect(() => {
    fetchAll();
  }, [clientId]);

  const fetchAll = async () => {
    setLoading(true);

    const [clientRes, workoutsRes, anamnesisRes] = await Promise.all([
      supabase.from("clients").select("id, name, status, plan, observations").eq("id", clientId).single(),
      supabase.from("workouts").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("anamnesis").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
    ]);

    setClient(clientRes.data as Client | null);
    setAnamnesis((anamnesisRes.data || []) as Anamnesis[]);

    // Fetch sessions and exercises for workouts
    const workoutIds = ((workoutsRes.data || []) as any[]).map(w => w.id);
    
    if (workoutIds.length > 0) {
      const [sessionsRes, exercisesRes] = await Promise.all([
        supabase.from("workout_sessions").select("*").in("workout_id", workoutIds).order("sort_order"),
        supabase.from("workout_exercises").select("*").in("workout_id", workoutIds).order("sort_order"),
      ]);

      const sessionsList = (sessionsRes.data || []) as any[];
      const exercisesList = (exercisesRes.data || []) as any[];

      // Group exercises by session_id
      const exBySession: Record<string, Exercise[]> = {};
      const exNoSession: Record<string, Exercise[]> = {};
      exercisesList.forEach(e => {
        if (e.session_id) {
          if (!exBySession[e.session_id]) exBySession[e.session_id] = [];
          exBySession[e.session_id].push(e);
        } else {
          if (!exNoSession[e.workout_id]) exNoSession[e.workout_id] = [];
          exNoSession[e.workout_id].push(e);
        }
      });

      // Group sessions by workout_id
      const sessionsByWorkout: Record<string, WorkoutSession[]> = {};
      sessionsList.forEach(s => {
        if (!sessionsByWorkout[s.workout_id]) sessionsByWorkout[s.workout_id] = [];
        sessionsByWorkout[s.workout_id].push({
          id: s.id, name: s.name, day_label: s.day_label, duration_min: s.duration_min,
          exercises: exBySession[s.id] || [],
        });
      });

      setWorkouts(((workoutsRes.data || []) as any[]).map(w => ({
        ...w,
        sessions: sessionsByWorkout[w.id] || [],
        // Keep legacy exercises without session as a fallback session
        ...(exNoSession[w.id]?.length && !sessionsByWorkout[w.id]?.length ? {
          sessions: [{ id: "legacy", name: "Exercícios", day_label: null, duration_min: null, exercises: exNoSession[w.id] }]
        } : {}),
      })));
    } else {
      setWorkouts([]);
    }

    setLoading(false);
  };

  const handleCreateAnamnesis = async () => {
    if (!newAnamnesisContent.trim()) return;
    const { error } = await supabase.from("anamnesis").insert({
      client_id: clientId, type: "general", content: newAnamnesisContent,
    });
    if (error) { toast.error("Erro ao salvar anamnese"); return; }
    toast.success("Anamnese salva!");
    setShowNewAnamnesis(false);
    setNewAnamnesisContent("");
    fetchAll();
  };

  const initials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "AT": return <span className="bg-green-500 text-white text-[10px] font-dm font-bold px-2.5 py-0.5 rounded-full">Plano ativo</span>;
      case "IN": return <span className="bg-gray-400 text-white text-[10px] font-dm font-bold px-2.5 py-0.5 rounded-full">Inativo</span>;
      default: return <span className="bg-blue-500 text-white text-[10px] font-dm font-bold px-2.5 py-0.5 rounded-full">Oportunidade</span>;
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

  // If in prescription mode, show the prescription component
  if (prescriptionMode && client) {
    return (
      <WorkoutPrescription
        clientId={clientId}
        clientName={client.name}
        workoutId={editWorkoutId}
        onBack={() => { setPrescriptionMode(false); setEditWorkoutId(undefined); }}
        onSaved={() => { setPrescriptionMode(false); setEditWorkoutId(undefined); fetchAll(); }}
      />
    );
  }

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground font-dm">Carregando...</div>;
  }

  if (!client) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground font-dm">Cliente não encontrado.</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft size={24} />
        </button>
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold font-barlow">
          {initials(client.name)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-barlow font-bold text-xl text-foreground">{client.name}</h1>
            {getStatusBadge(client.status)}
          </div>
          {client.plan && <p className="text-xs font-dm text-muted-foreground">{client.plan}</p>}
        </div>
        <div className="ml-auto">
          <Button className="gap-2 font-dm text-sm" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Adicionar
          </Button>
        </div>
      </div>

      {/* Observações do Aluno */}
      <div className="bg-yellow-50 border-l-4 border-l-yellow-400 border border-yellow-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-barlow font-bold text-sm text-yellow-800">⚠️ OBSERVAÇÕES DO ALUNO</h3>
          {!editingObs ? (
            <button onClick={() => { setObsText(client.observations || ""); setEditingObs(true); }} className="text-yellow-600 hover:text-yellow-800 transition-colors">
              <Pencil size={14} />
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={async () => {
                const { error } = await supabase.from("clients").update({ observations: obsText.trim() || null }).eq("id", client.id);
                if (error) { toast.error("Erro ao salvar"); return; }
                setClient({ ...client, observations: obsText.trim() || null });
                setEditingObs(false);
                toast.success("Observação atualizada!");
              }} className="text-green-600 hover:text-green-800"><Check size={16} /></button>
              <button onClick={() => setEditingObs(false)} className="text-red-500 hover:text-red-700"><X size={16} /></button>
            </div>
          )}
        </div>
        {editingObs ? (
          <textarea value={obsText} onChange={e => setObsText(e.target.value)} rows={3} maxLength={1000}
            className="w-full px-3 py-2 text-sm bg-white border border-yellow-300 rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-yellow-400"
            placeholder="Ex: Aluna diabética e lesão no joelho direito..." />
        ) : (
          <p className="text-sm font-dm text-yellow-700 font-semibold whitespace-pre-wrap">
            {client.observations || "Nenhuma observação registrada. Clique no ícone para adicionar."}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border mb-4">
        <button onClick={() => setActiveTab("fichas")}
          className={`pb-2 text-sm font-dm font-semibold transition-colors ${activeTab === "fichas" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
          📄 Fichas de Treino
        </button>
        <button onClick={() => setActiveTab("anamnese")}
          className={`pb-2 text-sm font-dm font-semibold transition-colors ${activeTab === "anamnese" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
          🩺 Anamnese
        </button>
      </div>

      {/* Fichas Tab */}
      {activeTab === "fichas" && (
        <div>
          {workouts.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
              <div className="flex justify-center mb-4">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="text-muted-foreground opacity-40">
                  <path d="M20 12h24a4 4 0 014 4v32a4 4 0 01-4 4H20a4 4 0 01-4-4V16a4 4 0 014-4z" stroke="currentColor" strokeWidth="2" />
                  <path d="M24 28h16M24 36h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="44" cy="44" r="10" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="2" />
                  <path d="M41 44h6M44 41v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <p className="font-dm font-bold text-base text-foreground mb-1">Nenhum plano de treino</p>
              <p className="text-sm font-dm text-muted-foreground mb-5">Crie um plano de treino para este aluno.</p>
              <Button className="gap-2 font-dm bg-primary hover:bg-primary/90" onClick={() => setShowCreateModal(true)}>
                <Plus size={16} /> Criar Plano
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {workouts.map(w => (
                <div key={w.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedWorkout(expandedWorkout === w.id ? null : w.id)}>
                    <div className="flex items-center gap-3">
                      <span className="font-dm font-bold text-sm text-foreground">{w.name}</span>
                      {w.description && <span className="text-xs text-muted-foreground font-dm">· {w.description}</span>}
                      <span className={`text-[10px] font-dm font-bold px-2 py-0.5 rounded-full ${w.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {w.status === "active" ? "Ativo" : "Vencido"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={e => { e.stopPropagation(); setEditWorkoutId(w.id); setPrescriptionMode(true); }} className="p-1 hover:bg-muted rounded">
                        <Settings size={14} className="text-muted-foreground" />
                      </button>
                      <ChevronDown size={16} className={`text-muted-foreground transition-transform ${expandedWorkout === w.id ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {expandedWorkout === w.id && (
                    <div className="border-t border-border">
                      {w.sessions.length === 0 ? (
                        <p className="text-xs text-muted-foreground font-dm py-4 text-center">Nenhuma sessão.</p>
                      ) : (
                        w.sessions.map(s => (
                          <div key={s.id} className="border-b border-border last:border-0">
                            <div className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-muted/30"
                              onClick={() => setExpandedSession(expandedSession === s.id ? null : s.id)}>
                              <div className="flex items-center gap-2">
                                <Dumbbell size={14} className="text-primary" />
                                <span className="font-dm font-semibold text-xs text-foreground">{s.name}</span>
                                {s.day_label && <span className="text-[10px] font-dm text-muted-foreground">{getDayLabel(s.day_label)}</span>}
                              </div>
                              <ChevronDown size={14} className={`text-muted-foreground transition-transform ${expandedSession === s.id ? "rotate-180" : ""}`} />
                            </div>
                            {expandedSession === s.id && (
                              <div className="px-4 pb-3">
                                {s.exercises.length === 0 ? (
                                  <p className="text-xs text-muted-foreground font-dm py-1">Sem exercícios.</p>
                                ) : (
                                  <table className="w-full text-xs font-dm">
                                    <thead>
                                      <tr className="text-muted-foreground border-b border-border">
                                        <th className="text-left py-1.5 w-6">#</th>
                                        <th className="text-left py-1.5">Exercício</th>
                                        <th className="text-right py-1.5">Séries × Reps</th>
                                        <th className="text-right py-1.5">Carga</th>
                                        <th className="text-right py-1.5">Interv.</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {s.exercises.map((e, i) => (
                                        <tr key={e.id} className="border-b border-border last:border-0">
                                          <td className="py-1.5 text-muted-foreground">{i + 1}</td>
                                          <td className="py-1.5 font-medium text-foreground">{e.name}</td>
                                          <td className="py-1.5 text-right">{e.sets} × {e.reps}</td>
                                          <td className="py-1.5 text-right text-muted-foreground">{e.load || "—"}</td>
                                          <td className="py-1.5 text-right text-muted-foreground">{e.rest_seconds}s</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Anamnese Tab */}
      {activeTab === "anamnese" && (
        <div>
          <Button size="sm" className="gap-2 mb-4" onClick={() => setShowNewAnamnesis(true)}>
            <Plus size={14} /> Nova Anamnese
          </Button>

          {showNewAnamnesis && (
            <div className="bg-card border border-primary/20 rounded-xl p-4 mb-4">
              <h3 className="font-barlow font-bold text-sm text-foreground mb-2">Nova Anamnese</h3>
              <textarea value={newAnamnesisContent} onChange={e => setNewAnamnesisContent(e.target.value)} rows={4}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Observações sobre o aluno, lesões, restrições, objetivos..." />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleCreateAnamnesis}>Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNewAnamnesis(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {anamnesis.length === 0 && !showNewAnamnesis ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <p className="text-sm font-dm text-muted-foreground">Nenhuma anamnese registrada.</p>
              </div>
            ) : (
              anamnesis.map(a => (
                <div key={a.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-dm text-muted-foreground">
                      {a.created_at ? new Date(a.created_at).toLocaleDateString("pt-BR") : "—"}
                    </span>
                    <span className="bg-muted text-muted-foreground text-[10px] font-dm px-2 py-0.5 rounded-full capitalize">{a.type}</span>
                  </div>
                  <p className="text-sm font-dm text-foreground whitespace-pre-wrap">{a.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create Plan Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-barlow font-bold text-lg">Criar Novo Plano de Treino</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <button
              onClick={() => { setShowCreateModal(false); setPrescriptionMode(true); setEditWorkoutId(undefined); }}
              className="w-full flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Pencil size={20} className="text-primary" />
              </div>
              <div>
                <p className="font-dm font-bold text-sm text-foreground">Criar Manualmente</p>
                <p className="text-xs font-dm text-muted-foreground">Monte o treino do zero com sessões e exercícios</p>
              </div>
            </button>
            <button disabled className="w-full flex items-center gap-4 p-4 border border-border rounded-xl opacity-50 cursor-not-allowed text-left">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <Copy size={20} className="text-muted-foreground" />
              </div>
              <div>
                <p className="font-dm font-bold text-sm text-foreground">Usar da Biblioteca</p>
                <p className="text-xs font-dm text-muted-foreground">Em breve — selecione de modelos prontos</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TreinosClienteDetalhe;
