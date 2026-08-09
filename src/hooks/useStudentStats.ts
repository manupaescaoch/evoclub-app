import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudentName } from "@/hooks/useStudentName";

export const brToday = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export type XpRow = { key: string; label: string; points: number; occurrences: number; total: number };

export type StudentStats = {
  loading: boolean;
  totalWorkouts: number;
  weeklyAverage: number | null;
  firstWorkoutDate: string | null;
  streak: number;
  xpToday: number;
  xpTodayRows: XpRow[];
  xpTotal: number;
  xpBestDay: number;
  weekDone: boolean[];
};

const emptyStats: StudentStats = {
  loading: true,
  totalWorkouts: 0,
  weeklyAverage: null,
  firstWorkoutDate: null,
  streak: 0,
  xpToday: 0,
  xpTodayRows: [],
  xpTotal: 0,
  xpBestDay: 0,
  weekDone: [false, false, false, false, false, false, false],
};

/** Estatísticas reais do aluno (treinos, streak, XP conforme regras cadastradas). */
export const useStudentStats = () => {
  const { clientId } = useStudentName();
  const [stats, setStats] = useState<StudentStats>(emptyStats);

  useEffect(() => {
    if (!clientId) {
      setStats({ ...emptyStats, loading: false });
      return;
    }
    let alive = true;
    (async () => {
      const today = brToday();
      const todayIso = isoDate(today);
      // semana segunda -> domingo
      const jsDay = today.getDay(); // 0=dom
      const mondayOffset = jsDay === 0 ? 6 : jsDay - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - mondayOffset);

      const [{ data: logs }, xpTodayRes, xpTotalRes] = await Promise.all([
        supabase
          .from("workout_logs")
          .select("workout_date")
          .eq("client_id", clientId)
          .eq("status", "completed")
          .order("workout_date", { ascending: false }),
        supabase.rpc("student_xp", { _client_id: clientId, _from: todayIso, _to: todayIso }),
        supabase.rpc("student_xp", { _client_id: clientId }),
      ]);
      if (!alive) return;

      const dates = ((logs || []) as { workout_date: string }[]).map((l) => l.workout_date);
      const uniqueDates = Array.from(new Set(dates));
      const totalWorkouts = dates.length;
      const firstWorkoutDate = uniqueDates.length ? uniqueDates[uniqueDates.length - 1] : null;

      let weeklyAverage: number | null = null;
      if (firstWorkoutDate) {
        const weeks = Math.max(
          1,
          (today.getTime() - new Date(firstWorkoutDate).getTime()) / (7 * 24 * 3600 * 1000)
        );
        weeklyAverage = Math.round((totalWorkouts / weeks) * 10) / 10;
      }

      // streak: dias consecutivos com treino (hoje ou ontem como ponto de partida)
      const set = new Set(uniqueDates);
      let streak = 0;
      const cursor = new Date(today);
      if (!set.has(isoDate(cursor))) cursor.setDate(cursor.getDate() - 1);
      while (set.has(isoDate(cursor))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }

      const weekDone = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return set.has(isoDate(d));
      });

      const xpTodayRows = ((xpTodayRes.data || []) as XpRow[]).map((r) => ({
        ...r,
        occurrences: Number(r.occurrences),
        total: Number(r.total),
      }));
      const xpToday = xpTodayRows.reduce((a, r) => a + r.total, 0);
      const xpTotalRows = ((xpTotalRes.data || []) as XpRow[]).map((r) => Number(r.total));
      const xpTotal = xpTotalRows.reduce((a, b) => a + b, 0);
      // referência de progresso: maior XP possível somando 1 ocorrência de cada regra
      const xpBestDay = xpTodayRows.reduce((a, r) => a + r.points, 0);

      setStats({
        loading: false,
        totalWorkouts,
        weeklyAverage,
        firstWorkoutDate,
        streak,
        xpToday,
        xpTodayRows,
        xpTotal,
        xpBestDay,
        weekDone,
      });
    })();
    return () => { alive = false; };
  }, [clientId]);

  return stats;
};
