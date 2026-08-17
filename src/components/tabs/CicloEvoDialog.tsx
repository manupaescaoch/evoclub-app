import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Dumbbell, CalendarCheck, HeartPulse, MessageSquare, Zap, Sparkles } from "lucide-react";
import { useEvoCycle, cycleXp } from "@/hooks/useEvoCycle";

const fmt = (iso?: string) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR") : "—";

/** Retrospectiva vertical animada do Ciclo EVO — aparece até o aluno concluir. */
const CicloEvoDialog = ({ onNavigate }: { onNavigate?: (s: string) => void }) => {
  const { cycle, complete } = useEvoCycle();
  const [closing, setClosing] = useState(false);

  const show = cycle.available && !cycle.completed && !closing;
  const s = cycle.stats;
  const xp = cycleXp(s);

  const slides = [
    { icon: Dumbbell, label: "Treinos concluídos", value: s?.workouts ?? 0 },
    { icon: CalendarCheck, label: "Presenças na grade", value: s?.class_checkins ?? 0 },
    { icon: HeartPulse, label: "Check-ins diários", value: s?.daily_checkins ?? 0 },
    { icon: MessageSquare, label: "Posts na comunidade", value: s?.posts ?? 0 },
    { icon: Zap, label: "Score do ciclo", value: xp },
  ];

  const finish = async () => {
    setClosing(true);
    await complete();
  };

  return (
    <Dialog open={show} onOpenChange={(o) => !o && finish()}>
      <DialogContent className="max-w-[340px] rounded-3xl p-0 overflow-hidden">
        <div className="bg-primary text-primary-foreground px-5 pt-6 pb-5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} />
            <p className="font-barlow text-[10px] tracking-[2px] uppercase font-bold opacity-80">CICLO EVO</p>
          </div>
          <p className="font-barlow font-[800] text-2xl leading-tight mt-1">SEU CICLO ESTÁ FECHANDO</p>
          <p className="text-[11px] font-dm opacity-85 mt-1">
            {fmt(cycle.cycle_start)} até {fmt(cycle.cycle_end)}
            {cycle.days_left != null && cycle.days_left >= 0 ? ` • faltam ${cycle.days_left} dia(s)` : ""}
          </p>
        </div>

        <div className="max-h-[46vh] overflow-y-auto px-5 py-4 space-y-2">
          {slides.map((sl, i) => (
            <div
              key={sl.label}
              className="flex items-center gap-3 p-3 rounded-2xl bg-secondary animate-in fade-in slide-in-from-bottom-3"
              style={{ animationDelay: `${i * 120}ms`, animationDuration: "500ms", animationFillMode: "backwards" }}
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <sl.icon size={16} className="text-primary" />
              </div>
              <div>
                <p className="font-barlow font-[800] text-xl text-foreground leading-none">{sl.value}</p>
                <p className="text-[11px] font-dm text-muted">{sl.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5 space-y-2">
          <button
            onClick={async () => { await finish(); onNavigate?.("plano"); }}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-dm font-semibold text-sm cta-shadow"
          >
            Quero renovar meu plano
          </button>
          <button
            onClick={finish}
            className="w-full py-3 rounded-2xl bg-secondary text-foreground font-dm font-semibold text-sm"
          >
            Concluir retrospectiva
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CicloEvoDialog;
