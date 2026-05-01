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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = ["Serviços gerais","Energia","Contabilidade","Marketing","Equipamentos","Suplementos","Limpeza","Manutenção","Tecnologia","Jurídico","Outro"];

type Supplier = any;
const empty: Partial<Supplier> = { name: "", status: "active" };

export default function Fornecedores() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Supplier>>(empty);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("suppliers").select("*").order("name");
    setRows(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r =>
    (statusFilter === "all" || r.status === statusFilter) &&
    (catFilter === "all" || r.category === catFilter) &&
    (r.name?.toLowerCase().includes(search.toLowerCase()) ||
     r.cnpj?.toLowerCase().includes(search.toLowerCase()) ||
     r.responsible?.toLowerCase().includes(search.toLowerCase()))
  );

  const save = async () => {
    if (!form.name) { toast.error("Nome é obrigatório"); return; }
    const payload: any = { ...form }; delete payload.id;
    const res = form.id
      ? await supabase.from("suppliers").update(payload).eq("id", form.id)
      : await supabase.from("suppliers").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Salvo!"); setOpen(false); setForm(empty); load();
  };
  const toggleStatus = async (r: Supplier) => {
    if (!confirm(`${r.status === "active" ? "Inativar" : "Ativar"} "${r.name}"?`)) return;
    await supabase.from("suppliers").update({ status: r.status === "active" ? "inactive" : "active" }).eq("id", r.id);
    load();
  };

  return (
    <PageShell
      title="Fornecedores"
      description="Cadastro e gestão de fornecedores."
      primaryAction={<Button onClick={() => { setForm(empty); setOpen(true); }} className="gap-2"><Plus size={16} />Novo fornecedor</Button>}
      search={{ value: search, onChange: setSearch, placeholder: "Buscar por nome, CNPJ ou responsável..." }}
      filters={
        <>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas categorias</SelectItem>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
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
                <tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Responsável</th><th className="px-4 py-3">Telefone</th><th className="px-4 py-3">E-mail</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.category || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.responsible || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.phone || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{r.email || "—"}</td>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2"><Label>Nome</Label><Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>CNPJ</Label><Input value={form.cnpj || ""} onChange={e => setForm({ ...form, cnpj: e.target.value })} /></div>
            <div><Label>Categoria</Label>
              <Select value={form.category || ""} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Responsável</Label><Input value={form.responsible || ""} onChange={e => setForm({ ...form, responsible: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>E-mail</Label><Input type="email" value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Site</Label><Input value={form.website || ""} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
            <div><Label>CEP</Label><Input value={form.zip_code || ""} onChange={e => setForm({ ...form, zip_code: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Endereço</Label><Input value={form.address || ""} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Número</Label><Input value={form.number || ""} onChange={e => setForm({ ...form, number: e.target.value })} /></div>
            <div><Label>Complemento</Label><Input value={form.complement || ""} onChange={e => setForm({ ...form, complement: e.target.value })} /></div>
            <div><Label>Bairro</Label><Input value={form.neighborhood || ""} onChange={e => setForm({ ...form, neighborhood: e.target.value })} /></div>
            <div><Label>Cidade</Label><Input value={form.city || ""} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
            <div><Label>UF</Label><Input value={form.state || ""} maxLength={2} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
            <div><Label>Banco</Label><Input value={form.bank || ""} onChange={e => setForm({ ...form, bank: e.target.value })} /></div>
            <div><Label>Agência</Label><Input value={form.bank_agency || ""} onChange={e => setForm({ ...form, bank_agency: e.target.value })} /></div>
            <div><Label>Conta</Label><Input value={form.bank_account || ""} onChange={e => setForm({ ...form, bank_account: e.target.value })} /></div>
            <div><Label>Pix</Label><Input value={form.pix_key || ""} onChange={e => setForm({ ...form, pix_key: e.target.value })} /></div>
            <div><Label>Comissão %</Label><Input type="number" value={form.commission ?? ""} onChange={e => setForm({ ...form, commission: Number(e.target.value) })} /></div>
            <div><Label>Prazo mínimo (dias)</Label><Input type="number" value={form.min_delivery_days ?? ""} onChange={e => setForm({ ...form, min_delivery_days: Number(e.target.value) })} /></div>
            <div className="md:col-span-3"><Label>Observações</Label><Textarea rows={2} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
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