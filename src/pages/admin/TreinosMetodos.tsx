import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Method = {
  id: string;
  name: string;
  description: string | null;
  is_global: boolean;
};

const TreinosMetodos = () => {
  const [methods, setMethods] = useState<Method[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Method | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(true);

  const fetchMethods = async () => {
    const { data } = await supabase.from("training_methods").select("*").order("name");
    setMethods(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchMethods(); }, []);

  const filtered = methods.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.description?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (m: Method) => {
    setEditing(m);
    setForm({ name: m.name, description: m.description || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (editing) {
      await supabase.from("training_methods").update({ name: form.name, description: form.description || null }).eq("id", editing.id);
      toast.success("Método atualizado");
    } else {
      await supabase.from("training_methods").insert({ name: form.name, description: form.description || null, is_global: false });
      toast.success("Método criado");
    }
    setDialogOpen(false);
    fetchMethods();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("training_methods").delete().eq("id", id);
    toast.success("Método removido");
    fetchMethods();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-barlow font-bold text-foreground">Banco de Métodos</h1>
          <p className="text-sm font-dm text-muted-foreground">Métodos de treino para prescrição</p>
        </div>
        <Button onClick={openCreate} size="sm" className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-1" /> Novo Método
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar método..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 font-dm text-sm" />
      </div>

      <div className="space-y-2">
        {filtered.map(m => (
          <div key={m.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-barlow font-bold text-sm uppercase tracking-wide text-foreground">{m.name}</span>
                {m.is_global && <Badge variant="secondary" className="text-[10px] font-dm">Global</Badge>}
              </div>
              {m.description && <p className="text-sm font-dm text-muted-foreground leading-snug">{m.description}</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}><Pencil className="w-3.5 h-3.5" /></Button>
              {!m.is_global && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(m.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground font-dm text-sm">Nenhum método encontrado</p>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-barlow font-bold">{editing ? "Editar Método" : "Novo Método"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="font-dm text-sm">Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="font-dm" /></div>
            <div><Label className="font-dm text-sm">Descrição</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="font-dm" rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="font-dm">Cancelar</Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground font-dm">{editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TreinosMetodos;
