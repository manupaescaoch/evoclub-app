import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer, Plus, ChevronLeft, ChevronRight, Lock } from "lucide-react";

const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const hours = Array.from({ length: 18 }, (_, i) => i + 5); // 05:00 to 22:00

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

const Grade = () => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"todos" | "manha" | "tarde" | "noite">("todos");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from("classes").select("*");
      // Fetch bookings count per class
      const classesData = (data || []) as ClassData[];
      const { data: bookings } = await supabase.from("class_bookings").select("class_id");
      const bookingCount: Record<string, number> = {};
      (bookings || []).forEach(b => {
        if (b.class_id) bookingCount[b.class_id] = (bookingCount[b.class_id] || 0) + 1;
      });
      setClasses(classesData.map(c => ({ ...c, bookings_count: bookingCount[c.id] || 0 })));
      setLoading(false);
    };
    fetch();
  }, []);

  const getSlotColor = (filled: number, max: number) => {
    if (filled >= max) return "text-red-600 bg-red-50";
    if (filled >= 8) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  const getHourFromTime = (t: string) => parseInt(t.split(":")[0], 10);

  const filteredClasses = classes.filter(c => {
    if (filter === "todos") return true;
    const h = getHourFromTime(c.start_time);
    if (filter === "manha") return h >= 5 && h < 12;
    if (filter === "tarde") return h >= 12 && h < 18;
    return h >= 18;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-barlow font-bold text-2xl text-foreground">GRADE DE AULAS</h1>
        <div className="flex gap-2">
          <Button variant="ghost" className="gap-2 font-dm text-sm"><Printer size={16} /> IMPRIMIR</Button>
          <Button className="gap-2 font-dm text-sm"><Plus size={16} /> AGENDAR SOB DEMANDA</Button>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex gap-2 mb-4">
        {(["todos", "manha", "tarde", "noite"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-dm font-semibold transition-colors
              ${filter === f ? "bg-primary text-white" : "bg-card text-muted-foreground card-shadow"}`}
          >
            {f === "todos" ? "TODOS" : f === "manha" ? "MANHÃ" : f === "tarde" ? "TARDE" : "NOITE"}
          </button>
        ))}
      </div>

      {/* Week nav */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon"><ChevronLeft size={18} /></Button>
        <span className="text-sm font-dm text-foreground">14/04 — 20/04/2026</span>
        <Button variant="ghost" size="icon"><ChevronRight size={18} /></Button>
        <Button variant="outline" size="sm" className="text-xs font-dm">HOJE</Button>
      </div>

      {/* Grid */}
      <div className="bg-card rounded-xl card-shadow overflow-auto">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground font-dm">Carregando grade...</div>
        ) : (
          <table className="w-full text-xs font-dm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-muted-foreground w-16">Hora</th>
                {[1, 2, 3, 4, 5, 6, 0].map(d => (
                  <th key={d} className="px-2 py-2 text-center text-muted-foreground">{dayLabels[d]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map(h => (
                <tr key={h} className="border-b border-border">
                  <td className="px-3 py-2 text-muted-foreground font-barlow font-bold">{String(h).padStart(2, "0")}:00</td>
                  {[1, 2, 3, 4, 5, 6, 0].map(d => {
                    const cls = filteredClasses.find(c => c.day_of_week === d && getHourFromTime(c.start_time) === h);
                    if (!cls) return <td key={d} className="px-2 py-2" />;
                    const filled = cls.bookings_count || 0;
                    const max = cls.max_slots || 14;
                    return (
                      <td key={d} className="px-1 py-1">
                        <div className="bg-primary/5 border border-primary/10 rounded-lg p-2 text-[10px]">
                          <p className="font-semibold text-foreground">{cls.start_time?.slice(0, 5)} – {cls.end_time?.slice(0, 5)}</p>
                          <p className="text-foreground">{cls.name}</p>
                          <p className="text-muted-foreground">{cls.trainer}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${getSlotColor(filled, max)}`}>
                              {filled}/{max}
                            </span>
                            <Lock size={10} className="text-muted-foreground" />
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Grade;
