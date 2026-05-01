import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Copy, Power } from "lucide-react";
import { toast } from "sonner";
import PageShell, { EmptyState, LoadingState, StatusBadge } from "@/components/admin/gerencial/PageShell";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TYPES = ["contrato","servico","matricula","mensalidade","plano","outro"];

type Coupon = any;
const empty: Partial<Coupon> = {
  name: "", code: "", coupon_type: "mensalidade", discount_type: "percent",
  discount_value: 0, status: "active",
};

export default function Cupons() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [validityFilter, setValidityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Coupon>>(empty);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("discount_coupons").select("*").order("name");
    setRows(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const filtered = rows.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (typeFilter !== "all" && r.coupon_type !== typeFilter) return false;
    if (validityFilter === "valid" && r.valid_to && r.valid_to < today) return false;
    if (validityFilter === "expired" && (!r.valid_to || r.valid_to >= today)) return false;
    return r.name?.toLowerCase().includes(search.toLowerCase()) || r.code?.toLowerCase().includes(search.toLowerCase());
  });

  const save = async () => {
    if (!form.name || !form.code) { toast.error("Nome e código obrigatórios"); return; }
    const payload: any = { ...form }; delete payload.id;
    if (!payload.valid_from) payload.valid_from = null;
    if (!payload.valid_to) payload.valid_to = null;
    const res = form.id
      ? await supabase.from("discount_coupons").update(payload).eq("id", form.id)
      : await supabase.from("discount_coupons").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Salvo!"); setOpen(false); setForm(empty); load();
  };
  const duplicate = async (r: Coupon) => {
    const { id, ...rest } = r as any;
    await supabase.from("discount_coupons").insert({ ...rest, name: `${r.name} (cópia)`, code: `${r.code}-COPY-${Date.now().toString(36).slice(-4)}` });
    toast.success("Duplicado"); load();
  };
  const toggleStatus = async (r: Coupon) => {
    if (!confirm(`${r.status === "active" ? "Inativar" : "Ativar"} cupom?`)) return;
    await supabase.from("discount_coupons").update({ status: r.status === "active" ? "inactive" : "active" }).eq("id", r.id);
    load();
  };

  return (
    <PageShell
      title="Cupons de Desconto"
      description="Vouchers, cupons e benefícios promocionais."
      primaryAction={<Button onClick={() => { setForm(empty); setOpen(true); }} className="gap-2"><Plus size={16} />Novo cupom</Button>}
      search={{ value: search, onChange: setSearch, placeholder: "Buscar por nome ou código..." }}
      filters={
        <>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos tipos</SelectItem>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={validityFilter} onValueChange={setValidityFilter}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Validade" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Toda validade</SelectItem><SelectItem value="valid">Válidos</SelectItem><SelectItem value="expired">Vencidos</SelectItem></SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="active">Ativos</SelectItem><SelectItem value="inactive">Inativos</SelectItem></SelectContent>
          </Select>
        </>
      }
    >
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-dm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                <tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Código</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Desconto</th><th className="px-4 py-3">Validade</th><th className="px-4 py-3">Usos</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.coupon_type || "—"}</td>
                    <td className="px-4 py-3">{r.discount_type === "percent" ? `${r.discount_value}%` : `R$ ${Number(r.discount_value).toFixed(2)}`}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{r.valid_to ? new Date(r.valid_to).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-3 text-xs">{r.quantity_used || 0}{r.quantity_available ? `/${r.quantity_available}` : ""}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3"><div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => { setForm(r); setOpen(true); }}><Pencil size={14} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => duplicate(r)}><Copy size={14} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => toggleStatus(r)}><Power size={14} /></Button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar cupom" : "Novo cupom"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Nome</Label><Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Código</Label><Input value={form.code || ""} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
            <div><Label>Tipo</Label>
              <Select value={form.coupon_type || ""} onValueChange={v => setForm({ ...form, coupon_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Tipo de desconto</Label>
              <Select value={form.discount_type || "percent"} onValueChange={v => setForm({ ...form, discount_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="percent">Percentual</SelectItem><SelectItem value="fixed">Valor fixo</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Valor do desconto</Label><Input type="number" step="0.01" value={form.discount_value ?? ""} onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })} /></div>
            <div><Label>Quantidade disponível</Label><Input type="number" value={form.quantity_available ?? ""} onChange={e => setForm({ ...form, quantity_available: Number(e.target.value) })} /></div>
            <div><Label>Válido de</Label><Input type="date" value={form.valid_from || ""} onChange={e => setForm({ ...form, valid_from: e.target.value })} /></div>
            <div><Label>Válido até</Label><Input type="date" value={form.valid_to || ""} onChange={e => setForm({ ...form, valid_to: e.target.value })} /></div>
            <div><Label>Plano vinculado</Label><Input value={form.linked_plan || ""} onChange={e => setForm({ ...form, linked_plan: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Observações</Label><Textarea rows={2} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}