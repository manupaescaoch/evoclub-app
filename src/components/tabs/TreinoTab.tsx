import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Check, Play, Clock, X, Pause, RotateCcw, Dumbbell, PersonStanding, ChevronRight, Pencil, Zap, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStudentName } from "@/hooks/useStudentName";

const DEFAULT_THUMB =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&h=300&fit=crop";

interface ExerciseSeries {
  reps: string;
  load: string;
  rest: string;
  setId: string | null;
  setType: string | null;
  prescribedSets: number | null;
  prescribedReps: string | null;
  prescribedLoad: string | null;
  performedSets: number | null;
  performedReps: string | null;
  performedLoad: string | null;
}

interface Exercise {
  sessionExerciseId: string;
  name: string;
  videoThumb: string;
  series: ExerciseSeries[];
  done: boolean;
}

interface Workout {
  id: string;
  name: string;
  icon: "weights" | "cardio";
  days: { id: string; day: string; name: string; state: "done" | "today" | "upcoming" }[];
}

const dayShort = (label: string | null, index: number) =>
  label ? label.slice(0, 3).toUpperCase() : `D${index + 1}`;

const brazilToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

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
  series,
  onSave,
  onClose,
}: {
  series: ExerciseSeries;
  onSave: (v: { load: string; sets: string; reps: string }) => void;
  onClose: () => void;
}) => {
  const initialLoad = series.performedLoad ?? (series.load === "0" ? "" : series.load);
  const [input, setInput] = useState(initialLoad === "0" ? "" : initialLoad);
  const [setsInput, setSetsInput] = useState(
    String(series.performedSets ?? series.prescribedSets ?? "")
  );
  const [repsInput, setRepsInput] = useState(
    series.performedReps ?? series.prescribedReps ?? ""
  );
  const numVal = parseFloat(input) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-[340px] bg-card rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-dm font-semibold text-sm text-foreground">O que você executou</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary">
            <X size={16} className="text-muted" />
          </button>
        </div>
        <p className="text-[11px] font-dm text-muted mb-3">
          Prescrito: {series.prescribedSets ?? "-"}x{series.prescribedReps || "-"}
          {series.prescribedLoad ? ` · ${series.prescribedLoad}kg` : ""}
        </p>
        <p className="text-[10px] font-barlow tracking-[1px] uppercase text-muted mb-1">Carga (kg)</p>
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
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <p className="text-[10px] font-barlow tracking-[1px] uppercase text-muted mb-1">Séries feitas</p>
            <input
              type="number"
              inputMode="numeric"
              value={setsInput}
              onChange={(e) => setSetsInput(e.target.value)}
              className="w-full h-12 rounded-2xl bg-secondary text-center text-lg font-barlow font-[800] text-foreground border border-muted/20 outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-barlow tracking-[1px] uppercase text-muted mb-1">Reps feitas</p>
            <input
              value={repsInput}
              onChange={(e) => setRepsInput(e.target.value)}
              className="w-full h-12 rounded-2xl bg-secondary text-center text-lg font-barlow font-[800] text-foreground border border-muted/20 outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <button
          onClick={() => { onSave({ load: input, sets: setsInput, reps: repsInput }); onClose(); }}
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
  const { clientId } = useStudentName();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [loadingDay, setLoadingDay] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [started, setStarted] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [editTarget, setEditTarget] = useState<{ ex: number; s: number } | null>(null);
  const [timerTarget, setTimerTarget] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [loadAnnotations, setLoadAnnotations] = useState(0);
  const [showXpModal, setShowXpModal] = useState(false);
  const [logId, setLogId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Carrega o plano ativo prescrito para o aluno
  useEffect(() => {
    if (!clientId) return;
    let alive = true;
    (async () => {
      setLoadingPlan(true);
      const { data: plans } = await supabase
        .from("training_plans")
        .select("id, name, goal")
        .eq("student_id", clientId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);
      const plan = plans?.[0];
      if (!plan) {
        if (alive) { setWorkouts([]); setLoadingPlan(false); }
        return;
      }
      const { data: weeks } = await supabase
        .from("training_weeks")
        .select("id")
        .eq("training_plan_id", plan.id)
        .order("week_number")
        .limit(1);
      const week = weeks?.[0];
      let days: Workout["days"] = [];
      if (week) {
        const { data: sessions } = await supabase
          .from("training_sessions")
          .select("id, name, day_of_week, order_index")
          .eq("training_week_id", week.id)
          .order("order_index");
        const { data: todayLogs } = await supabase
          .from("workout_logs")
          .select("training_session_id, status")
          .eq("client_id", clientId)
          .eq("workout_date", brazilToday());
        const doneIds = new Set(
          (todayLogs || [])
            .filter((l) => l.status === "completed" && l.training_session_id)
            .map((l) => l.training_session_id as string)
        );
        days = (sessions || []).map((s, i) => ({
          id: s.id,
          day: dayShort(s.day_of_week, i),
          name: s.name,
          state: doneIds.has(s.id) ? ("done" as const) : ("upcoming" as const),
        }));
      }
      if (!alive) return;
      setWorkouts([{ id: plan.id, name: plan.name, icon: "weights", days }]);
      setLoadingPlan(false);
    })();
    return () => { alive = false; };
  }, [clientId]);

  const openWorkout = (w: Workout) => {
    setSelectedWorkout(w);
    setScreen("days");
  };

  const openDay = async (day: Workout["days"][number]) => {
    setSelectedDay(day.name);
    setStarted(false);
    setLoadAnnotations(0);
    setShowXpModal(false);
    setExercises([]);
    setLogId(null);
    setCurrentSessionId(day.id);
    setScreen("exercises");
    setLoadingDay(true);
    const { data: exs } = await supabase
      .from("training_session_exercises")
      .select("id, exercise_name, order_index")
      .eq("training_session_id", day.id)
      .order("order_index");
    const ids = (exs || []).map((e) => e.id);
    const { data: sets } = ids.length
      ? await supabase
          .from("training_exercise_sets")
          .select("id, session_exercise_id, set_type, sets, reps, load, rest_seconds, time_seconds, order_index")
          .in("session_exercise_id", ids)
          .order("order_index")
      : { data: [] as never[] };
    let mapped: Exercise[] = (exs || []).map((e) => ({
      sessionExerciseId: e.id,
      name: e.exercise_name,
      videoThumb: DEFAULT_THUMB,
      done: false,
      series: (sets || [])
        .filter((s) => s.session_exercise_id === e.id)
        .map((s) => ({
          reps: `${s.sets || 1}x${s.reps || (s.time_seconds ? `${s.time_seconds}s` : "-")}`,
          load: s.load || "0",
          rest: `${s.rest_seconds ?? 60}s`,
          setId: s.id,
          setType: s.set_type ?? null,
          prescribedSets: s.sets ?? null,
          prescribedReps: s.reps ?? (s.time_seconds ? `${s.time_seconds}s` : null),
          prescribedLoad: s.load ?? null,
          performedSets: null,
          performedReps: null,
          performedLoad: null,
        })),
    }));

    // Retoma um registro em andamento do mesmo dia, se existir
    if (clientId) {
      const { data: logs } = await supabase
        .from("workout_logs")
        .select("id, status")
        .eq("client_id", clientId)
        .eq("training_session_id", day.id)
        .eq("workout_date", brazilToday())
        .eq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(1);
      const log = logs?.[0];
      if (log) {
        setLogId(log.id);
        setStarted(true);
        const { data: logSets } = await supabase
          .from("workout_log_sets")
          .select("session_exercise_id, prescribed_set_id, performed_sets, performed_reps, performed_load, completed")
          .eq("workout_log_id", log.id);
        if (logSets?.length) {
          mapped = mapped.map((ex) => {
            const rows = logSets.filter((r) => r.session_exercise_id === ex.sessionExerciseId);
            if (!rows.length) return ex;
            return {
              ...ex,
              done: rows.every((r) => r.completed),
              series: ex.series.map((s) => {
                const row = rows.find((r) => r.prescribed_set_id === s.setId);
                if (!row) return s;
                return {
                  ...s,
                  load: row.performed_load ?? s.load,
                  performedSets: row.performed_sets ?? null,
                  performedReps: row.performed_reps ?? null,
                  performedLoad: row.performed_load ?? null,
                };
              }),
            };
          });
        }
      }
    }

    setExercises(mapped);
    setLoadingDay(false);
  };

  const updateLoad = (
    exerciseIdx: number,
    seriesIdx: number,
    value: { load: string; sets: string; reps: string }
  ) => {
    setExercises(prev => {
      const updated = [...prev];
      const ex = { ...updated[exerciseIdx] };
      const series = [...ex.series];
      series[seriesIdx] = {
        ...series[seriesIdx],
        load: value.load || series[seriesIdx].load,
        performedLoad: value.load || null,
        performedSets: value.sets ? parseInt(value.sets) : null,
        performedReps: value.reps || null,
      };
      ex.series = series;
      updated[exerciseIdx] = ex;
      return updated;
    });
    if (value.load && value.load !== "0") {
      setLoadAnnotations(prev => prev + 1);
      toast(`+${XP_LOAD} XP — Carga anotada!`, { icon: <Zap size={16} className="text-primary" /> });
    }
  };

  // Grava as séries executadas de um exercício no registro do dia
  const persistExercise = useCallback(async (log: string, ex: Exercise, exIdx: number, done: boolean) => {
    await supabase
      .from("workout_log_sets")
      .delete()
      .eq("workout_log_id", log)
      .eq("session_exercise_id", ex.sessionExerciseId);
    if (!done || ex.series.length === 0) return;
    const rows = ex.series.map((s, si) => ({
      workout_log_id: log,
      session_exercise_id: ex.sessionExerciseId,
      prescribed_set_id: s.setId,
      exercise_name: ex.name,
      set_type: s.setType,
      prescribed_sets: s.prescribedSets,
      prescribed_reps: s.prescribedReps,
      prescribed_load: s.prescribedLoad,
      performed_sets: s.performedSets ?? s.prescribedSets,
      performed_reps: s.performedReps ?? s.prescribedReps,
      performed_load: s.performedLoad ?? (s.load !== "0" ? s.load : s.prescribedLoad),
      completed: true,
      exercise_order: exIdx,
      order_index: si,
    }));
    await supabase.from("workout_log_sets").insert(rows);
  }, []);

  const toggleExerciseDone = async (idx: number) => {
    const next = !exercises[idx].done;
    setExercises(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], done: next };
      return updated;
    });
    if (logId) {
      await persistExercise(logId, exercises[idx], idx, next);
    }
  };

  const handleStartWorkout = async () => {
    setStarted(true);
    if (clientId && !logId) {
      const { data, error } = await supabase
        .from("workout_logs")
        .insert({
          client_id: clientId,
          training_plan_id: selectedWorkout?.id ?? null,
          training_session_id: currentSessionId,
          session_name: selectedDay,
          workout_date: brazilToday(),
          status: "in_progress",
        })
        .select("id")
        .single();
      if (!error && data) setLogId(data.id);
    }
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
          {loadingDay && <p className="text-xs font-dm text-muted py-4">Carregando treino...</p>}
          {!loadingDay && exercises.length === 0 && (
            <p className="text-xs font-dm text-muted py-4 text-center">
              Nenhum exercício cadastrado neste dia.
            </p>
          )}
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
              key={w.id}
              onClick={() => openDay(w)}
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
      {loadingPlan && <p className="text-xs font-dm text-muted">Carregando seu treino...</p>}
      {!loadingPlan && workouts.length === 0 && (
        <div className="rounded-2xl bg-card card-shadow p-5 text-center">
          <p className="font-dm font-semibold text-sm text-foreground">Nenhum treino prescrito</p>
          <p className="text-xs font-dm text-muted-foreground mt-1">
            Fale com seu professor para receber seu plano de treino.
          </p>
        </div>
      )}
      <div className="space-y-3">
        {workouts.map((w) => (
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
