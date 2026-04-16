import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Check, Play, Clock, X, Pause, RotateCcw, Dumbbell, PersonStanding, ChevronRight, Pencil, Zap, Trophy } from "lucide-react";
import { toast } from "sonner";
// ... types & data

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

interface Workout {
  id: string;
  name: string;
  icon: "weights" | "cardio";
  days: { day: string; name: string; state: "done" | "today" | "upcoming" }[];
  exercises: Exercise[];
}

const workoutsData: Workout[] = [
  {
    id: "rotinas",
    name: "Costas & Bíceps",
    icon: "weights",
    days: [
      { day: "SEG", name: "Peito & Tríceps", state: "done" },
      { day: "TER", name: "Costas & Bíceps", state: "today" },
      { day: "QUA", name: "Pernas", state: "upcoming" },
      { day: "QUI", name: "Ombros & Trapézio", state: "upcoming" },
      { day: "SEX", name: "Braços & Abdômen", state: "upcoming" },
    ],
    exercises: [
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
    ],
  },
  {
    id: "cardio",
    name: "Treinos de Cardio",
    icon: "cardio",
    days: [
      { day: "TER", name: "HIIT 30min", state: "today" },
      { day: "QUI", name: "Esteira 45min", state: "upcoming" },
      { day: "SAB", name: "Bike 40min", state: "upcoming" },
    ],
    exercises: [
      {
        name: "Burpees",
        videoThumb: "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=300&h=300&fit=crop",
        series: [
          { reps: "3x15", load: "0", rest: "45s" },
          { reps: "2x20", load: "0", rest: "30s" },
        ],
        done: false,
      },
      {
        name: "Mountain Climbers",
        videoThumb: "https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=300&h=300&fit=crop",
        series: [
          { reps: "3x30s", load: "0", rest: "30s" },
          { reps: "2x45s", load: "0", rest: "30s" },
        ],
        done: false,
      },
    ],
  },
];

const parseRestSeconds = (rest: string): number => {
  const match = rest.match(/(\d+)/);
  return match ? parseInt(match[1]) : 60;
};

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const LoadModal = ({
  value,
  onSave,
  onClose,
}: {
  value: string;
  onSave: (v: string) => void;
  onClose: () => void;
}) => {
  const [input, setInput] = useState(value === "0" ? "" : value);
  const numVal = parseFloat(input) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-[340px] bg-card rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-dm font-semibold text-sm text-foreground">Atualizar carga (kg)</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary">
            <X size={16} className="text-muted" />
          </button>
        </div>
        <input
          type="number"
          inputMode="decimal"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          className="w-full h-14 rounded-2xl bg-secondary text-center text-2xl font-barlow font-[800] text-foreground border border-muted/20 outline-none focus:ring-2 focus:ring-primary/30 mb-3"
        />
        <div className="flex gap-2 mb-4">
          {[2.5, 5, 10].map((inc) => (
            <button
              key={inc}
              onClick={() => setInput(String(numVal + inc))}
              className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground font-dm font-semibold text-sm active:scale-95 transition-transform"
            >
              +{inc}kg
            </button>
          ))}
        </div>
        <button
          onClick={() => { onSave(input); onClose(); }}
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-barlow font-bold text-base active:scale-[0.98] transition-transform"
          style={{ boxShadow: "0 3px 10px #1400FF44" }}
        >
          Atualizar
        </button>
      </div>
    </div>
  );
};

const TimerModal = ({
  seconds: initialSeconds,
  onClose,
}: {
  seconds: number;
  onClose: () => void;
}) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [running, timeLeft]);

  const progress = 1 - timeLeft / initialSeconds;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-[320px] bg-card rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-dm font-semibold text-sm text-foreground">Intervalo</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary">
            <X size={16} className="text-muted" />
          </button>
        </div>
        <div className="flex items-center justify-center my-4">
          <div className="relative w-44 h-44">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
              <circle cx="100" cy="100" r={radius} fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-barlow font-[800] text-3xl text-foreground">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setRunning(!running)} className="w-12 h-12 rounded-full bg-primary flex items-center justify-center active:scale-95 transition-transform" style={{ boxShadow: "0 3px 10px #1400FF44" }}>
            {running ? <Pause size={20} className="text-primary-foreground" /> : <Play size={20} className="text-primary-foreground fill-primary-foreground" />}
          </button>
          <button onClick={() => { setTimeLeft(initialSeconds); setRunning(false); }} className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition-transform">
            <RotateCcw size={18} className="text-muted" />
          </button>
        </div>
      </div>
    </div>
  );
};

const XP_LOAD = 5;
const XP_START = 10;
const XP_COMPLETE = 25;

const XpCompletionModal = ({
  xpBreakdown,
  onClose,
}: {
  xpBreakdown: { loads: number; start: boolean; complete: boolean };
  onClose: () => void;
}) => {
  const loadXp = xpBreakdown.loads * XP_LOAD;
  const startXp = xpBreakdown.start ? XP_START : 0;
  const completeXp = xpBreakdown.complete ? XP_COMPLETE : 0;
  const total = loadXp + startXp + completeXp;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-[340px] bg-card rounded-3xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Trophy size={32} className="text-primary" />
        </div>
        <h2 className="font-barlow font-bold text-xl text-foreground mb-1">TREINO CONCLUÍDO! 🎉</h2>
        <p className="text-sm font-dm text-muted mb-5">Parabéns pela dedicação!</p>

        <div className="space-y-2 mb-5">
          {xpBreakdown.start && (
            <div className="flex items-center justify-between bg-secondary rounded-xl px-4 py-2.5">
              <span className="text-sm font-dm text-foreground">Início do treino</span>
              <span className="font-barlow font-bold text-primary">+{XP_START} XP</span>
            </div>
          )}
          {xpBreakdown.loads > 0 && (
            <div className="flex items-center justify-between bg-secondary rounded-xl px-4 py-2.5">
              <span className="text-sm font-dm text-foreground">Cargas anotadas ({xpBreakdown.loads}x)</span>
              <span className="font-barlow font-bold text-primary">+{loadXp} XP</span>
            </div>
          )}
          {xpBreakdown.complete && (
            <div className="flex items-center justify-between bg-secondary rounded-xl px-4 py-2.5">
              <span className="text-sm font-dm text-foreground">Treino completo</span>
              <span className="font-barlow font-bold text-primary">+{XP_COMPLETE} XP</span>
            </div>
          )}
        </div>

        <div className="rounded-2xl p-4 mb-5" style={{ background: "linear-gradient(135deg, #1400FF 0%, #0A00B0 100%)" }}>
          <p className="text-white/70 text-[10px] font-barlow tracking-[2px] uppercase">XP TOTAL GANHO</p>
          <p className="font-barlow font-[800] text-4xl text-white">+{total}</p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-barlow font-bold text-base active:scale-[0.98] transition-transform"
          style={{ boxShadow: "0 3px 10px #1400FF44" }}
        >
          FECHAR
        </button>
      </div>
    </div>
  );
};

type Screen = "menu" | "days" | "exercises";

const TreinoTab = () => {
  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [started, setStarted] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [editTarget, setEditTarget] = useState<{ ex: number; s: number } | null>(null);
  const [timerTarget, setTimerTarget] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [loadAnnotations, setLoadAnnotations] = useState(0);
  const [showXpModal, setShowXpModal] = useState(false);

  const openWorkout = (w: Workout) => {
    setSelectedWorkout(w);
    setScreen("days");
  };

  const openDay = (dayName: string, w: Workout) => {
    setSelectedDay(dayName);
    setExercises(w.exercises.map(e => ({ ...e, done: false })));
    setStarted(false);
    setLoadAnnotations(0);
    setShowXpModal(false);
    setScreen("exercises");
  };

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
    if (value && value !== "0") {
      setLoadAnnotations(prev => prev + 1);
      toast(`+${XP_LOAD} XP — Carga anotada!`, { icon: <Zap size={16} className="text-primary" /> });
    }
  };

  const toggleExerciseDone = (idx: number) => {
    setExercises(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], done: !updated[idx].done };
      return updated;
    });
  };

  const handleStartWorkout = () => {
    setStarted(true);
    toast(`+${XP_START} XP — Treino iniciado!`, { icon: <Zap size={16} className="text-primary" /> });
  };

  const handleFinishWorkout = useCallback(() => {
    setShowXpModal(true);
  }, []);

  // Screen: Exercise detail
  if (screen === "exercises" && selectedWorkout) {
    const doneCount = exercises.filter(e => e.done).length;

    return (
      <div className="flex flex-col h-full">
        {/* Fixed header */}
        <div className="sticky top-0 z-10 bg-background px-4 pt-4 pb-3">
          <button onClick={() => setScreen("days")} className="flex items-center gap-1 text-primary text-sm font-dm font-semibold mb-3 min-h-[44px]">
            <ArrowLeft size={18} /> Voltar
          </button>
          <h1 className="font-barlow font-bold text-lg text-foreground mb-1 leading-tight">{selectedDay.toUpperCase()}</h1>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${(doneCount / exercises.length) * 100}%`, background: "linear-gradient(90deg, #1400FF, #0A00B0)" }} />
            </div>
            <span className="text-xs font-dm text-muted">{doneCount}/{exercises.length}</span>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-24">
          {!started && (
            <div className="mb-4">
              <button onClick={handleStartWorkout} className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-barlow font-bold text-base tracking-wide active:scale-[0.98] transition-transform" style={{ boxShadow: "0 3px 10px #1400FF44" }}>
                INICIAR
              </button>
              <p className="text-center text-[11px] text-muted font-dm mt-2">Modo visualização. Aperte INICIAR para começar.</p>
            </div>
          )}

          {started && doneCount === exercises.length && doneCount > 0 && !showXpModal && (
            <div className="mb-4">
              <button onClick={handleFinishWorkout} className="w-full py-3.5 rounded-2xl font-barlow font-bold text-base tracking-wide text-white active:scale-[0.98] transition-transform" style={{ background: "linear-gradient(135deg, #1400FF 0%, #0A00B0 100%)", boxShadow: "0 3px 14px #1400FF55" }}>
                🏆 FINALIZAR TREINO
              </button>
            </div>
          )}

          <div className="space-y-2.5">
            {exercises.map((ex, i) => (
              <div key={i} className={`rounded-2xl bg-card card-shadow overflow-hidden transition-all ${ex.done ? "opacity-50" : ""}`}>
                <div className="flex items-start gap-2.5 p-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleExerciseDone(i)}
                    className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${ex.done ? "bg-primary border-primary" : "border-muted/30"}`}>
                      {ex.done && <Check size={12} className="text-primary-foreground" />}
                    </div>
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-dm font-semibold text-[13px] text-foreground leading-tight ${ex.done ? "line-through" : ""}`}>{ex.name}</h3>
                    <div className="mt-2 space-y-0">
                      {ex.series.map((s, si) => (
                        <div key={si} className={`flex items-center gap-1 py-1.5 ${si > 0 ? "border-t border-muted/10" : ""}`}>
                          <span className="text-[11px] font-dm text-foreground font-semibold w-[60px] shrink-0">{s.reps}</span>
                          <button
                            onClick={() => setEditTarget({ ex: i, s: si })}
                            className="flex items-center gap-1 text-primary min-h-[32px] px-1"
                          >
                            <span className="text-[11px] font-dm font-semibold">{s.load}kg</span>
                            <Pencil size={10} />
                          </button>
                          <button
                            onClick={() => setTimerTarget(parseRestSeconds(s.rest))}
                            className="flex items-center gap-1 text-muted ml-auto min-h-[32px] px-1"
                          >
                            <Clock size={11} />
                            <span className="text-[11px] font-dm">{s.rest}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Thumbnail */}
                  <div className="relative w-16 h-20 rounded-xl overflow-hidden shrink-0">
                    <img src={ex.videoThumb} alt={ex.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Play size={16} className="text-white fill-white" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {editTarget && (
          <LoadModal value={exercises[editTarget.ex].series[editTarget.s].load} onSave={(v) => updateLoad(editTarget.ex, editTarget.s, v)} onClose={() => setEditTarget(null)} />
        )}
        {timerTarget !== null && (
          <TimerModal seconds={timerTarget} onClose={() => setTimerTarget(null)} />
        )}
        {showXpModal && (
          <XpCompletionModal
            xpBreakdown={{ loads: loadAnnotations, start: started, complete: true }}
            onClose={() => setShowXpModal(false)}
          />
        )}
      </div>
    );
  }

  // Screen: Days list
  if (screen === "days" && selectedWorkout) {
    return (
      <div className="px-4 pt-4 pb-24">
        <button onClick={() => setScreen("menu")} className="flex items-center gap-1 text-primary text-sm font-dm font-semibold mb-3 min-h-[44px]">
          <ArrowLeft size={18} /> Voltar
        </button>
        <h1 className="font-barlow font-bold text-xl text-foreground mb-4">{selectedWorkout.name.toUpperCase()}</h1>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Concluídos", value: `${selectedWorkout.days.filter(d => d.state === "done").length}/${selectedWorkout.days.length}` },
            { label: "Volume", value: "14.2t" },
            { label: "Streak", value: "3 dias" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-card p-3 card-shadow text-center">
              <p className="font-barlow font-[800] text-lg text-foreground">{s.value}</p>
              <p className="text-[10px] font-barlow tracking-[1px] uppercase text-muted">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {selectedWorkout.days.map((w) => (
            <button
              key={w.day}
              onClick={() => openDay(w.name, selectedWorkout)}
              className={`w-full rounded-2xl p-4 card-shadow flex items-center gap-3 text-left min-h-[56px]
                ${w.state === "done" ? "bg-card opacity-60" : w.state === "today" ? "bg-primary/5 border border-primary/20" : "bg-card"}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-barlow font-bold text-xs ${w.state === "today" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted"}`}>
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
  }

  // Screen: Menu
  return (
    <div className="px-4 pt-4 pb-24">
      <h1 className="font-barlow font-bold text-xl text-foreground mb-4">TREINOS</h1>
      <div className="space-y-3">
        {workoutsData.map((w) => (
          <button
            key={w.id}
            onClick={() => openWorkout(w)}
            className="w-full rounded-2xl bg-card card-shadow p-4 flex items-center gap-4 text-left border border-muted/10 min-h-[64px] active:scale-[0.98] transition-transform"
          >
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0">
              {w.icon === "weights" ? (
                <Dumbbell size={22} className="text-primary-foreground" />
              ) : (
                <PersonStanding size={22} className="text-primary-foreground" />
              )}
            </div>
            <p className="flex-1 font-dm font-semibold text-sm text-foreground">{w.name}</p>
            <ChevronRight size={20} className="text-muted" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default TreinoTab;
