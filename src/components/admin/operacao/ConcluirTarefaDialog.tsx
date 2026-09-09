import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { concluirTarefa } from "./actions";
import type { Tarefa } from "./types";

export default function ConcluirTarefaDialog({
  tarefa, onClose, onDone,
}: { tarefa: Tarefa | null; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    if (!tarefa) return;
    if (tarefa.requiresEvidence && !file) {
      toast.error("Esta tarefa exige o envio de uma evidência.");
      return;
    }
    setSaving(true);
    try {
      await concluirTarefa({ id: tarefa.id, note, file });
      toast.success("Tarefa concluída.");
      onDone();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível concluir a tarefa.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!tarefa} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-barlow">Concluir tarefa</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm font-dm">{tarefa?.titulo}</p>
          <div>
            <Label className="text-[11px] text-muted-foreground">Observação (opcional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="mt-1 font-dm" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">
              Evidência {tarefa?.requiresEvidence ? "(obrigatória)" : "(opcional)"}
            </Label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 font-dm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Concluir"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
