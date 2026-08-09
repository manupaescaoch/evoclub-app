import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudentName } from "@/hooks/useStudentName";

export type Point = { date: string; value: number; extra?: number; source?: string };

export const RANGES = [
  { key: "30d", label: "30 dias", days: 30 },
  { key: "3m", label: "3 meses", days: 90 },
  { key: "6m", label: "6 meses", days: 180 },
  { key: "1a", label: "1 ano", days: 365 },
  { key: "all", label: "Todo período", days: 0 },
] as const;
export type RangeKey = (typeof RANGES)[number]["key"];

export const sinceIso = (range: RangeKey) => {
  const r = RANGES.find((x) => x.key === range)!;
  if (!r.days) return "1970-01-01T00:00:00.000Z";
  const d = new Date();
  d.setDate(d.getDate() - r.days);
  return d.toISOString();
};

/** Último peso registrado do aluno. */
export const useLatestWeight = () => {
  const { clientId } = useStudentName();
  const [weight, setWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) { setLoading(false); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("health_weights")
        .select("value")
        .eq("client_id", clientId)
        .order("measured_at", { ascending: false })
        .limit(1);
      if (!alive) return;
      const row = (data || [])[0] as { value: number } | undefined;
      setWeight(row ? Number(row.value) : null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [clientId]);

  return { weight, loading };
};

export type HealthSummary = {
  loading: boolean;
  weight: number | null;
  goal: { id: string; target: number; achieved_at: string | null } | null;
  restingHr: number | null;
  bp: { systolic: number; diastolic: number } | null;
  sleepHours: number | null;
  sleepQuality: number | null;
};

export const useHealthSummary = () => {
  const { clientId } = useStudentName();
  const [data, setData] = useState<HealthSummary>({
    loading: true, weight: null, goal: null, restingHr: null, bp: null, sleepHours: null, sleepQuality: null,
  });

  const load = useCallback(async () => {
    if (!clientId) { setData((d) => ({ ...d, loading: false })); return; }
    const [w, g, hr, bp, ck] = await Promise.all([
      supabase.from("health_weights").select("value").eq("client_id", clientId).order("measured_at", { ascending: false }).limit(1),
      supabase.from("weight_goals").select("id, target, achieved_at").eq("client_id", clientId).eq("active", true).order("created_at", { ascending: false }).limit(1),
      supabase.from("health_metrics").select("value").eq("client_id", clientId).eq("metric", "resting_hr").order("measured_at", { ascending: false }).limit(1),
      supabase.from("health_blood_pressure").select("systolic, diastolic").eq("client_id", clientId).order("measured_at", { ascending: false }).limit(1),
      supabase.from("daily_checkins").select("sleep_hours, sleep_quality").eq("client_id", clientId).order("checkin_date", { ascending: false }).limit(1),
    ]);
    const wRow = (w.data || [])[0] as { value: number } | undefined;
    const gRow = (g.data || [])[0] as { id: string; target: number; achieved_at: string | null } | undefined;
    const hrRow = (hr.data || [])[0] as { value: number } | undefined;
    const bpRow = (bp.data || [])[0] as { systolic: number; diastolic: number } | undefined;
    const ckRow = (ck.data || [])[0] as { sleep_hours: number; sleep_quality: number } | undefined;
    setData({
      loading: false,
      weight: wRow ? Number(wRow.value) : null,
      goal: gRow ? { id: gRow.id, target: Number(gRow.target), achieved_at: gRow.achieved_at } : null,
      restingHr: hrRow ? Number(hrRow.value) : null,
      bp: bpRow ? { systolic: bpRow.systolic, diastolic: bpRow.diastolic } : null,
      sleepHours: ckRow ? Number(ckRow.sleep_hours) : null,
      sleepQuality: ckRow ? Number(ckRow.sleep_quality) : null,
    });
  }, [clientId]);

  useEffect(() => { load(); }, [load]);
  return { ...data, reload: load };
};

export type SeriesKey = "weight" | "resting_hr" | "blood_pressure" | "sleep_hours" | "sleep_quality";

export const useHealthSeries = (metric: SeriesKey, range: RangeKey) => {
  const { clientId } = useStudentName();
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);
    const from = sinceIso(range);
    let result: Point[] = [];
    if (metric === "weight") {
      const { data } = await supabase.from("health_weights")
        .select("id, value, measured_at, source").eq("client_id", clientId)
        .gte("measured_at", from).order("measured_at", { ascending: true });
      result = (data || []).map((r: any) => ({ date: r.measured_at, value: Number(r.value), source: r.source }));
    } else if (metric === "resting_hr") {
      const { data } = await supabase.from("health_metrics")
        .select("value, measured_at, source").eq("client_id", clientId).eq("metric", "resting_hr")
        .gte("measured_at", from).order("measured_at", { ascending: true });
      result = (data || []).map((r: any) => ({ date: r.measured_at, value: Number(r.value), source: r.source }));
    } else if (metric === "blood_pressure") {
      const { data } = await supabase.from("health_blood_pressure")
        .select("systolic, diastolic, measured_at, source").eq("client_id", clientId)
        .gte("measured_at", from).order("measured_at", { ascending: true });
      result = (data || []).map((r: any) => ({ date: r.measured_at, value: r.systolic, extra: r.diastolic, source: r.source }));
    } else {
      const field = metric === "sleep_hours" ? "sleep_hours" : "sleep_quality";
      const { data } = await supabase.from("daily_checkins")
        .select(`checkin_date, ${field}`).eq("client_id", clientId)
        .gte("checkin_date", from.slice(0, 10)).order("checkin_date", { ascending: true });
      result = (data || []).map((r: any) => ({ date: r.checkin_date, value: Number(r[field]) }));
    }
    setPoints(result);
    setLoading(false);
  }, [clientId, metric, range]);

  useEffect(() => { load(); }, [load]);
  return { points, loading, reload: load };
};
