import { supabase } from "@/integrations/supabase/client";

export type SetPayload = {
  workout_log_id: string;
  session_exercise_id: string;
  prescribed_set_id: string | null;
  exercise_name: string;
  set_type: string | null;
  prescribed_sets: number | null;
  prescribed_reps: string | null;
  prescribed_load: string | null;
  performed_sets: number | null;
  performed_reps: string | null;
  performed_load: string | null;
  performed_time_seconds: number | null;
  performed_distance_km: number | null;
  performed_speed: number | null;
  performed_incline: string | null;
  performed_calories: number | null;
  completed: boolean;
  completed_at: string | null;
  rest_seconds: number | null;
  side_mode: string | null;
  exercise_order: number;
  order_index: number;
  set_index: number;
  /** false = série sem nenhum dado: deve ser removida do registro */
  keep: boolean;
};

const QUEUE_KEY = "evo.workout.queue";

const rowKey = (p: SetPayload) =>
  `${p.workout_log_id}|${p.session_exercise_id}|${p.order_index}|${p.set_index}`;

const readQueue = (): Record<string, SetPayload> => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "{}");
  } catch {
    return {};
  }
};

const writeQueue = (q: Record<string, SetPayload>) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* armazenamento indisponível */
  }
};

const enqueue = (p: SetPayload) => {
  const q = readQueue();
  q[rowKey(p)] = p;
  writeQueue(q);
};

const dequeue = (p: SetPayload) => {
  const q = readQueue();
  delete q[rowKey(p)];
  writeQueue(q);
};

/** Grava (ou remove) uma série no banco. Falhando, guarda no aparelho para sincronizar depois. */
export async function saveSet(p: SetPayload): Promise<boolean> {
  enqueue(p);
  try {
    const { keep, ...row } = p;
    const del = await supabase
      .from("workout_log_sets")
      .delete()
      .eq("workout_log_id", p.workout_log_id)
      .eq("session_exercise_id", p.session_exercise_id)
      .eq("order_index", p.order_index)
      .eq("set_index", p.set_index);
    if (del.error) throw del.error;
    if (keep) {
      const { error } = await supabase.from("workout_log_sets").insert(row);
      if (error) throw error;
    }
    dequeue(p);
    return true;
  } catch {
    return false;
  }
}

/** Reenvia tudo que ficou pendente. Devolve quantas séries seguem sem sincronizar. */
export async function flushQueue(logId?: string): Promise<number> {
  const q = readQueue();
  const items = Object.values(q).filter((p) => !logId || p.workout_log_id === logId);
  let failed = 0;
  for (const p of items) {
    const ok = await saveSet(p);
    if (!ok) failed++;
  }
  return failed;
}

export const pendingCount = (logId?: string) =>
  Object.values(readQueue()).filter((p) => !logId || p.workout_log_id === logId).length;
