import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Lock, Eye } from "lucide-react";

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
      setLoading(true);
      const { data } = await supabase.from("classes").select("*");
      const classesData = (data || []) as ClassData[];
      const { data: bookings } = await supabase.from("class_bookings").select("class_id");
      const bookingCount: Record<string, number> = {};
      (bookings || []).forEach(b => {
        if (b.class_id) bookingCount[b.class_id] = (bookingCount[b.class_id] || 0) + 1;
      });
      setClasses(classesData.map(c => ({ ...c, bookings_count: bookingCount[c.id] || 0 })));
      setLoading(false);
    };
    fetchData();
  }, []);

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
                                    className={`rounded p-2 text-[10px] cursor-pointer hover:shadow-md transition-shadow ${getSlotStyle(filled, max, isToday)}`}
                                  >
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
    </div>
  );
};

export default Grade;
