import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (session: { name: string; day_label: string; duration_min: number | null; notes: string }) => void;
};

const DAY_OPTIONS = [
  { value: "segunda", label: "Segunda-feira" },
  { value: "terca", label: "Terça-feira" },
  { value: "quarta", label: "Quarta-feira" },
  { value: "quinta", label: "Quinta-feira" },
  { value: "sexta", label: "Sexta-feira" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
];

const NewSessionDialog = ({ open, onClose, onSave }: Props) => {
  const [name, setName] = useState("");
  const [dayType, setDayType] = useState<"weekday" | "numeric">("weekday");
  const [dayLabel, setDayLabel] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      day_label: dayLabel || null as any,
      duration_min: duration ? parseInt(duration) : null,
      notes: notes.trim() || "",
    });
    setName(""); setDayLabel(""); setDuration(""); setNotes("");
    setDayType("weekday");
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-barlow font-bold text-lg">Nova Sessão de Treino</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-dm font-semibold text-muted-foreground mb-1 block">Nome da Sessão *</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ex: Treino A - Peito e Tríceps"
            />
          </div>

          <div>
            <label className="text-xs font-dm font-semibold text-muted-foreground mb-1 block">Tipo de Frequência</label>
            <div className="flex gap-2">
              <button
                onClick={() => { setDayType("weekday"); setDayLabel(""); }}
                className={`flex-1 py-2 text-xs font-dm font-semibold rounded-lg border transition-colors ${dayType === "weekday" ? "bg-primary text-white border-primary" : "bg-background border-border text-foreground"}`}
              >
                Dia da Semana
              </button>
              <button
                onClick={() => { setDayType("numeric"); setDayLabel(""); }}
                className={`flex-1 py-2 text-xs font-dm font-semibold rounded-lg border transition-colors ${dayType === "numeric" ? "bg-primary text-white border-primary" : "bg-background border-border text-foreground"}`}
              >
                Numérico
              </button>
            </div>
          </div>

          {dayType === "weekday" ? (
            <div>
              <label className="text-xs font-dm font-semibold text-muted-foreground mb-1 block">Dia da Semana</label>
              <select
                value={dayLabel} onChange={e => setDayLabel(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Selecionar...</option>
                {DAY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-xs font-dm font-semibold text-muted-foreground mb-1 block">Número do Treino</label>
              <input
                type="number" min={1} value={dayLabel} onChange={e => setDayLabel(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Ex: 1"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-dm font-semibold text-muted-foreground mb-1 block">Duração (min)</label>
            <input
              type="number" min={1} value={duration} onChange={e => setDuration(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ex: 60"
            />
          </div>

          <div>
            <label className="text-xs font-dm font-semibold text-muted-foreground mb-1 block">Observações</label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ex: Foco em hipertrofia..."
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <Button variant="ghost" onClick={onClose} className="font-dm">Cancelar</Button>
          <Button onClick={handleSave} disabled={!name.trim()} className="font-dm">Criar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewSessionDialog;
