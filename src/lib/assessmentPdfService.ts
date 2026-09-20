import { supabase } from "@/integrations/supabase/client";
import { assessmentPdfFileName, generateAssessmentEvoPdf } from "@/lib/assessmentEvoPdf";

export async function buildAssessmentPdfData(assessmentId: string) {
  const { data: row, error } = await supabase.from("physical_assessments").select("*").eq("id", assessmentId).single();
  if (error || !row) throw new Error("Avaliação não encontrada.");
  const [clientResult, unitResult, bioResult, previousResult] = await Promise.all([
    supabase.from("clients").select("name, phone, unit_id").eq("id", row.client_id).single(),
    row.unit_id ? supabase.from("units").select("name").eq("id", row.unit_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("assessment_bioimpedance").select("*").eq("assessment_id", assessmentId).maybeSingle(),
    supabase.from("physical_assessments").select("id, performed_at").eq("client_id", row.client_id).lt("performed_at", row.performed_at || row.scheduled_at).not("performed_at", "is", null).order("performed_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!clientResult.data) throw new Error("Aluno não encontrado.");
  let previousBio: Record<string, any> | null = null;
  if (previousResult.data?.id) {
    const { data } = await supabase.from("assessment_bioimpedance").select("*").eq("assessment_id", previousResult.data.id).maybeSingle();
    previousBio = data as Record<string, any> | null;
  }
  return {
    row,
    phone: clientResult.data.phone || "",
    pdfData: {
      id: row.id,
      studentName: clientResult.data.name,
      performedAt: row.performed_at || row.scheduled_at,
      professional: row.professional_name,
      unitName: (unitResult.data as { name?: string } | null)?.name || null,
      notes: row.notes,
      bio: bioResult.data as Record<string, any> | null,
      previous: previousResult.data ? { performedAt: previousResult.data.performed_at, bio: previousBio } : null,
    },
  };
}

export async function generateAndStoreAssessmentPdf(assessmentId: string) {
  const { row, phone, pdfData } = await buildAssessmentPdfData(assessmentId);
  const blob = generateAssessmentEvoPdf(pdfData);
  const version = Number((row as any).evo_pdf_version || 0) + 1;
  const name = assessmentPdfFileName(pdfData.studentName, pdfData.performedAt);
  const path = `pdf/${row.client_id}/${assessmentId}-v${version}.pdf`;
  const upload = await supabase.storage.from("avaliacoes").upload(path, blob, { contentType: "application/pdf", upsert: true });
  if (upload.error) throw upload.error;
  const { error } = await supabase.from("physical_assessments").update({
    evo_pdf_path: path, evo_pdf_name: name, evo_pdf_generated_at: new Date().toISOString(), evo_pdf_version: version,
  } as any).eq("id", assessmentId);
  if (error) throw error;
  return { blob, path, name, phone, pdfData };
}

export async function getAssessmentPdf(assessmentId: string, regenerate = false) {
  const { data: row } = await supabase.from("physical_assessments").select("evo_pdf_path, evo_pdf_name").eq("id", assessmentId).single();
  if (!regenerate && row?.evo_pdf_path) {
    const { data, error } = await supabase.storage.from("avaliacoes").download(row.evo_pdf_path);
    if (!error && data) return { blob: data, path: row.evo_pdf_path, name: row.evo_pdf_name || "avaliacao-evo.pdf", phone: "" };
  }
  return generateAndStoreAssessmentPdf(assessmentId);
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
