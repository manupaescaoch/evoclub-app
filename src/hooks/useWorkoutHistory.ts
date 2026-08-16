import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WorkoutHistorySet = {
  id: string;
  exercise_name: string;
  prescribed_sets: number | null;
  prescribed_reps: string | null;
  prescribed_load: string | null;
  performed_sets: number | null;
  performed_reps: string | null;
  performed_load: string | null;
  completed: boolean;
  exercise_order: number | null;
  order_index: number | null;
};

export type WorkoutHistoryLog = {
  id: string;
  workout_date: string;
  session_name: string | null;
  status: string;
  rpe: number | null;
  pain: boolean | null;
  sets: WorkoutHistorySet[];
};

/**
 * Fonte única do histórico de treinos executados (workout_logs + workout_log_sets).
 * Usado pelo app do aluno (Histórico) e pelo Modo Treinador (resumo do aluno).
 */
export function useWorkoutHistory(clientId?: number | null, limit = 20) {
  const [logs, setLogs] = useState<WorkoutHistoryLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientId) { setLogs([]); return; }
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("workout_logs")
      .select("id, workout_date, session_name, status, rpe, pain")
      .eq("client_id", clientId)
      .order("workout_date", { ascending: false })
      .order("started_at", { ascending: false })
      .limit(limit);
    if (err) { setError(err.message); setLoading(false); return; }
    const rows = data || [];
    let sets: any[] = [];
    if (rows.length) {
      const { data: s, error: sErr } = await supabase
        .from("workout_log_sets")
        .select("id, workout_log_id, exercise_name, prescribed_sets, prescribed_reps, prescribed_load, performed_sets, performed_reps, performed_load, completed, exercise_order, order_index")
        .in("workout_log_id", rows.map(r => r.id))
        .order("exercise_order")
        .order("order_index");
      if (sErr) { setError(sErr.message); setLoading(false); return; }
      sets = s || [];
    }
    setLogs(rows.map(r => ({
      ...r,
      sets: sets.filter(x => x.workout_log_id === r.id) as WorkoutHistorySet[],
    })) as WorkoutHistoryLog[]);
    setLoading(false);
  }, [clientId, limit]);

  useEffect(() => { load(); }, [load]);

  const lastCompleted = logs.find(l => l.status === "completed") || null;

  return { logs, lastCompleted, loading, error, reload: load };
}
