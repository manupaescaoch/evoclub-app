import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical, Sparkles, MessageSquare, Copy } from "lucide-react";

const SERIES_TYPES = [
  { value: "reps_load", label: "Repetições e carga" },
  { value: "reps_load_time", label: "Repetições, carga e tempo" },
  { value: "reps_time", label: "Repetições e tempo" },
  { value: "time_incline", label: "Tempo e inclinação" },
  { value: "run", label: "Corrida" },
  { value: "notes_only", label: "Observações" },
  { value: "cadence", label: "Cadência" },
];

type SerieRow = {
  id: string;
  type: string;
  setsReps: string;
  load: string;
  rest: string;
  time: string;
  incline: string;
  cadence: string;
};

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

const makeId = () => Math.random().toString(36).slice(2, 9);

const defaultRow = (type = "reps_load"): SerieRow => ({
  id: makeId(),
  type,
  setsReps: "",
  load: "",
  rest: "",
  time: "",
  incline: "",
  cadence: "",
});

const AddExerciseDialog = ({ open, onClose, onSave }: Props) => {
  const [step, setStep] = useState<"search" | "config">("search");
  const [search, setSearch] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [series, setSeries] = useState<SerieRow[]>([defaultRow()]);
  const [method, setMethod] = useState("");
  const [showMethod, setShowMethod] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const filtered = COMMON_EXERCISES.filter(e => e.toLowerCase().includes(search.toLowerCase()));

  const selectExercise = (name: string) => {
    setSelectedName(name);
    setStep("config");
  };

  const updateRow = (id: string, field: keyof SerieRow, value: string) => {
    setSeries(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRow = (id: string) => {
    setSeries(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  };

  const addRow = () => {
    const lastType = series[series.length - 1]?.type || "reps_load";
    setSeries(prev => [...prev, defaultRow(lastType)]);
  };

  const replicateSeries = () => {
    if (series.length === 0) return;
    const last = series[series.length - 1];
    setSeries(prev => [...prev, { ...last, id: makeId() }]);
  };

  const handleSave = () => {
    const first = series[0];
    const totalSets = series.length;
    const repsVal = first?.setsReps || "12";
    const loadVal = first?.load || "";
    const restVal = parseInt(first?.rest || "60") || 60;
    const allNotes = [method, notes].filter(Boolean).join(" | ");
    onSave({ name: selectedName, sets: totalSets, reps: repsVal, load: loadVal, rest_seconds: restVal, notes: allNotes });
    reset();
  };

  const reset = () => {
    setStep("search"); setSearch(""); setSelectedName("");
    setSeries([defaultRow()]); setMethod(""); setShowMethod(false);
    setNotes(""); setShowNotes(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const renderRowFields = (row: SerieRow) => {
    const inputClass = "px-2 py-2 text-sm bg-background border border-border rounded font-dm focus:outline-none focus:ring-1 focus:ring-primary text-center";

    switch (row.type) {
      case "reps_load":
        return (
          <>
            <div className="flex-1">
              <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Série/Rep</label>
              <input value={row.setsReps} onChange={e => updateRow(row.id, "setsReps", e.target.value)} className={`${inputClass} w-full`} placeholder="3x12" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Carga</label>
              <input value={row.load} onChange={e => updateRow(row.id, "load", e.target.value)} className={`${inputClass} w-full`} placeholder="40kg" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Intervalo</label>
              <input value={row.rest} onChange={e => updateRow(row.id, "rest", e.target.value)} className={`${inputClass} w-full`} placeholder="60" />
            </div>
          </>
        );
      case "reps_load_time":
        return (
          <>
            <div className="flex-1">
              <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Série/Rep</label>
              <input value={row.setsReps} onChange={e => updateRow(row.id, "setsReps", e.target.value)} className={`${inputClass} w-full`} placeholder="3x12" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Carga</label>
              <input value={row.load} onChange={e => updateRow(row.id, "load", e.target.value)} className={`${inputClass} w-full`} placeholder="40kg" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Tempo</label>
              <input value={row.time} onChange={e => updateRow(row.id, "time", e.target.value)} className={`${inputClass} w-full`} placeholder="30s" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Intervalo</label>
              <input value={row.rest} onChange={e => updateRow(row.id, "rest", e.target.value)} className={`${inputClass} w-full`} placeholder="60" />
            </div>
          </>
        );
      case "reps_time":
        return (
          <>
            <div className="flex-1">
              <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Série/Rep</label>
              <input value={row.setsReps} onChange={e => updateRow(row.id, "setsReps", e.target.value)} className={`${inputClass} w-full`} placeholder="3x12" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Tempo</label>
              <input value={row.time} onChange={e => updateRow(row.id, "time", e.target.value)} className={`${inputClass} w-full`} placeholder="30s" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Intervalo</label>
              <input value={row.rest} onChange={e => updateRow(row.id, "rest", e.target.value)} className={`${inputClass} w-full`} placeholder="60" />
            </div>
          </>
        );
      case "time_incline":
        return (
          <>
            <div className="flex-1">
              <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Tempo</label>
              <input value={row.time} onChange={e => updateRow(row.id, "time", e.target.value)} className={`${inputClass} w-full`} placeholder="10min" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Inclinação</label>
              <input value={row.incline} onChange={e => updateRow(row.id, "incline", e.target.value)} className={`${inputClass} w-full`} placeholder="5%" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Intervalo</label>
              <input value={row.rest} onChange={e => updateRow(row.id, "rest", e.target.value)} className={`${inputClass} w-full`} placeholder="60" />
            </div>
          </>
        );
      case "run":
        return (
          <>
            <div className="flex-1">
              <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Distância</label>
              <input value={row.setsReps} onChange={e => updateRow(row.id, "setsReps", e.target.value)} className={`${inputClass} w-full`} placeholder="5km" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Tempo</label>
              <input value={row.time} onChange={e => updateRow(row.id, "time", e.target.value)} className={`${inputClass} w-full`} placeholder="30min" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Intervalo</label>
              <input value={row.rest} onChange={e => updateRow(row.id, "rest", e.target.value)} className={`${inputClass} w-full`} placeholder="60" />
            </div>
          </>
        );
      case "cadence":
        return (
          <>
            <div className="flex-1">
              <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Série/Rep</label>
              <input value={row.setsReps} onChange={e => updateRow(row.id, "setsReps", e.target.value)} className={`${inputClass} w-full`} placeholder="3x12" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Cadência</label>
              <input value={row.cadence} onChange={e => updateRow(row.id, "cadence", e.target.value)} className={`${inputClass} w-full`} placeholder="3-0-1-0" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Carga</label>
              <input value={row.load} onChange={e => updateRow(row.id, "load", e.target.value)} className={`${inputClass} w-full`} placeholder="40kg" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Intervalo</label>
              <input value={row.rest} onChange={e => updateRow(row.id, "rest", e.target.value)} className={`${inputClass} w-full`} placeholder="60" />
            </div>
          </>
        );
      case "notes_only":
        return (
          <div className="flex-1">
            <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Observação</label>
            <input value={row.setsReps} onChange={e => updateRow(row.id, "setsReps", e.target.value)} className={`${inputClass} w-full text-left`} placeholder="Texto livre..." />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-barlow font-bold text-lg">
            {step === "search" ? "Adicionar Exercício" : `Configurar: ${selectedName}`}
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
            {/* Series rows */}
            <div className="space-y-3">
              {series.map((row, idx) => (
                <div key={row.id} className="space-y-2">
                  {/* Type selector per row */}
                  {idx === 0 && (
                    <div>
                      <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">Tipo da série</label>
                      <select
                        value={row.type}
                        onChange={e => {
                          const newType = e.target.value;
                          setSeries(prev => prev.map(r => ({ ...r, type: newType })));
                        }}
                        className="w-full px-2 py-2 text-sm bg-background border border-border rounded font-dm focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {SERIES_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Fields row */}
                  <div className="flex items-end gap-2">
                    <div className="flex items-center text-muted-foreground pt-4">
                      <GripVertical size={14} />
                    </div>
                    {renderRowFields(row)}
                    <button
                      onClick={() => removeRow(row.id)}
                      className="flex items-center justify-center w-8 h-8 text-destructive hover:bg-destructive/10 rounded transition-colors mt-3"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {idx < series.length - 1 && <div className="border-b border-border" />}
                </div>
              ))}
            </div>

            {/* Action buttons row */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={addRow}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-dm border border-primary text-primary rounded-full hover:bg-primary/5 transition-colors"
              >
                <Plus size={12} /> Adicionar série
              </button>
              <button
                onClick={() => setShowMethod(!showMethod)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-dm border border-border text-foreground rounded-full hover:bg-muted transition-colors"
              >
                <Sparkles size={12} /> Adicionar Método
              </button>
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-dm border border-border text-foreground rounded-full hover:bg-muted transition-colors"
              >
                <MessageSquare size={12} /> Adicionar Observação
              </button>
              <button
                onClick={replicateSeries}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-dm border border-border text-foreground rounded-full hover:bg-muted transition-colors"
              >
                <Copy size={12} /> Replicar séries
              </button>
            </div>

            {/* Method input */}
            {showMethod && (
              <div>
                <label className="text-xs font-dm font-semibold text-muted-foreground mb-1 block">Método</label>
                <input
                  value={method} onChange={e => setMethod(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: Drop-set, Rest-pause, Bi-set..."
                  autoFocus
                />
              </div>
            )}

            {/* Notes input */}
            {showNotes && (
              <div>
                <label className="text-xs font-dm font-semibold text-muted-foreground mb-1 block">Observação</label>
                <textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px] resize-none"
                  placeholder="Ex: Pegada supinada, cadência 3-0-1..."
                />
              </div>
            )}

            {/* Footer */}
            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setStep("search")} className="font-dm">Cancelar</Button>
              <Button onClick={handleSave} className="font-dm bg-primary hover:bg-primary/90">Salvar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddExerciseDialog;
