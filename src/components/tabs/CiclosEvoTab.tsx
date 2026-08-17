import { useEffect, useState } from "react";
import { ChevronLeft, Sparkles, Dumbbell, CalendarCheck, HeartPulse, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudent } from "@/contexts/StudentContext";
import { cycleXp, type CycleStats } from "@/hooks/useEvoCycle";

type Row = {
  id: string;
  cycle_start: string | null;
  cycle_end: string;
  stats: CycleStats | null;
  completed_at: string | null;
};

const fmt = (iso?: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR") : "—";

const CiclosEvoTab = ({ onBack }: { onBack: () => void }) => {
  const { client } = useStudent();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!client?.id) return;
    supabase
      .from("evo_cycles")
      .select("id, cycle_start, cycle_end, stats, completed_at")
      .eq("client_id", client.id)
      .order("cycle_end", { ascending: false })
      .then(({ data }) => setRows((data || []) as unknown as Row[]));
  }, [client?.id]);

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center">
          <ChevronLeft size={22} className="text-foreground" />
        </button>
        <p className="font-barlow font-bold text-lg text-foreground">Meus Ciclos EVO</p>
      </div>

      {rows.length === 0 && (
        <div className="rounded-2xl bg-white p-6 card-shadow text-center">
          <Sparkles size={22} className="text-primary mx-auto mb-2" />
          <p className="text-sm font-dm text-muted">
            Seu primeiro Ciclo EVO aparece aqui quando faltarem 30 dias para o vencimento do plano.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r) => {
          const s = r.stats;
          return (
            <div key={r.id} className="rounded-2xl bg-white p-4 card-shadow">
              <div className="flex items-center justify-between">
                <p className="font-barlow font-[800] text-base text-foreground">
                  {fmt(r.cycle_start)} — {fmt(r.cycle_end)}
                </p>
                <span className="text-[10px] font-dm font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {r.completed_at ? "Concluído" : "Em aberto"}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[
                  { icon: Dumbbell, v: s?.workouts ?? 0, l: "Treinos" },
                  { icon: CalendarCheck, v: s?.class_checkins ?? 0, l: "Presenças" },
                  { icon: HeartPulse, v: s?.daily_checkins ?? 0, l: "Check-ins" },
                  { icon: Zap, v: cycleXp(s ?? undefined), l: "Score" },
                ].map((c) => (
                  <div key={c.l} className="p-2 rounded-xl bg-secondary text-center">
                    <c.icon size={14} className="text-primary mx-auto" />
                    <p className="font-barlow font-[800] text-base text-foreground leading-none mt-1">{c.v}</p>
                    <p className="text-[9px] font-dm text-muted">{c.l}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CiclosEvoTab;
