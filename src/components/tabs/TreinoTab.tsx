import { useState } from "react";
import { ArrowLeft, Check, Play, Clock, ChevronDown, ChevronUp } from "lucide-react";

interface ExerciseSeries {
  reps: string;
  load: string;
  rest: string;
}

interface Exercise {
  name: string;
  videoThumb: string;
  series: ExerciseSeries[];
  done: boolean;
}

const workouts = [
  { day: "SEG", name: "Peito & Tríceps", state: "done" as const },
  { day: "TER", name: "Costas & Bíceps", state: "today" as const },
  { day: "QUA", name: "Pernas", state: "upcoming" as const },
  { day: "QUI", name: "Ombros & Trapézio", state: "upcoming" as const },
  { day: "SEX", name: "Braços & Abdômen", state: "upcoming" as const },
];

const initialExercises: Exercise[] = [
  {
    name: "Puxada Frontal",
    videoThumb: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&h=300&fit=crop",
    series: [
      { reps: "1x15-20", load: "0", rest: "60s" },
      { reps: "2x12-15", load: "0", rest: "60s" },
      { reps: "2x8-12", load: "0", rest: "60s" },
    ],
    done: false,
  },
  {
    name: "Remada Curvada",
    videoThumb: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=300&h=300&fit=crop",
    series: [
      { reps: "1x15-20", load: "0", rest: "60s" },
      { reps: "2x12-15", load: "0", rest: "60s" },
      { reps: "2x8-12", load: "0", rest: "60s" },
    ],
    done: false,
  },
  {
    name: "Remada Unilateral",
    videoThumb: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=300&h=300&fit=crop",
    series: [
      { reps: "1x15-20", load: "0", rest: "60s" },
      { reps: "3x12", load: "0", rest: "60s" },
    ],
    done: false,
  },
  {
    name: "Pulldown Corda",
    videoThumb: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=300&h=300&fit=crop",
    series: [
      { reps: "1x15-20", load: "0", rest: "60s" },
      { reps: "2x12-15", load: "0", rest: "60s" },
      { reps: "2x8-12", load: "0", rest: "60s" },
    ],
    done: false,
  },
  {
    name: "Rosca Direta",
    videoThumb: "https://images.unsplash.com/photo-1581009137042-c552e485697a?w=300&h=300&fit=crop",
    series: [
      { reps: "1x15-20", load: "0", rest: "60s" },
      { reps: "2x12-15", load: "0", rest: "60s" },
      { reps: "2x8-12", load: "0", rest: "60s" },
    ],
    done: false,
  },
  {
    name: "Rosca Martelo",
    videoThumb: "https://images.unsplash.com/photo-1584952811565-c4c4031a2cd2?w=300&h=300&fit=crop",
    series: [
      { reps: "1x15-20", load: "0", rest: "60s" },
      { reps: "3x12", load: "0", rest: "60s" },
    ],
    done: false,
  },
];

const TreinoTab = () => {
  const [drillDown, setDrillDown] = useState(false);
  const [started, setStarted] = useState(false);
  const [exercises, setExercises] = useState(initialExercises);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);

  const updateLoad = (exerciseIdx: number, seriesIdx: number, value: string) => {
    setExercises(prev => {
      const updated = [...prev];
      const ex = { ...updated[exerciseIdx] };
      const series = [...ex.series];
      series[seriesIdx] = { ...series[seriesIdx], load: value };
      ex.series = series;
      updated[exerciseIdx] = ex;
      return updated;
    });
  };

  const toggleExerciseDone = (idx: number) => {
    setExercises(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], done: !updated[idx].done };
      return updated;
    });
  };

  if (drillDown) {
    const doneCount = exercises.filter(e => e.done).length;

    return (
      <div className="px-4 pt-4 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { setDrillDown(false); setStarted(false); }} className="flex items-center gap-1 text-primary text-sm font-dm font-semibold">
            <ArrowLeft size={18} /> Voltar
          </button>
        </div>

        <h1 className="font-barlow font-bold text-xl text-foreground mb-1">COSTAS & BÍCEPS</h1>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(doneCount / exercises.length) * 100}%`,
                background: "linear-gradient(90deg, #1400FF, #0A00B0)",
              }}
            />
          </div>
          <span className="text-xs font-dm text-muted">{doneCount}/{exercises.length}</span>
        </div>

        {/* Start button */}
        {!started && (
          <div className="mb-4">
            <button
              onClick={() => setStarted(true)}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-barlow font-bold text-base tracking-wide"
              style={{ boxShadow: "0 3px 10px #1400FF44" }}
            >
              INICIAR
            </button>
            <p className="text-center text-xs text-muted font-dm mt-2">
              Você está no "modo visualização". Aperte INICIAR para começar seu treino.
            </p>
          </div>
        )}

        {/* Exercise list */}
        <div className="space-y-3">
          {exercises.map((ex, i) => (
            <div
              key={i}
              className={`rounded-2xl bg-card card-shadow overflow-hidden transition-all ${ex.done ? "opacity-60" : ""}`}
            >
              {/* Exercise header */}
              <div
                className="flex items-start gap-3 p-4 cursor-pointer"
                onClick={() => setExpandedExercise(expandedExercise === i ? null : i)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {started && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleExerciseDone(i); }}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                          ${ex.done ? "bg-primary border-primary" : "border-muted/30"}`}
                      >
                        {ex.done && <Check size={12} className="text-primary-foreground" />}
                      </button>
                    )}
                    <h3 className={`font-dm font-semibold text-sm text-foreground ${ex.done ? "line-through" : ""}`}>
                      {ex.name}
                    </h3>
                  </div>

                  {/* Series with load inputs */}
                  <div className="mt-2 space-y-2">
                    {ex.series.map((s, si) => (
                      <div key={si}>
                        <p className="text-xs font-dm text-foreground">
                          <span className="font-semibold">Séries:</span> {s.reps}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-dm font-semibold text-foreground">Carga:</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={s.load}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => updateLoad(i, si, e.target.value)}
                                className="w-14 h-7 rounded-lg bg-secondary text-center text-xs font-dm font-semibold text-foreground border-none outline-none focus:ring-2 focus:ring-primary/30"
                              />
                              <span className="text-xs font-dm text-muted">kg</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-primary">
                            <Clock size={12} />
                            <span className="text-xs font-dm font-medium">Intervalo: {s.rest}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Video thumbnail */}
                <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
                  <img src={ex.videoThumb} alt={ex.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Play size={20} className="text-white fill-white" />
                  </div>
                </div>
              </div>

              {/* Expanded series details */}
              {expandedExercise === i && (
                <div className="px-4 pb-4 space-y-3 border-t border-secondary">
                  {ex.series.map((s, si) => (
                    <div key={si} className="pt-3">
                      <p className="text-xs font-dm font-semibold text-foreground mb-1">
                        Séries: {s.reps}
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-dm font-semibold text-foreground">Carga:</span>
                          {started ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={s.load}
                                onChange={(e) => updateLoad(i, si, e.target.value)}
                                className="w-14 h-7 rounded-lg bg-secondary text-center text-xs font-dm font-semibold text-foreground border-none outline-none focus:ring-2 focus:ring-primary/30"
                              />
                              <span className="text-xs font-dm text-muted">kg</span>
                            </div>
                          ) : (
                            <span className="text-xs font-dm text-muted">{s.load}kg</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-primary">
                          <Clock size={12} />
                          <span className="text-xs font-dm font-medium">Intervalo: {s.rest}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
          <div key={s.label} className="rounded-2xl bg-card p-3 card-shadow text-center">
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
              ${w.state === "done" ? "bg-card opacity-60" : w.state === "today" ? "bg-primary/5 border border-primary/20" : "bg-card"}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-barlow font-bold text-xs
              ${w.state === "today" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted"}`}>
              {w.day}
            </div>
            <div className="flex-1">
              <p className={`font-dm font-semibold text-sm ${w.state === "done" ? "line-through text-muted" : "text-foreground"}`}>{w.name}</p>
            </div>
            {w.state === "today" && (
              <span className="text-[10px] font-barlow font-bold tracking-[1px] uppercase bg-primary text-primary-foreground px-2 py-0.5 rounded-full">HOJE</span>
            )}
            {w.state === "done" && <Check size={16} className="text-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TreinoTab;
