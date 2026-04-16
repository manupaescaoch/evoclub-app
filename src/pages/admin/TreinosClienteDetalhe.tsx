import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Plus, Settings, Copy, Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";

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
  exercises: Exercise[];
};

type Exercise = {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
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

  // New workout form
  const [showNewWorkout, setShowNewWorkout] = useState(false);
  const [newWorkoutName, setNewWorkoutName] = useState("");
  const [newWorkoutDesc, setNewWorkoutDesc] = useState("");

  // New anamnesis form
  const [showNewAnamnesis, setShowNewAnamnesis] = useState(false);
  const [newAnamnesisContent, setNewAnamnesisContent] = useState("");

  useEffect(() => {
    fetchAll();
  }, [clientId]);

  const fetchAll = async () => {
    setLoading(true);

    const [clientRes, workoutsRes, exercisesRes, anamnesisRes] = await Promise.all([
      supabase.from("clients").select("id, name, status, plan, observations").eq("id", clientId).single(),
      supabase.from("workouts").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("workout_exercises").select("*").order("sort_order"),
      supabase.from("anamnesis").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
    ]);

    setClient(clientRes.data as Client | null);
    
    const allExercises = (exercisesRes.data || []) as Exercise[];
    const ws = ((workoutsRes.data || []) as any[]).map(w => ({
      ...w,
      exercises: allExercises.filter(e => e.id && w.id ? (exercisesRes.data || []).find((ex: any) => ex.id === e.id && ex.workout_id === w.id) : false),
    }));

    // Re-fetch exercises properly
    const workoutIds = ((workoutsRes.data || []) as any[]).map(w => w.id);
    const { data: exData } = await supabase.from("workout_exercises").select("*").in("workout_id", workoutIds.length > 0 ? workoutIds : ["none"]).order("sort_order");
    
    const exercisesByWorkout: Record<string, Exercise[]> = {};
    (exData || []).forEach((e: any) => {
      if (!exercisesByWorkout[e.workout_id]) exercisesByWorkout[e.workout_id] = [];
      exercisesByWorkout[e.workout_id].push(e);
    });

    setWorkouts(((workoutsRes.data || []) as any[]).map(w => ({
      ...w,
      exercises: exercisesByWorkout[w.id] || [],
    })));
    
    setAnamnesis((anamnesisRes.data || []) as Anamnesis[]);
    setLoading(false);
  };

  const handleCreateWorkout = async () => {
    if (!newWorkoutName.trim()) return;
    const { error } = await supabase.from("workouts").insert({
      client_id: clientId,
      name: newWorkoutName,
      description: newWorkoutDesc || null,
      status: "active",
      starts_at: new Date().toISOString().split("T")[0],
    });
    if (error) { toast.error("Erro ao criar treino"); return; }
    toast.success("Treino criado!");
    setShowNewWorkout(false);
    setNewWorkoutName("");
    setNewWorkoutDesc("");
    fetchAll();
  };

  const handleCreateAnamnesis = async () => {
    if (!newAnamnesisContent.trim()) return;
    const { error } = await supabase.from("anamnesis").insert({
      client_id: clientId,
      type: "general",
      content: newAnamnesisContent,
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
          <Button className="gap-2 font-dm text-sm" onClick={() => setShowNewWorkout(true)}>
            <Plus size={16} /> Adicionar
          </Button>
        </div>
      </div>

      {/* Anamnese Summary */}
      {anamnesis.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <h3 className="font-barlow font-bold text-sm text-yellow-800 mb-1">📋 Resumo do Aluno (Anamnese)</h3>
          <p className="text-xs font-dm text-yellow-700 whitespace-pre-wrap">{anamnesis[0].content}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border mb-4">
        <button
          onClick={() => setActiveTab("fichas")}
          className={`pb-2 text-sm font-dm font-semibold transition-colors ${activeTab === "fichas" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
        >
          📄 Fichas de Treino
        </button>
        <button
          onClick={() => setActiveTab("anamnese")}
          className={`pb-2 text-sm font-dm font-semibold transition-colors ${activeTab === "anamnese" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
        >
          🩺 Anamnese
        </button>
      </div>

      {/* Fichas Tab */}
      {activeTab === "fichas" && (
        <div>
          {showNewWorkout && (
            <div className="bg-card border border-primary/20 rounded-xl p-4 mb-4">
              <h3 className="font-barlow font-bold text-sm text-foreground mb-3">Novo Treino</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs font-dm text-muted-foreground">Nome do Plano</label>
                  <input value={newWorkoutName} onChange={e => setNewWorkoutName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Ex: Treino A - Peito e Tríceps" />
                </div>
                <div>
                  <label className="text-xs font-dm text-muted-foreground">Descrição</label>
                  <input value={newWorkoutDesc} onChange={e => setNewWorkoutDesc(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Ex: Meso 03" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateWorkout}>Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNewWorkout(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          {workouts.length === 0 && !showNewWorkout ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Trash2 size={32} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-dm text-muted-foreground">Nenhuma ficha de treino cadastrada.</p>
              <Button size="sm" className="mt-3 gap-2" onClick={() => setShowNewWorkout(true)}>
                <Plus size={14} /> Criar primeiro treino
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {workouts.map(w => (
                <div key={w.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedWorkout(expandedWorkout === w.id ? null : w.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-dm font-bold text-sm text-foreground">{w.name}</span>
                        {w.description && <span className="text-xs text-muted-foreground font-dm">· {w.description}</span>}
                      </div>
                      <span className={`text-[10px] font-dm font-bold px-2 py-0.5 rounded-full ${w.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {w.status === "active" ? "Ativo" : "Vencido"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Settings size={14} className="text-muted-foreground" />
                      <Copy size={14} className="text-muted-foreground" />
                      <ChevronDown size={16} className={`text-muted-foreground transition-transform ${expandedWorkout === w.id ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {expandedWorkout === w.id && (
                    <div className="border-t border-border px-4 py-3">
                      {w.exercises.length === 0 ? (
                        <p className="text-xs text-muted-foreground font-dm py-2">Nenhum exercício adicionado.</p>
                      ) : (
                        <table className="w-full text-xs font-dm">
                          <thead>
                            <tr className="text-muted-foreground border-b border-border">
                              <th className="text-left py-1.5 w-8">#</th>
                              <th className="text-left py-1.5">Exercício</th>
                              <th className="text-left py-1.5">Grupo</th>
                              <th className="text-right py-1.5">Séries × Reps</th>
                            </tr>
                          </thead>
                          <tbody>
                            {w.exercises.map((e, i) => (
                              <tr key={e.id} className="border-b border-border last:border-0">
                                <td className="py-2 text-muted-foreground">{i + 1}</td>
                                <td className="py-2 font-medium text-foreground">{e.name}</td>
                                <td className="py-2 text-muted-foreground">{e.day_label || "—"}</td>
                                <td className="py-2 text-right">{e.sets} × {e.reps}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
              <textarea
                value={newAnamnesisContent}
                onChange={e => setNewAnamnesisContent(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Observações sobre o aluno, lesões, restrições, objetivos..."
              />
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
    </div>
  );
};

export default TreinosClienteDetalhe;
