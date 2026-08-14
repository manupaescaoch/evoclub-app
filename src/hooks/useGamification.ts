import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudentName } from "@/hooks/useStudentName";

export type Achievement = {
  code: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  metric: string;
  threshold: number;
  xp_bonus: number;
  progress: number;
  unlocked_at: string | null;
};

export type GamificationState = {
  loading: boolean;
  xp: number;
  level: number;
  levelStartXp: number;
  levelEndXp: number;
  levelPct: number;
  xpToNext: number;
  streak: number;
  workouts: number;
  achievements: Achievement[];
  unlockedCount: number;
  justUnlocked: Achievement[];
  dismissUnlocked: () => void;
  reload: () => void;
};

const LEVEL_TITLES = ["Iniciante", "Consistente", "Dedicado", "Forte", "Atleta", "Veterano", "Elite", "Lenda"];
export const levelTitle = (level: number) =>
  LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.max(0, level - 1))];

/** Nível, XP e conquistas do aluno (desbloqueio automático no banco). */
export const useGamification = (): GamificationState => {
  const { clientId } = useStudentName();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [justUnlocked, setJustUnlocked] = useState<Achievement[]>([]);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: newly } = await supabase.rpc("sync_achievements");
      const { data: state } = await supabase.rpc("gamification_state");
      if (!alive) return;
      const unlockedNow = (newly as unknown as Achievement[]) || [];
      if (unlockedNow.length) setJustUnlocked(unlockedNow);
      setData(state);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [clientId, tick]);

  const xp = Number(data?.xp || 0);
  const level = Number(data?.level || 1);
  const levelStartXp = Number(data?.level_start_xp || 0);
  const levelEndXp = Number(data?.level_end_xp || 250);
  const span = Math.max(1, levelEndXp - levelStartXp);
  const achievements = ((data?.achievements as Achievement[]) || []).map((a) => ({
    ...a,
    progress: Number(a.progress),
    threshold: Number(a.threshold),
  }));

  return {
    loading,
    xp,
    level,
    levelStartXp,
    levelEndXp,
    levelPct: Math.min(100, Math.max(0, Math.round(((xp - levelStartXp) / span) * 100))),
    xpToNext: Math.max(0, levelEndXp - xp),
    streak: Number(data?.streak || 0),
    workouts: Number(data?.workouts || 0),
    achievements,
    unlockedCount: achievements.filter((a) => a.unlocked_at).length,
    justUnlocked,
    dismissUnlocked: () => setJustUnlocked([]),
    reload,
  };
};
