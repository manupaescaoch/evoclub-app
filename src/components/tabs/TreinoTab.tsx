import { useState, useEffect, useCallback, useRef } from "react";
import VolumeSemanalCard from "@/components/tabs/VolumeSemanalCard";
import {
  ArrowLeft, Check, Play, Clock, X, Pause, RotateCcw, Pencil, Zap, Trophy,
  ChevronRight, AlertTriangle, CalendarDays, Info, Sparkles, Archive, History,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStudentName } from "@/hooks/useStudentName";
import { useTrainingPlan, brazilToday, daysToSwap, swapStatus } from "@/hooks/useTrainingPlan";

interface Serie {
  setId: string | null;
  setType: string | null;
  label: string;
  rest: number;
  methodName: string | null;
  notes: string | null;
  prescribedSets: number | null;
  prescribedReps: string | null;
  prescribedLoad: string | null;
  prescribedTime: number | null;
  prescribedIncline: string | null;
  performedSets: number | null;
  performedReps: string | null;
  performedLoad: string | null;
  performedTime: number | null;
  performedDistance: string | null;
  performedSpeed: string | null;
  performedIncline: string | null;
  performedCalories: string | null;
  cardio: boolean;
  completed: boolean;
  lastExecution: string | null;
}

interface Exercise {
  sessionExerciseId: string;
  name: string;
  notes: string | null;
  videoUrl: string | null;
  series: Serie[];
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const fmtDate = (d: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—";

const isCardioType = (t: string | null) =>
  !!t && /cardio|corrida|inclina|tempo/i.test(t);

/** Existe algum dado registrado pelo aluno nessa série? */
const hasPerformedData = (s: {
  performedSets: number | null; performedReps: string | null; performedLoad: string | null;
  performedTime: number | null; performedDistance: string | null; performedSpeed: string | null;
  performedIncline: string | null; performedCalories: string | null;
}) =>
  [s.performedSets, s.performedReps, s.performedLoad, s.performedTime,
   s.performedDistance, s.performedSpeed, s.performedIncline, s.performedCalories]
    .some((v) => v !== null && v !== undefined && String(v).trim() !== "");

const XP_LOAD = 5;
const XP_START = 10;
const XP_COMPLETE = 25;
const AUTO_FINISH_MS = 2 * 60 * 60 * 1000;

/* ---------------- Modais ---------------- */

const LoadModal = ({
  serie, onSave, onClose,
}: {
  serie: Serie;
  onSave: (v: {
    load: string; sets: string; reps: string;
    time?: string; distance?: string; speed?: string; incline?: string; calories?: string;
  }) => void;
  onClose: () => void;
}) => {
  const [input, setInput] = useState(serie.performedLoad ?? serie.prescribedLoad ?? "");
  const [setsInput, setSetsInput] = useState(String(serie.performedSets ?? serie.prescribedSets ?? ""));
  const [repsInput, setRepsInput] = useState(serie.performedReps ?? serie.prescribedReps ?? "");
  const [timeInput, setTimeInput] = useState(
    String(serie.performedTime ?? serie.prescribedTime ?? "")
  );
  const [distanceInput, setDistanceInput] = useState(serie.performedDistance ?? "");
  const [speedInput, setSpeedInput] = useState(serie.performedSpeed ?? "");
  const [inclineInput, setInclineInput] = useState(serie.performedIncline ?? serie.prescribedIncline ?? "");
  const [caloriesInput, setCaloriesInput] = useState(serie.performedCalories ?? "");
  const numVal = parseFloat(input) || 0;

  const save = () =>
    onSave({
      load: input, sets: setsInput, reps: repsInput,
      time: timeInput, distance: distanceInput, speed: speedInput,
      incline: inclineInput, calories: caloriesInput,
    });

  const field = (label: string, value: string, set: (v: string) => void, numeric = true) => (
    <div className="flex-1">
      <p className="text-[10px] font-barlow tracking-[1px] uppercase text-muted mb-1">{label}</p>
      <input
        {...(numeric ? { type: "number", inputMode: "decimal" as const } : {})}
        value={value} onChange={(e) => set(e.target.value)}
        className="w-full h-12 rounded-2xl bg-secondary text-center text-lg font-barlow font-[800] text-foreground border border-muted/20 outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );

  if (serie.cardio) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative w-full max-w-[340px] bg-card rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <p className="font-dm font-semibold text-sm text-foreground">Registro do cardio</p>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary">
              <X size={16} className="text-muted" />
            </button>
          </div>
          <p className="text-[11px] font-dm text-muted mb-1">
            Prescrito: {serie.prescribedTime ? `${Math.round(serie.prescribedTime / 60)} min` : serie.prescribedReps || "-"}
            {serie.prescribedIncline ? ` · inclinação ${serie.prescribedIncline}` : ""}
          </p>
          {serie.lastExecution && (
            <p className="text-[11px] font-dm text-primary mb-3">Última vez: {serie.lastExecution}</p>
          )}
          <div className="flex gap-2 mb-3">
            {field("Tempo (s)", timeInput, setTimeInput)}
            {field("Distância (km)", distanceInput, setDistanceInput)}
          </div>
          <div className="flex gap-2 mb-3">
            {field("Velocidade", speedInput, setSpeedInput)}
            {field("Inclinação", inclineInput, setInclineInput, false)}
          </div>
          <div className="flex gap-2 mb-4">
            {field("Calorias", caloriesInput, setCaloriesInput)}
          </div>
          <button
            onClick={() => { save(); onClose(); }}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-barlow font-bold text-base active:scale-[0.98] transition-transform"
            style={{ boxShadow: "0 3px 10px #0057FF44" }}
          >
            Salvar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-[340px] bg-card rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-dm font-semibold text-sm text-foreground">O que você executou</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary">
            <X size={16} className="text-muted" />
          </button>
        </div>
        <p className="text-[11px] font-dm text-muted mb-1">
          Prescrito: {serie.prescribedSets ?? "-"}x{serie.prescribedReps || "-"}
          {serie.prescribedLoad ? ` · ${serie.prescribedLoad}kg` : ""}
        </p>
        {serie.lastExecution && (
          <p className="text-[11px] font-dm text-primary mb-3">Última vez: {serie.lastExecution}</p>
        )}
        <p className="text-[10px] font-barlow tracking-[1px] uppercase text-muted mb-1">Carga (kg)</p>
        <input
          type="number" inputMode="decimal" value={input} autoFocus
          onChange={(e) => setInput(e.target.value)}
          className="w-full h-14 rounded-2xl bg-secondary text-center text-2xl font-barlow font-[800] text-foreground border border-muted/20 outline-none focus:ring-2 focus:ring-primary/30 mb-3"
        />
        <div className="flex gap-2 mb-4">
          {[2.5, 5, 10].map((inc) => (
            <button key={inc} onClick={() => setInput(String(numVal + inc))}
              className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground font-dm font-semibold text-sm active:scale-95 transition-transform">
              +{inc}kg
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <p className="text-[10px] font-barlow tracking-[1px] uppercase text-muted mb-1">Séries feitas</p>
            <input type="number" inputMode="numeric" value={setsInput} onChange={(e) => setSetsInput(e.target.value)}
              className="w-full h-12 rounded-2xl bg-secondary text-center text-lg font-barlow font-[800] text-foreground border border-muted/20 outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-barlow tracking-[1px] uppercase text-muted mb-1">Reps feitas</p>
            <input value={repsInput} onChange={(e) => setRepsInput(e.target.value)}
              className="w-full h-12 rounded-2xl bg-secondary text-center text-lg font-barlow font-[800] text-foreground border border-muted/20 outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <button
          onClick={() => { save(); onClose(); }}
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-barlow font-bold text-base active:scale-[0.98] transition-transform"
          style={{ boxShadow: "0 3px 10px #0057FF44" }}
        >
          Salvar
        </button>
      </div>
    </div>
  );
};

const RestTimer = ({ seconds, onClose }: { seconds: number; onClose: () => void }) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [running, timeLeft]);

  const progress = 1 - timeLeft / seconds;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-[320px] bg-card rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-dm font-semibold text-sm text-foreground">Descanso</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary">
            <X size={16} className="text-muted" />
          </button>
        </div>
        <div className="flex items-center justify-center my-4">
          <div className="relative w-44 h-44">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
              <circle cx="100" cy="100" r={radius} fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                strokeLinecap="round" strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)} className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-barlow font-[800] text-3xl text-foreground">{formatTime(Math.max(timeLeft, 0))}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 mb-3">
          <button onClick={() => setRunning(!running)}
            className="w-12 h-12 rounded-full bg-primary flex items-center justify-center active:scale-95 transition-transform"
            style={{ boxShadow: "0 3px 10px #0057FF44" }}>
            {running ? <Pause size={20} className="text-primary-foreground" /> : <Play size={20} className="text-primary-foreground fill-primary-foreground" />}
          </button>
          <button onClick={() => { setTimeLeft(seconds); setRunning(true); }}
            className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition-transform">
            <RotateCcw size={18} className="text-muted" />
          </button>
        </div>
        <button onClick={onClose} className="w-full py-3 rounded-2xl bg-secondary font-dm font-semibold text-sm text-foreground">
          Pular descanso
        </button>
      </div>
    </div>
  );
};

const VideoModal = ({ url, name, onClose }: { url: string; name: string; onClose: () => void }) => {
  const embed = url.includes("watch?v=")
    ? url.replace("watch?v=", "embed/")
    : url.includes("youtu.be/")
      ? url.replace("youtu.be/", "www.youtube.com/embed/")
      : url;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-[350px] bg-card rounded-3xl p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-dm font-semibold text-sm text-foreground truncate pr-2">{name}</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary shrink-0">
            <X size={16} className="text-muted" />
          </button>
        </div>
        <div className="rounded-2xl overflow-hidden bg-black aspect-video">
          <iframe src={embed} title={name} allowFullScreen className="w-full h-full" />
        </div>
      </div>
    </div>
  );
};

export interface PostWorkoutAnswers {
  rpe: number;
  stars: number;
  note: string;
  pain: boolean;
  painNote: string;
}

const RPE_FACES = [
  { v: 1, emoji: "😄", label: "Leve" },
  { v: 2, emoji: "🙂", label: "Tranquilo" },
  { v: 3, emoji: "😐", label: "Moderado" },
  { v: 4, emoji: "😥", label: "Difícil" },
  { v: 5, emoji: "🥵", label: "Máximo" },
];

const PostWorkoutModal = ({
  onSubmit, saving,
}: {
  onSubmit: (a: PostWorkoutAnswers) => void;
  saving: boolean;
}) => {
  const [rpe, setRpe] = useState(0);
  const [stars, setStars] = useState(0);
  const [note, setNote] = useState("");
  const [pain, setPain] = useState<boolean | null>(null);
  const [painNote, setPainNote] = useState("");
  const needsNote = stars > 0 && stars <= 2;
  const valid = rpe > 0 && stars > 0 && pain !== null && (!pain || painNote.trim().length > 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-[350px] max-h-[88vh] overflow-y-auto bg-card rounded-3xl p-5">
        <h2 className="font-barlow font-bold text-lg text-foreground">COMO FOI O TREINO?</h2>
        <p className="text-[12px] font-dm text-muted mb-4">Leva menos de 30 segundos.</p>

        <p className="text-[10px] font-barlow tracking-[1px] uppercase text-muted mb-2">Esforço percebido</p>
        <div className="flex gap-1.5 mb-4">
          {RPE_FACES.map((f) => (
            <button key={f.v} onClick={() => setRpe(f.v)}
              className={`flex-1 rounded-2xl py-2 flex flex-col items-center transition-colors ${rpe === f.v ? "bg-primary/10 ring-2 ring-primary" : "bg-secondary"}`}>
              <span className="text-xl leading-none">{f.emoji}</span>
              <span className="text-[9px] font-dm text-muted mt-1">{f.label}</span>
            </button>
          ))}
        </div>

        <p className="text-[10px] font-barlow tracking-[1px] uppercase text-muted mb-2">Acompanhamento do professor</p>
        <div className="flex gap-1.5 mb-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} onClick={() => setStars(s)}
              className={`flex-1 h-11 rounded-2xl font-barlow font-bold text-lg transition-colors ${stars >= s ? "bg-primary/10 text-primary" : "bg-secondary text-muted"}`}>
              ★
            </button>
          ))}
        </div>
        {needsNote && (
          <textarea value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Conta pra gente o que pode melhorar"
            className="w-full min-h-[70px] rounded-2xl bg-secondary p-3 text-[13px] font-dm text-foreground border border-muted/20 outline-none focus:ring-2 focus:ring-primary/30 mb-3" />
        )}

        <p className="text-[10px] font-barlow tracking-[1px] uppercase text-muted mb-2 mt-2">Sentiu alguma dor?</p>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setPain(false)}
            className={`flex-1 py-3 rounded-2xl font-dm font-semibold text-sm ${pain === false ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
            Não
          </button>
          <button onClick={() => setPain(true)}
            className={`flex-1 py-3 rounded-2xl font-dm font-semibold text-sm ${pain === true ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
            Sim
          </button>
        </div>
        {pain && (
          <textarea value={painNote} onChange={(e) => setPainNote(e.target.value)}
            placeholder="Onde doeu e em qual exercício?"
            className="w-full min-h-[80px] rounded-2xl bg-secondary p-3 text-[13px] font-dm text-foreground border border-muted/20 outline-none focus:ring-2 focus:ring-primary/30 mb-3" />
        )}

        <button
          disabled={!valid || saving}
          onClick={() => onSubmit({ rpe, stars, note, pain: !!pain, painNote })}
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-barlow font-bold text-base active:scale-[0.98] transition-transform disabled:opacity-50"
          style={{ boxShadow: "0 3px 10px #0057FF44" }}
        >
          {saving ? "SALVANDO..." : "ENVIAR E FINALIZAR"}
        </button>
      </div>
    </div>
  );
};

const XpCompletionModal = ({
  xpBreakdown, onClose,
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
        <div className="rounded-2xl p-4 mb-5" style={{ background: "linear-gradient(135deg, #0057FF 0%, #0043C4 100%)" }}>
          <p className="text-white/70 text-[10px] font-barlow tracking-[2px] uppercase">XP TOTAL GANHO</p>
          <p className="font-barlow font-[800] text-4xl text-white">+{total}</p>
        </div>
        <button onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-barlow font-bold text-base active:scale-[0.98] transition-transform"
          style={{ boxShadow: "0 3px 10px #0057FF44" }}>
          FECHAR
        </button>
      </div>
    </div>
  );
};

/* ---------------- Tela principal ---------------- */

const TreinoTab = () => {
  const { clientId } = useStudentName();
  const { plan, archived, loading, reload } = useTrainingPlan(clientId);
  const [screen, setScreen] = useState<"plan" | "session">("plan");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadingSession, setLoadingSession] = useState(false);
  const [started, setStarted] = useState(false);
  const [logId, setLogId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [loadAnnotations, setLoadAnnotations] = useState(0);
  const [editTarget, setEditTarget] = useState<{ ex: number; s: number } | null>(null);
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [videoTarget, setVideoTarget] = useState<{ url: string; name: string } | null>(null);
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  const [showXpModal, setShowXpModal] = useState(false);
  const [showPostWorkout, setShowPostWorkout] = useState(false);
  const [saving, setSaving] = useState(false);
  const finishRef = useRef<(auto?: boolean) => void>(() => {});
  const logPromiseRef = useRef<Promise<string | null> | null>(null);

  /** Garante o id do registro mesmo que o INSERT do log ainda esteja em voo. */
  const ensureLogId = useCallback(async () => {
    if (logId) return logId;
    if (logPromiseRef.current) return await logPromiseRef.current;
    return null;
  }, [logId]);

  const swap = swapStatus(plan?.expiresAt ?? null);
  const remaining = daysToSwap(plan?.expiresAt ?? null);

  const openSession = async (id: string, name: string) => {
    setSessionId(id);
    setSessionName(name);
    setScreen("session");
    setExercises([]);
    setStarted(false);
    setLogId(null);
    setStartedAt(null);
    setLoadAnnotations(0);
    setShowXpModal(false);
    setLoadingSession(true);

    const { data: exs } = await supabase
      .from("training_session_exercises")
      .select("id, exercise_name, exercise_id, notes, order_index")
      .eq("training_session_id", id)
      .order("order_index");

    const exIds = (exs || []).map((e) => e.id);
    const { data: sets } = exIds.length
      ? await supabase
          .from("training_exercise_sets")
          .select("id, session_exercise_id, set_type, sets, reps, load, rest_seconds, time_seconds, incline, cadence, notes, method_id, order_index")
          .in("session_exercise_id", exIds)
          .order("order_index")
      : { data: [] as any[] };

    const methodIds = [...new Set((sets || []).map((s) => s.method_id).filter(Boolean))] as string[];
    const { data: methods } = methodIds.length
      ? await supabase.from("training_methods").select("id, name").in("id", methodIds)
      : { data: [] as { id: string; name: string }[] };
    const methodName = new Map((methods || []).map((m) => [m.id, m.name]));

    const libIds = [...new Set((exs || []).map((e) => e.exercise_id).filter(Boolean))] as string[];
    const { data: lib } = libIds.length
      ? await supabase.from("exercise_library").select("id, video_url").in("id", libIds)
      : { data: [] as { id: string; video_url: string | null }[] };
    const videoById = new Map((lib || []).map((l) => [l.id, l.video_url]));

    // Última execução registrada (referência)
    const lastBySet = new Map<string, string>();
    if (clientId) {
      const { data: prev } = await supabase
        .from("workout_logs")
        .select("id, workout_date")
        .eq("client_id", clientId)
        .eq("training_session_id", id)
        .eq("status", "completed")
        .lt("workout_date", brazilToday())
        .order("workout_date", { ascending: false })
        .limit(1);
      if (prev?.[0]) {
        const { data: prevSets } = await supabase
          .from("workout_log_sets")
          .select("prescribed_set_id, performed_sets, performed_reps, performed_load")
          .eq("workout_log_id", prev[0].id);
        (prevSets || []).forEach((r) => {
          if (!r.prescribed_set_id) return;
          const parts = [
            r.performed_sets ? `${r.performed_sets}x${r.performed_reps || ""}` : r.performed_reps || "",
            r.performed_load ? `${r.performed_load}kg` : "",
          ].filter(Boolean);
          if (parts.length) lastBySet.set(r.prescribed_set_id, parts.join(" · "));
        });
      }
    }

    let mapped: Exercise[] = (exs || []).map((e) => ({
      sessionExerciseId: e.id,
      name: e.exercise_name,
      notes: e.notes ?? null,
      videoUrl: e.exercise_id ? videoById.get(e.exercise_id) ?? null : null,
      series: (sets || [])
        .filter((s) => s.session_exercise_id === e.id)
        .map((s) => {
          const reps = s.reps || (s.time_seconds ? `${s.time_seconds}s` : "-");
          return {
            setId: s.id,
            setType: s.set_type ?? null,
            label: `${s.sets || 1}x${reps}`,
            rest: s.rest_seconds ?? 60,
            methodName: s.method_id ? methodName.get(s.method_id) ?? null : null,
            notes: s.notes ?? null,
            prescribedSets: s.sets ?? null,
            prescribedReps: reps,
            prescribedLoad: s.load ?? null,
            prescribedTime: s.time_seconds ?? null,
            prescribedIncline: s.incline ?? null,
            performedSets: null,
            performedReps: null,
            performedLoad: null,
            performedTime: null,
            performedDistance: null,
            performedSpeed: null,
            performedIncline: null,
            performedCalories: null,
            cardio: isCardioType(s.set_type ?? null) || !!s.incline,
            completed: false,
            lastExecution: s.id ? lastBySet.get(s.id) ?? null : null,
          } as Serie;
        }),
    }));

    // Retoma registro em andamento (ou auto-finaliza após 2h)
    if (clientId) {
      const { data: logs } = await supabase
        .from("workout_logs")
        .select("id, started_at")
        .eq("client_id", clientId)
        .eq("training_session_id", id)
        .eq("workout_date", brazilToday())
        .eq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(1);
      const log = logs?.[0];
      if (log) {
        const start = log.started_at ? new Date(log.started_at).getTime() : Date.now();
        if (Date.now() - start > AUTO_FINISH_MS) {
          await supabase
            .from("workout_logs")
            .update({ status: "completed", finished_at: new Date().toISOString() })
            .eq("id", log.id);
          toast("Treino anterior finalizado automaticamente após 2h.");
        } else {
          setLogId(log.id);
          setStarted(true);
          setStartedAt(start);
          const { data: logSets } = await supabase
            .from("workout_log_sets")
            .select("session_exercise_id, prescribed_set_id, performed_sets, performed_reps, performed_load, performed_time_seconds, performed_distance_km, performed_speed, performed_incline, performed_calories, completed")
            .eq("workout_log_id", log.id);
          if (logSets?.length) {
            mapped = mapped.map((ex) => ({
              ...ex,
              series: ex.series.map((s) => {
                const row = logSets.find((r) => r.prescribed_set_id === s.setId);
                if (!row) return s;
                return {
                  ...s,
                  performedSets: row.performed_sets ?? null,
                  performedReps: row.performed_reps ?? null,
                  performedLoad: row.performed_load ?? null,
                  performedTime: row.performed_time_seconds ?? null,
                  performedDistance: row.performed_distance_km != null ? String(row.performed_distance_km) : null,
                  performedSpeed: row.performed_speed != null ? String(row.performed_speed) : null,
                  performedIncline: row.performed_incline ?? null,
                  performedCalories: row.performed_calories != null ? String(row.performed_calories) : null,
                  completed: !!row.completed,
                };
              }),
            }));
          }
        }
      }
    }

    setExercises(mapped);
    setLoadingSession(false);
  };

  const persistSerie = useCallback(
    async (log: string, ex: Exercise, exIdx: number, serie: Serie, sIdx: number) => {
      const keep = serie.completed || hasPerformedData(serie);
      const { error: delError } = await supabase
        .from("workout_log_sets")
        .delete()
        .eq("workout_log_id", log)
        .eq("session_exercise_id", ex.sessionExerciseId)
        .eq("order_index", sIdx);
      if (delError) throw delError;
      // Sem check e sem dado registrado: nada a guardar.
      if (!keep) return;
      const { error } = await supabase.from("workout_log_sets").insert({
        workout_log_id: log,
        session_exercise_id: ex.sessionExerciseId,
        prescribed_set_id: serie.setId,
        exercise_name: ex.name,
        set_type: serie.setType,
        prescribed_sets: serie.prescribedSets,
        prescribed_reps: serie.prescribedReps,
        prescribed_load: serie.prescribedLoad,
        performed_sets: serie.performedSets ?? serie.prescribedSets,
        performed_reps: serie.performedReps ?? serie.prescribedReps,
        performed_load: serie.performedLoad ?? serie.prescribedLoad,
        performed_time_seconds: serie.performedTime ?? serie.prescribedTime,
        performed_distance_km: serie.performedDistance ? Number(serie.performedDistance) : null,
        performed_speed: serie.performedSpeed ? Number(serie.performedSpeed) : null,
        performed_incline: serie.performedIncline ?? serie.prescribedIncline,
        performed_calories: serie.performedCalories ? parseInt(serie.performedCalories) : null,
        completed: serie.completed,
        exercise_order: exIdx,
        order_index: sIdx,
      });
      if (error) throw error;
    },
    []
  );

  const startWorkout = async () => {
    setStarted(true);
    setStartedAt(Date.now());
    if (clientId && !logId) {
      const promise = (async () => {
        const { data, error } = await supabase
          .from("workout_logs")
          .insert({
            client_id: clientId,
            training_plan_id: plan?.id ?? null,
            training_session_id: sessionId,
            session_name: sessionName,
            workout_date: brazilToday(),
            status: "in_progress",
            started_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (error || !data) {
          toast.error("Não conseguimos iniciar o registro do treino. Verifique sua conexão.");
          return null;
        }
        setLogId(data.id);
        return data.id as string;
      })();
      logPromiseRef.current = promise;
      await promise;
    }
    toast(`+${XP_START} XP — Treino iniciado!`, { icon: <Zap size={16} className="text-primary" /> });
  };

  const toggleSerie = async (exIdx: number, sIdx: number) => {
    const ex = exercises[exIdx];
    const serie = ex.series[sIdx];
    const next = !serie.completed;
    const updatedSerie = { ...serie, completed: next };
    setExercises((prev) =>
      prev.map((e, i) =>
        i !== exIdx ? e : { ...e, series: e.series.map((s, j) => (j !== sIdx ? s : updatedSerie)) }
      )
    );
    const log = await ensureLogId();
    if (log) {
      try {
        await persistSerie(log, ex, exIdx, updatedSerie, sIdx);
      } catch {
        toast.error("Não conseguimos salvar essa série. Tentaremos de novo ao finalizar.");
      }
    }
    if (next) setRestSeconds(serie.rest);
  };

  const saveSerieData = async (
    exIdx: number,
    sIdx: number,
    v: {
      load: string; sets: string; reps: string;
      time?: string; distance?: string; speed?: string; incline?: string; calories?: string;
    }
  ) => {
    const ex = exercises[exIdx];
    const serie = ex.series[sIdx];
    const updated: Serie = {
      ...serie,
      performedLoad: v.load || serie.performedLoad,
      performedSets: v.sets ? parseInt(v.sets) : serie.performedSets,
      performedReps: v.reps || serie.performedReps,
      performedTime: v.time ? parseInt(v.time) : serie.performedTime,
      performedDistance: v.distance || serie.performedDistance,
      performedSpeed: v.speed || serie.performedSpeed,
      performedIncline: v.incline || serie.performedIncline,
      performedCalories: v.calories || serie.performedCalories,
    };
    setExercises((prev) =>
      prev.map((e, i) =>
        i !== exIdx ? e : { ...e, series: e.series.map((s, j) => (j !== sIdx ? s : updated)) }
      )
    );
    const log = await ensureLogId();
    if (log) {
      try {
        await persistSerie(log, ex, exIdx, updated, sIdx);
      } catch {
        toast.error("Não conseguimos salvar esse registro. Tentaremos de novo ao finalizar.");
      }
    }
    if (v.load && v.load !== "0" && !serie.performedLoad) {
      setLoadAnnotations((n) => n + 1);
      toast(`+${XP_LOAD} XP — Carga anotada!`, { icon: <Zap size={16} className="text-primary" /> });
    }
  };

  const finishWorkout = useCallback(
    async (auto = false, answers?: PostWorkoutAnswers) => {
      const log = await ensureLogId();
      if (!log) { setShowXpModal(true); return; }
      if (!auto && !answers) { setShowPostWorkout(true); return; }
      setSaving(true);
      let failed = 0;
      for (let i = 0; i < exercises.length; i++) {
        for (let j = 0; j < exercises[i].series.length; j++) {
          try {
            await persistSerie(log, exercises[i], i, exercises[i].series[j], j);
          } catch {
            failed++;
          }
        }
      }
      if (failed > 0) {
        setSaving(false);
        toast.error(
          `Não conseguimos salvar ${failed} série${failed > 1 ? "s" : ""}. Seu treino segue em andamento — verifique a conexão e finalize de novo.`
        );
        return;
      }
      const { error: logError } = await supabase
        .from("workout_logs")
        .update({
          status: "completed",
          finished_at: new Date().toISOString(),
          ...(answers
            ? {
                rpe: answers.rpe,
                followup_stars: answers.stars,
                followup_note: answers.note || null,
                pain: answers.pain,
                pain_note: answers.pain ? answers.painNote : null,
              }
            : {}),
        })
        .eq("id", log);
      if (logError) {
        setSaving(false);
        toast.error("Não conseguimos concluir o treino. Verifique a conexão e tente de novo.");
        return;
      }
      if (answers?.pain && clientId) {
        await supabase.from("pain_reports").insert({
          client_id: clientId,
          workout_log_id: log,
          note: answers.painNote,
          status: "novo",
        });
      }
      setSaving(false);
      setShowPostWorkout(false);
      setStarted(false);
      reload();
      if (auto) {
        toast("Treino finalizado automaticamente após 2h. Salvamos o que foi registrado.");
        setScreen("plan");
      } else {
        setShowXpModal(true);
      }
    },
    [ensureLogId, exercises, persistSerie, reload, clientId]
  );

  finishRef.current = (auto?: boolean) => { void finishWorkout(auto ?? false); };

  // Auto-finalização em 2h
  useEffect(() => {
    if (!started || !startedAt) return;
    const remainingMs = AUTO_FINISH_MS - (Date.now() - startedAt);
    if (remainingMs <= 0) { finishRef.current(true); return; }
    const id = setTimeout(() => finishRef.current(true), remainingMs);
    return () => clearTimeout(id);
  }, [started, startedAt]);

  /* ---------- Tela de execução ---------- */
  if (screen === "session") {
    const allSeries = exercises.flatMap((e) => e.series);
    const doneSeries = allSeries.filter((s) => s.completed).length;

    return (
      <div className="flex flex-col h-full">
        <div className="sticky top-0 z-10 bg-background px-4 pt-4 pb-3">
          <button onClick={() => { setScreen("plan"); reload(); }}
            className="flex items-center gap-1 text-primary text-sm font-dm font-semibold mb-3 min-h-[44px]">
            <ArrowLeft size={18} /> Voltar
          </button>
          <h1 className="font-barlow font-bold text-lg text-foreground mb-1 leading-tight">{sessionName.toUpperCase()}</h1>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: allSeries.length ? `${(doneSeries / allSeries.length) * 100}%` : "0%", background: "linear-gradient(90deg, #0057FF, #0043C4)" }} />
            </div>
            <span className="text-xs font-dm text-muted">{doneSeries}/{allSeries.length} séries</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-24">
          {loadingSession && <p className="text-xs font-dm text-muted py-4">Carregando treino...</p>}
          {!loadingSession && exercises.length === 0 && (
            <p className="text-xs font-dm text-muted py-4 text-center">Nenhum exercício cadastrado neste dia.</p>
          )}

          {!started && exercises.length > 0 && (
            <div className="mb-4">
              <button onClick={startWorkout}
                className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-barlow font-bold text-base tracking-wide active:scale-[0.98] transition-transform"
                style={{ boxShadow: "0 3px 10px #0057FF44" }}>
                INICIAR TREINO
              </button>
              <p className="text-center text-[11px] text-muted font-dm mt-2">Modo visualização. Aperte INICIAR para registrar.</p>
            </div>
          )}

          {started && !showXpModal && (
            <div className="mb-4">
              <button onClick={() => finishWorkout(false)} disabled={saving}
                className="w-full py-3.5 rounded-2xl font-barlow font-bold text-base tracking-wide text-white active:scale-[0.98] transition-transform disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #0057FF 0%, #0043C4 100%)", boxShadow: "0 3px 14px #0057FF55" }}>
                {saving ? "SALVANDO..." : "🏆 FINALIZAR TREINO"}
              </button>
            </div>
          )}

          <div className="space-y-2.5">
            {exercises.map((ex, i) => {
              const exDone = ex.series.length > 0 && ex.series.every((s) => s.completed);
              const notesOpen = !!openNotes[ex.sessionExerciseId];
              return (
                <div key={ex.sessionExerciseId} className={`rounded-2xl bg-card card-shadow overflow-hidden ${exDone ? "opacity-60" : ""}`}>
                  <div className="p-3">
                    <div className="flex items-start gap-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-barlow tracking-[1px] uppercase text-muted">Exercício {i + 1}</p>
                        <h3 className="font-dm font-semibold text-[13px] text-foreground leading-tight">{ex.name}</h3>
                        {ex.notes && (
                          <button onClick={() => setOpenNotes((p) => ({ ...p, [ex.sessionExerciseId]: !notesOpen }))}
                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-dm font-semibold text-primary">
                            <Info size={11} /> {notesOpen ? "Ocultar observação" : "Ver observação"}
                          </button>
                        )}
                        {ex.notes && notesOpen && (
                          <p className="mt-1 text-[11px] font-dm text-muted bg-secondary rounded-xl p-2">{ex.notes}</p>
                        )}
                      </div>
                      {ex.videoUrl && (
                        <button onClick={() => setVideoTarget({ url: ex.videoUrl!, name: ex.name })}
                          className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Play size={18} className="text-primary fill-primary" />
                        </button>
                      )}
                    </div>

                    <div className="mt-2">
                      {ex.series.map((s, si) => (
                        <div key={si} className={`flex items-center gap-1.5 py-2 ${si > 0 ? "border-t border-muted/10" : ""}`}>
                          <button onClick={() => toggleSerie(i, si)} disabled={!started}
                            className="w-9 h-9 flex items-center justify-center shrink-0 disabled:opacity-40">
                            <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${s.completed ? "bg-primary border-primary" : "border-muted/30"}`}>
                              {s.completed && <Check size={12} className="text-primary-foreground" />}
                            </span>
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-dm font-semibold text-foreground">{s.label}</span>
                              {s.methodName && (
                                <span className="text-[9px] font-barlow tracking-[1px] uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                  {s.methodName}
                                </span>
                              )}
                            </div>
                            {s.lastExecution && (
                              <span className="flex items-center gap-1 text-[10px] font-dm text-muted">
                                <History size={9} /> {s.lastExecution}
                              </span>
                            )}
                          </div>
                          <button onClick={() => setEditTarget({ ex: i, s: si })}
                            className="flex items-center gap-1 text-primary min-h-[32px] px-1">
                            <span className="text-[11px] font-dm font-semibold">
                              {s.cardio
                                ? `${Math.round((s.performedTime ?? s.prescribedTime ?? 0) / 60)} min`
                                : `${s.performedLoad || s.prescribedLoad || "0"}kg`}
                            </span>
                            <Pencil size={10} />
                          </button>
                          <button onClick={() => setRestSeconds(s.rest)}
                            className="flex items-center gap-1 text-muted min-h-[32px] px-1">
                            <Clock size={11} />
                            <span className="text-[11px] font-dm">{s.rest}s</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {editTarget && (
          <LoadModal
            serie={exercises[editTarget.ex].series[editTarget.s]}
            onSave={(v) => saveSerieData(editTarget.ex, editTarget.s, v)}
            onClose={() => setEditTarget(null)}
          />
        )}
        {restSeconds !== null && <RestTimer seconds={restSeconds} onClose={() => setRestSeconds(null)} />}
        {videoTarget && <VideoModal url={videoTarget.url} name={videoTarget.name} onClose={() => setVideoTarget(null)} />}
        {showPostWorkout && (
          <PostWorkoutModal saving={saving} onSubmit={(a) => finishWorkout(false, a)} />
        )}
        {showXpModal && (
          <XpCompletionModal
            xpBreakdown={{ loads: loadAnnotations, start: true, complete: true }}
            onClose={() => { setShowXpModal(false); setScreen("plan"); }}
          />
        )}
      </div>
    );
  }

  /* ---------- Tela do plano ativo ---------- */
  return (
    <div className="px-4 pt-4 pb-24">
      <h1 className="font-barlow font-bold text-xl text-foreground mb-4">TREINO</h1>

      {loading && <p className="text-xs font-dm text-muted">Carregando seu treino...</p>}

      {!loading && !plan && (
        <div className="rounded-2xl bg-card card-shadow p-5 text-center">
          <p className="font-dm font-semibold text-sm text-foreground">Nenhum treino ativo</p>
          <p className="text-xs font-dm text-muted mt-1">Fale com seu professor para receber seu plano de treino.</p>
        </div>
      )}

      {plan && (
        <>
          {swap === "soon" && (
            <div className="rounded-2xl bg-primary/10 border border-primary/20 p-3 mb-3 flex items-start gap-2">
              <Sparkles size={16} className="text-primary mt-0.5 shrink-0" />
              <p className="text-[12px] font-dm text-foreground">
                <span className="font-semibold">Troca próxima.</span> Seu treino vence em {remaining} dia{remaining === 1 ? "" : "s"}. Fale com seu professor.
              </p>
            </div>
          )}
          {swap === "late" && (
            <div className="rounded-2xl bg-secondary border border-muted/20 p-3 mb-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-primary mt-0.5 shrink-0" />
              <p className="text-[12px] font-dm text-foreground">
                <span className="font-semibold">Troca vencida.</span> Você ainda pode treinar, mas já é hora de renovar seu programa.
              </p>
            </div>
          )}

          <div className="rounded-2xl bg-card card-shadow p-4 mb-3">
            <p className="text-[10px] font-barlow tracking-[1px] uppercase text-muted">Treino ativo</p>
            <h2 className="font-barlow font-bold text-lg text-foreground leading-tight">{plan.name.toUpperCase()}</h2>
            {plan.goal && <p className="text-[12px] font-dm text-muted mt-0.5">{plan.goal}</p>}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="rounded-xl bg-secondary p-2.5">
                <p className="text-[9px] font-barlow tracking-[1px] uppercase text-muted">Início</p>
                <p className="font-dm font-semibold text-[12px] text-foreground">{fmtDate(plan.startsAt)}</p>
              </div>
              <div className="rounded-xl bg-secondary p-2.5">
                <p className="text-[9px] font-barlow tracking-[1px] uppercase text-muted">Troca</p>
                <p className="font-dm font-semibold text-[12px] text-foreground">{fmtDate(plan.expiresAt)}</p>
              </div>
              <div className="rounded-xl bg-secondary p-2.5">
                <p className="text-[9px] font-barlow tracking-[1px] uppercase text-muted">Professor</p>
                <p className="font-dm font-semibold text-[12px] text-foreground truncate">{plan.coachName || "—"}</p>
              </div>
            </div>
          </div>

          <p className="text-[10px] font-barlow tracking-[1px] uppercase text-muted mb-2">Sessões</p>
          <div className="space-y-2">
            {plan.sessions.length === 0 && (
              <p className="text-xs font-dm text-muted">Nenhuma sessão cadastrada neste plano.</p>
            )}
            {plan.sessions.map((s) => (
              <button key={s.id} onClick={() => openSession(s.id, s.name)}
                className={`w-full rounded-2xl bg-card card-shadow p-4 flex items-center gap-3 text-left min-h-[56px] active:scale-[0.99] transition-transform ${s.doneToday ? "opacity-60" : ""}`}>
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-barlow font-bold text-xs text-muted shrink-0">
                  {s.day}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-dm font-semibold text-sm ${s.doneToday ? "line-through text-muted" : "text-foreground"}`}>{s.name}</p>
                  <p className="text-[11px] font-dm text-muted">{s.exerciseCount} exercícios</p>
                </div>
                {s.doneToday ? <Check size={16} className="text-primary" /> : <ChevronRight size={20} className="text-muted" />}
              </button>
            ))}
          </div>

          <VolumeSemanalCard volume={plan.volume} />

          {archived.length > 0 && (
            <div className="mt-5">
              <p className="text-[10px] font-barlow tracking-[1px] uppercase text-muted mb-2 flex items-center gap-1">
                <Archive size={11} /> Treinos arquivados
              </p>
              <div className="space-y-2">
                {archived.map((a) => (
                  <div key={a.id} className="rounded-2xl bg-card card-shadow p-3 flex items-center gap-3">
                    <CalendarDays size={16} className="text-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-dm font-semibold text-[13px] text-foreground truncate">{a.name}</p>
                      <p className="text-[11px] font-dm text-muted">{fmtDate(a.startsAt)} — {fmtDate(a.expiresAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TreinoTab;
