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
import { Checkbox } from "@/components/ui/checkbox";
import { logSensitive, logCreate } from "@/lib/audit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

const MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "clientes", label: "Clientes" },
  { key: "grade", label: "Grade" },
  { key: "crm", label: "CRM" },
  { key: "financeiro", label: "Financeiro" },
  { key: "gerencial", label: "Gerencial" },
  { key: "treinos", label: "Treinos" },
  { key: "avaliacao", label: "Avaliação Física" },
  { key: "equipe", label: "Equipe" },
  { key: "operacional", label: "Operacional" },
  { key: "ocorrencias", label: "Ocorrências" },
  { key: "club", label: "EVO Club" },
  { key: "comunidade", label: "Comunidade" },
  { key: "configuracoes", label: "Configurações" },
];
const ACTIONS = [
  { key: "view", label: "Ver" },
  { key: "create", label: "Criar" },
  { key: "edit", label: "Editar" },
  { key: "delete", label: "Excluir" },
  { key: "sensitive", label: "Sensível" },
];

type Profile = {
  id: string; name: string; description: string | null;
  modules: Record<string, string[]>; status: string;
};
type Override = {
  id: string; collaborator_id: string; module: string;
  actions: string[]; mode: string; notes: string | null;
};
type Collab = { id: string; full_name: string; permission_profile_id: string | null };

const empty: Partial<Profile> = { name: "", description: "", modules: {}, status: "active" };

export default function Permissoes() {
  const [rows, setRows] = useState<Profile[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Profile>>(empty);
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [exOpen, setExOpen] = useState(false);
  const [exForm, setExForm] = useState<{ collaborator_id: string; module: string; actions: string[]; mode: string; notes: string }>({
    collaborator_id: "", module: "clientes", actions: [], mode: "grant", notes: "",
  });

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: c }, { data: o }] = await Promise.all([
      supabase.from("permission_profiles").select("*").order("name"),
      supabase.from("collaborators").select("id, full_name, permission_profile_id").order("full_name"),
      supabase.from("permission_overrides").select("*").order("created_at", { ascending: false }),
    ]);
    setRows((p || []) as any);
    setCollabs((c || []) as any);
    setOverrides((o || []) as any);
    const cnt: Record<string, number> = {};
    (c || []).forEach((x: any) => { if (x.permission_profile_id) cnt[x.permission_profile_id] = (cnt[x.permission_profile_id] || 0) + 1; });
    setCounts(cnt);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  const toggleAction = (modKey: string, actKey: string) => {
    const mods = { ...(form.modules || {}) } as Record<string, string[]>;
    const cur = mods[modKey] || [];
    mods[modKey] = cur.includes(actKey) ? cur.filter(a => a !== actKey) : [...cur, actKey];
    if (mods[modKey].length === 0) delete mods[modKey];
    setForm({ ...form, modules: mods });
  };
  const isChecked = (modKey: string, actKey: string) => (form.modules?.[modKey] || []).includes(actKey);

  const save = async () => {
    if (!form.name) { toast.error("Nome obrigatório"); return; }
    const payload: any = { ...form }; delete payload.id;
    const previous = form.id ? rows.find(r => r.id === form.id) : null;
    const res = form.id
      ? await supabase.from("permission_profiles").update(payload).eq("id", form.id)
      : await supabase.from("permission_profiles").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    if (form.id) {
      logSensitive({
        entity: "permission_profile", entity_id: form.id, module: "gerencial",
        description: `Alterou o perfil de permissão "${form.name}"`,
        before: previous ? { name: previous.name, status: previous.status, modules: previous.modules } : null,
        after: { name: payload.name, status: payload.status, modules: payload.modules },
      });
    } else {
      logCreate("permission_profile", null, `Criou o perfil de permissão "${form.name}"`, { modules: payload.modules }, null, "gerencial");
    }
    toast.success("Salvo!"); setOpen(false); setForm(empty); load();
  };
  const duplicate = async (r: Profile) => {
    const { id, ...rest } = r as any;
    await supabase.from("permission_profiles").insert({ ...rest, name: `${r.name} (cópia)` });
    toast.success("Duplicado"); load();
  };
  const toggleStatus = async (r: Profile) => {
    if (!confirm(`${r.status === "active" ? "Inativar" : "Ativar"} "${r.name}"?`)) return;
    const next = r.status === "active" ? "inactive" : "active";
    await supabase.from("permission_profiles").update({ status: next }).eq("id", r.id);
    logSensitive({
      entity: "permission_profile", entity_id: r.id, module: "gerencial",
      description: `${next === "active" ? "Ativou" : "Inativou"} o perfil "${r.name}"`,
      before: { status: r.status }, after: { status: next },
    });
    load();
  };

  const collabName = (id: string) => collabs.find(c => c.id === id)?.full_name || "—";
  const moduleLabel = (k: string) => MODULES.find(m => m.key === k)?.label || k;

  const toggleExAction = (a: string) => setExForm(f => ({
    ...f, actions: f.actions.includes(a) ? f.actions.filter(x => x !== a) : [...f.actions, a],
  }));

  const saveOverride = async () => {
    if (!exForm.collaborator_id || exForm.actions.length === 0) { toast.error("Selecione colaborador e ações"); return; }
    const { error } = await supabase.from("permission_overrides").insert({
      collaborator_id: exForm.collaborator_id, module: exForm.module,
      actions: exForm.actions, mode: exForm.mode, notes: exForm.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    logSensitive({
      entity: "permission_override", entity_id: exForm.collaborator_id, module: "gerencial",
      description: `${exForm.mode === "grant" ? "Liberou" : "Bloqueou"} ${exForm.actions.join(", ")} em ${moduleLabel(exForm.module)} para ${collabName(exForm.collaborator_id)}`,
      before: null, after: { ...exForm },
    });
    toast.success("Exceção registrada");
    setExOpen(false);
    setExForm({ collaborator_id: "", module: "clientes", actions: [], mode: "grant", notes: "" });
    load();
  };

  const removeOverride = async (o: Override) => {
    if (!confirm("Remover esta exceção?")) return;
    await supabase.from("permission_overrides").delete().eq("id", o.id);
    logSensitive({
      entity: "permission_override", entity_id: o.id, module: "gerencial",
      description: `Removeu exceção de ${moduleLabel(o.module)} de ${collabName(o.collaborator_id)}`,
      before: { module: o.module, actions: o.actions, mode: o.mode }, after: null,
    });
    load();
  };

  return (
    <PageShell
      title="Permissões"
      description="Controle de acesso dos colaboradores às telas e funcionalidades."
      primaryAction={<Button onClick={() => { setForm(empty); setOpen(true); }} className="gap-2"><Plus size={16} />Nova permissão</Button>}
      search={{ value: search, onChange: setSearch, placeholder: "Buscar por nome..." }}
    >
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-dm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                <tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Descrição</th><th className="px-4 py-3">Colaboradores</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-md truncate">{r.description || "—"}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{counts[r.id] || 0}</span></td>
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

      {/* Exceções individuais */}
      <div className="bg-card border border-border rounded-xl mt-5 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h3 className="font-barlow font-bold text-base">Exceções individuais</h3>
            <p className="text-xs text-muted-foreground font-dm">Liberações ou bloqueios pontuais que sobrepõem o perfil do colaborador.</p>
          </div>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setExOpen(true)}><Plus size={14} />Nova exceção</Button>
        </div>
        {overrides.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground font-dm">Nenhuma exceção cadastrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-dm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                <tr><th className="px-4 py-3">Colaborador</th><th className="px-4 py-3">Módulo</th><th className="px-4 py-3">Ações</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3 text-right">—</th></tr>
              </thead>
              <tbody>
                {overrides.map(o => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{collabName(o.collaborator_id)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{moduleLabel(o.module)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{(o.actions || []).join(", ")}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${o.mode === "grant" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                        {o.mode === "grant" ? "Liberação" : "Bloqueio"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => removeOverride(o)}><Trash2 size={14} /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={exOpen} onOpenChange={setExOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova exceção individual</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Colaborador</Label>
              <Select value={exForm.collaborator_id} onValueChange={v => setExForm({ ...exForm, collaborator_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{collabs.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Módulo</Label>
                <Select value={exForm.module} onValueChange={v => setExForm({ ...exForm, module: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MODULES.map(m => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Tipo</Label>
                <Select value={exForm.mode} onValueChange={v => setExForm({ ...exForm, mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="grant">Liberação</SelectItem><SelectItem value="deny">Bloqueio</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Ações</Label>
              <div className="flex flex-wrap gap-3 mt-1.5">
                {ACTIONS.map(a => (
                  <label key={a.key} className="flex items-center gap-1.5 text-sm font-dm">
                    <Checkbox checked={exForm.actions.includes(a.key)} onCheckedChange={() => toggleExAction(a.key)} /> {a.label}
                  </label>
                ))}
              </div>
            </div>
            <div><Label>Justificativa</Label><Textarea rows={2} value={exForm.notes} onChange={e => setExForm({ ...exForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExOpen(false)}>Cancelar</Button>
            <Button onClick={saveOverride}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar permissão" : "Nova permissão"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><Label>Nome</Label><Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Descrição</Label><Textarea rows={1} value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm font-dm">
                <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Módulo</th>
                    {ACTIONS.map(a => <th key={a.key} className="px-3 py-2 text-center">{a.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map(m => (
                    <tr key={m.key} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{m.label}</td>
                      {ACTIONS.map(a => (
                        <td key={a.key} className="px-3 py-2 text-center">
                          <Checkbox checked={isChecked(m.key, a.key)} onCheckedChange={() => toggleAction(m.key, a.key)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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