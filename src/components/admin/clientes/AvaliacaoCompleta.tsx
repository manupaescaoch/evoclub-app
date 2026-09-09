import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Pencil } from "lucide-react";
import { toast } from "sonner";
import { MEASURE_KEYS } from "@/components/tabs/AvaliacoesTab";
import { fetchAssessmentDetail } from "@/hooks/useAdminAssessments";
import { LoadingState } from "@/components/admin/gerencial/PageShell";
import { printAssessment } from "@/lib/assessmentPdf";

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

  const toPdf = () => {
    const ok = printAssessment({
      studentName,
      performedAt: row.performed_at || row.scheduled_at,
      professional: row.professional_name,
      status: row.status,
      notes: row.notes,
      origin: detail?.bio?.origin || row.origin || null,
      compareLabel: compare ? compareLabel : null,
      measures: MEASURE_KEYS.map(m => ({
        label: m.label,
        value: detail?.measures?.[m.key] ?? null,
        compare: compare?.measures?.[m.key] ?? null,
      })),
      bio: BIO_FIELDS.map(f => ({
        label: f.label,
        unit: f.unit || undefined,
        value: detail?.bio?.[f.key] ?? null,
        compare: compare?.bio?.[f.key] ?? null,
      })),
    });
    if (!ok) toast.error("Libere pop-ups para salvar em PDF.");
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
          <Button size="sm" variant="outline" className="font-dm" onClick={toPdf} disabled={loading}>
            <Download size={14} className="mr-1.5" /> SALVAR PDF
          </Button>
          {canEdit && (
            <Button size="sm" variant="outline" className="font-dm" onClick={onEdit}>
              <Pencil size={14} className="mr-1.5" /> EDITAR / CORRIGIR
            </Button>
          )}
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
              {detail?.bio?.origin && (
                <p className="text-[11px] font-dm text-muted-foreground mt-2">Origem dos dados: {detail.bio.origin}</p>
              )}
            </div>

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
