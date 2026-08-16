import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Search, Play, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { OFFICIAL_MUSCLE_GROUPS } from "@/lib/muscleVolume";

type LibraryExercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  secondary_muscle: string | null;
  equipment: string | null;
  video_url: string | null;
  is_global: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (ex: LibraryExercise) => void;
};

const FAVS_KEY = "iron_fav_exercises";

const ExerciseLibraryPicker = ({ open, onClose, onSelect }: Props) => {
  const [exercises, setExercises] = useState<LibraryExercise[]>([]);
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equip, setEquip] = useState("");
  const [favs, setFavs] = useState<string[]>([]);
  const [tab, setTab] = useState<"favs" | "global" | "custom" | "all">("all");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("exercise_library").select("*").order("name");
      setExercises((data as LibraryExercise[]) || []);
    })();
    try { setFavs(JSON.parse(localStorage.getItem(FAVS_KEY) || "[]")); } catch { setFavs([]); }
  }, [open]);

  const toggleFav = (id: string) => {
    const next = favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id];
    setFavs(next);
    localStorage.setItem(FAVS_KEY, JSON.stringify(next));
  };

  const muscleGroups = [...OFFICIAL_MUSCLE_GROUPS, "Cardio"];
  const equipments = Array.from(new Set(exercises.map(e => e.equipment).filter(Boolean))) as string[];

  const filtered = exercises.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (muscle && e.muscle_group !== muscle) return false;
    if (equip && e.equipment !== equip) return false;
    if (tab === "favs" && !favs.includes(e.id)) return false;
    if (tab === "global" && !e.is_global) return false;
    if (tab === "custom" && e.is_global) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const { data, error } = await supabase.from("exercise_library")
      .insert({ name: newName.trim(), is_global: false }).select().single();
    if (error) { toast.error("Erro ao criar"); return; }
    toast.success("Exercício criado");
    setExercises(p => [...p, data as LibraryExercise]);
    setCreating(false); setNewName("");
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-barlow font-bold text-lg">Adicionar Exercício</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={v => setTab(v as any)}>
          <TabsList className="w-full bg-muted/50 rounded-lg">
            <TabsTrigger value="all" className="flex-1 text-xs font-dm">Todos</TabsTrigger>
            <TabsTrigger value="favs" className="flex-1 text-xs font-dm">Favoritos</TabsTrigger>
            <TabsTrigger value="global" className="flex-1 text-xs font-dm">App</TabsTrigger>
            <TabsTrigger value="custom" className="flex-1 text-xs font-dm">Seus</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..." className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={muscle} onChange={e => setMuscle(e.target.value)}
            className="text-sm font-dm bg-background border border-border rounded-lg px-2 py-2 focus:outline-none">
            <option value="">Grupo muscular</option>
            {muscleGroups.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={equip} onChange={e => setEquip(e.target.value)}
            className="text-sm font-dm bg-background border border-border rounded-lg px-2 py-2 focus:outline-none">
            <option value="">Equipamento</option>
            {equipments.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto mt-3 space-y-2">
          {creating ? (
            <div className="bg-primary/5 border border-primary/30 rounded-lg p-3 flex gap-2">
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Nome do exercício..."
                className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary" />
              <Button size="sm" onClick={handleCreate}>Criar</Button>
              <Button size="sm" variant="outline" onClick={() => { setCreating(false); setNewName(""); }}>Cancelar</Button>
            </div>
          ) : (
            <button onClick={() => setCreating(true)}
              className="w-full border-2 border-dashed border-primary/30 text-primary rounded-lg py-2.5 flex items-center justify-center gap-2 font-dm text-xs font-semibold hover:bg-primary/5">
              <Plus size={14} /> Criar exercício
            </button>
          )}

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground font-dm py-6 text-center">Nenhum exercício encontrado.</p>
          ) : filtered.map(ex => (
            <div key={ex.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
              <button onClick={() => toggleFav(ex.id)} className="text-muted-foreground hover:text-yellow-500">
                <Star size={16} className={favs.includes(ex.id) ? "fill-yellow-400 text-yellow-400" : ""} />
              </button>
              {ex.video_url ? (
                <a href={ex.video_url} target="_blank" rel="noreferrer" className="text-primary"><Play size={16} /></a>
              ) : <Play size={16} className="text-muted-foreground/30" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-dm font-semibold text-foreground truncate">{ex.name}</p>
                <p className="text-[11px] font-dm text-muted-foreground truncate">
                  {[ex.muscle_group, ex.equipment].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <Button size="sm" className="font-dm text-xs" onClick={() => onSelect(ex)}>
                Adicionar
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseLibraryPicker;