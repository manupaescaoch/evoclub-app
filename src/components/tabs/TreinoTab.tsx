import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";

const workouts = [
  { day: "SEG", name: "Peito & Tríceps", state: "done" as const },
  { day: "TER", name: "Costas & Bíceps", state: "today" as const },
  { day: "QUA", name: "Pernas", state: "upcoming" as const },
  { day: "QUI", name: "Ombros & Trapézio", state: "upcoming" as const },
  { day: "SEX", name: "Braços & Abdômen", state: "upcoming" as const },
];

const exercises = [
  { name: "Puxada Frontal", sets: "4x12", load: "60kg", rest: "60s", done: true },
  { name: "Remada Curvada", sets: "4x10", load: "70kg", rest: "90s", done: true },
  { name: "Remada Unilateral", sets: "3x12", load: "30kg", rest: "60s", done: true },
  { name: "Pulldown Corda", sets: "3x15", load: "40kg", rest: "60s", done: false },
  { name: "Rosca Direta", sets: "4x12", load: "25kg", rest: "60s", done: false },
  { name: "Rosca Martelo", sets: "3x12", load: "20kg", rest: "60s", done: false },
  { name: "Rosca Scott", sets: "3x10", load: "22kg", rest: "60s", done: false },
  { name: "Rosca Concentrada", sets: "3x12", load: "14kg", rest: "45s", done: false },
];

const TreinoTab = () => {
  const [drillDown, setDrillDown] = useState(false);

  if (drillDown) {
    return (
      <div className="px-4 pt-4">
        <button onClick={() => setDrillDown(false)} className="flex items-center gap-1 text-primary text-sm font-dm font-semibold mb-4">
          <ArrowLeft size={18} /> Voltar
        </button>
        <h1 className="font-barlow font-bold text-xl text-foreground mb-1">COSTAS & BÍCEPS</h1>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full w-[37.5%] rounded-full" style={{ background: "linear-gradient(90deg, #1400FF, #0A00B0)" }} />
          </div>
          <span className="text-xs font-dm text-muted">3/8</span>
        </div>

        <div className="space-y-2 pb-4">
          {exercises.map((ex, i) => (
            <div key={i} className={`rounded-2xl p-3.5 card-shadow flex items-center gap-3 ${ex.done ? "bg-primary/5" : "bg-white"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-barlow font-bold
                ${ex.done ? "bg-primary text-white" : "bg-secondary text-muted"}`}>
                {ex.done ? <Check size={14} /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-dm font-semibold text-sm ${ex.done ? "line-through text-muted" : "text-foreground"}`}>{ex.name}</p>
                <p className="text-[11px] text-muted font-dm">{ex.sets} · {ex.load} · {ex.rest}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="font-barlow font-bold text-xl text-foreground mb-4">TREINOS DA SEMANA</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "Concluídos", value: "1/5" },
          { label: "Volume", value: "14.2t" },
          { label: "Streak", value: "3 dias" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-3 card-shadow text-center">
            <p className="font-barlow font-[800] text-lg text-foreground">{s.value}</p>
            <p className="text-[10px] font-barlow tracking-[1px] uppercase text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Workout list */}
      <div className="space-y-2 pb-4">
        {workouts.map((w) => (
          <button
            key={w.day}
            onClick={() => w.state === "today" && setDrillDown(true)}
            className={`w-full rounded-2xl p-4 card-shadow flex items-center gap-3 text-left relative
              ${w.state === "done" ? "bg-white opacity-60" : w.state === "today" ? "bg-primary/5 border border-primary/20" : "bg-white"}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-barlow font-bold text-xs
              ${w.state === "today" ? "bg-primary text-white" : "bg-secondary text-muted"}`}>
              {w.day}
            </div>
            <div className="flex-1">
              <p className={`font-dm font-semibold text-sm ${w.state === "done" ? "line-through text-muted" : "text-foreground"}`}>{w.name}</p>
            </div>
            {w.state === "today" && (
              <span className="text-[10px] font-barlow font-bold tracking-[1px] uppercase bg-primary text-white px-2 py-0.5 rounded-full">HOJE</span>
            )}
            {w.state === "done" && <Check size={16} className="text-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TreinoTab;
