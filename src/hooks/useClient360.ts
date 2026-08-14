import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OverviewRow = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  status: string | null;
  plan: string | null;
  plan_value: number | null;
  unit_id: string | null;
  visit_type: string | null;
  avatar_url: string | null;
  contract_start: string | null;
  contract_end: string | null;
  created_at: string | null;
  auth_user_id: string | null;
  objective: string | null;
  limitations: string | null;
  weekly_goal: number | null;
  last_activity: string | null;
  days_since_activity: number | null;
  workouts_30d: number | null;
  financial_state: string | null;
  plan_expires_at: string | null;
  training_overdue: boolean | null;
  last_assessment: string | null;
  assessment_overdue: boolean | null;
  open_occurrences: number | null;
  pending_renewals: number | null;
  open_alerts: number | null;
};

export type AttendanceStats = {
  allowed: boolean;
  weekly_goal: number;
  last_activity: string | null;
  days_since_activity: number | null;
  d7: number; d30: number; d90: number;
  avg_per_week: number;
  cancellations: number;
  absences: number;
  streak: number;
  best_streak: number;
  by_dow: { dow: number; total: number }[];
  weeks: { week: string; total: number }[];
  weeks_ok: number;
  weeks_total: number;
  weeks_pct: number;
};

export type TimelineEvent = {
  occurred_at: string;
  kind: string;
  title: string;
  detail: string | null;
  meta: any;
};

/** Lista de clientes com indicadores derivados (view client_overview). */
export function useClientOverview(unitId: string | null) {
  const [rows, setRows] = useState<OverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    let q = supabase.from("client_overview").select("*").order("created_at", { ascending: false });
    if (unitId) q = q.eq("unit_id", unitId);
    const { data, error } = await q;
    if (error) setError(error.message);
    setRows(((data as any[]) || []) as OverviewRow[]);
    setLoading(false);
  }, [unitId]);

  useEffect(() => { load(); }, [load]);
  return { rows, loading, error, reload: load };
}

export function useAttendanceStats(clientId: number | null) {
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true); setError(null);
    const { data, error } = await supabase.rpc("client_attendance_stats" as any, { _client_id: clientId });
    if (error) setError(error.message);
    setStats((data as any) || null);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);
  return { stats, loading, error, reload: load };
}

const PAGE = 25;

export function useClientTimeline(clientId: number | null, kinds: string[] | null) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const fetchPage = useCallback(async (offset: number) => {
    if (!clientId) return;
    setLoading(true); setError(null);
    const { data, error } = await supabase.rpc("client_timeline" as any, {
      _client_id: clientId,
      _kinds: kinds && kinds.length ? kinds : null,
      _limit: PAGE,
      _offset: offset,
    });
    if (error) setError(error.message);
    const list = ((data as any[]) || []) as TimelineEvent[];
    setEvents(prev => (offset === 0 ? list : [...prev, ...list]));
    setDone(list.length < PAGE);
    setLoading(false);
  }, [clientId, kinds]);

  useEffect(() => { setEvents([]); setDone(false); fetchPage(0); }, [fetchPage]);

  return { events, loading, error, done, loadMore: () => fetchPage(events.length) };
}
