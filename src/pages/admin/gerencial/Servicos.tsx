import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Power } from "lucide-react";
import { toast } from "sonner";
import PageShell, { EmptyState, LoadingState, StatusBadge } from "@/components/admin/gerencial/PageShell";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NATURES = ["Receita","Despesa","Outros"];

type Service = any;
const empty: Partial<Service> = {
  description: "", category: "", default_value: 0, financial_nature: "Receita",
  show_on_receipt: true, receipt_only: false, status: "active",
};

export default function Servicos() {
  const [rows, setRows] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Service>>(empty);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("services").select("*").order("description");
    setRows(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const cats = Array.from(new Set(rows.map(r => r.category).filter(Boolean)));
  const filtered = rows.filter(r =>
    (statusFilter === "all" || r.status === statusFilter) &&
    (catFilter === "all" || r.category === catFilter) &&
    r.description?.toLowerCase().includes(search.toLowerCase())
  );

  const save = async () => {
    if (!form.description) { toast.error("Descrição obrigatória"); return; }
    const payload: any = { ...form }; delete payload.id;
    const res = form.id
      ? await supabase.from("services").update(payload).eq("id", form.id)
      : await supabase.from("services").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Salvo!"); setOpen(false); setForm(empty); load();
  };
  const toggleStatus = async (r: Service) => {
    if (!confirm(`${r.status === "active" ? "Inativar" : "Ativar"} serviço?`)) return;
    await supabase.from("services").update({ status: r.status === "active" ? "inactive" : "active" }).eq("id", r.id);
    load();
  };

  return (
    <PageShell
      title="Serviços"
      description="Serviços para cobranças, recibos e contratos."
      primaryAction={<Button onClick={() => { setForm(empty); setOpen(true); }} className="gap-2"><Plus size={16} />Novo serviço</Button>}
      search={{ value: search, onChange: setSearch, placeholder: "Buscar por descrição..." }}
      filters={
        <>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas</SelectItem>{cats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
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
                <tr><th className="px-4 py-3">Descrição</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Valor padrão</th><th className="px-4 py-3">Natureza</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.description}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.category || "—"}</td>
                    <td className="px-4 py-3">R$ {Number(r.default_value || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.financial_nature || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3"><div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => { setForm(r); setOpen(true); }}><Pencil size={14} /></Button>
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
          <DialogHeader><DialogTitle>{form.id ? "Editar serviço" : "Novo serviço"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2"><Label>Descrição</Label><Input value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Categoria</Label><Input value={form.category || ""} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>Valor padrão (R$)</Label><Input type="number" step="0.01" value={form.default_value ?? ""} onChange={e => setForm({ ...form, default_value: Number(e.target.value) })} /></div>
            <div><Label>Natureza</Label>
              <Select value={form.financial_nature || ""} onValueChange={v => setForm({ ...form, financial_nature: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{NATURES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Centro de receita</Label><Input value={form.revenue_center || ""} onChange={e => setForm({ ...form, revenue_center: e.target.value })} /></div>
            <div><Label>Código contábil</Label><Input value={form.accounting_code || ""} onChange={e => setForm({ ...form, accounting_code: e.target.value })} /></div>
            <div><Label>Tipo de tributação</Label><Input value={form.tax_type || ""} onChange={e => setForm({ ...form, tax_type: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={!!form.show_on_receipt} onCheckedChange={v => setForm({ ...form, show_on_receipt: v })} /><Label>Exibir no recibo</Label></div>
            <div className="flex items-center gap-2"><Switch checked={!!form.receipt_only} onCheckedChange={v => setForm({ ...form, receipt_only: v })} /><Label>Somente recibo</Label></div>
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