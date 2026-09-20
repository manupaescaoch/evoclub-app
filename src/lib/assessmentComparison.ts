import { supabase } from "@/integrations/supabase/client";

export type AssessmentComparisonItem = {
  id: string;
  client_id: number;
  unit_id: string | null;
  unit_name: string | null;
  scheduled_at: string | null;
  performed_at: string | null;
  status: string;
  professional_name: string | null;
  origin: string | null;
  created_at: string;
  evo_pdf_path: string | null;
  evo_pdf_name: string | null;
  file_path: string | null;
  file_name: string | null;
  bio: Record<string, any> | null;
};

export const COMPARISON_INDICATORS = [
  { key: "weight", label: "Peso", unit: "kg", tone: "neutral" },
  { key: "skeletal_muscle_mass", fallback: "muscle_mass", label: "Massa muscular esquelética", unit: "kg", tone: "up" },
  { key: "fat_mass", label: "Massa de gordura", unit: "kg", tone: "down" },
  { key: "body_fat_pct", label: "Percentual de gordura", unit: "%", deltaUnit: "p.p.", tone: "down" },
  { key: "bmi", label: "IMC", unit: "kg/m²", tone: "neutral" },
  { key: "total_body_water", fallback: "body_water", label: "Água corporal total", unit: "L", tone: "neutral" },
  { key: "lean_mass", label: "Massa livre de gordura", unit: "kg", tone: "up" },
  { key: "basal_metabolism", label: "Taxa metabólica basal", unit: "kcal", tone: "neutral" },
  { key: "visceral_fat", label: "Gordura visceral", unit: "", tone: "down" },
  { key: "waist_hip_ratio", label: "Relação cintura-quadril", unit: "", tone: "down" },
  { key: "inbody_score", label: "Pontuação geral", unit: "/ 100", tone: "up" },
] as const;

export const SEGMENT_KEYS = [
  ["lean_arm_left", "Massa magra — braço esquerdo"], ["lean_arm_right", "Massa magra — braço direito"],
  ["lean_trunk", "Massa magra — tronco"], ["lean_leg_left", "Massa magra — perna esquerda"],
  ["lean_leg_right", "Massa magra — perna direita"], ["fat_arm_left", "Gordura — braço esquerdo"],
  ["fat_arm_right", "Gordura — braço direito"], ["fat_trunk", "Gordura — tronco"],
  ["fat_leg_left", "Gordura — perna esquerda"], ["fat_leg_right", "Gordura — perna direita"],
] as const;

export const valueOf = (item: AssessmentComparisonItem, key: string, fallback?: string) => {
  const value = item.bio?.[key] ?? (fallback ? item.bio?.[fallback] : null);
  const parsed = value == null || value === "" ? null : Number(value);
  return parsed != null && Number.isFinite(parsed) ? parsed : null;
};

export const assessmentDate = (item: AssessmentComparisonItem) => item.performed_at || item.scheduled_at || item.created_at;
export const assessmentType = (item: AssessmentComparisonItem) => item.bio?.device_model ? "Bioimpedância" : "Avaliação física";
export const isComparable = (item: AssessmentComparisonItem) => item.status === "realizada" && !!item.performed_at && !!item.bio && COMPARISON_INDICATORS.some(i => valueOf(item, i.key, "fallback" in i ? i.fallback : undefined) != null);
export const isIncomplete = (item: AssessmentComparisonItem) => ["weight", "skeletal_muscle_mass", "body_fat_pct"].some(key => valueOf(item, key, key === "skeletal_muscle_mass" ? "muscle_mass" : undefined) == null);

export const formatAssessmentValue = (value: number | null, unit = "") => value == null ? "Não informado" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;

export const evolutionTone = (tone: string, delta: number, current?: number | null, previous?: number | null) => {
  if (Math.abs(delta) < 0.01) return "stable";
  if (tone === "neutral") return "neutral";
  if ([current, previous].some(v => v == null)) return "neutral";
  return (tone === "up" ? delta > 0 : delta < 0) ? "positive" : "negative";
};

export async function fetchClientAssessments(clientId: number): Promise<{ client: any; items: AssessmentComparisonItem[] }> {
  const [clientResult, rowsResult, unitsResult] = await Promise.all([
    supabase.from("client_overview").select("*").eq("id", clientId).single(),
    supabase.from("physical_assessments").select("*, assessment_bioimpedance(*)").eq("client_id", clientId).order("created_at", { ascending: false }),
    supabase.from("units").select("id, name"),
  ]);
  if (clientResult.error || !clientResult.data) throw new Error("Aluno não encontrado.");
  if (rowsResult.error) throw rowsResult.error;
  const units = new Map((unitsResult.data || []).map(u => [u.id, u.name]));
  const items = ((rowsResult.data || []) as any[]).map(row => ({
    ...row,
    unit_name: row.unit_id ? units.get(row.unit_id) || null : null,
    bio: Array.isArray(row.assessment_bioimpedance) ? row.assessment_bioimpedance[0] || null : row.assessment_bioimpedance || null,
  })) as AssessmentComparisonItem[];
  return { client: clientResult.data, items };
}

export const comparisonFileName = (name: string, first: string, last: string) => {
  const slug = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const date = (iso: string) => new Date(iso).toLocaleDateString("pt-BR").replace(/\//g, "-");
  return `comparativo-evo-${slug}-${date(first)}-a-${date(last)}.pdf`;
};