import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logSensitive } from "@/lib/audit";
import { GradeSlot, RPC_REASONS } from "@/hooks/useGradeDay";

export default function SlotOverrideDialog({
  open, onOpenChange, slot, dateISO, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slot: GradeSlot | null;
  dateISO: string;
  onSaved: () => void;
}) {
  const [capacity, setCapacity] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!slot) return;
    setCapacity(slot.capacity);
    setBlocked(slot.blocked);
    setReason(slot.reason || "");
  }, [slot, open]);

  if (!slot) return null;

  const save = async () => {
    if (!reason.trim()) { toast.error("Informe o motivo do ajuste."); return; }
    setSaving(true);
    const { data, error } = await supabase.rpc("set_slot_override" as any, {
      _class_id: slot.class_id, _class_date: dateISO,
      _capacity: capacity, _blocked: blocked, _reason: reason.trim(),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    const res = (data || {}) as { ok?: boolean; reason?: string };
    if (!res.ok) { toast.error(RPC_REASONS[res.reason || ""] || "Não foi possível salvar."); return; }
    await logSensitive({
      entity: "class_slot_overrides", entity_id: slot.class_id, module: "grade",
      unit_id: slot.unit_id,
      description: `Ajuste de vagas/bloqueio no horário ${slot.start_time.slice(0, 5)} em ${dateISO}`,
      before: { capacity: slot.capacity, blocked: slot.blocked, reason: slot.reason },
      after: { capacity, blocked, reason: reason.trim() },
    });
    toast.success("Horário atualizado.");
    onOpenChange(false);
    onSaved();
  };

  const clearOverride = async () => {
    setSaving(true);
    const { data, error } = await supabase.rpc("clear_slot_override" as any, {
      _class_id: slot.class_id, _class_date: dateISO,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    const res = (data || {}) as { ok?: boolean; reason?: string };
    if (!res.ok) { toast.error(RPC_REASONS[res.reason || ""] || "Não foi possível remover."); return; }
    await logSensitive({
      entity: "class_slot_overrides", entity_id: slot.class_id, module: "grade", unit_id: slot.unit_id,
      description: `Remoção do ajuste temporário do horário ${slot.start_time.slice(0, 5)} em ${dateISO}`,
      before: { capacity: slot.capacity, blocked: slot.blocked, reason: slot.reason },
      after: null,
    });
    toast.success("Ajuste removido.");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-barlow">AJUSTAR HORÁRIO · {slot.start_time.slice(0, 5)}</DialogTitle>
          <DialogDescription className="font-dm text-xs">
            Vale apenas para {dateISO.split("-").reverse().join("/")}. Ação registrada em auditoria.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Vagas para esta data</Label>
            <Input type="number" min={slot.booked} value={capacity}
              onChange={e => setCapacity(Number(e.target.value))} />
            <p className="text-[11px] text-muted-foreground font-dm mt-1">
              {slot.booked} aluno(s) já agendado(s). Capacidade padrão da aula: {slot.capacity_override != null ? "ajustada" : slot.capacity}.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-dm font-semibold">Bloquear horário</p>
              <p className="text-[11px] text-muted-foreground font-dm">Impede novos agendamentos e lista de espera.</p>
            </div>
            <Switch checked={blocked} onCheckedChange={setBlocked} />
          </div>
          <div>
            <Label className="text-xs">Motivo (obrigatório)</Label>
            <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Ex.: manutenção do ar-condicionado" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {(slot.capacity_override != null || slot.blocked) && (
            <Button variant="outline" onClick={clearOverride} disabled={saving}>Remover ajuste</Button>
          )}
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}