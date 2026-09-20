import { supabase } from "@/integrations/supabase/client";
import { buildAssessmentPdfData } from "@/lib/assessmentPdfService";
import { generateAssessmentEvoPdf } from "@/lib/assessmentEvoPdf";
import { assessmentDate, comparisonFileName, fetchClientAssessments, isComparable } from "@/lib/assessmentComparison";
import { logAudit } from "@/lib/audit";

export async function generateAndStoreComparisonPdf(clientId: number, assessmentIds: string[]) {
  if (assessmentIds.length < 2 || assessmentIds.length > 5) throw new Error("Selecione de duas a cinco avaliações.");
  const { client, items } = await fetchClientAssessments(clientId);
  const selected = items.filter(item => assessmentIds.includes(item.id));
  if (selected.length !== assessmentIds.length || selected.some(item => item.client_id !== clientId || !isComparable(item))) throw new Error("Uma das avaliações não pode ser comparada.");
  selected.sort((a, b) => +new Date(assessmentDate(a)) - +new Date(assessmentDate(b)));
  const latest = selected[selected.length - 1];
  const { pdfData } = await buildAssessmentPdfData(latest.id);
  const comparison = selected.map(item => ({ performedAt: assessmentDate(item), bio: item.bio }));
  const blob = generateAssessmentEvoPdf(pdfData, comparison);
  const name = comparisonFileName(client.name, assessmentDate(selected[0]), assessmentDate(latest));
  const { data: auth } = await supabase.auth.getUser();
  const path = `comparativos/${clientId}/${crypto.randomUUID()}.pdf`;
  const upload = await supabase.storage.from("avaliacoes").upload(path, blob, { contentType: "application/pdf" });
  if (upload.error) throw upload.error;
  const { data: collaborator } = auth.user ? await supabase.from("collaborators").select("full_name").eq("auth_user_id", auth.user.id).maybeSingle() : { data: null };
  const { error } = await supabase.from("assessment_comparisons").insert({ client_id: clientId, unit_id: latest.unit_id, assessment_ids: selected.map(i => i.id), file_path: path, file_name: name, generated_by: auth.user?.id || null, generated_by_name: collaborator?.full_name || auth.user?.email || "Equipe EVO" });
  if (error) { await supabase.storage.from("avaliacoes").remove([path]); throw error; }
  await logAudit({ action: "custom", entity: "assessment_comparisons", entity_id: clientId, module: "avaliacao", description: `Comparativo de ${selected.length} avaliações gerado para ${client.name}` });
  return { blob, path, name };
}

export function downloadComparisonBlob(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }