import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudent } from "@/contexts/StudentContext";

export type CycleStats = {
  workouts: number;
  class_checkins: number;
  daily_checkins: number;
  posts: number;
};

export type EvoCycle = {
  available: boolean;
  days_left: number | null;
  cycle_start?: string;
  cycle_end?: string;
  stats?: CycleStats;
  completed?: boolean;
};

const FALLBACK: EvoCycle = { available: false, days_left: null };

/** Retrospectiva do Ciclo EVO (30 dias antes do vencimento do plano). */
export const useEvoCycle = () => {
  const { client } = useStudent();
  const [cycle, setCycle] = useState<EvoCycle>(FALLBACK);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!client?.id) { setCycle(FALLBACK); setLoading(false); return; }
    const { data } = await supabase.rpc("evo_cycle_state");
    setCycle(((data as unknown) as EvoCycle) || FALLBACK);
    setLoading(false);
  }, [client?.id]);

  useEffect(() => { load(); }, [load]);

  const complete = useCallback(async () => {
    await supabase.rpc("complete_evo_cycle", { _stats: (cycle.stats ?? {}) as never });
    setCycle((c) => ({ ...c, completed: true }));
  }, [cycle.stats]);

  return { cycle, loading, complete, reload: load };
};

export const cycleXp = (s?: CycleStats) =>
  s ? s.workouts * 15 + s.class_checkins * 10 + s.daily_checkins * 5 + s.posts * 5 : 0;
