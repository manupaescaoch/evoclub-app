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
  return useTrainingPlanImpl(clientId);
};

/** Início (segunda) da semana, N semanas atrás, no fuso de Brasília. */
const weekStartOffset = (weeksAgo: number) => {
  const { from } = brazilWeekRange();
  const d = new Date(`${from}T00:00:00`);
  return new Date(d.getTime() - weeksAgo * 7 * 86400000).toISOString().slice(0, 10);
};

/** Volume semanal realizado por grupo oficial, com histórico das últimas 5 semanas. */
export const loadVolume = async (clientId: number): Promise<VolumeRow[]> => {
  const WEEKS = 5; // atual + 4 anteriores
  const histFrom = weekStartOffset(WEEKS - 1);
  const { to: curTo, from: curFrom } = brazilWeekRange();

  const { data: logs } = await supabase
    .from("workout_logs")
    .select("id, workout_date")
    .eq("client_id", clientId)
    .gte("workout_date", histFrom)
    .lte("workout_date", curTo);

  const empty = () =>
    OFFICIAL_MUSCLE_GROUPS.map((group) => ({
      group,
      direct: 0,
      indirect: 0,
      total: 0,
      target: weeklyTarget(group),
      days: 0,
      sessions: 0,
      prevTotal: 0,
      avg4: 0,
      history: Array.from({ length: WEEKS }, (_, i) => ({
        week: weekStartOffset(WEEKS - 1 - i),
        total: 0,
      })),
    }));

  const logIds = (logs || []).map((l) => l.id);
  if (!logIds.length) return empty();

  const { data: rawSets } = await supabase
    .from("workout_log_sets")
    .select("workout_log_id, session_exercise_id, performed_sets, prescribed_sets, completed")
    .in("workout_log_id", logIds);

  // Só séries efetivamente realizadas
  const sets = (rawSets || []).filter(
    (s) => s.session_exercise_id && (s.completed || (s.performed_sets ?? 0) > 0)
  );
  if (!sets.length) return empty();

  const seIds = [...new Set(sets.map((s) => s.session_exercise_id as string))];
  const { data: seRows } = await supabase
    .from("training_session_exercises")
    .select("id, exercise_id")
    .in("id", seIds);
  const exerciseIdBySe = new Map((seRows || []).map((r) => [r.id, r.exercise_id]));

  const libIds = [...new Set((seRows || []).map((r) => r.exercise_id).filter(Boolean))] as string[];
  const { data: lib } = libIds.length
    ? await supabase
        .from("exercise_library")
        .select("id, muscle_group, secondary_muscle, secondary_muscle_2")
        .in("id", libIds)
    : { data: [] as any[] };
  const groupsById = new Map<string, { primary: string | null; aux: string[] }>(
    (lib || []).map((l: any) => {
      const primary = toOfficialGroup(l.muscle_group);
      const aux = [
        ...String(l.secondary_muscle || "").split(","),
        l.secondary_muscle_2 || "",
      ]
        .map((s: string) => toOfficialGroup(s))
        .filter((g): g is string => !!g && g !== primary);
      return [l.id, { primary, aux: [...new Set(aux)].slice(0, 2) }];
    })
  );

  const curStart = new Date(`${curFrom}T00:00:00`).getTime();
  const weekIndexOf = (date: string) => {
    const t = new Date(`${date}T00:00:00`).getTime();
    const diffWeeks = Math.floor((t - curStart) / (7 * 86400000));
    return WEEKS - 1 + diffWeeks; // índice 0 = mais antiga, WEEKS-1 = atual
  };
  const logInfo = new Map((logs || []).map((l) => [l.id, l.workout_date as string]));

  const direct = new Map<string, number[]>();
  const indirect = new Map<string, number[]>();
  const daysByGroup = new Map<string, Set<string>>();
  const sessionsByGroup = new Map<string, Set<string>>();
  const bump = (m: Map<string, number[]>, group: string, wi: number, qty: number) => {
    const arr = m.get(group) || Array.from({ length: WEEKS }, () => 0);
    arr[wi] += qty;
    m.set(group, arr);
  };

  sets.forEach((s) => {
    const date = logInfo.get(s.workout_log_id);
    if (!date) return;
    const wi = weekIndexOf(date);
    if (wi < 0 || wi >= WEEKS) return;
    const exId = exerciseIdBySe.get(s.session_exercise_id as string);
    const g = exId ? groupsById.get(exId) : undefined;
    if (!g) return;
    const qty = s.performed_sets ?? s.prescribed_sets ?? 1;
    const touch = (group: string) => {
      if (wi !== WEEKS - 1) return;
      const d = daysByGroup.get(group) || new Set<string>();
      d.add(date);
      daysByGroup.set(group, d);
      const ss = sessionsByGroup.get(group) || new Set<string>();
      ss.add(s.workout_log_id);
      sessionsByGroup.set(group, ss);
    };
    if (g.primary) {
      bump(direct, g.primary, wi, qty);
      touch(g.primary);
    }
    g.aux.forEach((a) => {
      bump(indirect, a, wi, qty * 0.5);
      touch(a);
    });
  });

  return OFFICIAL_MUSCLE_GROUPS.map((group) => {
    const d = direct.get(group) || Array.from({ length: WEEKS }, () => 0);
    const ind = indirect.get(group) || Array.from({ length: WEEKS }, () => 0);
    const totals = d.map((v, i) => v + ind[i]);
    const prev4 = totals.slice(0, WEEKS - 1);
    return {
      group,
      direct: d[WEEKS - 1],
      indirect: ind[WEEKS - 1],
      total: totals[WEEKS - 1],
      target: weeklyTarget(group),
      days: daysByGroup.get(group)?.size || 0,
      sessions: sessionsByGroup.get(group)?.size || 0,
      prevTotal: totals[WEEKS - 2],
      avg4: prev4.reduce((a, b) => a + b, 0) / prev4.length,
      history: totals.map((total, i) => ({ week: weekStartOffset(WEEKS - 1 - i), total })),
    };
  });
};

const useTrainingPlanImpl = (clientId: number | null) => {
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
