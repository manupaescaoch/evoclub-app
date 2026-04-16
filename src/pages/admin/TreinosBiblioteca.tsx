import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Plus, Play, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const MUSCLE_GROUPS = [
  "Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Antebraço",
  "Quadríceps", "Posterior", "Glúteos", "Panturrilha", "Abdômen", "Core",
  "Cardio", "Deltóide Anterior", "Deltóide Posterior", "Deltóide Lateral",
  "Trapézio", "Lombar", "Adutores", "Abdutores"
];

const EQUIPMENT_OPTIONS = [
  "Barra", "Halter", "Máquina", "Cabo/Polia", "Peso Corporal", "Kettlebell",
  "Elástico", "Smith", "Anilha", "Outro"
];

const MUSCLE_COLORS: Record<string, string> = {
  "Peito": "bg-red-100 text-red-700",
  "Costas": "bg-blue-100 text-blue-700",
  "Ombros": "bg-orange-100 text-orange-700",
  "Bíceps": "bg-purple-100 text-purple-700",
  "Tríceps": "bg-pink-100 text-pink-700",
  "Quadríceps": "bg-green-100 text-green-700",
  "Posterior": "bg-teal-100 text-teal-700",
  "Glúteos": "bg-yellow-100 text-yellow-700",
  "Panturrilha": "bg-cyan-100 text-cyan-700",
  "Abdômen": "bg-indigo-100 text-indigo-700",
  "Core": "bg-violet-100 text-violet-700",
  "Antebraço": "bg-amber-100 text-amber-700",
  "Cardio": "bg-rose-100 text-rose-700",
  "Deltóide Anterior": "bg-orange-100 text-orange-700",
  "Deltóide Posterior": "bg-orange-100 text-orange-700",
  "Deltóide Lateral": "bg-orange-100 text-orange-700",
  "Trapézio": "bg-slate-100 text-slate-700",
  "Lombar": "bg-stone-100 text-stone-700",
  "Adutores": "bg-emerald-100 text-emerald-700",
  "Abdutores": "bg-lime-100 text-lime-700",
};

type Exercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  secondary_muscle: string | null;
  equipment: string | null;
  video_url: string | null;
  instructions: string | null;
  is_global: boolean;
};

const TreinosBiblioteca = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [filterMuscle, setFilterMuscle] = useState("all");
  const [filterEquipment, setFilterEquipment] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [form, setForm] = useState({
    name: "", muscle_group: "", equipment: "", video_url: "", instructions: "",
    secondaryMuscles: [] as string[],
  });
  const [loading, setLoading] = useState(true);

  const fetchExercises = async () => {
    const { data } = await supabase.from("exercise_library").select("*").order("name");
    setExercises((data as Exercise[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchExercises(); }, []);

  const filtered = exercises.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterMuscle !== "all" && e.muscle_group !== filterMuscle) return false;
    if (filterEquipment !== "all" && e.equipment !== filterEquipment) return false;
    return true;
  });

  const parseSecondary = (val: string | null): string[] =>
    val ? val.split(",").map(s => s.trim()).filter(Boolean) : [];

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", muscle_group: "", equipment: "", video_url: "", instructions: "", secondaryMuscles: [] });
    setDialogOpen(true);
  };

  const openEdit = (ex: Exercise) => {
    setEditing(ex);
    setForm({
      name: ex.name,
      muscle_group: ex.muscle_group || "",
      equipment: ex.equipment || "",
      video_url: ex.video_url || "",
      instructions: ex.instructions || "",
      secondaryMuscles: parseSecondary(ex.secondary_muscle),
    });
    setDialogOpen(true);
  };

  const addSecondary = (val: string) => {
    if (val && form.secondaryMuscles.length < 2 && !form.secondaryMuscles.includes(val)) {
      setForm(f => ({ ...f, secondaryMuscles: [...f.secondaryMuscles, val] }));
    }
  };

  const removeSecondary = (val: string) => {
    setForm(f => ({ ...f, secondaryMuscles: f.secondaryMuscles.filter(m => m !== val) }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    const payload = {
      name: form.name,
      muscle_group: form.muscle_group || null,
      secondary_muscle: form.secondaryMuscles.length > 0 ? form.secondaryMuscles.join(", ") : null,
      equipment: form.equipment || null,
      video_url: form.video_url || null,
      instructions: form.instructions || null,
    };
    if (editing) {
      await supabase.from("exercise_library").update(payload).eq("id", editing.id);
      toast.success("Exercício atualizado");
    } else {
      await supabase.from("exercise_library").insert({ ...payload, is_global: false });
      toast.success("Exercício criado");
    }
    setDialogOpen(false);
    fetchExercises();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("exercise_library").delete().eq("id", id);
    toast.success("Exercício removido");
    fetchExercises();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-barlow font-bold text-foreground">Biblioteca de Exercícios</h1>
          <p className="text-sm font-dm text-muted-foreground">Banco de exercícios com vídeos</p>
        </div>
        <Button onClick={openCreate} size="sm" className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-1" /> Criar exercício
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1 text-xs font-dm">Todos</TabsTrigger>
          <TabsTrigger value="global" className="flex-1 text-xs font-dm">Exercícios do app</TabsTrigger>
          <TabsTrigger value="custom" className="flex-1 text-xs font-dm">Seus exercícios</TabsTrigger>
        </TabsList>

        {["all", "global", "custom"].map(tab => (
          <TabsContent key={tab} value={tab}>
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome, grupo muscular..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 font-dm text-sm" />
              </div>
              <Select value={filterMuscle} onValueChange={setFilterMuscle}>
                <SelectTrigger className="w-[170px] font-dm text-sm"><SelectValue placeholder="Grupos musculares" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Grupos musculares</SelectItem>
                  {MUSCLE_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterEquipment} onValueChange={setFilterEquipment}>
                <SelectTrigger className="w-[150px] font-dm text-sm"><SelectValue placeholder="Equipamento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Equipamento</SelectItem>
                  {EQUIPMENT_OPTIONS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="font-barlow font-semibold text-xs uppercase">Exercício</TableHead>
                    <TableHead className="font-barlow font-semibold text-xs uppercase">Ativação</TableHead>
                    <TableHead className="font-barlow font-semibold text-xs uppercase">Equipamento</TableHead>
                    <TableHead className="w-20 font-barlow font-semibold text-xs uppercase">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered
                    .filter(e => tab === "all" ? true : tab === "global" ? e.is_global : !e.is_global)
                    .map(ex => {
                      const secondaries = parseSecondary(ex.secondary_muscle);
                      return (
                        <TableRow key={ex.id}>
                          <TableCell>
                            {ex.video_url ? (
                              <a href={ex.video_url} target="_blank" rel="noopener noreferrer" className="text-primary"><Play className="w-4 h-4" /></a>
                            ) : <Play className="w-4 h-4 text-muted-foreground/30" />}
                          </TableCell>
                          <TableCell className="font-dm text-sm font-medium">{ex.name}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {ex.muscle_group && (
                                <Badge variant="secondary" className={`text-[10px] ${MUSCLE_COLORS[ex.muscle_group] || ""}`}>
                                  {ex.muscle_group}
                                </Badge>
                              )}
                              {secondaries.map(s => (
                                <Badge key={s} variant="outline" className={`text-[10px] ${MUSCLE_COLORS[s] || ""}`}>
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="font-dm text-sm text-muted-foreground">{ex.equipment || "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ex)}><Pencil className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(ex.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {filtered.filter(e => tab === "all" ? true : tab === "global" ? e.is_global : !e.is_global).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground font-dm text-sm py-8">Nenhum exercício encontrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-barlow font-bold text-lg">{editing ? "Editar Exercício" : "Novo Exercício"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Nome */}
            <div>
              <Label className="font-dm text-sm font-medium">Nome *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Supino reto com barra"
                className="font-dm mt-1"
              />
            </div>

            {/* Grupo Muscular Principal + Equipamento */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-dm text-sm font-medium">Grupo Muscular Principal</Label>
                <Select value={form.muscle_group} onValueChange={v => setForm(f => ({ ...f, muscle_group: v }))}>
                  <SelectTrigger className="font-dm text-sm mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{MUSCLE_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-dm text-sm font-medium">Equipamento</Label>
                <Select value={form.equipment} onValueChange={v => setForm(f => ({ ...f, equipment: v }))}>
                  <SelectTrigger className="font-dm text-sm mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{EQUIPMENT_OPTIONS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Grupos Secundários (até 2) */}
            <div>
              <Label className="font-dm text-sm font-medium">Grupos Musculares Secundários (até 2)</Label>
              <p className="text-[11px] font-dm text-muted-foreground mb-1">Volume: 1 série = 1.0 principal + 0.5 por secundário</p>
              {form.secondaryMuscles.length > 0 && (
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  {form.secondaryMuscles.map(m => (
                    <Badge key={m} variant="secondary" className={`text-xs pr-1 ${MUSCLE_COLORS[m] || ""}`}>
                      {m}
                      <button onClick={() => removeSecondary(m)} className="ml-1 hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {form.secondaryMuscles.length < 2 && (
                <Select value="" onValueChange={addSecondary}>
                  <SelectTrigger className="font-dm text-sm"><SelectValue placeholder="+ Adicionar grupo secundário" /></SelectTrigger>
                  <SelectContent>
                    {MUSCLE_GROUPS
                      .filter(g => g !== form.muscle_group && !form.secondaryMuscles.includes(g))
                      .map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* URL do Vídeo */}
            <div>
              <Label className="font-dm text-sm font-medium">URL do Vídeo</Label>
              <Input
                value={form.video_url}
                onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                placeholder="https://youtube.com/..."
                className="font-dm mt-1"
              />
            </div>

            {/* Instruções */}
            <div>
              <Label className="font-dm text-sm font-medium">Instruções</Label>
              <Textarea
                value={form.instructions}
                onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
                placeholder="Descreva como executar o exercício..."
                className="font-dm mt-1"
                rows={3}
              />
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

export default TreinosBiblioteca;
