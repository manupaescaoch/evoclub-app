import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type Param = { key: string; label: string; type: string };

type Method = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  params: Param[] | null;
  display_template: string | null;
  is_global: boolean;
  created_by: string | null;
};

const emptyForm = { name: "", description: "", category: "", display_template: "", params: [] as Param[] };

const TreinosMetodos = () => {
  const [methods, setMethods] = useState<Method[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Method | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchMethods = async () => {
    const { data } = await supabase.from("training_methods").select("*").order("name");
    setMethods(((data as any[]) || []).map(m => ({ ...m, params: Array.isArray(m.params) ? m.params : [] })) as Method[]);
  };

  useEffect(() => {
    fetchMethods();
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const isOwner = (m: Method) => !m.is_global && !!m.created_by && m.created_by === userId;

  const term = search.trim().toLowerCase();
  const filtered = methods.filter(m =>
    !term ||
    m.name.toLowerCase().includes(term) ||
    m.description?.toLowerCase().includes(term) ||
    m.category?.toLowerCase().includes(term)
  );

  const groups = Array.from(
    filtered.reduce((acc, m) => {
      const key = m.category || "Outros";
      acc.set(key, [...(acc.get(key) || []), m]);
      return acc;
    }, new Map<string, Method[]>())
  ).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (m: Method) => {
    setEditing(m);
    setForm({
      name: m.name,
      description: m.description || "",
      category: m.category || "",
      display_template: m.display_template || "",
      params: m.params || [],
    });
    setDialogOpen(true);
  };

  const setParam = (i: number, patch: Partial<Param>) =>
    setForm(f => ({ ...f, params: f.params.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) }));

  const addParam = () =>
    setForm(f => ({ ...f, params: [...f.params, { key: "", label: "", type: "number" }] }));

  const removeParam = (i: number) =>
    setForm(f => ({ ...f, params: f.params.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      category: form.category || null,
      display_template: form.display_template || null,
      params: form.params.filter(p => p.key.trim() && p.label.trim()) as any,
    };
    if (editing) {
      const { error } = await supabase.from("training_methods").update(payload).eq("id", editing.id);
      if (error) { toast.error("Não foi possível salvar"); return; }
      toast.success("Método atualizado");
    } else {
      const { error } = await supabase.from("training_methods").insert({ ...payload, is_global: false, created_by: userId });
      if (error) { toast.error("Não foi possível criar"); return; }
      toast.success("Método criado");
    }
    setDialogOpen(false);
    fetchMethods();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este método? Os treinos já prescritos continuam iguais.")) return;
    await supabase.from("training_methods").delete().eq("id", id);
    toast.success("Método removido");
    fetchMethods();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-barlow font-bold text-foreground">Banco de Métodos</h1>
          <p className="text-sm font-dm text-muted-foreground">{methods.length} métodos disponíveis para prescrição</p>
        </div>
        <Button onClick={openCreate} size="sm" className="bg-primary text-primary-foreground shrink-0">
          <Plus className="w-4 h-4 mr-1" /> Novo Método
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, descrição ou categoria..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 font-dm text-sm" />
      </div>

      <div className="space-y-5">
        {groups.map(([category, items]) => (
          <div key={category} className="space-y-2">
            <p className="text-xs font-barlow font-bold uppercase tracking-wider text-muted-foreground">{category} · {items.length}</p>
            {items.map(m => (
              <div key={m.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-barlow font-bold text-sm uppercase tracking-wide text-foreground">{m.name}</span>
                    {m.is_global && <Badge variant="secondary" className="text-[10px] font-dm">Global</Badge>}
                    {isOwner(m) && <Badge variant="outline" className="text-[10px] font-dm">Meu método</Badge>}
                  </div>
                  {m.description && <p className="text-sm font-dm text-muted-foreground leading-snug">{m.description}</p>}
                  {!!m.params?.length && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {m.params.map(p => (
                        <span key={p.key} className="text-[10px] font-dm px-2 py-0.5 rounded-full bg-muted text-foreground/70">{p.label}</span>
                      ))}
                    </div>
                  )}
                  {m.display_template && (
                    <p className="text-[11px] font-dm text-muted-foreground mt-2">
                      No treino: <span className="text-foreground/80">{m.display_template}</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {isOwner(m) && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(m.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground font-dm text-sm">Nenhum método encontrado</p>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-barlow font-bold">{editing ? "Editar Método" : "Novo Método"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="font-dm text-sm">Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="font-dm" /></div>
            <div><Label className="font-dm text-sm">Categoria</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ex: Intensificadores" className="font-dm" /></div>
            <div><Label className="font-dm text-sm">Descrição</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="font-dm" rows={3} /></div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-dm text-sm">Parâmetros configuráveis</Label>
                <Button variant="outline" size="sm" className="h-7 font-dm text-xs" onClick={addParam}>
                  <Plus className="w-3 h-3 mr-1" /> Parâmetro
                </Button>
              </div>
              {form.params.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input value={p.label} onChange={e => setParam(i, { label: e.target.value })} placeholder="Rótulo (ex: Reps)" className="font-dm text-sm" />
                  <Input value={p.key} onChange={e => setParam(i, { key: e.target.value })} placeholder="chave (ex: reps)" className="font-dm text-sm w-32" />
                  <select value={p.type} onChange={e => setParam(i, { type: e.target.value })} className="h-9 rounded-md border border-input bg-background px-2 text-sm font-dm">
                    <option value="number">número</option>
                    <option value="text">texto</option>
                  </select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeParam(i)}><X className="w-3.5 h-3.5" /></Button>
                </div>
              ))}
              {form.params.length === 0 && (
                <p className="text-xs font-dm text-muted-foreground">Nenhum parâmetro. Ex: Drop-set → reps, quedas, redução (%).</p>
              )}
            </div>

            <div>
              <Label className="font-dm text-sm">Como exibir no treino</Label>
              <Input value={form.display_template} onChange={e => setForm(f => ({ ...f, display_template: e.target.value }))} placeholder="{reps} reps + {drops} queda(s) de {drop_pct}%" className="font-dm" />
              <p className="text-[11px] font-dm text-muted-foreground mt-1">Use as chaves dos parâmetros entre chaves para montar a instrução do aluno.</p>
            </div>
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
