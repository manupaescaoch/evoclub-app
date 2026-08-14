import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AssessmentRow = {
  id: string;
  client_id: number;
  client_name: string;
  unit_id: string | null;
  scheduled_at: string | null;
  performed_at: string | null;
  published_at: string | null;
  status: string;
  professional_id: string | null;
  professional_name: string | null;
  origin: string | null;
  next_due_at: string | null;
  student_rating: number | null;
  revisions: number;
  created_at: string;
};

export type AssessmentDashboard = {
  allowed: boolean;
  today_scheduled: number;
  done: number;
  scheduled: number;
  missed: number;
  cancelled: number;
  due_7d: number;
  overdue: number;
  never: number;
  attendance_pct: number;
  by_professional: { name: string; done: number; total: number; rating: number | null }[];
};

export const ASSESSMENT_STATUS: Record<string, string> = {
  agendada: "Agendada",
  presente: "Presente",
  faltou: "Faltou",
  cancelou: "Cancelou",
  realizada: "Realizada",
};

export const ASSESSMENT_STATUS_STYLE: Record<string, string> = {
  agendada: "bg-blue-50 text-blue-700",
  presente: "bg-emerald-50 text-emerald-700",
  faltou: "bg-red-50 text-red-700",
  cancelou: "bg-gray-100 text-gray-600",
  realizada: "bg-green-50 text-green-700",
};

/** Lista de avaliações do período, já com nome do aluno e contagem de correções. */
export function useAssessmentList(unitId: string | null, from: string, to: string) {
  const [rows, setRows] = useState<AssessmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase.rpc("assessment_list" as any, {
      _unit_id: unitId, _from: null, _to: null,
    });
    if (error) setError(error.message);
    setRows(((data as any[]) || []) as AssessmentRow[]);
    setLoading(false);
  }, [unitId]);

  useEffect(() => { load(); }, [load]);
  return { rows, loading, error, reload: load };
}

export function useAssessmentDashboard(unitId: string | null, from: string, to: string) {
  const [data, setData] = useState<AssessmentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase.rpc("assessment_dashboard" as any, {
      _unit_id: unitId, _from: from, _to: to,
    });
    if (error) setError(error.message);
    setData((data as any) || null);
    setLoading(false);
  }, [unitId, from, to]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

export type MeasureMap = Record<string, number | null>;

export async function fetchAssessmentDetail(id: string) {
  const [m, b, r] = await Promise.all([
    supabase.from("assessment_measures").select("measure_key, value").eq("assessment_id", id),
    supabase.from("assessment_bioimpedance").select("*").eq("assessment_id", id).maybeSingle(),
    supabase.from("assessment_revisions" as any).select("*").eq("assessment_id", id).order("created_at", { ascending: false }),
  ]);
  const measures: MeasureMap = {};
  ((m.data || []) as any[]).forEach(row => { measures[row.measure_key] = row.value == null ? null : Number(row.value); });
  return { measures, bio: (b.data as any) || null, revisions: ((r.data as any[]) || []) };
}
