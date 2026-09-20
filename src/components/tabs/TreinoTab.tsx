import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import VolumeSemanalCard from "@/components/tabs/VolumeSemanalCard";
import {
  ArrowLeft, Check, Play, Clock, X, Pause, Pencil, Zap, Trophy,
  ChevronRight, ChevronDown, AlertTriangle, CalendarDays, Info, Sparkles, Archive, History,
  Plus, SkipForward, CloudOff,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStudentName } from "@/hooks/useStudentName";
import { useTrainingPlan, brazilToday, daysToSwap, swapStatus } from "@/hooks/useTrainingPlan";
import { useWorkoutTimer, formatDuration } from "@/hooks/useWorkoutTimer";
import { saveSet, flushQueue, pendingCount, SetPayload } from "@/lib/workoutQueue";

/** Uma série individual do treino (Série 1, Série 2, ...). */
interface SetRow {
  groupIdx: number;
  setIndex: number;
  setId: string | null;
  setType: string | null;
  rest: number;
  methodName: string | null;
  notes: string | null;
  prescribedReps: string | null;
  prescribedLoad: string | null;
  prescribedTime: number | null;
  prescribedIncline: string | null;
  performedReps: string | null;
  performedLoad: string | null;
  performedTime: number | null;
  performedDistance: string | null;
  performedSpeed: string | null;
  performedIncline: string | null;
  performedCalories: string | null;
  cardio: boolean;
  completed: boolean;
  completedAt: string | null;
  sideMode: string | null;
  lastLoad: string | null;
  lastExecution: string | null;
}

interface Exercise {
  sessionExerciseId: string;
  name: string;
  notes: string | null;
  videoUrl: string | null;
  sets: SetRow[];
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const fmtDate = (d: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—";

const isCardioType = (t: string | null) => !!t && /cardio|corrida|inclina|tempo/i.test(t);

const hasPerformedData = (s: SetRow) =>
  [s.performedReps, s.performedLoad, s.performedTime, s.performedDistance,
   s.performedSpeed, s.performedIncline, s.performedCalories]
    .some((v) => v !== null && v !== undefined && String(v).trim() !== "");

const maxLoad = (sets: SetRow[]) => {
  const vals = sets
    .map((s) => parseFloat((s.performedLoad || "").replace(",", ".")))
    .filter((n) => !isNaN(n) && n > 0);
  return vals.length ? Math.max(...vals) : null;
};

const XP_LOAD = 5;
const XP_START = 10;
const XP_COMPLETE = 25;
const AUTO_FINISH_MS = 2 * 60 * 60 * 1000;

/** Vibração + bipe curto ao terminar o intervalo (quando o aparelho permitir). */
const alertRestEnd = () => {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* sem vibração */
  }
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.12;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {
    /* sem áudio */
  }
};

/* ---------------- Modais ---------------- */

/** Registro de cardio (tempo, distância, velocidade, inclinação, calorias). */
const CardioModal = ({
  serie, onSave, onClose,
}: {
  serie: SetRow;
  onSave: (v: { time: string; distance: string; speed: string; incline: string; calories: string }) => void;
  onClose: () => void;
}) => {
  const [timeInput, setTimeInput] = useState(String(serie.performedTime ?? serie.prescribedTime ?? ""));
  const [distanceInput, setDistanceInput] = useState(serie.performedDistance ?? "");
  const [speedInput, setSpeedInput] = useState(serie.performedSpeed ?? "");
  const [inclineInput, setInclineInput] = useState(serie.performedIncline ?? serie.prescribedIncline ?? "");
  const [caloriesInput, setCaloriesInput] = useState(serie.performedCalories ?? "");

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
        <div className="flex gap-2 mb-4">{field("Calorias", caloriesInput, setCaloriesInput)}</div>
        <button
          onClick={() => {
            onSave({ time: timeInput, distance: distanceInput, speed: speedInput, incline: inclineInput, calories: caloriesInput });
            onClose();
          }}
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-barlow font-bold text-base active:scale-[0.98] transition-transform"
          style={{ boxShadow: "0 3px 10px #0057FF44" }}
        >
          Salvar
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
  xpBreakdown, summary, onClose, onEdit,
}: {
  xpBreakdown: { loads: number; start: boolean; complete: boolean };
  summary: { duration: string; exercisesDone: number; exercisesTotal: number; setsDone: number };
  onClose: () => void;
  onEdit: () => void;
}) => {
  const loadXp = xpBreakdown.loads * XP_LOAD;
  const startXp = xpBreakdown.start ? XP_START : 0;
  const completeXp = xpBreakdown.complete ? XP_COMPLETE : 0;
  const total = loadXp + startXp + completeXp;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-[340px] max-h-[88vh] overflow-y-auto bg-card rounded-3xl p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Trophy size={32} className="text-primary" />
        </div>
        <h2 className="font-barlow font-bold text-xl text-foreground mb-1">TREINO CONCLUÍDO! 🎉</h2>
        <p className="text-sm font-dm text-muted mb-4">Parabéns pela dedicação!</p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl bg-secondary p-2.5">
            <p className="text-[9px] font-barlow tracking-[1px] uppercase text-muted">Duração</p>
            <p className="font-barlow font-bold text-[13px] text-foreground">{summary.duration}</p>
          </div>
          <div className="rounded-xl bg-secondary p-2.5">
            <p className="text-[9px] font-barlow tracking-[1px] uppercase text-muted">Exercícios</p>
            <p className="font-barlow font-bold text-[13px] text-foreground">{summary.exercisesDone}/{summary.exercisesTotal}</p>
          </div>
          <div className="rounded-xl bg-secondary p-2.5">
            <p className="text-[9px] font-barlow tracking-[1px] uppercase text-muted">Séries</p>
            <p className="font-barlow font-bold text-[13px] text-foreground">{summary.setsDone}</p>
          </div>
        </div>

        <div className="space-y-2 mb-5">
          {xpBreakdown.start && (
            <div className="flex items-center justify-between bg-secondary rounded-xl px-4 py-2.5">
              <span className="text-sm font-dm text-foreground">Início do treino</span>
              <span className="font-barlow font-bold text-primary">+{XP_START} Score</span>
            </div>
          )}
          {xpBreakdown.loads > 0 && (
            <div className="flex items-center justify-between bg-secondary rounded-xl px-4 py-2.5">
              <span className="text-sm font-dm text-foreground">Cargas anotadas ({xpBreakdown.loads}x)</span>
              <span className="font-barlow font-bold text-primary">+{loadXp} Score</span>
            </div>
          )}
          {xpBreakdown.complete && (
            <div className="flex items-center justify-between bg-secondary rounded-xl px-4 py-2.5">
              <span className="text-sm font-dm text-foreground">Treino completo</span>
              <span className="font-barlow font-bold text-primary">+{XP_COMPLETE} Score</span>
            </div>
          )}
        </div>
        <div className="rounded-2xl p-4 mb-4" style={{ background: "linear-gradient(135deg, #0057FF 0%, #0043C4 100%)" }}>
          <p className="text-white/70 text-[10px] font-barlow tracking-[2px] uppercase">SCORE TOTAL GANHO</p>
          <p className="font-barlow font-[800] text-4xl text-white">+{total}</p>
        </div>
        <button onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-barlow font-bold text-base active:scale-[0.98] transition-transform mb-2"
          style={{ boxShadow: "0 3px 10px #0057FF44" }}>
          FECHAR
        </button>
        <button onClick={onEdit} className="w-full py-3 rounded-2xl bg-secondary font-dm font-semibold text-sm text-foreground">
          Editar registro
        </button>
      </div>
    </div>
  );
};

/** Barra fixa do intervalo, acima do menu inferior. */
const RestBar = ({
  seconds, onClose,
}: {
  seconds: number;
  onClose: () => void;
}) => {
  const [total, setTotal] = useState(seconds);
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(true);
  const donePlayed = useRef(false);

  useEffect(() => { setTotal(seconds); setLeft(seconds); setRunning(true); donePlayed.current = false; }, [seconds]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (left > 0 || donePlayed.current) return;
    donePlayed.current = true;
    alertRestEnd();
    const id = setTimeout(onClose, 4000);
    return () => clearTimeout(id);
  }, [left, onClose]);

  const pct = total > 0 ? Math.min(100, ((total - left) / total) * 100) : 100;

  return (
    <div className="fixed left-0 right-0 z-40 px-4" style={{ bottom: "calc(72px + env(safe-area-inset-bottom))" }}>
      <div className="rounded-2xl bg-card card-shadow border border-primary/20 overflow-hidden">
        <div className="h-1 bg-secondary">
          <div className="h-full transition-all" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#0057FF,#0043C4)" }} />
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Clock size={16} className="text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[9px] font-barlow tracking-[1px] uppercase text-muted leading-none">Intervalo</p>
            <p className="font-barlow font-[800] text-lg text-foreground leading-tight">
              {left > 0 ? formatTime(left) : "Vamos lá!"}
            </p>
          </div>
          <div className="flex-1" />
          <button onClick={() => setRunning((r) => !r)} aria-label={running ? "Pausar intervalo" : "Continuar intervalo"}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition-transform">
            {running ? <Pause size={15} className="text-foreground" /> : <Play size={15} className="text-foreground fill-foreground" />}
          </button>
          <button onClick={() => { setTotal((t) => t + 15); setLeft((t) => t + 15); donePlayed.current = false; }}
            className="h-9 px-2.5 rounded-full bg-secondary flex items-center gap-0.5 active:scale-95 transition-transform">
            <Plus size={13} className="text-foreground" />
            <span className="text-[11px] font-dm font-semibold text-foreground">15s</span>
          </button>
          <button onClick={onClose} aria-label="Pular intervalo"
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center active:scale-95 transition-transform">
            <SkipForward size={15} className="text-primary-foreground" />
          </button>
        </div>
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
  const [resumed, setResumed] = useState(false);
  const [logId, setLogId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [initialPausedMs, setInitialPausedMs] = useState(0);
  const [loadAnnotations, setLoadAnnotations] = useState(0);
  const [cardioTarget, setCardioTarget] = useState<{ ex: number; s: number } | null>(null);
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [restKey, setRestKey] = useState(0);
  const [videoTarget, setVideoTarget] = useState<{ url: string; name: string } | null>(null);
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showXpModal, setShowXpModal] = useState(false);
  const [showPostWorkout, setShowPostWorkout] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(0);
  const [finalDuration, setFinalDuration] = useState("00:00:00");
  const finishRef = useRef<(auto?: boolean) => void>(() => {});
  const logPromiseRef = useRef<Promise<string | null> | null>(null);

  const timer = useWorkoutTimer(logId, started ? startedAt : null, initialPausedMs);

  const ensureLogId = useCallback(async () => {
    if (logId) return logId;
    if (logPromiseRef.current) return await logPromiseRef.current;
    return null;
  }, [logId]);

  const swap = swapStatus(plan?.expiresAt ?? null);
  const remaining = daysToSwap(plan?.expiresAt ?? null);

  // sincroniza séries pendentes quando a conexão volta
  useEffect(() => {
    const sync = async () => {
      if (!logId) return;
      const left = await flushQueue(logId);
      setPending(left);
    };
    window.addEventListener("online", sync);
    const id = setInterval(sync, 20000);
    return () => { window.removeEventListener("online", sync); clearInterval(id); };
  }, [logId]);

  const openSession = async (id: string, name: string) => {
    setSessionId(id);
    setSessionName(name);
    setScreen("session");
    setExercises([]);
    setStarted(false);
    setResumed(false);
    setLogId(null);
    setStartedAt(null);
    setInitialPausedMs(0);
    setLoadAnnotations(0);
    setShowXpModal(false);
    setExpanded({});
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

    // Referência do treino anterior: resumo e última carga por série prescrita
    const lastBySet = new Map<string, string>();
    const lastLoadBySet = new Map<string, string>();
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
          if (r.performed_load) lastLoadBySet.set(r.prescribed_set_id, r.performed_load);
        });
      }
    }

    let mapped: Exercise[] = (exs || []).map((e) => {
      const groups = (sets || []).filter((s) => s.session_exercise_id === e.id);
      const rows: SetRow[] = [];
      groups.forEach((s, groupIdx) => {
        const reps = s.reps || (s.time_seconds ? `${s.time_seconds}s` : "-");
        const cardio = isCardioType(s.set_type ?? null) || !!s.incline;
        const count = cardio ? 1 : Math.max(1, s.sets ?? 1);
        for (let k = 0; k < count; k++) {
          rows.push({
            groupIdx,
            setIndex: k,
            setId: s.id,
            setType: s.set_type ?? null,
            rest: s.rest_seconds ?? 60,
            methodName: s.method_id ? methodName.get(s.method_id) ?? null : null,
            notes: s.notes ?? null,
            prescribedReps: reps,
            prescribedLoad: s.load ?? null,
            prescribedTime: s.time_seconds ?? null,
            prescribedIncline: s.incline ?? null,
            performedReps: null,
            performedLoad: null,
            performedTime: null,
            performedDistance: null,
            performedSpeed: null,
            performedIncline: null,
            performedCalories: null,
            cardio,
            completed: false,
            completedAt: null,
            sideMode: null,
            lastLoad: s.id ? lastLoadBySet.get(s.id) ?? null : null,
            lastExecution: s.id ? lastBySet.get(s.id) ?? null : null,
          });
        }
      });
      return {
        sessionExerciseId: e.id,
        name: e.exercise_name,
        notes: e.notes ?? null,
        videoUrl: e.exercise_id ? videoById.get(e.exercise_id) ?? null : null,
        sets: rows,
      };
    });

    // Retoma registro em andamento (ou auto-finaliza após 2h)
    if (clientId) {
      const { data: logs } = await supabase
        .from("workout_logs")
        .select("id, started_at, paused_ms")
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
          setResumed(true);
          setStartedAt(start);
          setInitialPausedMs(log.paused_ms ?? 0);
          setPending(pendingCount(log.id));
          const { data: logSets } = await supabase
            .from("workout_log_sets")
            .select("session_exercise_id, prescribed_set_id, order_index, set_index, performed_reps, performed_load, performed_time_seconds, performed_distance_km, performed_speed, performed_incline, performed_calories, completed, completed_at, side_mode")
            .eq("workout_log_id", log.id);
          if (logSets?.length) {
            mapped = mapped.map((ex) => ({
              ...ex,
              sets: ex.sets.map((s) => {
                const row = logSets.find(
                  (r) => r.session_exercise_id === ex.sessionExerciseId &&
                    r.order_index === s.groupIdx && (r.set_index ?? 0) === s.setIndex
                );
                if (!row) return s;
                return {
                  ...s,
                  performedReps: row.performed_reps ?? null,
                  performedLoad: row.performed_load ?? null,
                  performedTime: row.performed_time_seconds ?? null,
                  performedDistance: row.performed_distance_km != null ? String(row.performed_distance_km) : null,
                  performedSpeed: row.performed_speed != null ? String(row.performed_speed) : null,
                  performedIncline: row.performed_incline ?? null,
                  performedCalories: row.performed_calories != null ? String(row.performed_calories) : null,
                  completed: !!row.completed,
                  completedAt: row.completed_at ?? null,
                  sideMode: row.side_mode ?? null,
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

  const buildPayload = useCallback(
    (log: string, ex: Exercise, exIdx: number, row: SetRow): SetPayload => ({
      workout_log_id: log,
      session_exercise_id: ex.sessionExerciseId,
      prescribed_set_id: row.setId,
      exercise_name: ex.name,
      set_type: row.setType,
      prescribed_sets: 1,
      prescribed_reps: row.prescribedReps,
      prescribed_load: row.prescribedLoad,
      performed_sets: 1,
      performed_reps: row.performedReps ?? row.prescribedReps,
      performed_load: row.performedLoad ?? row.prescribedLoad,
      performed_time_seconds: row.performedTime ?? row.prescribedTime,
      performed_distance_km: row.performedDistance ? Number(row.performedDistance) : null,
      performed_speed: row.performedSpeed ? Number(row.performedSpeed) : null,
      performed_incline: row.performedIncline ?? row.prescribedIncline,
      performed_calories: row.performedCalories ? parseInt(row.performedCalories) : null,
      completed: row.completed,
      completed_at: row.completedAt,
      rest_seconds: row.rest,
      side_mode: row.sideMode,
      exercise_order: exIdx,
      order_index: row.groupIdx,
      set_index: row.setIndex,
      keep: row.completed || hasPerformedData(row),
    }),
    []
  );

  const persistRow = useCallback(
    async (ex: Exercise, exIdx: number, row: SetRow) => {
      const log = await ensureLogId();
      if (!log) return;
      const ok = await saveSet(buildPayload(log, ex, exIdx, row));
      setPending(pendingCount(log));
      if (!ok) toast("Sem conexão: guardamos no aparelho e enviaremos depois.", { icon: <CloudOff size={15} /> });
    },
    [buildPayload, ensureLogId]
  );

  const updateRow = (exIdx: number, rowIdx: number, patch: Partial<SetRow>, persist = true) => {
    let updatedEx: Exercise | null = null;
    let updatedRow: SetRow | null = null;
    setExercises((prev) =>
      prev.map((e, i) => {
        if (i !== exIdx) return e;
        const sets = e.sets.map((s, j) => {
          if (j !== rowIdx) return s;
          updatedRow = { ...s, ...patch };
          return updatedRow;
        });
        updatedEx = { ...e, sets };
        return updatedEx;
      })
    );
    if (persist && updatedEx && updatedRow) void persistRow(updatedEx, exIdx, updatedRow);
  };

  const startWorkout = async () => {
    setStarted(true);
    if (resumed) { toast("Treino retomado."); return; }
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
    toast(`+${XP_START} Score — Treino iniciado!`, { icon: <Zap size={16} className="text-primary" /> });
  };

  const toggleSet = (exIdx: number, rowIdx: number) => {
    const row = exercises[exIdx].sets[rowIdx];
    const next = !row.completed;
    updateRow(exIdx, rowIdx, { completed: next, completedAt: next ? new Date().toISOString() : null });
    if (next && row.rest > 0) { setRestSeconds(row.rest); setRestKey((k) => k + 1); }
  };

  const setLoad = (exIdx: number, rowIdx: number, value: string) => {
    const row = exercises[exIdx].sets[rowIdx];
    const clean = value.replace(",", ".");
    updateRow(exIdx, rowIdx, { performedLoad: clean });
    if (clean && clean !== "0" && !row.performedLoad) {
      setLoadAnnotations((n) => n + 1);
      toast(`+${XP_LOAD} Score — Carga anotada!`, { icon: <Zap size={16} className="text-primary" /> });
    }
  };

  const toggleSide = (exIdx: number) => {
    const cur = exercises[exIdx].sets[0]?.sideMode;
    const next = cur === "cada lado" ? "total" : "cada lado";
    exercises[exIdx].sets.forEach((_, j) => updateRow(exIdx, j, { sideMode: next }));
  };

  const completeExercise = (exIdx: number, force = false) => {
    const ex = exercises[exIdx];
    const pendingSets = ex.sets.filter((s) => !s.completed).length;
    if (pendingSets > 0 && !force) {
      if (!window.confirm(`Ainda faltam ${pendingSets} série(s). Marcar o exercício como concluído?`)) return;
    }
    ex.sets.forEach((s, j) => {
      if (!s.completed) updateRow(exIdx, j, { completed: true, completedAt: new Date().toISOString() });
    });
  };

  const progress = useMemo(() => {
    const total = exercises.length;
    const done = exercises.filter((e) => e.sets.length > 0 && e.sets.every((s) => s.completed)).length;
    const setsDone = exercises.flatMap((e) => e.sets).filter((s) => s.completed).length;
    const setsTotal = exercises.flatMap((e) => e.sets).length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0, setsDone, setsTotal };
  }, [exercises]);

  const finishWorkout = useCallback(
    async (auto = false, answers?: PostWorkoutAnswers) => {
      const log = await ensureLogId();
      if (!log) { setShowXpModal(true); return; }
      if (!auto && !answers) { setShowPostWorkout(true); return; }
      setSaving(true);
      let failed = 0;
      for (let i = 0; i < exercises.length; i++) {
        for (const row of exercises[i].sets) {
          const ok = await saveSet(buildPayload(log, exercises[i], i, row));
          if (!ok) failed++;
        }
      }
      if (failed > 0) {
        setSaving(false);
        setPending(pendingCount(log));
        toast.error(
          `Não conseguimos enviar ${failed} série${failed > 1 ? "s" : ""}. Seu treino segue em andamento — verifique a conexão e finalize de novo.`
        );
        return;
      }
      const duration = timer.elapsedSeconds;
      const { error: logError } = await supabase
        .from("workout_logs")
        .update({
          status: "completed",
          finished_at: new Date().toISOString(),
          duration_seconds: duration,
          paused_ms: timer.pausedMs,
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
      setFinalDuration(formatDuration(duration));
      setSaving(false);
      setShowPostWorkout(false);
      setConfirmFinish(false);
      setStarted(false);
      setRestSeconds(null);
      timer.clear();
      reload();
      if (auto) {
        toast("Treino finalizado automaticamente após 2h. Salvamos o que foi registrado.");
        setScreen("plan");
      } else {
        setShowXpModal(true);
      }
    },
    [ensureLogId, exercises, buildPayload, reload, clientId, timer]
  );

  finishRef.current = (auto?: boolean) => { void finishWorkout(auto ?? false); };

  useEffect(() => {
    if (!started || !startedAt) return;
    const remainingMs = AUTO_FINISH_MS - (Date.now() - startedAt);
    if (remainingMs <= 0) { finishRef.current(true); return; }
    const id = setTimeout(() => finishRef.current(true), remainingMs);
    return () => clearTimeout(id);
  }, [started, startedAt]);

  const reopenWorkout = async () => {
    const log = logId;
    if (!log) return;
    await supabase.from("workout_logs").update({ status: "in_progress", finished_at: null }).eq("id", log);
    setShowXpModal(false);
    setStarted(true);
    toast("Registro reaberto para edição.");
  };

  /* ---------- Tela de execução ---------- */
  if (screen === "session") {
    return (
      <div className="flex flex-col h-full">
        <div className="sticky top-0 z-10 bg-background px-4 pt-4 pb-3">
          <button onClick={() => { setScreen("plan"); setRestSeconds(null); reload(); }}
            className="flex items-center gap-1 text-primary text-sm font-dm font-semibold mb-3 min-h-[44px]">
            <ArrowLeft size={18} /> Voltar
          </button>
          <h1 className="font-barlow font-bold text-lg text-foreground mb-2 leading-tight">{sessionName.toUpperCase()}</h1>

          {started && (
            <>
              <div className="rounded-2xl p-3 mb-2 flex items-center gap-2.5"
                style={{ background: "linear-gradient(135deg, #0057FF 0%, #0043C4 100%)", boxShadow: "0 3px 14px #0057FF44" }}>
                <Clock size={18} className="text-white shrink-0" />
                <div className="min-w-0">
                  <p className="text-white/70 text-[9px] font-barlow tracking-[1px] uppercase leading-none">
                    {timer.paused ? "Pausado" : "Em andamento"}
                  </p>
                  <p className="font-barlow font-[800] text-xl text-white leading-tight tabular-nums">{timer.label}</p>
                </div>
                <div className="flex-1" />
                <button onClick={() => (timer.paused ? timer.resume() : timer.pause())}
                  aria-label={timer.paused ? "Continuar treino" : "Pausar treino"}
                  className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-transform">
                  {timer.paused ? <Play size={16} className="text-white fill-white" /> : <Pause size={16} className="text-white" />}
                </button>
                <button onClick={() => setConfirmFinish(true)} disabled={saving}
                  className="h-9 px-3 rounded-full bg-white font-barlow font-bold text-[12px] text-primary active:scale-95 transition-transform disabled:opacity-60">
                  FINALIZAR
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${progress.pct}%`, background: "linear-gradient(90deg, #0057FF, #0043C4)" }} />
                </div>
                <span className="text-[11px] font-dm text-muted shrink-0">
                  {progress.done} de {progress.total} • {progress.pct}%
                </span>
              </div>
              <p className="text-[11px] font-dm text-muted mt-1">
                {progress.done} de {progress.total} exercícios concluídos
                {pending > 0 ? ` · ${pending} série(s) aguardando conexão` : ""}
              </p>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-40">
          {loadingSession && <p className="text-xs font-dm text-muted py-4">Carregando treino...</p>}
          {!loadingSession && exercises.length === 0 && (
            <p className="text-xs font-dm text-muted py-4 text-center">Nenhum exercício cadastrado neste dia.</p>
          )}

          {!started && exercises.length > 0 && (
            <div className="mb-4">
              <button onClick={startWorkout}
                className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-barlow font-bold text-base tracking-wide active:scale-[0.98] transition-transform"
                style={{ boxShadow: "0 3px 10px #0057FF44" }}>
                {resumed ? "CONTINUAR TREINO" : "INICIAR TREINO"}
              </button>
              <p className="text-center text-[11px] text-muted font-dm mt-2">
                {resumed
                  ? "Você tem um treino em andamento hoje."
                  : "Modo visualização. Aperte INICIAR para registrar e começar o cronômetro."}
              </p>
            </div>
          )}

          <div className="space-y-2.5">
            {exercises.map((ex, i) => {
              const exDone = ex.sets.length > 0 && ex.sets.every((s) => s.completed);
              const isOpen = expanded[ex.sessionExerciseId] ?? !exDone;
              const notesOpen = !!openNotes[ex.sessionExerciseId];
              const top = maxLoad(ex.sets);
              const doneCount = ex.sets.filter((s) => s.completed).length;

              if (exDone && !isOpen) {
                return (
                  <button key={ex.sessionExerciseId}
                    onClick={() => setExpanded((p) => ({ ...p, [ex.sessionExerciseId]: true }))}
                    className="w-full rounded-2xl bg-card card-shadow p-3 flex items-center gap-2.5 text-left">
                    <span className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                      <Check size={15} className="text-white" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-dm font-semibold text-[13px] text-foreground truncate">{ex.name}</p>
                      <p className="text-[11px] font-dm text-muted">
                        {doneCount} série{doneCount === 1 ? "" : "s"} concluída{doneCount === 1 ? "" : "s"}
                        {top ? ` · ${top}kg` : ""}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-muted shrink-0" />
                  </button>
                );
              }

              return (
                <div key={ex.sessionExerciseId} className="rounded-2xl bg-card card-shadow overflow-hidden">
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
                      {exDone && (
                        <button onClick={() => setExpanded((p) => ({ ...p, [ex.sessionExerciseId]: false }))}
                          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0" aria-label="Recolher">
                          <ChevronDown size={16} className="text-muted" />
                        </button>
                      )}
                      {ex.videoUrl && (
                        <button onClick={() => setVideoTarget({ url: ex.videoUrl!, name: ex.name })}
                          className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Play size={18} className="text-primary fill-primary" />
                        </button>
                      )}
                    </div>

                    <div className="mt-2">
                      {ex.sets.map((s, si) => {
                        const num = ex.sets.filter((o, k) => k < si && o.groupIdx === s.groupIdx).length + 1;
                        const cardioValue = `${Math.round((s.performedTime ?? s.prescribedTime ?? 0) / 60)} min`;
                        return (
                          <div key={`${s.groupIdx}-${s.setIndex}`}
                            className={`rounded-xl px-2 py-2 ${si > 0 ? "mt-1.5" : ""} ${s.completed ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-secondary/60"}`}>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => toggleSet(i, si)} disabled={!started}
                                aria-label={s.completed ? "Desfazer série" : "Concluir série"}
                                className="w-9 h-9 flex items-center justify-center shrink-0 disabled:opacity-40">
                                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${s.completed ? "bg-emerald-500 border-emerald-500" : "border-muted/30"}`}>
                                  {s.completed && <Check size={12} className="text-white" />}
                                </span>
                              </button>
                              <div className="min-w-0 w-[74px]">
                                <p className="text-[10px] font-barlow tracking-[1px] uppercase text-muted leading-none">
                                  Série {num}
                                </p>
                                <p className="text-[12px] font-dm font-semibold text-foreground leading-tight truncate">
                                  {s.prescribedReps || "-"}
                                </p>
                              </div>

                              {s.cardio ? (
                                <button onClick={() => setCardioTarget({ ex: i, s: si })}
                                  className="flex-1 flex items-center justify-end gap-1 text-primary min-h-[40px]">
                                  <span className="text-[12px] font-dm font-semibold">{cardioValue}</span>
                                  <Pencil size={11} />
                                </button>
                              ) : (
                                <>
                                  <div className="flex-1 flex items-center gap-1">
                                    <input
                                      type="number" inputMode="decimal" step="0.5" placeholder={s.lastLoad ?? s.prescribedLoad ?? "0"}
                                      defaultValue={s.performedLoad ?? ""}
                                      onBlur={(e) => { if (e.target.value !== (s.performedLoad ?? "")) setLoad(i, si, e.target.value); }}
                                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                      disabled={!started}
                                      className="w-full h-10 rounded-xl bg-card text-center text-[15px] font-barlow font-[800] text-foreground border border-muted/20 outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                                    />
                                    <span className="text-[11px] font-dm text-muted shrink-0">kg</span>
                                  </div>
                                  <input
                                    inputMode="numeric" placeholder="reps" defaultValue={s.performedReps ?? ""}
                                    onBlur={(e) => { if (e.target.value !== (s.performedReps ?? "")) updateRow(i, si, { performedReps: e.target.value || null }); }}
                                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                    disabled={!started}
                                    className="w-[52px] h-10 rounded-xl bg-card text-center text-[13px] font-dm font-semibold text-foreground border border-muted/20 outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                                  />
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mt-1 pl-10">
                              {s.methodName && (
                                <span className="text-[9px] font-barlow tracking-[1px] uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                  {s.methodName}
                                </span>
                              )}
                              {s.lastLoad && (
                                <span className="text-[10px] font-dm text-muted">Última carga: {s.lastLoad} kg</span>
                              )}
                              {!s.lastLoad && s.lastExecution && (
                                <span className="flex items-center gap-1 text-[10px] font-dm text-muted">
                                  <History size={9} /> {s.lastExecution}
                                </span>
                              )}
                              <button onClick={() => { setRestSeconds(s.rest); setRestKey((k) => k + 1); }}
                                className="flex items-center gap-1 text-muted">
                                <Clock size={10} />
                                <span className="text-[10px] font-dm">{s.rest}s</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {started && (
                      <div className="flex items-center gap-2 mt-2.5">
                        <button onClick={() => toggleSide(i)}
                          className="h-9 px-3 rounded-xl bg-secondary text-[11px] font-dm font-semibold text-foreground">
                          {ex.sets[0]?.sideMode === "cada lado" ? "kg por lado" : "kg total"}
                        </button>
                        <button onClick={() => completeExercise(i)} disabled={exDone}
                          className="flex-1 h-9 rounded-xl bg-primary/10 text-primary font-dm font-semibold text-[12px] disabled:opacity-50">
                          {exDone ? "Exercício concluído" : "Concluir exercício"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {restSeconds !== null && (
          <RestBar key={restKey} seconds={restSeconds} onClose={() => setRestSeconds(null)} />
        )}

        {cardioTarget && (
          <CardioModal
            serie={exercises[cardioTarget.ex].sets[cardioTarget.s]}
            onSave={(v) =>
              updateRow(cardioTarget.ex, cardioTarget.s, {
                performedTime: v.time ? parseInt(v.time) : null,
                performedDistance: v.distance || null,
                performedSpeed: v.speed || null,
                performedIncline: v.incline || null,
                performedCalories: v.calories || null,
              })
            }
            onClose={() => setCardioTarget(null)}
          />
        )}

        {confirmFinish && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={() => setConfirmFinish(false)}>
            <div className="absolute inset-0 bg-black/45" />
            <div className="relative w-full max-w-[340px] bg-card rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-barlow font-bold text-lg text-foreground mb-1">FINALIZAR TREINO?</h3>
              <p className="text-[12px] font-dm text-muted mb-3">Confira o resumo antes de confirmar.</p>
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between bg-secondary rounded-xl px-3 py-2.5">
                  <span className="text-[13px] font-dm text-foreground">Duração total</span>
                  <span className="font-barlow font-bold text-foreground tabular-nums">{timer.label}</span>
                </div>
                <div className="flex items-center justify-between bg-secondary rounded-xl px-3 py-2.5">
                  <span className="text-[13px] font-dm text-foreground">Exercícios concluídos</span>
                  <span className="font-barlow font-bold text-foreground">{progress.done}/{progress.total}</span>
                </div>
                <div className="flex items-center justify-between bg-secondary rounded-xl px-3 py-2.5">
                  <span className="text-[13px] font-dm text-foreground">Séries realizadas</span>
                  <span className="font-barlow font-bold text-foreground">{progress.setsDone}/{progress.setsTotal}</span>
                </div>
              </div>
              {progress.done < progress.total && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 mb-3 flex items-start gap-2">
                  <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-[12px] font-dm text-foreground">
                    {progress.total - progress.done} exercício(s) pendente(s). Você pode finalizar de qualquer forma.
                  </p>
                </div>
              )}
              <button onClick={() => { setConfirmFinish(false); void finishWorkout(false); }} disabled={saving}
                className="w-full py-3.5 rounded-2xl font-barlow font-bold text-base text-white active:scale-[0.98] transition-transform disabled:opacity-60 mb-2"
                style={{ background: "linear-gradient(135deg, #0057FF 0%, #0043C4 100%)", boxShadow: "0 3px 14px #0057FF55" }}>
                {saving ? "SALVANDO..." : "🏆 CONFIRMAR E FINALIZAR"}
              </button>
              <button onClick={() => setConfirmFinish(false)}
                className="w-full py-3 rounded-2xl bg-secondary font-dm font-semibold text-sm text-foreground">
                Continuar treinando
              </button>
            </div>
          </div>
        )}

        {videoTarget && <VideoModal url={videoTarget.url} name={videoTarget.name} onClose={() => setVideoTarget(null)} />}
        {showPostWorkout && <PostWorkoutModal saving={saving} onSubmit={(a) => finishWorkout(false, a)} />}
        {showXpModal && (
          <XpCompletionModal
            xpBreakdown={{ loads: loadAnnotations, start: true, complete: true }}
            summary={{
              duration: finalDuration,
              exercisesDone: progress.done,
              exercisesTotal: progress.total,
              setsDone: progress.setsDone,
            }}
            onEdit={reopenWorkout}
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
