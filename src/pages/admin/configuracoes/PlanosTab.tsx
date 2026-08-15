import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Save, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";
import { logAudit, logSensitive } from "@/lib/audit";
import { useSettingKey } from "./useSettingKey";

const CYCLES = [
  { v: "mensal", m: 1 }, { v: "bimestral", m: 2 }, { v: "trimestral", m: 3 },
  { v: "quadrimestral", m: 4 }, { v: "semestral", m: 6 }, { v: "anual", m: 12 },
];
const STATUS: Record<string, string> = { active: "Ativo", inactive: "Inativo", discontinued: "Descontinuado" };
const DAYS = [{ i: 1, l: "Seg" }, { i: 2, l: "Ter" }, { i: 3, l: "Qua" }, { i: 4, l: "Qui" }, { i: 5, l: "Sex" }, { i: 6, l: "Sáb" }, { i: 0, l: "Dom" }];

type Plan = any;
const empty: Partial<Plan> = {
  name: "", value: 0, billing_cycle: "mensal", duration_months: 1, weekly_frequency: 3,
  usage_rules: "", restrict_hours: false, allowed_days: [], allowed_start: "", allowed_end: "",
  payment_tolerance_days: 5, status: "active", notes: "",
};

const money = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PlanosTab() {
  const [rows, setRows] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Plan>>(empty);
  const [before, setBefore] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const cfg = useSettingKey("plans", { default_tolerance_days: 5 }, "Planos");

  const load = async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase.from("plans").select("*").order("name");
    if (error) setError(error.message); else setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (patch: Partial<Plan>) => setForm(f => ({ ...f, ...patch }));

  const openNew = () => { setForm({ ...empty, payment_tolerance_days: cfg.value.default_tolerance_days ?? 5 }); setBefore(null); setOpen(true); };
  const openEdit = (r: Plan) => {
    setForm({ ...r, allowed_start: r.allowed_start || "", allowed_end: r.allowed_end || "" });
    setBefore(r); setOpen(true);
  };

  const save = async () => {
    if (!form.name?.trim()) return toast.error("Informe o nome do plano");
    setSaving(true);
    const payload: any = {
      name: form.name!.trim(),
      value: Number(form.value || 0),
      billing_cycle: form.billing_cycle,
      duration_months: Number(form.duration_months || 1),
      weekly_frequency: form.weekly_frequency ? Number(form.weekly_frequency) : null,
      usage_rules: form.usage_rules || null,
      restrict_hours: !!form.restrict_hours,
      allowed_days: form.allowed_days || [],
      allowed_start: form.restrict_hours && form.allowed_start ? form.allowed_start : null,
      allowed_end: form.restrict_hours && form.allowed_end ? form.allowed_end : null,
      payment_tolerance_days: Number(form.payment_tolerance_days ?? 5),
      status: form.status || "active",
      notes: form.notes || null,
    };
    const res = form.id
      ? await supabase.from("plans").update(payload).eq("id", form.id)
      : await supabase.from("plans").insert(payload).select("id").single();
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    const id = form.id || (res as any).data?.id;
    if (form.id) {
      logSensitive({ entity: "plan", entity_id: id, module: "configuracoes", description: `Alterou o plano ${payload.name}`, before, after: payload });
    } else {
      logAudit({ action: "create", entity: "plan", entity_id: id, module: "configuracoes", description: `Criou o plano ${payload.name}`, after: payload });
    }
    toast.success("Plano salvo"); setOpen(false); load();
  };

  const toggleDay = (i: number) => {
    const cur: number[] = form.allowed_days || [];
    set({ allowed_days: cur.includes(i) ? cur.filter(d => d !== i) : [...cur, i] });
  };

  const field = (label: string, node: React.ReactNode, hint?: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-dm text-muted-foreground">{label}</Label>
      {node}
      {hint && <p className="text-[11px] text-muted-foreground font-dm">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl card-shadow p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-primary" />
          <div>
            <p className="font-barlow font-bold text-base">Tolerância padrão de pagamento</p>
            <p className="text-xs text-muted-foreground font-dm">Vale para alunos sem plano cadastrado aqui. Cada plano pode ter regra própria.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-dm text-muted-foreground">Dias corridos de tolerância</Label>
            <Input type="number" min={0} className="w-40" value={cfg.value.default_tolerance_days ?? 5}
              onChange={e => cfg.set({ default_tolerance_days: Number(e.target.value) })} />
          </div>
          <Button disabled={cfg.saving} onClick={cfg.save} className="gap-1.5"><Save size={14} /> Salvar</Button>
        </div>
      </div>

      <div className="bg-card rounded-xl card-shadow p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-barlow font-bold text-base">Planos</p>
          <Button onClick={openNew} className="gap-1.5"><Plus size={14} /> Novo plano</Button>
        </div>

        {loading ? <LoadingState />
          : error ? <p className="text-sm font-dm text-red-600">Erro ao carregar planos: {error}</p>
          : !rows.length ? <EmptyState message="Nenhum plano cadastrado ainda." />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-dm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="py-2 pr-3">Plano</th><th className="py-2 pr-3">Valor</th>
                    <th className="py-2 pr-3">Vigência</th><th className="py-2 pr-3">Horários</th>
                    <th className="py-2 pr-3">Tolerância</th><th className="py-2 pr-3">Status</th><th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="py-2.5 pr-3 font-semibold">{r.name}</td>
                      <td className="py-2.5 pr-3">{money(r.value)}</td>
                      <td className="py-2.5 pr-3 capitalize">{r.billing_cycle} · {r.duration_months}m</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {r.restrict_hours ? `${(r.allowed_start || "").slice(0, 5)}–${(r.allowed_end || "").slice(0, 5)}` : "Livre"}
                      </td>
                      <td className="py-2.5 pr-3">{r.payment_tolerance_days} dias</td>
                      <td className="py-2.5 pr-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          r.status === "active" ? "bg-green-100 text-green-700"
                          : r.status === "discontinued" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                          {STATUS[r.status] || r.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil size={14} /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        <p className="text-[11px] text-muted-foreground font-dm">
          O valor do plano alimenta contratos e cobranças — o valor do contrato do aluno continua sendo o registrado no contrato assinado.
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-barlow">{form.id ? "Editar plano" : "Novo plano"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field("Nome", <Input value={form.name || ""} onChange={e => set({ name: e.target.value })} placeholder="EVO 3x semana" />)}
              {field("Valor mensal (R$)", <Input type="number" step="0.01" min={0} value={form.value ?? 0} onChange={e => set({ value: e.target.value })} />)}
              {field("Vigência", (
                <select value={form.billing_cycle} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  onChange={e => {
                    const c = CYCLES.find(x => x.v === e.target.value);
                    set({ billing_cycle: e.target.value, duration_months: c?.m ?? form.duration_months });
                  }}>
                  {CYCLES.map(c => <option key={c.v} value={c.v} className="capitalize">{c.v}</option>)}
                  <option value="outro">outro</option>
                </select>
              ))}
              {field("Duração (meses)", <Input type="number" min={1} value={form.duration_months ?? 1} onChange={e => set({ duration_months: e.target.value })} />)}
              {field("Frequência semanal", <Input type="number" min={1} max={7} value={form.weekly_frequency ?? ""} onChange={e => set({ weekly_frequency: e.target.value })} />)}
              {field("Tolerância de atraso (dias)", <Input type="number" min={0} value={form.payment_tolerance_days ?? 5} onChange={e => set({ payment_tolerance_days: e.target.value })} />, "Após esse prazo o aluno é bloqueado.")}
              {field("Status", (
                <select value={form.status} onChange={e => set({ status: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="active">Ativo</option><option value="inactive">Inativo</option><option value="discontinued">Descontinuado</option>
                </select>
              ))}
            </div>

            {field("Regras de uso", <textarea rows={3} value={form.usage_rules || ""} onChange={e => set({ usage_rules: e.target.value })}
              className="w-full rounded-md border border-input bg-background p-3 text-sm font-dm" placeholder="Ex: 3 treinos por semana, sem congelamento." />)}

            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-dm font-semibold">Restringir horários de treino</p>
                  <p className="text-[11px] text-muted-foreground font-dm">Limita os horários em que o aluno deste plano pode agendar.</p>
                </div>
                <Switch checked={!!form.restrict_hours} onCheckedChange={b => set({ restrict_hours: b })} />
              </div>
              {form.restrict_hours && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {field("Das", <Input type="time" value={(form.allowed_start || "").slice(0, 5)} onChange={e => set({ allowed_start: e.target.value })} />)}
                    {field("Até", <Input type="time" value={(form.allowed_end || "").slice(0, 5)} onChange={e => set({ allowed_end: e.target.value })} />)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(d => {
                      const on = (form.allowed_days || []).includes(d.i);
                      return (
                        <button key={d.i} type="button" onClick={() => toggleDay(d.i)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-dm border ${on ? "bg-primary text-white border-primary" : "border-border text-muted-foreground"}`}>
                          {d.l}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {field("Observações", <Input value={form.notes || ""} onChange={e => set({ notes: e.target.value })} />)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={saving} onClick={save} className="gap-1.5"><Save size={14} /> Salvar plano</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
