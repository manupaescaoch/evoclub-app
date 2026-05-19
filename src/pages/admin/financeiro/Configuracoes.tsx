import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useUnit } from "@/contexts/UnitContext";

const Configuracoes = () => {
  const { units } = useUnit();
  const [tab, setTab] = useState<"groups" | "categories" | "units">("groups");
  const [groups, setGroups] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [type, setType] = useState<"group" | "category" | "unit">("group");

  const load = async () => {
    const [g, c] = await Promise.all([
      supabase.from("financial_groups").select("*").order("name"),
      supabase.from("financial_categories").select("*").order("name"),
    ]);
    setGroups(g.data || []); setCats(c.data || []);
  };
  useEffect(() => { load(); }, []);

  const openNew = (t: "group" | "category" | "unit") => {
    setType(t);
    if (t === "group") setForm({ name: "", kind: "expense", color: "#1400FF" });
    if (t === "category") setForm({ name: "", kind: "expense", color: "#1400FF", group_id: "" });
    if (t === "unit") setForm({ name: "", address: "" });
    setOpen(true);
  };

  const save = async () => {
    const table = type === "group" ? "financial_groups" : type === "category" ? "financial_categories" : "units";
    const payload = { ...form };
    if (type === "category" && !payload.group_id) payload.group_id = null;
    if (form.id) {
      const { error } = await supabase.from(table).update(payload).eq("id", form.id);
      if (error) toast.error(error.message); else toast.success("Atualizado");
    } else {
      const { error } = await supabase.from(table).insert(payload);
      if (error) toast.error(error.message); else toast.success("Criado");
    }
    setOpen(false); load();
  };

  const remove = async (t: string, id: string) => {
    if (!confirm("Excluir?")) return;
    await supabase.from(t).delete().eq("id", id);
    load(); toast.success("Excluído");
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl p-2 card-shadow flex gap-2 w-fit">
        {[{ k: "groups", l: "Grupos" }, { k: "categories", l: "Categorias" }, { k: "units", l: "Unidades" }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`px-3 py-1.5 rounded-lg text-xs font-dm ${tab === t.k ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>{t.l}</button>
        ))}
      </div>

      {tab === "groups" && (
        <div className="bg-card rounded-xl card-shadow overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b border-border">
            <p className="text-sm font-dm font-semibold">Grupos financeiros</p>
            <Button size="sm" onClick={() => openNew("group")} className="gap-1.5"><Plus size={14} /> Novo</Button>
          </div>
          <table className="w-full text-xs font-dm">
            <thead><tr className="border-b border-border text-left"><th className="px-3 py-2 text-muted-foreground font-medium">Nome</th><th className="px-3 py-2 text-muted-foreground font-medium">Tipo</th><th className="px-3 py-2 text-muted-foreground font-medium">Cor</th><th className="px-3 py-2"></th></tr></thead>
            <tbody>
              {groups.length === 0 ? <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Nenhum grupo</td></tr> :
                groups.map(g => <tr key={g.id} className="border-b border-border"><td className="px-3 py-2">{g.name}</td><td className="px-3 py-2">{g.kind === "income" ? "Entrada" : "Saída"}</td><td className="px-3 py-2"><span className="inline-block w-4 h-4 rounded" style={{ background: g.color }} /></td><td className="px-3 py-2 text-right"><button onClick={() => { setType("group"); setForm(g); setOpen(true); }} className="p-1"><Pencil size={14} /></button><button onClick={() => remove("financial_groups", g.id)} className="p-1 text-red-500"><Trash2 size={14} /></button></td></tr>)}
            </tbody>
          </table>
        </div>
      )}

      {tab === "categories" && (
        <div className="bg-card rounded-xl card-shadow overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b border-border">
            <p className="text-sm font-dm font-semibold">Categorias</p>
            <Button size="sm" onClick={() => openNew("category")} className="gap-1.5"><Plus size={14} /> Nova</Button>
          </div>
          <table className="w-full text-xs font-dm">
            <thead><tr className="border-b border-border text-left"><th className="px-3 py-2 text-muted-foreground font-medium">Nome</th><th className="px-3 py-2 text-muted-foreground font-medium">Tipo</th><th className="px-3 py-2 text-muted-foreground font-medium">Grupo</th><th className="px-3 py-2"></th></tr></thead>
            <tbody>
              {cats.length === 0 ? <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Nenhuma categoria</td></tr> :
                cats.map(c => <tr key={c.id} className="border-b border-border"><td className="px-3 py-2">{c.name}</td><td className="px-3 py-2">{c.kind === "income" ? "Entrada" : "Saída"}</td><td className="px-3 py-2">{groups.find(g => g.id === c.group_id)?.name || "—"}</td><td className="px-3 py-2 text-right"><button onClick={() => { setType("category"); setForm(c); setOpen(true); }} className="p-1"><Pencil size={14} /></button><button onClick={() => remove("financial_categories", c.id)} className="p-1 text-red-500"><Trash2 size={14} /></button></td></tr>)}
            </tbody>
          </table>
        </div>
      )}

      {tab === "units" && (
        <div className="bg-card rounded-xl card-shadow overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b border-border">
            <p className="text-sm font-dm font-semibold">Unidades</p>
            <Button size="sm" onClick={() => openNew("unit")} className="gap-1.5"><Plus size={14} /> Nova</Button>
          </div>
          <table className="w-full text-xs font-dm">
            <thead><tr className="border-b border-border text-left"><th className="px-3 py-2 text-muted-foreground font-medium">Nome</th><th className="px-3 py-2 text-muted-foreground font-medium">Endereço</th></tr></thead>
            <tbody>{units.map(u => <tr key={u.id} className="border-b border-border"><td className="px-3 py-2">{u.name}</td><td className="px-3 py-2">—</td></tr>)}</tbody>
          </table>
        </div>
      )}

      {form && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} {type === "group" ? "grupo" : type === "category" ? "categoria" : "unidade"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              {(type === "group" || type === "category") && (
                <>
                  <div>
                    <Label>Tipo</Label>
                    <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                      <option value="income">Entrada</option><option value="expense">Saída</option>
                    </select>
                  </div>
                  <div><Label>Cor</Label><Input type="color" value={form.color || "#1400FF"} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
                </>
              )}
              {type === "category" && (
                <div>
                  <Label>Grupo</Label>
                  <select value={form.group_id || ""} onChange={(e) => setForm({ ...form, group_id: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">—</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              )}
              {type === "unit" && <div><Label>Endereço</Label><Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Configuracoes;