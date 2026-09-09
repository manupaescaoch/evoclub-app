import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { todayISO } from "@/lib/finance";
import { logCreate, logUpdate } from "@/lib/audit";
import { Tx, TX_STATUS, PAYMENT_METHODS, RECURRENCES, nextDate } from "@/lib/txUtils";
import type { Cat, Ref } from "@/hooks/useTransacoesLedger";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tx: Partial<Tx> | null;
  groups: Ref[];
  categories: Cat[];
  accounts: Ref[];
  suppliers: Ref[];
  units: { id: string; name: string }[];
  defaultUnit: string | null;
  onSaved: () => void;
};

const select = "w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-dm";

const TxFormDialog = ({ open, onOpenChange, tx, groups, categories, accounts, suppliers, units, defaultUnit, onSaved }: Props) => {
  const [f, setF] = useState<Partial<Tx>>({});
  const [recur, setRecur] = useState("");
  const [repeats, setRepeats] = useState(12);
  const [customDays, setCustomDays] = useState(30);
  const [scope, setScope] = useState<"one" | "next" | "all">("one");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF({
      kind: "income",
      date: todayISO(),
      due_date: todayISO(),
      status: "paid",
      amount: 0,
      fees: 0,
      discount: 0,
      unit_id: defaultUnit,
      ...(tx || {}),
    });
    setRecur("");
    setScope("one");
    setFile(null);
  }, [open, tx, defaultUnit]);

  const cats = useMemo(
    () => categories.filter((c) => (!f.group_id || c.group_id === f.group_id) && (!c.kind || c.kind === f.kind)),
    [categories, f.group_id, f.kind],
  );

  const upload = async (id: string) => {
    if (!file) return null;
    const path = `${id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("financeiro").upload(path, file);
    if (error) { toast.error("Falha ao anexar comprovante"); return null; }
    return path;
  };

  const save = async () => {
    if (!f.description || !Number(f.amount) || !f.date || !f.unit_id || !f.status || !f.kind) {
      toast.error("Preencha tipo, descrição, valor, data, unidade e status");
      return;
    }
    setSaving(true);
    const cat = categories.find((c) => c.id === f.category_id);
    const base: any = {
      unit_id: f.unit_id,
      date: f.date,
      due_date: f.due_date || f.date,
      paid_at: f.status === "paid" ? f.paid_at || f.date : null,
      description: f.description,
      kind: f.kind,
      amount: Number(f.amount),
      fees: Number(f.fees) || 0,
      discount: Number(f.discount) || 0,
      net_amount: Number(f.amount) - (Number(f.fees) || 0) - (Number(f.discount) || 0),
      group_id: f.group_id || null,
      category_id: f.category_id || null,
      category_name: cat?.name || f.category_name || null,
      payment_method: f.payment_method || null,
      status: f.status,
      supplier_id: f.supplier_id || null,
      client_id: f.client_id || null,
      bank_account_id: f.bank_account_id || null,
      cost_center: f.cost_center || null,
      notes: f.notes || null,
      source: f.source || "manual",
    };

    if (f.id) {
      let ids = [f.id];
      if (f.recurrence_group && scope !== "one") {
        let q = supabase.from("transactions").select("id,date").eq("recurrence_group", f.recurrence_group).is("deleted_at", null);
        if (scope === "next") q = q.gte("date", f.date as string);
        const { data } = await q;
        ids = (data || []).map((r: any) => r.id);
      }
      const patch = { ...base };
      if (ids.length > 1) { delete patch.date; delete patch.due_date; delete patch.paid_at; }
      const { error } = await supabase.from("transactions").update(patch).in("id", ids);
      if (error) { toast.error(error.message); setSaving(false); return; }
      const path = await upload(f.id);
      if (path) await supabase.from("transactions").update({ receipt_url: path }).eq("id", f.id);
      logUpdate("transaction", f.id, `Lançamento atualizado: ${f.description}`, base, f.unit_id, "financeiro");
      toast.success(ids.length > 1 ? `${ids.length} lançamentos atualizados` : "Lançamento atualizado");
    } else {
      const group = recur ? crypto.randomUUID() : null;
      const n = recur ? Math.max(1, Math.min(60, repeats)) : 1;
      const payload = Array.from({ length: n }, (_, i) => ({
        ...base,
        date: nextDate(base.date, recur || "monthly", i, customDays),
        due_date: nextDate(base.due_date, recur || "monthly", i, customDays),
        paid_at: i === 0 ? base.paid_at : null,
        status: i === 0 ? base.status : "pending",
        recurrence: recur || null,
        recurrence_group: group,
      }));
      const { data, error } = await supabase.from("transactions").insert(payload).select("id");
      if (error) { toast.error(error.message); setSaving(false); return; }
      const newId = (data || [])[0]?.id;
      if (newId) {
        const path = await upload(newId);
        if (path) await supabase.from("transactions").update({ receipt_url: path }).eq("id", newId);
        logCreate("transaction", newId, `Lançamento criado: ${f.description}`, base, f.unit_id, "financeiro");
      }
      toast.success(n > 1 ? `${n} lançamentos criados` : "Lançamento criado");
    }
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{f.id ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Tipo *</Label>
            <select className={select} value={f.kind || "income"} onChange={(e) => setF({ ...f, kind: e.target.value, category_id: null })}>
              <option value="income">Entrada</option>
              <option value="expense">Saída</option>
            </select>
          </div>
          <div>
            <Label>Status *</Label>
            <select className={select} value={f.status || "paid"} onChange={(e) => setF({ ...f, status: e.target.value })}>
              {TX_STATUS.filter((s) => s.value !== "overdue").map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição *</Label>
            <Input value={f.description || ""} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <div>
            <Label>Valor *</Label>
            <Input type="number" step="0.01" value={f.amount ?? 0} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Data *</Label>
            <Input type="date" value={f.date || ""} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </div>
          <div>
            <Label>Competência *</Label>
            <Input type="date" value={f.due_date || ""} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
          </div>
          <div>
            <Label>Data de pagamento</Label>
            <Input type="date" value={f.paid_at || ""} onChange={(e) => setF({ ...f, paid_at: e.target.value })} />
          </div>
          <div>
            <Label>Unidade *</Label>
            <select className={select} value={f.unit_id || ""} onChange={(e) => setF({ ...f, unit_id: e.target.value })}>
              <option value="">Selecione</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Conta *</Label>
            <select className={select} value={f.bank_account_id || ""} onChange={(e) => setF({ ...f, bank_account_id: e.target.value || null })}>
              <option value="">Selecione</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Grupo *</Label>
            <select className={select} value={f.group_id || ""} onChange={(e) => setF({ ...f, group_id: e.target.value || null, category_id: null })}>
              <option value="">Selecione</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Categoria *</Label>
            <select className={select} value={f.category_id || ""} onChange={(e) => setF({ ...f, category_id: e.target.value || null })}>
              <option value="">Selecione</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Forma de pagamento</Label>
            <select className={select} value={f.payment_method || ""} onChange={(e) => setF({ ...f, payment_method: e.target.value || null })}>
              <option value="">—</option>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label>Fornecedor</Label>
            <select className={select} value={f.supplier_id || ""} onChange={(e) => setF({ ...f, supplier_id: e.target.value || null })}>
              <option value="">—</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Cliente (código)</Label>
            <Input type="number" value={f.client_id ?? ""} onChange={(e) => setF({ ...f, client_id: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div>
            <Label>Taxas</Label>
            <Input type="number" step="0.01" value={f.fees ?? 0} onChange={(e) => setF({ ...f, fees: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Descontos</Label>
            <Input type="number" step="0.01" value={f.discount ?? 0} onChange={(e) => setF({ ...f, discount: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Centro de custo</Label>
            <Input value={f.cost_center || ""} onChange={(e) => setF({ ...f, cost_center: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Observação</Label>
            <Textarea rows={2} value={f.notes || ""} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Comprovante</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>

          {!f.id && (
            <>
              <div>
                <Label>Recorrência</Label>
                <select className={select} value={recur} onChange={(e) => setRecur(e.target.value)}>
                  <option value="">Lançamento único</option>
                  {RECURRENCES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {recur && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Repetições</Label>
                    <Input type="number" min={1} max={60} value={repeats} onChange={(e) => setRepeats(Number(e.target.value))} />
                  </div>
                  {recur === "custom" && (
                    <div>
                      <Label>Intervalo (dias)</Label>
                      <Input type="number" min={1} value={customDays} onChange={(e) => setCustomDays(Number(e.target.value))} />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {f.id && f.recurrence_group && (
            <div className="sm:col-span-2 rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-semibold font-dm">Este lançamento é recorrente. Aplicar a alteração:</p>
              {([["one", "Somente neste lançamento"], ["next", "Neste e nos próximos"], ["all", "Em toda a recorrência"]] as const).map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 text-xs font-dm cursor-pointer">
                  <input type="radio" checked={scope === v} onChange={() => setScope(v)} />
                  {l}
                </label>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TxFormDialog;
