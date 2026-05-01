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

const MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "clientes", label: "Clientes" },
  { key: "grade", label: "Grade" },
  { key: "agenda", label: "Agenda" },
  { key: "crm", label: "CRM" },
  { key: "financeiro", label: "Financeiro" },
  { key: "gerencial", label: "Gerencial" },
  { key: "treinos", label: "Treinos" },
  { key: "avaliacao", label: "Avaliação Física" },
  { key: "administrativo", label: "Administrativo" },
  { key: "configuracoes", label: "Configurações" },
];
const ACTIONS = [
  { key: "view", label: "Ver" },
  { key: "create", label: "Criar" },
  { key: "edit", label: "Editar" },
  { key: "delete", label: "Excluir" },
  { key: "export", label: "Exportar" },
  { key: "approve", label: "Aprovar" },
];

type Profile = {
  id: string; name: string; description: string | null;
  modules: Record<string, string[]>; status: string;
};

const empty: Partial<Profile> = { name: "", description: "", modules: {}, status: "active" };

export default function Permissoes() {
  const [rows, setRows] = useState<Profile[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Profile>>(empty);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("permission_profiles").select("*").order("name"),
      supabase.from("collaborators").select("permission_profile_id"),
    ]);
    setRows((p || []) as any);
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
    const res = form.id
      ? await supabase.from("permission_profiles").update(payload).eq("id", form.id)
      : await supabase.from("permission_profiles").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Salvo!"); setOpen(false); setForm(empty); load();
  };
  const duplicate = async (r: Profile) => {
    const { id, ...rest } = r as any;
    await supabase.from("permission_profiles").insert({ ...rest, name: `${r.name} (cópia)` });
    toast.success("Duplicado"); load();
  };
  const toggleStatus = async (r: Profile) => {
    if (!confirm(`${r.status === "active" ? "Inativar" : "Ativar"} "${r.name}"?`)) return;
    await supabase.from("permission_profiles").update({ status: r.status === "active" ? "inactive" : "active" }).eq("id", r.id);
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