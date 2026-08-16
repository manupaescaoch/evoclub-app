import { useState } from "react";
import { ChevronDown, ChevronRight, Dumbbell } from "lucide-react";
import { WorkoutHistoryLog, WorkoutHistorySet } from "@/hooks/useWorkoutHistory";

export const fmtWorkoutDate = (d?: string | null) =>
  d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—";

type ExerciseSummary = { name: string; sets: number; reps: string | null; load: string | null; done: boolean };

/** Agrupa as séries por exercício, priorizando o que foi realmente executado. */
export function summarizeExercises(sets: WorkoutHistorySet[]): ExerciseSummary[] {
  const map = new Map<string, ExerciseSummary>();
  for (const s of sets) {
    const key = s.exercise_name || "Exercício";
    const cur = map.get(key) || { name: key, sets: 0, reps: null, load: null, done: false };
    cur.sets += 1;
    const reps = s.performed_reps || (s.performed_sets != null ? null : null) || s.prescribed_reps;
    if (reps) cur.reps = reps;
    const load = s.performed_load || s.prescribed_load;
    if (load) cur.load = load;
    if (s.completed) cur.done = true;
    map.set(key, cur);
  }
  return [...map.values()];
}

export const ExerciseLine = ({ e }: { e: ExerciseSummary }) => (
  <div className="flex items-center gap-2 text-[12px] font-dm">
    <span className={`flex-1 min-w-0 truncate ${e.done ? "text-foreground" : "text-muted-foreground"}`}>{e.name}</span>
    <span className="shrink-0 font-semibold text-foreground">
      {e.sets}x{e.reps || "-"}{e.load ? ` · ${e.load}kg` : ""}
    </span>
  </div>
);

/** Card de destaque do último treino concluído. */
export const LastWorkoutCard = ({ log, maxExercises = 6 }: { log: WorkoutHistoryLog; maxExercises?: number }) => {
  const ex = summarizeExercises(log.sets);
  return (
    <div className="rounded-xl border border-border bg-muted/40 px-3 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Dumbbell size={14} className="text-primary shrink-0" />
        <p className="font-dm text-sm font-bold text-foreground flex-1 min-w-0 truncate">
          {log.session_name || "Treino"}
        </p>
        <span className="font-dm text-[11px] text-muted-foreground shrink-0">{fmtWorkoutDate(log.workout_date)}</span>
      </div>
      {ex.length === 0 ? (
        <p className="font-dm text-[12px] text-muted-foreground">Nenhum exercício registrado neste treino.</p>
      ) : (
        <div className="space-y-1">
          {ex.slice(0, maxExercises).map((e, i) => <ExerciseLine key={i} e={e} />)}
          {ex.length > maxExercises && (
            <p className="font-dm text-[11px] text-muted-foreground">+{ex.length - maxExercises} exercício(s)</p>
          )}
        </div>
      )}
      {(log.rpe || log.pain) && (
        <p className="font-dm text-[11px] text-muted-foreground mt-2">
          {log.rpe ? `PSE ${log.rpe}` : ""}{log.rpe && log.pain ? " · " : ""}{log.pain ? "dor relatada" : ""}
        </p>
      )}
    </div>
  );
};

/** Item de histórico expansível (data, sessão e exercícios executados). */
export const WorkoutLogItem = ({ log, className = "" }: { log: WorkoutHistoryLog; className?: string }) => {
  const [open, setOpen] = useState(false);
  const ex = summarizeExercises(log.sets);
  return (
    <div className={`rounded-2xl border border-border overflow-hidden ${className}`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 text-left min-h-[48px]">
        <Dumbbell size={16} className="text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-dm font-semibold text-foreground truncate">{log.session_name || "Treino"}</p>
          <p className="text-[11px] font-dm text-muted-foreground">
            {fmtWorkoutDate(log.workout_date)}
            {log.rpe ? ` · PSE ${log.rpe}` : ""}
            {log.pain ? " · dor relatada" : ""}
            {ex.length ? ` · ${ex.length} exercício(s)` : ""}
          </p>
        </div>
        <span className="text-[10px] font-dm text-muted-foreground shrink-0">
          {log.status === "completed" ? "Concluído" : "Em andamento"}
        </span>
        {open ? <ChevronDown size={16} className="text-muted-foreground shrink-0" /> : <ChevronRight size={16} className="text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3">
          {ex.length === 0 ? (
            <p className="text-[12px] font-dm text-muted-foreground">Nenhum exercício registrado neste treino.</p>
          ) : (
            <div className="space-y-1.5">{ex.map((e, i) => <ExerciseLine key={i} e={e} />)}</div>
          )}
        </div>
      )}
    </div>
  );
};
