import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Plus, Play, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const MUSCLE_GROUPS = [
  "Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Antebraço",
  "Quadríceps", "Posterior", "Glúteos", "Panturrilha", "Abdômen", "Core"
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
};

type Exercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  secondary_muscle: string | null;
  equipment: string | null;
  video_url: string | null;
  is_global: boolean;
};

const TreinosBiblioteca = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [filterMuscle, setFilterMuscle] = useState("all");
  const [filterEquipment, setFilterEquipment] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [form, setForm] = useState({ name: "", muscle_group: "", secondary_muscle: "", equipment: "", video_url: "" });
  const [loading, setLoading] = useState(true);

  const fetchExercises = async () => {
    const { data } = await supabase.from("exercise_library").select("*").order("name");
    setExercises(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchExercises(); }, []);

  const filtered = exercises.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterMuscle !== "all" && e.muscle_group !== filterMuscle) return false;
    if (filterEquipment !== "all" && e.equipment !== filterEquipment) return false;
    return true;
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", muscle_group: "", secondary_muscle: "", equipment: "", video_url: "" });
    setDialogOpen(true);
  };

  const openEdit = (ex: Exercise) => {
    setEditing(ex);
    setForm({
      name: ex.name,
      muscle_group: ex.muscle_group || "",
      secondary_muscle: ex.secondary_muscle || "",
      equipment: ex.equipment || "",
      video_url: ex.video_url || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (editing) {
      await supabase.from("exercise_library").update({
        name: form.name, muscle_group: form.muscle_group || null,
        secondary_muscle: form.secondary_muscle || null,
        equipment: form.equipment || null, video_url: form.video_url || null,
      }).eq("id", editing.id);
      toast.success("Exercício atualizado");
    } else {
      await supabase.from("exercise_library").insert({
        name: form.name, muscle_group: form.muscle_group || null,
        secondary_muscle: form.secondary_muscle || null,
        equipment: form.equipment || null, video_url: form.video_url || null, is_global: false,
      });
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
                <Input placeholder="Buscar exercício..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 font-dm text-sm" />
              </div>
              <Select value={filterMuscle} onValueChange={setFilterMuscle}>
                <SelectTrigger className="w-[160px] font-dm text-sm"><SelectValue placeholder="Grupo muscular" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os grupos</SelectItem>
                  {MUSCLE_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterEquipment} onValueChange={setFilterEquipment}>
                <SelectTrigger className="w-[140px] font-dm text-sm"><SelectValue placeholder="Equipamento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
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
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered
                    .filter(e => tab === "all" ? true : tab === "global" ? e.is_global : !e.is_global)
                    .map(ex => (
                    <TableRow key={ex.id}>
                      <TableCell>
                        {ex.video_url ? (
                          <a href={ex.video_url} target="_blank" rel="noopener noreferrer" className="text-primary"><Play className="w-4 h-4" /></a>
                        ) : <Play className="w-4 h-4 text-muted-foreground/30" />}
                      </TableCell>
                      <TableCell className="font-dm text-sm font-medium">{ex.name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {ex.muscle_group && <Badge variant="secondary" className={`text-[10px] ${MUSCLE_COLORS[ex.muscle_group] || ""}`}>{ex.muscle_group}</Badge>}
                          {ex.secondary_muscle && <Badge variant="outline" className="text-[10px]">{ex.secondary_muscle}</Badge>}
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
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground font-dm text-sm py-8">Nenhum exercício encontrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-barlow font-bold">{editing ? "Editar Exercício" : "Novo Exercício"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="font-dm text-sm">Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="font-dm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="font-dm text-sm">Grupo Muscular</Label>
                <Select value={form.muscle_group} onValueChange={v => setForm(f => ({ ...f, muscle_group: v }))}>
                  <SelectTrigger className="font-dm text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{MUSCLE_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="font-dm text-sm">Músculo Secundário</Label>
                <Select value={form.secondary_muscle} onValueChange={v => setForm(f => ({ ...f, secondary_muscle: v }))}>
                  <SelectTrigger className="font-dm text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{MUSCLE_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="font-dm text-sm">Equipamento</Label>
              <Select value={form.equipment} onValueChange={v => setForm(f => ({ ...f, equipment: v }))}>
                <SelectTrigger className="font-dm text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{EQUIPMENT_OPTIONS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="font-dm text-sm">URL do Vídeo</Label><Input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://youtube.com/..." className="font-dm" /></div>
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
