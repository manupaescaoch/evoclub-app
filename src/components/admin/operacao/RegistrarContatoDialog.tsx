import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CANAIS, RESULTADOS, registrarContato } from "./actions";
import type { OpRecord } from "./types";

type Colab = { id: string; full_name: string };

export default function RegistrarContatoDialog({
  record, colaboradores, onClose, onDone,
}: { record: OpRecord | null; colaboradores: Colab[]; onClose: () => void; onDone: () => void }) {
  const [channel, setChannel] = useState<string>(CANAIS[0]);
  const [result, setResult] = useState<string>(RESULTADOS[0]);
  const [note, setNote] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    if (!record) return;
    setSaving(true);
    try {
      await registrarContato({
        record, channel, result, note, nextAction, nextFollowUp,
        ownerId: ownerId || null,
        ownerName: colaboradores.find((c) => c.id === ownerId)?.full_name || null,
      });
      toast.success("Contato registrado no histórico.");
      onDone();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível registrar o contato.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-barlow">Registrar contato — {record?.nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-muted-foreground">Canal</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CANAIS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Resultado</Label>
              <Select value={result} onValueChange={setResult}>
                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESULTADOS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Observação</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="mt-1 font-dm" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Próxima ação</Label>
            <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} className="h-9 mt-1 font-dm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-muted-foreground">Próximo follow-up</Label>
              <Input type="date" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Responsável</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Registrar contato"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
