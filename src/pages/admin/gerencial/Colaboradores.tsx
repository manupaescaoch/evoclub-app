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
import { Checkbox } from "@/components/ui/checkbox";
import { logCreate, logSensitive } from "@/lib/audit";
import { useUnit } from "@/contexts/UnitContext";

const ROLES = ["Admin","Coordenador","Treinador","Estagiário","Recepção","Comercial","Financeiro","Limpeza","Marketing","Nutricionista","Outro"];

type Profile = { id: string; name: string };
type Collaborator = {
  id: string; full_name: string; photo_url: string | null; email: string | null;
  phone: string | null; cpf: string | null; role_title: string | null;
  permission_profile_id: string | null; hired_at: string | null;
  internal_notes: string | null; status: string;
  auth_user_id: string | null; financial_release: boolean | null; allow_consolidated: boolean | null;
  unit_id: string | null;
};

const empty: Partial<Collaborator> = {
  full_name: "", email: "", phone: "", cpf: "", role_title: "", permission_profile_id: null,
  hired_at: "", internal_notes: "", status: "active",
  financial_release: false, allow_consolidated: false, unit_id: null,
};

export default function Colaboradores() {
  const { units } = useUnit();
  const [rows, setRows] = useState<Collaborator[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [links, setLinks] = useState<{ collaborator_id: string; unit_id: string }[]>([]);
  const [formUnits, setFormUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [profileFilter, setProfileFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Collaborator>>(empty);

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: p }, { data: l }] = await Promise.all([
      supabase.from("collaborators").select("*").order("full_name"),
      supabase.from("permission_profiles").select("id,name").order("name"),
      supabase.from("collaborator_units").select("collaborator_id, unit_id"),
    ]);
    setRows((c || []) as any); setProfiles(p || []); setLinks((l || []) as any); setLoading(false);
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
    const payload: any = { ...form }; delete payload.id; delete payload.created_at; delete payload.updated_at;
    if (!payload.hired_at) payload.hired_at = null;
    if (!payload.permission_profile_id) payload.permission_profile_id = null;
    if (!payload.unit_id) payload.unit_id = null;
    const previous = form.id ? rows.find(r => r.id === form.id) : null;
    const res: any = form.id
      ? await supabase.from("collaborators").update(payload).eq("id", form.id)
      : await supabase.from("collaborators").insert(payload).select("id").maybeSingle();
    if (res.error) { toast.error(res.error.message); return; }
    const savedId = form.id || res.data?.id;

    if (savedId) {
      await supabase.from("collaborator_units").delete().eq("collaborator_id", savedId);
      if (formUnits.length) {
        await supabase.from("collaborator_units").insert(formUnits.map(u => ({ collaborator_id: savedId, unit_id: u })));
      }
    }

    if (form.id) {
      logSensitive({
        entity: "collaborator", entity_id: form.id, module: "gerencial",
        description: `Alterou o colaborador ${form.full_name}`,
        before: previous ? {
          permission_profile_id: previous.permission_profile_id, status: previous.status,
          financial_release: previous.financial_release, allow_consolidated: previous.allow_consolidated,
          auth_user_id: previous.auth_user_id, units: links.filter(l => l.collaborator_id === form.id).map(l => l.unit_id),
        } : null,
        after: {
          permission_profile_id: payload.permission_profile_id, status: payload.status,
          financial_release: payload.financial_release, allow_consolidated: payload.allow_consolidated,
          auth_user_id: payload.auth_user_id, units: formUnits,
        },
      });
    } else {
      logCreate("collaborator", savedId, `Cadastrou o colaborador ${form.full_name}`, { role_title: payload.role_title, units: formUnits }, null, "gerencial");
    }
    toast.success("Salvo!"); setOpen(false); setForm(empty); load();
  };
  const toggleStatus = async (r: Collaborator) => {
    if (!confirm(`${r.status === "active" ? "Inativar" : "Ativar"} "${r.full_name}"?`)) return;
    const next = r.status === "active" ? "inactive" : "active";
    await supabase.from("collaborators").update({ status: next }).eq("id", r.id);
    logSensitive({
      entity: "collaborator", entity_id: r.id, module: "gerencial",
      description: `${next === "active" ? "Ativou" : "Inativou"} o colaborador ${r.full_name}`,
      before: { status: r.status }, after: { status: next },
    });
    load();
  };

  const profileName = (id: string | null) => profiles.find(p => p.id === id)?.name || "—";
  const openNew = () => { setForm(empty); setFormUnits([]); setOpen(true); };
  const openEdit = (r: Collaborator) => {
    setForm(r);
    setFormUnits(links.filter(l => l.collaborator_id === r.id).map(l => l.unit_id));
    setOpen(true);
  };
  const toggleFormUnit = (id: string) =>
    setFormUnits(u => u.includes(id) ? u.filter(x => x !== id) : [...u, id]);

  return (
    <PageShell
      title="Colaboradores"
      description="Gestão da equipe da academia."
      primaryAction={<Button onClick={openNew} className="gap-2"><Plus size={16} />Novo colaborador</Button>}
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
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil size={14} /></Button>
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
            <div className="md:col-span-2"><Label>ID de acesso (auth user id)</Label>
              <Input placeholder="uuid do login do colaborador" value={form.auth_user_id || ""} onChange={e => setForm({ ...form, auth_user_id: e.target.value || null })} />
              <p className="text-xs text-muted-foreground font-dm mt-1">Vincula o login ao colaborador para aplicar permissões e escopo de unidades.</p>
            </div>
            <div className="md:col-span-2">
              <Label>Unidades vinculadas</Label>
              <div className="flex flex-wrap gap-3 mt-1.5">
                {units.map(u => (
                  <label key={u.id} className="flex items-center gap-1.5 text-sm font-dm">
                    <Checkbox checked={formUnits.includes(u.id)} onCheckedChange={() => toggleFormUnit(u.id)} /> {u.name}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground font-dm mt-1">Sem unidades selecionadas, o colaborador vê todas as unidades permitidas pelo perfil.</p>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm font-dm border border-border rounded-lg px-3 py-2">
                <Checkbox checked={!!form.financial_release} onCheckedChange={v => setForm({ ...form, financial_release: !!v })} />
                Liberação financeira
              </label>
              <label className="flex items-center gap-2 text-sm font-dm border border-border rounded-lg px-3 py-2">
                <Checkbox checked={!!form.allow_consolidated} onCheckedChange={v => setForm({ ...form, allow_consolidated: !!v })} />
                Pode ver dados consolidados
              </label>
            </div>
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