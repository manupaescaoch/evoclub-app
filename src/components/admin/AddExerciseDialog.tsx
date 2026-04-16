import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";

type ExerciseData = {
  name: string;
  sets: number;
  reps: string;
  load: string;
  rest_seconds: number;
  notes: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (exercise: ExerciseData) => void;
};

const COMMON_EXERCISES = [
  "Supino Reto", "Supino Inclinado", "Supino Declinado",
  "Crucifixo", "Peck Deck", "Pullover",
  "Puxada Frontal", "Remada Curvada", "Remada Unilateral",
  "Desenvolvimento", "Elevação Lateral", "Elevação Frontal",
  "Rosca Direta", "Rosca Alternada", "Rosca Martelo",
  "Tríceps Corda", "Tríceps Testa", "Tríceps Francês",
  "Agachamento Livre", "Leg Press", "Cadeira Extensora",
  "Mesa Flexora", "Cadeira Abdutora", "Cadeira Adutora",
  "Stiff", "Panturrilha em Pé", "Panturrilha Sentado",
  "Abdominal Crunch", "Prancha", "Abdominal Infra",
];

const AddExerciseDialog = ({ open, onClose, onSave }: Props) => {
  const [step, setStep] = useState<"search" | "config">("search");
  const [search, setSearch] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState("12");
  const [load, setLoad] = useState("");
  const [rest, setRest] = useState(60);
  const [notes, setNotes] = useState("");

  const filtered = COMMON_EXERCISES.filter(e => e.toLowerCase().includes(search.toLowerCase()));

  const selectExercise = (name: string) => {
    setSelectedName(name);
    setStep("config");
  };

  const handleSave = () => {
    onSave({ name: selectedName, sets, reps, load, rest_seconds: rest, notes });
    reset();
  };

  const reset = () => {
    setStep("search"); setSearch(""); setSelectedName("");
    setSets(3); setReps("12"); setLoad(""); setRest(60); setNotes("");
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-barlow font-bold text-lg">
            {step === "search" ? "Adicionar Exercício" : selectedName}
          </DialogTitle>
        </DialogHeader>

        {step === "search" && (
          <div className="space-y-3">
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Buscar exercício..."
              autoFocus
            />
            {search.trim() && !filtered.find(f => f.toLowerCase() === search.toLowerCase().trim()) && (
              <button
                onClick={() => selectExercise(search.trim())}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-dm text-primary hover:bg-primary/5 rounded-lg transition-colors"
              >
                <Plus size={14} /> Criar "{search.trim()}"
              </button>
            )}
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {filtered.map(ex => (
                <button
                  key={ex}
                  onClick={() => selectExercise(ex)}
                  className="w-full text-left px-3 py-2 text-sm font-dm text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "config" && (
          <div className="space-y-4">
            {/* Sets */}
            <div>
              <label className="text-xs font-dm font-semibold text-muted-foreground mb-1 block">Séries</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setSets(Math.max(1, sets - 1))} className="w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-muted">
                  <Minus size={14} />
                </button>
                <span className="font-barlow font-bold text-xl w-8 text-center">{sets}</span>
                <button onClick={() => setSets(sets + 1)} className="w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-muted">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Reps */}
            <div>
              <label className="text-xs font-dm font-semibold text-muted-foreground mb-1 block">Repetições</label>
              <input
                value={reps} onChange={e => setReps(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Ex: 12 ou 8-12"
              />
            </div>

            {/* Load */}
            <div>
              <label className="text-xs font-dm font-semibold text-muted-foreground mb-1 block">Carga</label>
              <input
                value={load} onChange={e => setLoad(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Ex: 20kg ou Peso corporal"
              />
            </div>

            {/* Rest */}
            <div>
              <label className="text-xs font-dm font-semibold text-muted-foreground mb-1 block">Intervalo (segundos)</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setRest(Math.max(0, rest - 15))} className="w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-muted">
                  <Minus size={14} />
                </button>
                <span className="font-barlow font-bold text-xl w-12 text-center">{rest}s</span>
                <button onClick={() => setRest(rest + 15)} className="w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-muted">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-dm font-semibold text-muted-foreground mb-1 block">Observações</label>
              <input
                value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Ex: Pegada supinada, cadência 3-0-1"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setStep("search")} className="font-dm">Voltar</Button>
              <Button onClick={handleSave} className="font-dm">Salvar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddExerciseDialog;
