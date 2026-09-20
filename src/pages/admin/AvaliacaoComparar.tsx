import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BarChart3, FileDown, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { assessmentDate, assessmentType, fetchClientAssessments, formatAssessmentValue, isComparable, isIncomplete, valueOf, AssessmentComparisonItem } from "@/lib/assessmentComparison";
import { generateAndStoreComparisonPdf } from "@/lib/assessmentComparisonPdf";

export default function AvaliacaoComparar() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clientId = Number(id);
  const [client, setClient] = useState<any>(null);
  const [items, setItems] = useState<AssessmentComparisonItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => { if (!Number.isFinite(clientId)) return; fetchClientAssessments(clientId).then(r => { setClient(r.client); setItems(r.items); }).catch(e => toast.error(e.message)).finally(() => setLoading(false)); }, [clientId]);
  const performed = useMemo(() => items.filter(isComparable).sort((a, b) => +new Date(assessmentDate(b)) - +new Date(assessmentDate(a))), [items]);
  const orderedIds = useMemo(() => items.filter(i => selected.includes(i.id)).sort((a, b) => +new Date(assessmentDate(a)) - +new Date(assessmentDate(b))).map(i => i.id), [items, selected]);
  const toggle = (item: AssessmentComparisonItem) => {
    if (!isComparable(item)) return;
    if (selected.includes(item.id)) setSelected(v => v.filter(x => x !== item.id));
    else if (selected.length >= 5) toast.warning("Selecione no máximo cinco avaliações.");
    else setSelected(v => [...v, item.id]);
  };
  const resultUrl = `/admin/clientes/${clientId}/avaliacoes/comparar/resultado?ids=${orderedIds.join(",")}`;
  const generate = async () => { if (orderedIds.length < 2) return; setPdfBusy(true); try { const r = await generateAndStoreComparisonPdf(clientId, orderedIds); const url = URL.createObjectURL(r.blob); window.open(url, "_blank"); setTimeout(() => URL.revokeObjectURL(url), 60000); toast.success("Comparativo salvo no histórico do aluno."); } catch (e: any) { toast.error(e?.message || "Não foi possível gerar o comparativo."); } finally { setPdfBusy(false); } };

  return <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
    <div className="flex items-start gap-3">
      <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate(`/admin/clientes/${clientId}?tab=avaliacoes`)}><ArrowLeft size={20} /></Button>
      <div><h1 className="font-barlow text-2xl font-bold uppercase text-foreground">Comparar avaliações</h1><p className="font-dm text-sm text-muted-foreground">Selecione as avaliações que deseja incluir no comparativo.</p>{client && <p className="mt-1 font-dm text-xs font-medium text-foreground">{client.name}</p>}</div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
      <p className="font-dm text-sm"><strong>{selected.length}</strong> de 5 selecionadas</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setSelected([])} disabled={!selected.length}><RotateCcw size={14} className="mr-1.5" />Limpar seleção</Button>
        <Button variant="outline" size="sm" onClick={generate} disabled={selected.length < 2 || pdfBusy}><FileDown size={14} className="mr-1.5" />{pdfBusy ? "Gerando..." : "Gerar PDF comparativo"}</Button>
        <Button size="sm" onClick={() => navigate(resultUrl)} disabled={selected.length < 2}><BarChart3 size={14} className="mr-1.5" />Visualizar comparativo</Button>
      </div>
    </div>
    {loading ? <p className="py-12 text-center font-dm text-sm text-muted-foreground">Carregando avaliações...</p> : performed.length === 0 ? <p className="py-12 text-center font-dm text-sm text-muted-foreground">Não há avaliações realizadas com resultados.</p> : <div className="space-y-2">
      {performed.map((item, index) => { const checked = selected.includes(item.id); const incomplete = isIncomplete(item); return <label key={item.id} className={`flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors ${checked ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40"}`}>
        <Checkbox checked={checked} onCheckedChange={() => toggle(item)} className="mt-1 h-5 w-5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><p className="font-barlow text-lg font-bold text-foreground">{new Date(assessmentDate(item)).toLocaleDateString("pt-BR")}</p>{index === 0 && <span className="rounded bg-primary/10 px-2 py-0.5 font-dm text-[10px] font-medium text-primary">MAIS RECENTE</span>}{incomplete && <span className="flex items-center gap-1 rounded bg-warning/15 px-2 py-0.5 font-dm text-[10px] text-warning-foreground"><AlertTriangle size={11} /> DADOS INCOMPLETOS</span>}</div>
          <p className="font-dm text-sm text-foreground">{assessmentType(item)}{item.bio?.device_model ? ` • ${item.bio.device_model}` : ""} • {item.unit_name || "Unidade não informada"}</p>
          <p className="font-dm text-xs text-muted-foreground">{item.professional_name || "Avaliador não informado"}</p>
          <p className="mt-2 font-dm text-xs text-foreground">Peso: {formatAssessmentValue(valueOf(item, "weight"), "kg")} • Massa muscular: {formatAssessmentValue(valueOf(item, "skeletal_muscle_mass", "muscle_mass"), "kg")} • Gordura: {formatAssessmentValue(valueOf(item, "body_fat_pct"), "%")}</p>
        </div>
      </label>; })}
    </div>}
    <Button variant="ghost" onClick={() => navigate(`/admin/clientes/${clientId}?tab=avaliacoes`)}><ArrowLeft size={16} className="mr-2" />Voltar</Button>
  </div>;
}