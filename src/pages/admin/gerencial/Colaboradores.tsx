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

const ROLES = ["Admin","Coordenador","Treinador","Estagiário","Recepção","Comercial","Financeiro","Limpeza","Marketing","Nutricionista","Outro"];

type Profile = { id: string; name: string };
type Collaborator = {
  id: string; full_name: string; photo_url: string | null; email: string | null;
  phone: string | null; cpf: string | null; role_title: string | null;
  permission_profile_id: string | null; hired_at: string | null;
  internal_notes: string | null; status: string;
};

const empty: Partial<Collaborator> = {
  full_name: "", email: "", phone: "", cpf: "", role_title: "", permission_profile_id: null,
  hired_at: "", internal_notes: "", status: "active",
};

export default function Colaboradores() {
  const [rows, setRows] = useState<Collaborator[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [profileFilter, setProfileFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Collaborator>>(empty);

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("collaborators").select("*").order("full_name"),
      supabase.from("permission_profiles").select("id,name").order("name"),
    ]);
    setRows(c || []); setProfiles(p || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r =>
    (statusFilter === "all" || r.status === statusFilter) &&
    (roleFilter === "all" || r.role_title === roleFilter) &&
    (profileFilter === "all" || r.permission_profile_id === profileFilter) &&
    r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const save = async () => {
    if (!form.full_name) { toast.error("Nome é obrigatório"); return; }
    const payload: any = { ...form }; delete payload.id;
    if (!payload.hired_at) payload.hired_at = null;
    if (!payload.permission_profile_id) payload.permission_profile_id = null;
    const res = form.id
      ? await supabase.from("collaborators").update(payload).eq("id", form.id)
      : await supabase.from("collaborators").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Salvo!"); setOpen(false); setForm(empty); load();
  };
  const toggleStatus = async (r: Collaborator) => {
    if (!confirm(`${r.status === "active" ? "Inativar" : "Ativar"} "${r.full_name}"?`)) return;
    await supabase.from("collaborators").update({ status: r.status === "active" ? "inactive" : "active" }).eq("id", r.id);
    load();
  };

  const profileName = (id: string | null) => profiles.find(p => p.id === id)?.name || "—";

  return (
    <PageShell
      title="Colaboradores"
      description="Gestão da equipe da academia."
      primaryAction={<Button onClick={() => { setForm(empty); setOpen(true); }} className="gap-2"><Plus size={16} />Novo colaborador</Button>}
      search={{ value: search, onChange: setSearch, placeholder: "Buscar por nome..." }}
      filters={
        <>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Cargo" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos cargos</SelectItem>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={profileFilter} onValueChange={setProfileFilter}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Permissão" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas permissões</SelectItem>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
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
                <tr><th className="px-4 py-3">Colaborador</th><th className="px-4 py-3">Cargo</th><th className="px-4 py-3">Permissão</th><th className="px-4 py-3">Contato</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.role_title || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{profileName(r.permission_profile_id)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{r.email || r.phone || "—"}</td>
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
          <DialogHeader><DialogTitle>{form.id ? "Editar colaborador" : "Novo colaborador"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2"><Label>Nome completo</Label><Input value={form.full_name || ""} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>E-mail</Label><Input type="email" value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>CPF</Label><Input value={form.cpf || ""} onChange={e => setForm({ ...form, cpf: e.target.value })} /></div>
            <div><Label>Data de entrada</Label><Input type="date" value={form.hired_at || ""} onChange={e => setForm({ ...form, hired_at: e.target.value })} /></div>
            <div><Label>Cargo</Label>
              <Select value={form.role_title || ""} onValueChange={v => setForm({ ...form, role_title: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Permissão</Label>
              <Select value={form.permission_profile_id || ""} onValueChange={v => setForm({ ...form, permission_profile_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Foto (URL)</Label><Input value={form.photo_url || ""} onChange={e => setForm({ ...form, photo_url: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Observações internas</Label><Textarea rows={2} value={form.internal_notes || ""} onChange={e => setForm({ ...form, internal_notes: e.target.value })} /></div>
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