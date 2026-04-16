import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dumbbell, FolderPlus } from "lucide-react";
import { Search, Plus, FolderOpen, MoreVertical, ArrowLeft, Pencil, Trash2, Copy } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const CATEGORIES = ["Masculino", "Feminino", "Iniciante", "Intermediário", "Avançado", "Funcional", "Hipertrofia", "Emagrecimento"];

type Template = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  created_at: string;
};

const TreinosFichas = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState({ name: "", category: "", description: "" });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloneTarget, setCloneTarget] = useState<Template | null>(null);
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [addChooserOpen, setAddChooserOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");

  const fetchTemplates = async () => {
    const { data } = await supabase.from("workout_templates").select("*").order("created_at", { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  };

  const fetchClients = async () => {
    const { data } = await supabase.from("clients").select("id, name").order("name");
    setClients(data || []);
  };

  useEffect(() => { fetchTemplates(); fetchClients(); }, []);

  const categories = [...new Set(templates.map(t => t.category).filter(Boolean))] as string[];

  const filteredCategories = (filterCategory === "all" ? categories : categories.filter(c => c === filterCategory))
    .filter(c => !search || c.toLowerCase().includes(search.toLowerCase()) || templates.some(t => t.category === c && t.name.toLowerCase().includes(search.toLowerCase())));

  const filteredTemplates = templates.filter(t =>
    t.category === selectedCategory && (!search || t.name.toLowerCase().includes(search.toLowerCase()))
  );

  const openAddChooser = () => setAddChooserOpen(true);

  const openCreate = () => {
    setAddChooserOpen(false);
    setEditing(null);
    setForm({ name: "", category: selectedCategory || "", description: "" });
    setDialogOpen(true);
  };

  const openFolderCreate = () => {
    setAddChooserOpen(false);
    setFolderName("");
    setFolderDialogOpen(true);
  };

  const handleSaveFolder = async () => {
    if (!folderName.trim()) { toast.error("Nome é obrigatório"); return; }
    // Create a placeholder template to establish the category
    await supabase.from("workout_templates").insert({ name: "— pasta —", category: folderName.trim(), description: null });
    toast.success("Pasta criada");
    setFolderDialogOpen(false);
    fetchTemplates();
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({ name: t.name, category: t.category || "", description: t.description || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (editing) {
      await supabase.from("workout_templates").update({
        name: form.name, category: form.category || null, description: form.description || null,
      }).eq("id", editing.id);
      toast.success("Ficha atualizada");
    } else {
      await supabase.from("workout_templates").insert({
        name: form.name, category: form.category || null, description: form.description || null,
      });
      toast.success("Ficha criada");
    }
    setDialogOpen(false);
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("workout_templates").delete().eq("id", id);
    toast.success("Ficha removida");
    fetchTemplates();
  };

  const openClone = (t: Template) => {
    setCloneTarget(t);
    setSelectedClientId("");
    setCloneDialogOpen(true);
  };

  const handleClone = async () => {
    if (!cloneTarget || !selectedClientId) { toast.error("Selecione um aluno"); return; }
    // Create workout from template
    const { data: workout } = await supabase.from("workouts").insert({
      name: cloneTarget.name,
      description: cloneTarget.description,
      client_id: parseInt(selectedClientId),
      status: "active",
    }).select().single();

    if (workout) {
      // Copy sessions
      const { data: sessions } = await supabase.from("template_sessions").select("*").eq("template_id", cloneTarget.id).order("sort_order");
      if (sessions) {
        for (const s of sessions) {
          const { data: newSession } = await supabase.from("workout_sessions").insert({
            workout_id: workout.id, name: s.name || "Treino A", day_label: s.day_label,
            duration_min: s.duration_min, notes: s.notes, sort_order: s.sort_order,
          }).select().single();

          if (newSession) {
            const { data: exercises } = await supabase.from("template_exercises").select("*").eq("template_session_id", s.id).order("sort_order");
            if (exercises?.length) {
              await supabase.from("workout_exercises").insert(
                exercises.map(ex => ({
                  workout_id: workout.id, session_id: newSession.id, name: ex.name,
                  sets: ex.sets, reps: ex.reps, load: ex.load,
                  rest_seconds: ex.rest_seconds, notes: ex.notes, sort_order: ex.sort_order,
                }))
              );
            }
          }
        }
      }
      toast.success("Treino clonado para o aluno!");
    }
    setCloneDialogOpen(false);
  };

  // Category view
  if (!selectedCategory) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-barlow font-bold text-foreground">Fichas de Treino</h1>
            <p className="text-sm font-dm text-muted-foreground">Gerencie fichas de treino modelo para reutilizar com seus alunos.</p>
          </div>
          <Button onClick={openAddChooser} size="sm" className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar fichas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 font-dm text-sm" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px] font-dm text-sm"><SelectValue placeholder="Todas as categorias" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredCategories.map(cat => {
            const count = templates.filter(t => t.category === cat).length;
            return (
              <div
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/40 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <FolderOpen className="w-8 h-8 text-primary/70" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedCategory(cat); }}>
                        <FolderOpen className="w-4 h-4 mr-2" /> Abrir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="font-barlow font-bold text-sm text-foreground">{cat}</p>
                <p className="font-dm text-xs text-muted-foreground">{count} ficha{count !== 1 ? "s" : ""}</p>
              </div>
            );
          })}
          {filteredCategories.length === 0 && (
            <div className="col-span-full bg-card border border-border rounded-xl p-8 text-center">
              <p className="text-muted-foreground font-dm text-sm">Nenhuma categoria encontrada. Crie uma ficha para começar.</p>
            </div>
          )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-barlow font-bold">{editing ? "Editar Ficha" : "Nova Ficha de Treino"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label className="font-dm text-sm">Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="font-dm" /></div>
              <div><Label className="font-dm text-sm">Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="font-dm text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
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
  }

  // Templates inside category
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedCategory(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-barlow font-bold text-foreground">{selectedCategory}</h1>
            <p className="text-sm font-dm text-muted-foreground">{filteredTemplates.length} ficha{filteredTemplates.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Button onClick={openAddChooser} size="sm" className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-1" /> Adicionar
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar fichas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 font-dm text-sm" />
      </div>

      <div className="space-y-2">
        {filteredTemplates.map(t => (
          <div key={t.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-barlow font-bold text-sm text-foreground">{t.name}</p>
              {t.description && <p className="font-dm text-xs text-muted-foreground mt-0.5 truncate">{t.description}</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openClone(t)} title="Clonar para aluno">
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {filteredTemplates.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground font-dm text-sm">Nenhuma ficha nesta categoria</p>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-barlow font-bold">{editing ? "Editar Ficha" : "Nova Ficha de Treino"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="font-dm text-sm">Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="font-dm" /></div>
            <div><Label className="font-dm text-sm">Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="font-dm text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="font-dm text-sm">Descrição</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="font-dm" rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="font-dm">Cancelar</Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground font-dm">{editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Dialog */}
      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-barlow font-bold">Clonar Ficha para Aluno</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="font-dm text-sm text-muted-foreground">Selecione o aluno para receber a ficha <strong>{cloneTarget?.name}</strong>:</p>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="font-dm text-sm"><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneDialogOpen(false)} className="font-dm">Cancelar</Button>
            <Button onClick={handleClone} className="bg-primary text-primary-foreground font-dm">Clonar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Chooser Dialog */}
      <Dialog open={addChooserOpen} onOpenChange={setAddChooserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-barlow font-bold text-lg">O que deseja adicionar?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <button
              onClick={openCreate}
              className="w-full border-2 border-primary/20 hover:border-primary rounded-xl p-6 flex flex-col items-center gap-2 transition-colors"
            >
              <Dumbbell className="w-8 h-8 text-primary" />
              <span className="font-barlow font-bold text-sm text-foreground">Novo Treino</span>
            </button>
            <button
              onClick={openFolderCreate}
              className="w-full border-2 border-border hover:border-primary/40 rounded-xl p-6 flex flex-col items-center gap-2 transition-colors"
            >
              <FolderPlus className="w-8 h-8 text-muted-foreground" />
              <span className="font-barlow font-bold text-sm text-foreground">Nova Pasta</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-barlow font-bold">Nova Pasta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="font-dm text-sm">Nome da Pasta *</Label><Input value={folderName} onChange={e => setFolderName(e.target.value)} className="font-dm" placeholder="Ex: Masculino, Feminino..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)} className="font-dm">Cancelar</Button>
            <Button onClick={handleSaveFolder} className="bg-primary text-primary-foreground font-dm">Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TreinosFichas;
