import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  classInfo: { name: string; trainer?: string | null; start_time: string; end_time: string } | null;
  defaultName?: string;
  onConfirm: (data: { studentName: string; muscleGroup: "inferior" | "superior" }) => void | Promise<void>;
};

const CheckInDialog = ({ open, onOpenChange, classInfo, defaultName = "", onConfirm }: Props) => {
  const [group, setGroup] = useState<"inferior" | "superior" | null>(null);
  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);

  // Mantém o nome sincronizado com o usuário logado
  // (quando o dialog reabre após login, defaultName muda)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setName(defaultName); }, [defaultName, open]);

  const reset = () => { setGroup(null); setSaving(false); };

  const handleConfirm = async () => {
    if (!group || !name.trim()) return;
    setSaving(true);
    try {
      await onConfirm({ studentName: name.trim(), muscleGroup: group });
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-barlow">CONFIRMAR CHECK-IN</DialogTitle>
        </DialogHeader>

        {classInfo && (
          <div className="bg-muted/50 rounded-lg p-3 text-xs font-dm">
            <p className="font-semibold text-foreground">{classInfo.name}</p>
            <p className="text-muted-foreground mt-0.5">
              {classInfo.start_time.slice(0, 5)} - {classInfo.end_time.slice(0, 5)}
              {classInfo.trainer ? ` · Prof. ${classInfo.trainer}` : ""}
            </p>
          </div>
        )}

        {name ? (
          <div className="bg-white border border-border rounded-lg px-3 py-2 text-xs font-dm">
            <span className="text-muted-foreground">Aluno: </span>
            <span className="font-semibold text-foreground">{name}</span>
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-xs font-dm">Seu nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Digite seu nome" />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs font-dm">O que vai treinar hoje?</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["inferior", "superior"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroup(g)}
                className={`rounded-xl border-2 py-4 text-sm font-barlow font-bold uppercase tracking-wider transition-colors ${
                  group === g
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-white text-foreground hover:border-primary/40"
                }`}
              >
                {g === "inferior" ? "Inferior" : "Superior"}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!group || !name.trim() || saving}>
            {saving ? "Salvando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckInDialog;