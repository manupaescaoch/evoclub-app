import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Eye, MessageCircle, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MEASURE_KEYS } from "@/components/tabs/AvaliacoesTab";
import { fetchAssessmentDetail } from "@/hooks/useAdminAssessments";
import { LoadingState } from "@/components/admin/gerencial/PageShell";
import { downloadBlob, getAssessmentPdf, buildAssessmentPdfData } from "@/lib/assessmentPdfService";
import { logAudit } from "@/lib/audit";
import { useAccess } from "@/contexts/AccessContext";

const BIO_FIELDS = [
  { key: "weight", label: "Peso", unit: "kg" },
  { key: "body_fat_pct", label: "Gordura", unit: "%" },
  { key: "fat_mass", label: "Massa de gordura", unit: "kg" },
  { key: "muscle_mass", label: "Massa muscular", unit: "kg" },
  { key: "lean_mass", label: "Massa magra", unit: "kg" },
  { key: "body_water", label: "Água corporal", unit: "%" },
  { key: "visceral_fat", label: "Gordura visceral", unit: "" },
  { key: "basal_metabolism", label: "Metabolismo basal", unit: "kcal" },
  { key: "bmi", label: "IMC", unit: "" },
] as const;

const EXTRA_BIO = [
  { key: "skeletal_muscle_mass", label: "Massa muscular esquelética", unit: "kg" },
  { key: "total_body_water", label: "Água corporal total", unit: "L" },
  { key: "protein", label: "Proteína", unit: "kg" },
  { key: "minerals", label: "Minerais", unit: "kg" },
  { key: "waist_hip_ratio", label: "Relação cintura-quadril", unit: "" },
  { key: "obesity_degree", label: "Grau de obesidade", unit: "%" },
  { key: "inbody_score", label: "Pontuação InBody", unit: "" },
  { key: "ideal_weight", label: "Peso ideal", unit: "kg" },
  { key: "weight_control", label: "Controle de peso", unit: "kg" },
  { key: "fat_control", label: "Controle de gordura", unit: "kg" },
  { key: "muscle_control", label: "Controle muscular", unit: "kg" },
  { key: "lean_arm_left", label: "Massa magra braço esq.", unit: "kg" },
  { key: "lean_arm_right", label: "Massa magra braço dir.", unit: "kg" },
  { key: "lean_trunk", label: "Massa magra tronco", unit: "kg" },
  { key: "lean_leg_left", label: "Massa magra perna esq.", unit: "kg" },
  { key: "lean_leg_right", label: "Massa magra perna dir.", unit: "kg" },
  { key: "fat_arm_left", label: "Gordura braço esq.", unit: "kg" },
  { key: "fat_arm_right", label: "Gordura braço dir.", unit: "kg" },
  { key: "fat_trunk", label: "Gordura tronco", unit: "kg" },
  { key: "fat_leg_left", label: "Gordura perna esq.", unit: "kg" },
  { key: "fat_leg_right", label: "Gordura perna dir.", unit: "kg" },
  { key: "height_cm", label: "Altura", unit: "cm" },
  { key: "device_model", label: "Equipamento", unit: "" },
] as const;

const fmt = (d?: string | null) =>
  d ? new Date(d.length <= 10 ? `${d}T12:00:00` : d).toLocaleDateString("pt-BR") : "—";

type Detail = { measures: Record<string, number | null>; bio: any; revisions: any[] };

const Delta = ({ a, b }: { a: number | null | undefined; b: number | null | undefined }) => {
  if (a == null || b == null) return <span className="text-muted-foreground">—</span>;
  const d = Number(a) - Number(b);
  if (Math.abs(d) < 0.001) return <span className="text-muted-foreground">0</span>;
  return (
    <span className={d > 0 ? "text-amber-700" : "text-emerald-700"}>
      {d > 0 ? "+" : ""}{Number(d.toFixed(2))}
    </span>
  );
};

export default function AvaliacaoCompleta({
  studentName, row, others, canEdit, onClose, onEdit,
}: {
  studentName: string;
  row: any;
  others: any[];
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [compareId, setCompareId] = useState<string>("");
  const [compare, setCompare] = useState<Detail | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const { can, isAdmin } = useAccess();

  const comparable = others.filter(o => o.id !== row.id && o.performed_at);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const d = await fetchAssessmentDetail(row.id);
      if (!alive) return;
      setDetail(d as Detail);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [row.id]);

  useEffect(() => {
    let alive = true;
    if (!compareId) { setCompare(null); return; }
    (async () => {
      const d = await fetchAssessmentDetail(compareId);
      if (alive) setCompare(d as Detail);
    })();
    return () => { alive = false; };
  }, [compareId]);

  const compareRow = comparable.find(o => o.id === compareId) || null;
  const compareLabel = compareRow ? fmt(compareRow.performed_at) : null;

  const openFile = async () => {
    const { data, error } = await supabase.storage
      .from("avaliacoes").createSignedUrl(row.file_path, 300);
    if (error || !data?.signedUrl) { toast.error("Não foi possível abrir o arquivo."); return; }
    window.open(data.signedUrl, "_blank");
  };

  const pdfAction = async (action: "view" | "download" | "share" | "regenerate") => {
    setPdfBusy(true);
    try {
      const result = await getAssessmentPdf(row.id, action === "regenerate");
      if (action === "download" || action === "regenerate") downloadBlob(result.blob, result.name);
      if (action === "view") {
        const url = URL.createObjectURL(result.blob); window.open(url, "_blank"); setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
      if (action === "share") {
        const file = new File([result.blob], result.name, { type: "application/pdf" });
        if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
          await navigator.share({ title: "Avaliação EVO Club", text: `Avaliação de ${studentName}`, files: [file] });
        } else {
          downloadBlob(result.blob, result.name);
          const { phone } = await buildAssessmentPdfData(row.id);
          window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Segue a avaliação EVO Club de ${studentName}. O PDF foi baixado neste dispositivo para anexar à conversa.`)}`, "_blank");
        }
      }
      await logAudit({ action: action === "regenerate" ? "update" : "view", entity: "physical_assessments", entity_id: row.id, module: "avaliacao", description: `${action} do PDF EVO de ${studentName}` });
      if (action === "regenerate") toast.success("PDF EVO gerado novamente.");
    } catch (e: any) { toast.error(e?.message || "Não foi possível processar o PDF EVO."); }
    setPdfBusy(false);
  };

  const remove = async () => {
    if (!window.confirm("Excluir esta avaliação e seu histórico? Esta ação não pode ser desfeita.")) return;
    const paths = [row.file_path, row.evo_pdf_path].filter(Boolean);
    const { data, error } = await supabase.rpc("assessment_delete" as any, { _id: row.id });
    if (error || !(data as any)?.ok) { toast.error("Sem permissão para excluir a avaliação."); return; }
    if (paths.length) await supabase.storage.from("avaliacoes").remove(paths);
    toast.success("Avaliação excluída."); onClose();
  };

  const Row = ({ label, unit, a, b }: { label: string; unit?: string; a: any; b: any }) => (
    <div className={`grid ${compare ? "grid-cols-4" : "grid-cols-2"} gap-2 text-xs font-dm py-1.5 border-b border-border last:border-0`}>
      <span className="text-muted-foreground">{label}{unit ? ` (${unit})` : ""}</span>
      <span className="font-medium text-foreground">{a ?? "—"}</span>
      {compare && <span className="text-muted-foreground">{b ?? "—"}</span>}
      {compare && <span className="font-medium"><Delta a={a} b={b} /></span>}
    </div>
  );

  const Head = ({ title }: { title: string }) => (
    <div className={`grid ${compare ? "grid-cols-4" : "grid-cols-2"} gap-2 text-[10px] uppercase tracking-wider font-dm text-muted-foreground pb-1 border-b border-border`}>
      <span>{title}</span>
      <span>{fmt(row.performed_at)}</span>
      {compare && <span>{compareLabel}</span>}
      {compare && <span>Variação</span>}
    </div>
  );

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-barlow">AVALIAÇÃO DE {fmt(row.performed_at || row.scheduled_at)}</DialogTitle>
        </DialogHeader>

        <p className="text-sm font-dm text-muted-foreground">
          {studentName} · {row.professional_name || "Equipe EVO"} · {row.status || "—"}
          {row.student_rating ? ` · nota do aluno ${row.student_rating}/5` : ""}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <select value={compareId} onChange={e => setCompareId(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-dm">
            <option value="">Sem comparação</option>
            {comparable.map(o => (
              <option key={o.id} value={o.id}>Comparar com {fmt(o.performed_at)}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" className="font-dm" onClick={() => pdfAction("view")} disabled={loading || pdfBusy}>
            <Eye size={14} className="mr-1.5" /> VISUALIZAR PDF
          </Button>
          <Button size="sm" variant="outline" className="font-dm" onClick={() => pdfAction("download")} disabled={loading || pdfBusy}><Download size={14} className="mr-1.5" /> BAIXAR</Button>
          <Button size="sm" variant="outline" className="font-dm" onClick={() => pdfAction("share")} disabled={loading || pdfBusy}><MessageCircle size={14} className="mr-1.5" /> WHATSAPP</Button>
          {canEdit && (
            <Button size="sm" variant="outline" className="font-dm" onClick={onEdit}>
              <Pencil size={14} className="mr-1.5" /> EDITAR / CORRIGIR
            </Button>
          )}
          {canEdit && <Button size="sm" variant="outline" className="font-dm" onClick={() => pdfAction("regenerate")} disabled={loading || pdfBusy}><RefreshCw size={14} className="mr-1.5" /> GERAR NOVAMENTE</Button>}
          {(isAdmin || can("avaliacao", "delete")) && <Button size="sm" variant="outline" className="font-dm text-destructive" onClick={remove}><Trash2 size={14} className="mr-1.5" /> EXCLUIR</Button>}
        </div>

        {loading ? <LoadingState /> : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-3">
              <Head title="Medidas (cm)" />
              {MEASURE_KEYS.map(m => (
                <Row key={m.key} label={m.label}
                  a={detail?.measures?.[m.key] ?? null} b={compare?.measures?.[m.key] ?? null} />
              ))}
            </div>

            <div className="rounded-xl border border-border p-3">
              <Head title="Bioimpedância" />
              {BIO_FIELDS.map(f => (
                <Row key={f.key} label={f.label} unit={f.unit || undefined}
                  a={detail?.bio?.[f.key] ?? null} b={compare?.bio?.[f.key] ?? null} />
              ))}
              {EXTRA_BIO.filter(f => detail?.bio?.[f.key] != null).map(f => (
                <Row key={f.key} label={f.label} unit={f.unit || undefined}
                  a={detail?.bio?.[f.key] ?? null} b={compare?.bio?.[f.key] ?? null} />
              ))}
              {detail?.bio?.origin && (
                <p className="text-[11px] font-dm text-muted-foreground mt-2">Origem dos dados: {detail.bio.origin}</p>
              )}
            </div>

            {row.file_path && (
              <div className="rounded-xl border border-border p-3">
                <p className="text-[11px] uppercase tracking-wider font-dm text-muted-foreground mb-1">Arquivo original</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-dm text-foreground truncate">{row.file_name || "laudo"}</p>
                  <Button size="sm" variant="outline" className="font-dm shrink-0" onClick={openFile}>
                    <Download size={14} className="mr-1.5" /> ABRIR
                  </Button>
                </div>
                {row.imported_at && (
                  <p className="text-[11px] font-dm text-muted-foreground mt-2">
                    Importado em {new Date(row.imported_at).toLocaleString("pt-BR")}
                    {row.professional_name ? ` por ${row.professional_name}` : ""}
                  </p>
                )}
              </div>
            )}

            {row.notes && (
              <div className="rounded-xl border border-border p-3">
                <p className="text-[11px] uppercase tracking-wider font-dm text-muted-foreground mb-1">Observações</p>
                <p className="text-xs font-dm text-foreground whitespace-pre-wrap">{row.notes}</p>
              </div>
            )}

            {!!detail?.revisions?.length && (
              <div className="rounded-xl border border-border p-3">
                <p className="text-[11px] uppercase tracking-wider font-dm text-muted-foreground mb-1">Histórico de correções</p>
                {detail.revisions.map((r: any) => (
                  <p key={r.id} className="text-[11px] font-dm text-muted-foreground border-b border-border py-1 last:border-0">
                    {new Date(r.created_at).toLocaleString("pt-BR")} · {r.changed_by_name || "equipe"} · {r.reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
