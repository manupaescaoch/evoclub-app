import { useState, useEffect } from "react";
import { ArrowLeft, Check, Play, Clock, X, Pause, RotateCcw, Dumbbell, PersonStanding, ChevronRight } from "lucide-react";

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
    name: "Rotinas de Treinos",
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
  const [input, setInput] = useState(value);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-[390px] bg-card rounded-t-3xl p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <p className="font-dm font-semibold text-sm text-foreground mb-3">Atualize a carga utilizada:</p>
        <input
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          className="w-full h-12 rounded-2xl bg-secondary text-center text-lg font-dm font-semibold text-foreground border border-muted/20 outline-none focus:ring-2 focus:ring-primary/30 mb-4"
        />
        <button
          onClick={() => { onSave(input); onClose(); }}
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-barlow font-bold text-base"
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
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-[340px] bg-card rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-dm font-semibold text-base text-foreground">Cronômetro Regressivo</h3>
          <button onClick={onClose} className="text-muted"><X size={20} /></button>
        </div>
        <div className="flex items-center justify-center my-6">
          <div className="relative w-52 h-52">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 220 220">
              <circle cx="110" cy="110" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="10" />
              <circle cx="110" cy="110" r={radius} fill="none" stroke="hsl(var(--primary))" strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-barlow font-[800] text-4xl text-foreground">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-6">
          <button onClick={() => setRunning(!running)} className="w-14 h-14 rounded-full bg-primary flex items-center justify-center" style={{ boxShadow: "0 3px 10px #1400FF44" }}>
            {running ? <Pause size={22} className="text-primary-foreground" /> : <Play size={22} className="text-primary-foreground fill-primary-foreground" />}
          </button>
          <button onClick={() => { setTimeLeft(initialSeconds); setRunning(false); }} className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
            <RotateCcw size={20} className="text-muted" />
          </button>
        </div>
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

  const openWorkout = (w: Workout) => {
    setSelectedWorkout(w);
    setScreen("days");
  };

  const openDay = (dayName: string, w: Workout) => {
    setSelectedDay(dayName);
    setExercises(w.exercises.map(e => ({ ...e, done: false })));
    setStarted(false);
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
  };

  const toggleExerciseDone = (idx: number) => {
    setExercises(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], done: !updated[idx].done };
      return updated;
    });
  };

  // Screen: Exercise detail
  if (screen === "exercises" && selectedWorkout) {
    const doneCount = exercises.filter(e => e.done).length;

    return (
      <div className="px-4 pt-4 pb-4">
        <button onClick={() => setScreen("days")} className="flex items-center gap-1 text-primary text-sm font-dm font-semibold mb-4">
          <ArrowLeft size={18} /> Voltar
        </button>

        <h1 className="font-barlow font-bold text-xl text-foreground mb-1">{selectedDay.toUpperCase()}</h1>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${(doneCount / exercises.length) * 100}%`, background: "linear-gradient(90deg, #1400FF, #0A00B0)" }} />
          </div>
          <span className="text-xs font-dm text-muted">{doneCount}/{exercises.length}</span>
        </div>

        {!started && (
          <div className="mb-4">
            <button onClick={() => setStarted(true)} className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-barlow font-bold text-base tracking-wide" style={{ boxShadow: "0 3px 10px #1400FF44" }}>
              INICIAR
            </button>
            <p className="text-center text-xs text-muted font-dm mt-2">Você está no "modo visualização". Aperte INICIAR para começar seu treino.</p>
          </div>
        )}

        <div className="space-y-3">
          {exercises.map((ex, i) => (
            <div key={i} className={`rounded-2xl bg-card card-shadow overflow-hidden transition-all ${ex.done ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleExerciseDone(i)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${ex.done ? "bg-primary border-primary" : "border-muted/30"}`}>
                      {ex.done && <Check size={12} className="text-primary-foreground" />}
                    </button>
                    <h3 className={`font-dm font-semibold text-sm text-foreground ${ex.done ? "line-through" : ""}`}>{ex.name}</h3>
                  </div>
                  <div className="mt-2 space-y-2.5 ml-8">
                    {ex.series.map((s, si) => (
                      <div key={si}>
                        <p className="text-xs font-dm text-foreground"><span className="font-semibold">Séries:</span> {s.reps}</p>
                        <p className="text-xs font-dm text-foreground mt-0.5">
                          <span className="font-semibold">Carga:</span> {s.load}kg{" "}
                          <button onClick={() => setEditTarget({ ex: i, s: si })} className="text-primary font-dm font-semibold italic">Editar</button>
                        </p>
                        <button onClick={() => setTimerTarget(parseRestSeconds(s.rest))} className="flex items-center gap-1 text-primary mt-0.5">
                          <Clock size={12} />
                          <span className="text-xs font-dm font-medium">Intervalo: {s.rest}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative w-20 h-24 rounded-xl overflow-hidden shrink-0 mt-1">
                  <img src={ex.videoThumb} alt={ex.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Play size={20} className="text-white fill-white" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {editTarget && (
          <LoadModal value={exercises[editTarget.ex].series[editTarget.s].load} onSave={(v) => updateLoad(editTarget.ex, editTarget.s, v)} onClose={() => setEditTarget(null)} />
        )}
        {timerTarget !== null && (
          <TimerModal seconds={timerTarget} onClose={() => setTimerTarget(null)} />
        )}
      </div>
    );
  }

  // Screen: Days list for selected workout
  if (screen === "days" && selectedWorkout) {
    return (
      <div className="px-4 pt-4">
        <button onClick={() => setScreen("menu")} className="flex items-center gap-1 text-primary text-sm font-dm font-semibold mb-4">
          <ArrowLeft size={18} /> Voltar
        </button>
        <h1 className="font-barlow font-bold text-xl text-foreground mb-4">{selectedWorkout.name.toUpperCase()}</h1>

        {/* Stats */}
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

        <div className="space-y-2 pb-4">
          {selectedWorkout.days.map((w) => (
            <button
              key={w.day}
              onClick={() => openDay(w.name, selectedWorkout)}
              className={`w-full rounded-2xl p-4 card-shadow flex items-center gap-3 text-left relative
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

  // Screen: Menu (workout categories)
  return (
    <div className="px-4 pt-4">
      <h1 className="font-barlow font-bold text-xl text-foreground mb-4">TREINOS</h1>

      <div className="space-y-3">
        {workoutsData.map((w) => (
          <button
            key={w.id}
            onClick={() => openWorkout(w)}
            className="w-full rounded-2xl bg-card card-shadow p-4 flex items-center gap-4 text-left border border-muted/10"
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
