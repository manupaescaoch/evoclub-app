import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { RPC_REASONS, brToday } from "@/hooks/useGradeDay";

type Collab = { id: string; full_name: string };

export default function ConversaoDialog({
  open, onOpenChange, clientId, clientName, trialBookingId, trialProfessorId, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: number | null;
  clientName: string;
  trialBookingId: string | null;
  trialProfessorId: string | null;
  onSaved: () => void;
}) {
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [professor, setProfessor] = useState<string>("");
  const [registrar, setRegistrar] = useState<string>("");
  const [seller, setSeller] = useState<string>("");
  const [value, setValue] = useState<string>("");
  const [date, setDate] = useState<string>(brToday());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProfessor(trialProfessorId || "");
    (async () => {
      const { data } = await supabase.from("collaborators").select("id,full_name").eq("status", "active").order("full_name");
      setCollabs((data as Collab[]) || []);
    })();
  }, [open, trialProfessorId]);

  const save = async () => {
    if (!clientId) return;
    const v = Number(value.replace(",", "."));
    if (!v || v <= 0) { toast.error("Informe o valor da primeira mensalidade."); return; }
    setSaving(true);
    const { data, error } = await supabase.rpc("register_conversion" as any, {
      _client_id: clientId,
      _first_monthly_value: v,
      _trial_booking_id: trialBookingId,
      _trial_professor_id: professor || null,
      _registrar_id: registrar || null,
      _seller_id: seller || null,
      _enrollment_date: date,
      _unit_id: null,
      _notes: null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    const res = (data || {}) as { ok?: boolean; reason?: string; conversion_id?: string };
    if (!res.ok) { toast.error(RPC_REASONS[res.reason || ""] || "Não foi possível registrar."); return; }
    await logAudit({
      action: "create", entity: "enrollment_conversions", entity_id: res.conversion_id, module: "grade",
      description: `Conversão de experimental em matrícula — ${clientName}`,
      metadata: { sensitive: true },
      after: { first_monthly_value: v, professor, registrar, seller, enrollment_date: date },
    });
    toast.success("Conversão registrada e comissões lançadas.");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-barlow">REGISTRAR CONVERSÃO</DialogTitle>
          <DialogDescription className="font-dm text-xs">
            Professor R$ 20,00 · Cadastrador 3% · Vendedor 2% da primeira mensalidade. Um lançamento por papel, sem duplicidade.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Valor da primeira mensalidade (R$)</Label>
            <Input value={value} onChange={e => setValue(e.target.value)} placeholder="Ex.: 199,90" />
          </div>
          <div>
            <Label className="text-xs">Data da matrícula</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          {([["Professor da experimental", professor, setProfessor],
             ["Cadastrador", registrar, setRegistrar],
             ["Vendedor", seller, setSeller]] as const).map(([label, val, set]) => (
            <div key={label}>
              <Label className="text-xs">{label}</Label>
              <select value={val} onChange={e => (set as any)(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm font-dm bg-background">
                <option value="">Não informado</option>
                {collabs.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Registrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}