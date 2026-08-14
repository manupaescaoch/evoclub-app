import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Point, RangeKey, sinceIso } from "@/hooks/useHealth";

export type AdminHealthOverview = {
  allowed: boolean;
  weight: { id: string; value: number; measured_at: string; source: string } | null;
  goal: { target: number; start_value: number | null; achieved_at: string | null } | null;
  resting_hr: { value: number; measured_at: string; source: string } | null;
  bp: { id: string; systolic: number; diastolic: number; measured_at: string; source: string } | null;
  checkin: {
    date: string; sleep_hours: number | null; sleep_quality: number | null;
    energy: number | null; mood: number | null; stress_level: number | null;
    readiness: number | null; today: boolean;
  } | null;
  device: { provider: string; label: string | null; last_sync_at: string | null } | null;
  alerts: {
    new_limitation: number; pain_open: number; low_readiness: number;
    assessment_overdue: number; training_overdue: number;
  };
};

export function useAdminHealthOverview(clientId: number | null) {
  const [data, setData] = useState<AdminHealthOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error } = await supabase.rpc("client_health_overview" as any, { _client_id: clientId });
    if (error) setError(error.message);
    setData((data as any) || null);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

export type AdminSeriesKey = "weight" | "resting_hr" | "blood_pressure" | "sleep_hours" | "sleep_quality";

/** Mesmas séries do app do aluno, agora para qualquer aluno (uso da equipe). */
export function useAdminHealthSeries(clientId: number | null, metric: AdminSeriesKey, range: RangeKey) {
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true); setError(null);
    const from = sinceIso(range);
    let result: Point[] = [];
    if (metric === "weight") {
      const { data, error } = await supabase.from("health_weights")
        .select("id, value, measured_at, source").eq("client_id", clientId)
        .gte("measured_at", from).order("measured_at", { ascending: true });
      if (error) setError(error.message);
      result = (data || []).map((r: any) => ({ date: r.measured_at, value: Number(r.value), source: r.source }));
    } else if (metric === "resting_hr") {
      const { data, error } = await supabase.from("health_metrics")
        .select("value, measured_at, source").eq("client_id", clientId).eq("metric", "resting_hr")
        .gte("measured_at", from).order("measured_at", { ascending: true });
      if (error) setError(error.message);
      result = (data || []).map((r: any) => ({ date: r.measured_at, value: Number(r.value), source: r.source }));
    } else if (metric === "blood_pressure") {
      const { data, error } = await supabase.from("health_blood_pressure")
        .select("systolic, diastolic, measured_at, source").eq("client_id", clientId)
        .gte("measured_at", from).order("measured_at", { ascending: true });
      if (error) setError(error.message);
      result = (data || []).map((r: any) => ({ date: r.measured_at, value: r.systolic, extra: r.diastolic, source: r.source }));
    } else {
      const field = metric === "sleep_hours" ? "sleep_hours" : "sleep_quality";
      const { data, error } = await supabase.from("daily_checkins")
        .select(`checkin_date, ${field}`).eq("client_id", clientId)
        .gte("checkin_date", from.slice(0, 10)).order("checkin_date", { ascending: true });
      if (error) setError(error.message);
      result = (data || []).map((r: any) => ({ date: r.checkin_date, value: Number(r[field]) }));
    }
    setPoints(result);
    setLoading(false);
  }, [clientId, metric, range]);

  useEffect(() => { load(); }, [load]);
  return { points, loading, error, reload: load };
}
