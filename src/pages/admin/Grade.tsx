import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Lock, Eye, Plus, Trash2, CheckSquare, Square } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const dayLabels = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const hours = Array.from({ length: 18 }, (_, i) => i + 5);

type ClassData = {
  id: string;
  name: string | null;
  trainer: string | null;
  start_time: string;
  end_time: string;
  day_of_week: number | null;
  max_slots: number | null;
  bookings_count?: number;
  bookings_list?: { name: string; group: string | null }[];
};

const getWeekDates = (offset: number) => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (offset * 7);
  const sunday = new Date(now.setDate(diff));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
};

const Grade = () => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"todos" | "manha" | "tarde" | "noite">("todos");
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<"dia" | "semana">("semana");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState({
    name: "Musculação",
    trainer: "",
    startHour: 6,
    endHour: 21,
    durationMin: 60,
    maxSlots: 14,
    days: [1, 2, 3, 4, 5] as number[],
  });

  const weekDates = getWeekDates(weekOffset);
  const today = new Date();
  const todayDay = today.getDay();
  const todayDate = today.getDate();

  const formatWeekRange = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    const months = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
    return `${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]}, ${end.getFullYear()}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      await loadData();
    };
    fetchData();
  }, []);

  const loadData = async () => {
      setLoading(true);
      const { data } = await supabase.from("classes").select("*");
      const classesData = (data || []) as ClassData[];
      const { data: bookings } = await supabase
        .from("class_bookings")
        .select("class_id, student_name, muscle_group");
      const byClass: Record<string, { name: string; group: string | null }[]> = {};
      (bookings || []).forEach((b: any) => {
        if (!b.class_id) return;
        (byClass[b.class_id] ||= []).push({
          name: b.student_name || "Aluno",
          group: b.muscle_group,
        });
      });
      setClasses(classesData.map(c => ({
        ...c,
        bookings_count: (byClass[c.id] || []).length,
        bookings_list: byClass[c.id] || [],
      })));
      setLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const clearSelection = () => { setSelected(new Set()); setSelectMode(false); };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Excluir ${selected.size} aula(s) selecionada(s)?`)) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from("classes").delete().in("id", ids);
    if (error) { toast.error(error.message); return; }
    toast.success(`${ids.length} aula(s) excluída(s)`);
    clearSelection();
    loadData();
  };

  const toggleBulkDay = (d: number) => {
    setBulk(b => ({ ...b, days: b.days.includes(d) ? b.days.filter(x => x !== d) : [...b.days, d].sort() }));
  };

  const runBulkCreate = async () => {
    if (bulk.days.length === 0) { toast.error("Selecione ao menos um dia"); return; }
    if (bulk.endHour <= bulk.startHour) { toast.error("Hora final deve ser maior que inicial"); return; }
    if (!bulk.name.trim()) { toast.error("Informe o nome da atividade"); return; }
    const rows: any[] = [];
    for (const d of bulk.days) {
      for (let h = bulk.startHour; h < bulk.endHour; h++) {
        const startMin = h * 60;
        const endMin = startMin + bulk.durationMin;
        const sh = String(Math.floor(startMin / 60)).padStart(2, "0");
        const sm = String(startMin % 60).padStart(2, "0");
        const eh = String(Math.floor(endMin / 60)).padStart(2, "0");
        const em = String(endMin % 60).padStart(2, "0");
        rows.push({
          name: bulk.name,
          trainer: bulk.trainer || null,
          day_of_week: d,
          start_time: `${sh}:${sm}:00`,
          end_time: `${eh}:${em}:00`,
          max_slots: bulk.maxSlots,
        });
      }
    }
    const { error } = await supabase.from("classes").insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`${rows.length} aula(s) criada(s)`);
    setBulkOpen(false);
    loadData();
  };

  const getHourFromTime = (t: string) => parseInt(t.split(":")[0], 10);

  const filteredClasses = classes.filter(c => {
    if (filter === "todos") return true;
    const h = getHourFromTime(c.start_time);
    if (filter === "manha") return h >= 5 && h < 12;
    if (filter === "tarde") return h >= 12 && h < 18;
    return h >= 18;
  });

  const getClassesForSlot = (dayOfWeek: number, hour: number) => {
    return filteredClasses.filter(c => c.day_of_week === dayOfWeek && getHourFromTime(c.start_time) === hour);
  };

  const getSlotStyle = (filled: number, max: number, isToday: boolean) => {
    if (isToday) {
      if (filled >= max) return "border-l-4 border-l-red-500 bg-yellow-50 text-red-700";
      return "border-l-4 border-l-yellow-500 bg-yellow-50 text-yellow-800";
    }
    if (filled >= max) return "border-l-4 border-l-red-500 bg-red-50 text-red-700";
    return "border-l-4 border-l-green-500 bg-white text-foreground";
  };

  // Day order: DOM, SEG, TER, QUA, QUI, SEX, SAB → [0,1,2,3,4,5,6]
  const dayOrder = [0, 1, 2, 3, 4, 5, 6];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-barlow font-bold text-2xl text-foreground">GRADE DE AULAS</h1>
        <div className="flex items-center gap-2">
          {selectMode && (
            <>
              <span className="text-xs font-dm text-muted-foreground">{selected.size} selecionada(s)</span>
              <Button size="sm" variant="destructive" className="gap-2" disabled={selected.size === 0} onClick={deleteSelected}>
                <Trash2 size={14} /> Excluir
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection}>Sair</Button>
            </>
          )}
          {!selectMode && (
            <>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setSelectMode(true)}>
                <CheckSquare size={14} /> Selecionar
              </Button>
              <Button size="sm" className="gap-2" onClick={() => setBulkOpen(true)}>
                <Plus size={14} /> Criar em massa
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters row */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2">
          {(["todos", "manha", "tarde", "noite"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded text-xs font-dm font-bold uppercase tracking-wide transition-colors
                ${filter === f ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
            >
              {f === "todos" ? "TODOS" : f === "manha" ? "MANHÃ" : f === "tarde" ? "TARDE" : "NOITE"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(o => o - 1)}>
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm font-dm text-foreground min-w-[180px] text-center">{formatWeekRange()}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(o => o + 1)}>
              <ChevronRight size={16} />
            </Button>
          </div>
          <Button variant="outline" size="sm" className="text-xs font-dm font-bold" onClick={() => setWeekOffset(0)}>
            HOJE
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs font-dm text-muted-foreground cursor-pointer">
            <Eye size={14} /> Ver status
          </label>
          <div className="flex rounded overflow-hidden border border-border">
            <button
              onClick={() => setViewMode("dia")}
              className={`px-3 py-1 text-xs font-dm font-bold ${viewMode === "dia" ? "bg-muted text-foreground" : "bg-card text-muted-foreground"}`}
            >
              DIA
            </button>
            <button
              onClick={() => setViewMode("semana")}
              className={`px-3 py-1 text-xs font-dm font-bold ${viewMode === "semana" ? "bg-primary text-white" : "bg-card text-muted-foreground"}`}
            >
              SEMANA
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-card rounded-xl card-shadow overflow-auto">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground font-dm">Carregando grade...</div>
        ) : (
          <table className="w-full text-xs font-dm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-3 text-left text-muted-foreground w-16">
                  <div className="w-5 h-5 rounded-full border border-muted-foreground flex items-center justify-center">
                    <span className="text-[10px]">⏰</span>
                  </div>
                </th>
                {dayOrder.map((d, i) => {
                  const date = weekDates[i];
                  const isToday = date.getDate() === todayDate && date.getMonth() === today.getMonth();
                  return (
                    <th key={d} className={`px-2 py-3 text-center min-w-[130px] ${isToday ? "bg-primary/10" : ""}`}>
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`text-xs font-bold ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                          {dayLabels[d]} {date.getDate()}
                        </span>
                        {isToday && (
                          <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                            {date.getDate()}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {hours.map(h => {
                const slotsByDay = dayOrder.map(d => getClassesForSlot(d, h));
                const maxClasses = Math.max(1, ...slotsByDay.map(s => s.length));

                return (
                  <tr key={h} className="border-b border-border">
                    <td className="px-3 py-2 text-muted-foreground font-barlow font-bold align-top">
                      {String(h).padStart(2, "0")}:00
                    </td>
                    {dayOrder.map((d, di) => {
                      const dayClasses = slotsByDay[di];
                      const date = weekDates[di];
                      const isToday = date.getDate() === todayDate && date.getMonth() === today.getMonth();

                      return (
                        <td key={d} className={`px-1 py-1 align-top ${isToday ? "bg-primary/5" : ""}`}>
                          <div className="flex flex-col gap-1">
                            {dayClasses.length === 0 ? (
                              <div className="h-8" />
                            ) : (
                              dayClasses.map(cls => {
                                const filled = cls.bookings_count || 0;
                                const max = cls.max_slots || 14;
                                return (
                                  <div
                                    key={cls.id}
                                    onClick={() => selectMode && toggleSelect(cls.id)}
                                    className={`relative rounded p-2 text-[10px] cursor-pointer hover:shadow-md transition-shadow ${getSlotStyle(filled, max, isToday)} ${selectMode && selected.has(cls.id) ? "ring-2 ring-primary" : ""}`}
                                  >
                                    {selectMode && (
                                      <div className="absolute top-1 right-1 text-primary">
                                        {selected.has(cls.id) ? <CheckSquare size={12} /> : <Square size={12} />}
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between">
                                      <span className={`font-bold ${isToday ? "text-yellow-800" : ""}`}>
                                        {cls.start_time?.slice(0, 5)} - {cls.end_time?.slice(0, 5)}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <span className="font-bold">{filled}/{max}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                      <span className="font-medium">{cls.name}</span>
                                      <Lock size={10} className="text-muted-foreground" />
                                    </div>
                                    {(cls.bookings_list && cls.bookings_list.length > 0) && (
                                      <div className="mt-1.5 pt-1.5 border-t border-black/10 space-y-0.5">
                                        {cls.bookings_list.slice(0, 6).map((b, idx) => (
                                          <div key={idx} className="flex items-center justify-between gap-1">
                                            <span className="truncate text-[9px] font-medium text-foreground">{b.name}</span>
                                            {b.group && (
                                              <span className={`shrink-0 text-[8px] font-bold uppercase px-1 rounded ${
                                                b.group === "inferior"
                                                  ? "bg-blue-100 text-blue-700"
                                                  : "bg-amber-100 text-amber-700"
                                              }`}>
                                                {b.group === "inferior" ? "INF" : "SUP"}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                        {cls.bookings_list.length > 6 && (
                                          <div className="text-[9px] text-muted-foreground">+{cls.bookings_list.length - 6} mais</div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Criar aulas em massa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Dias da semana</Label>
              <div className="flex gap-1 mt-1">
                {dayLabels.map((d, i) => (
                  <button key={i} type="button" onClick={() => toggleBulkDay(i)}
                    className={`flex-1 py-1.5 rounded text-[11px] font-dm font-bold border ${bulk.days.includes(i) ? "bg-primary text-white border-primary" : "bg-card text-muted-foreground border-border"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Hora início</Label><Input type="number" min={0} max={23} value={bulk.startHour} onChange={e => setBulk({ ...bulk, startHour: Number(e.target.value) })} /></div>
              <div><Label className="text-xs">Hora fim</Label><Input type="number" min={1} max={24} value={bulk.endHour} onChange={e => setBulk({ ...bulk, endHour: Number(e.target.value) })} /></div>
              <div><Label className="text-xs">Duração (min)</Label><Input type="number" value={bulk.durationMin} onChange={e => setBulk({ ...bulk, durationMin: Number(e.target.value) })} /></div>
              <div><Label className="text-xs">Capacidade</Label><Input type="number" value={bulk.maxSlots} onChange={e => setBulk({ ...bulk, maxSlots: Number(e.target.value) })} /></div>
              <div className="col-span-2"><Label className="text-xs">Atividade</Label><Input value={bulk.name} onChange={e => setBulk({ ...bulk, name: e.target.value })} /></div>
              <div className="col-span-2"><Label className="text-xs">Professor</Label><Input value={bulk.trainer} onChange={e => setBulk({ ...bulk, trainer: e.target.value })} placeholder="Opcional" /></div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Serão criadas {bulk.days.length * Math.max(0, bulk.endHour - bulk.startHour)} aula(s).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancelar</Button>
            <Button onClick={runBulkCreate}>Criar aulas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Grade;
