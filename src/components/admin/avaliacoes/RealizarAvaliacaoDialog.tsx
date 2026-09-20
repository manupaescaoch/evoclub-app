import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Lock } from "lucide-react";
import { MEASURE_KEYS } from "@/components/tabs/AvaliacoesTab";
import { AssessmentRow, fetchAssessmentDetail } from "@/hooks/useAdminAssessments";
import { logAudit } from "@/lib/audit";
import { LoadingState } from "@/components/admin/gerencial/PageShell";
import { generateAndStoreAssessmentPdf } from "@/lib/assessmentPdfService";

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

type Props = { row: AssessmentRow; onClose: () => void; onSaved: () => void };

export default function RealizarAvaliacaoDialog({ row, onClose, onSaved }: Props) {
  const published = !!row.published_at;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [measures, setMeasures] = useState<Record<string, string>>({});
  const [bio, setBio] = useState<Record<string, string>>({});
  const [origin, setOrigin] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [revisions, setRevisions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError(null);
      try {
        const d = await fetchAssessmentDetail(row.id);
        if (!alive) return;
        const m: Record<string, string> = {};
        Object.entries(d.measures).forEach(([k, v]) => { m[k] = v == null ? "" : String(v); });
        const b: Record<string, string> = {};
        if (d.bio) BIO_FIELDS.forEach(f => { b[f.key] = d.bio[f.key] == null ? "" : String(d.bio[f.key]); });
        setMeasures(m); setBio(b);
        setOrigin(row.origin || d.bio?.origin || "");
        setRevisions(d.revisions);
      } catch (e: any) {
        if (alive) setError(e.message || "Falha ao carregar a avaliação.");
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [row.id, row.origin]);

  const save = async () => {
    if (!origin) { toast.error("Informe a origem dos dados: Integrado ou Manual."); return; }
    if (published && !reason.trim()) { toast.error("Correção de avaliação publicada exige motivo."); return; }
    setSaving(true);
    const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
    const mPayload: Record<string, number | null> = {};
    MEASURE_KEYS.forEach(k => { const n = num(measures[k.key] || ""); if (n != null) mPayload[k.key] = n; });
    const bPayload: Record<string, number | null> = {};
    BIO_FIELDS.forEach(f => { bPayload[f.key] = num(bio[f.key] || ""); });

    const { data, error } = await supabase.rpc("assessment_publish" as any, {
      _id: row.id, _measures: mPayload, _bio: bPayload, _origin: origin,
      _notes: notes.trim() || null, _reason: published ? reason.trim() : null, _next_due: null,
    });
    setSaving(false);
    const res = data as any;
    if (error || !res?.ok) {
      const reasonMap: Record<string, string> = {
        forbidden: "Sem permissão para publicar avaliações.",
        origin_required: "Origem dos dados inválida.",
        reason_required: "Correção exige motivo.",
        not_found: "Avaliação não encontrada.",
      };
      toast.error(reasonMap[res?.reason] || error?.message || "Não foi possível salvar.");
      return;
    }
    await logAudit({
      action: "update", entity: "physical_assessments", entity_id: row.id,
      module: "avaliacao", unit_id: row.unit_id,
      description: published
        ? `Correção de avaliação publicada de ${row.client_name}`
        : `Avaliação publicada para ${row.client_name}`,
      metadata: { sensitive: published, origin, reason: reason.trim() || null },
      after: { measures: mPayload, bio: bPayload },
    });
    try {
      await generateAndStoreAssessmentPdf(row.id);
      toast.success(published ? "Correção salva e PDF EVO atualizado." : "Avaliação publicada e PDF EVO gerado.");
    } catch {
      toast.warning("Avaliação salva. O PDF EVO poderá ser gerado novamente na avaliação completa.");
    }
    onSaved();
    onClose();
  };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-barlow">
            {published ? "CORRIGIR AVALIAÇÃO" : "REALIZAR AVALIAÇÃO"}
          </DialogTitle>
        </DialogHeader>

        {loading ? <LoadingState /> : (
          <div className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-dm text-red-700">{error}</div>
            )}
            <p className="text-sm font-dm text-muted-foreground">
              {row.client_name} · {row.professional_name || "sem responsável"}
            </p>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-dm mb-2">
                Origem dos dados (obrigatório)
              </p>
              <div className="flex gap-2">
                {[["integrado", "Integrado"], ["manual", "Manual"]].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setOrigin(k)}
                    className={`px-4 py-2 rounded-lg text-xs font-dm border ${
                      origin === k ? "bg-primary text-white border-primary" : "border-border text-muted-foreground"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-dm mb-2">Medidas (cm)</p>
              <div className="grid grid-cols-2 gap-2">
                {MEASURE_KEYS.map(k => (
                  <div key={k.key}>
                    <p className="text-[11px] font-dm text-muted-foreground">{k.label}</p>
                    <Input inputMode="decimal" value={measures[k.key] || ""}
                      onChange={e => setMeasures(s => ({ ...s, [k.key]: e.target.value }))}
                      className="h-9 font-dm" placeholder="—" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-dm mb-2">Bioimpedância</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {BIO_FIELDS.map(f => (
                  <div key={f.key}>
                    <p className="text-[11px] font-dm text-muted-foreground">{f.label}{f.unit ? ` (${f.unit})` : ""}</p>
                    <Input inputMode="decimal" value={bio[f.key] || ""}
                      onChange={e => setBio(s => ({ ...s, [f.key]: e.target.value }))}
                      className="h-9 font-dm" placeholder="—" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-dm text-muted-foreground">Observações</p>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="font-dm" />
            </div>

            {published && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                <p className="text-xs font-dm text-amber-800 flex items-center gap-1">
                  <Lock size={12} /> Avaliação já publicada: a correção mantém antes e depois no histórico.
                </p>
                <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                  placeholder="Motivo da correção (obrigatório)" className="font-dm bg-card" />
              </div>
            )}

            {!!revisions.length && (
              <div className="rounded-xl border border-border p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-dm mb-2">
                  Histórico de correções
                </p>
                <div className="space-y-2">
                  {revisions.map(r => (
                    <div key={r.id} className="text-[11px] font-dm text-muted-foreground border-b border-border pb-2 last:border-0">
                      {new Date(r.created_at).toLocaleString("pt-BR")} · {r.changed_by_name || "equipe"} · {r.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[11px] font-dm text-muted-foreground">
              As fotos de evolução são privadas do aluno e não aparecem para a equipe.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="font-dm" onClick={onClose}>Cancelar</Button>
          <Button className="font-dm" onClick={save} disabled={saving || loading}>
            {saving ? "SALVANDO..." : published ? "SALVAR CORREÇÃO" : "PUBLICAR AVALIAÇÃO"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
