import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OFFICIAL_MUSCLE_GROUPS, toOfficialGroup, weeklyTarget } from "@/lib/muscleVolume";

export interface PlanSession {
  id: string;
  name: string;
  day: string;
  exerciseCount: number;
  doneToday: boolean;
}

export interface ActivePlan {
  id: string;
  name: string;
  goal: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  coachName: string | null;
  sessions: PlanSession[];
  volume: VolumeRow[];
}

export interface VolumeRow {
  group: string;
  /** Séries realizadas em que o grupo é o principal (1,0 cada). */
  direct: number;
  /** Séries equivalentes indiretas (grupo como acessório, 0,5 cada). */
  indirect: number;
  /** direct + indirect. */
  total: number;
  /** Meta semanal de séries para o grupo. */
  target: number;
  /** Dias distintos da semana em que o grupo foi trabalhado. */
  days: number;
  /** Sessões (treinos registrados) que trabalharam o grupo na semana. */
  sessions: number;
  /** Total da semana anterior. */
  prevTotal: number;
  /** Média das últimas 4 semanas (anteriores à atual). */
  avg4: number;
  /** Histórico das últimas semanas (mais antiga → atual). */
  history: { week: string; total: number }[];
}

export interface ArchivedPlan {
  id: string;
  name: string;
  startsAt: string | null;
  expiresAt: string | null;
}

export const brazilToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

/** Dias restantes até a troca (negativo = vencida). */
export const daysToSwap = (expiresAt: string | null) => {
  if (!expiresAt) return null;
  const today = new Date(`${brazilToday()}T00:00:00`);
  const exp = new Date(`${expiresAt}T00:00:00`);
  return Math.round((exp.getTime() - today.getTime()) / 86400000);
};

export const swapStatus = (expiresAt: string | null): "ok" | "soon" | "late" | null => {
  const d = daysToSwap(expiresAt);
  if (d === null) return null;
  if (d < 0) return "late";
  if (d <= 7) return "soon";
  return "ok";
};

/** Semana atual segunda→domingo no fuso de Brasília. */
export const brazilWeekRange = () => {
  const today = new Date(`${brazilToday()}T00:00:00`);
  const dow = today.getDay(); // 0 = domingo
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today.getTime() + diffToMonday * 86400000);
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(monday), to: fmt(sunday) };
};

export const useTrainingPlan = (clientId: number | null) => {
  const [plan, setPlan] = useState<ActivePlan | null>(null);
  const [archived, setArchived] = useState<ArchivedPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);

    const { data: plans } = await supabase
      .from("training_plans")
      .select("id, name, goal, starts_at, expires_at, coach_id, is_active, created_at")
      .eq("student_id", clientId)
      .order("created_at", { ascending: false });

    const active = (plans || []).find((p) => p.is_active);
    setArchived(
      (plans || [])
        .filter((p) => !p.is_active)
        .map((p) => ({ id: p.id, name: p.name, startsAt: p.starts_at, expiresAt: p.expires_at }))
    );

    if (!active) {
      setPlan(null);
      setLoading(false);
      return;
    }

    const coachName: string | null = active.coach_id ? "Equipe EVO" : null;

    const { data: weeks } = await supabase
      .from("training_weeks")
      .select("id")
      .eq("training_plan_id", active.id)
      .order("week_number")
      .limit(1);

    let sessions: PlanSession[] = [];
    let volume: VolumeRow[] = [];

    if (weeks?.[0]) {
      const { data: rows } = await supabase
        .from("training_sessions")
        .select("id, name, day_of_week, order_index")
        .eq("training_week_id", weeks[0].id)
        .order("order_index");

      const sessionIds = (rows || []).map((s) => s.id);
      const { data: exs } = sessionIds.length
        ? await supabase
            .from("training_session_exercises")
            .select("id, training_session_id, exercise_id")
            .in("training_session_id", sessionIds)
        : { data: [] as { id: string; training_session_id: string; exercise_id: string | null }[] };

      const { data: logs } = await supabase
        .from("workout_logs")
        .select("training_session_id, status")
        .eq("client_id", clientId)
        .eq("workout_date", brazilToday());
      const doneIds = new Set(
        (logs || [])
          .filter((l) => l.status === "completed" && l.training_session_id)
          .map((l) => l.training_session_id as string)
      );

      sessions = (rows || []).map((s, i) => ({
        id: s.id,
        name: s.name,
        day: s.day_of_week ? s.day_of_week.slice(0, 3).toUpperCase() : `D${i + 1}`,
        exerciseCount: (exs || []).filter((e) => e.training_session_id === s.id).length,
        doneToday: doneIds.has(s.id),
      }));
    }

    volume = await loadVolume(clientId);

    setPlan({
      id: active.id,
      name: active.name,
      goal: active.goal,
      startsAt: active.starts_at,
      expiresAt: active.expires_at,
      coachName,
      sessions,
      volume,
    });
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  return { plan, archived, loading, reload: load };
};
