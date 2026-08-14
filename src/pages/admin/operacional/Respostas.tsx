import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageShell, { SummaryCard, EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { openWhatsApp } from "@/lib/whatsapp";
import { useUnit } from "@/contexts/UnitContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { logAudit } from "@/lib/audit";

type Nps = {
  id: string; client_id: number | null; lead_name: string | null; score: number;
  classification: string; comment: string | null; source: string; created_at: string;
};
type Anam = {
  id: string; client_id: number | null; lead_name: string | null; created_at: string;
  objective: string | null; injuries: string | null; pain: string | null;
  limitations: string | null; restrictions: string | null; sleep: string | null;
  stress: string | null; routine: string | null; training_history: string | null;
};
type LinkRow = {
  id: string; token: string; kind: string; lead_name: string | null; phone: string | null;
  status: string; sent_at: string;
};

const CLASS_LABEL: Record<string, { label: string; cls: string }> = {
  detrator: { label: "Detrator", cls: "bg-red-100 text-red-700" },
  neutro: { label: "Neutro", cls: "bg-amber-100 text-amber-700" },
  promotor: { label: "Promotor", cls: "bg-green-100 text-green-700" },
};

export default function OperacionalRespostas() {
  const { filterId } = useUnit();
  const { from, to } = usePeriod();
  const [nps, setNps] = useState<Nps[]>([]);
  const [anam, setAnam] = useState<Anam[]>([]);
  const [pending, setPending] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<{ lead_name: string; score: string; comment: string }>({
    lead_name: "", score: "10", comment: "",
  });

  const load = async () => {
    setLoading(true);
    let nq = supabase.from("nps_responses").select("*")
      .gte("created_at", `${from}T00:00:00`).lte("created_at", `${to}T23:59:59`)
      .order("created_at", { ascending: false });
    let aq = supabase.from("anamnesis").select("*")
      .gte("created_at", `${from}T00:00:00`).lte("created_at", `${to}T23:59:59`)
      .order("created_at", { ascending: false });
    let lq = supabase.from("form_links").select("*").neq("status", "answered")
      .order("sent_at", { ascending: false });
    if (filterId) { nq = nq.eq("unit_id", filterId); lq = lq.eq("unit_id", filterId); }

    const [n, a, l] = await Promise.all([nq, aq, lq]);
    if (n.error) toast.error("Erro ao carregar NPS: " + n.error.message);
    if (a.error) toast.error("Erro ao carregar anamneses: " + a.error.message);
    if (l.error) toast.error("Erro ao carregar pendências: " + l.error.message);
    setNps((n.data as Nps[]) || []);
    setAnam((a.data as Anam[]) || []);
    setPending((l.data as LinkRow[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filterId, from, to]);

  const saveNps = async () => {
    const score = Number(draft.score);
    if (Number.isNaN(score) || score < 0 || score > 10) return toast.error("Nota deve ser de 0 a 10");
    setSaving(true);
    const { data, error } = await supabase.from("nps_responses").insert({
      lead_name: draft.lead_name.trim() || null, unit_id: filterId, score,
      comment: draft.comment.trim() || null, source: "manual",
    }).select().single();
    setSaving(false);
    if (error) return toast.error(error.message);
    await logAudit({
      action: "create", entity: "nps_responses", entity_id: (data as Nps).id, module: "operacional",
      description: `NPS registrado manualmente (nota ${score})`, unit_id: filterId,
    });
    toast.success(score <= 6 ? "NPS registrado. Ocorrência e tarefa criadas automaticamente." : "NPS registrado");
    setOpen(false); setDraft({ lead_name: "", score: "10", comment: "" });
    load();
  };

  const detr = nps.filter(n => n.classification === "detrator").length;
  const prom = nps.filter(n => n.classification === "promotor").length;
  const npsScore = nps.length ? Math.round(((prom - detr) / nps.length) * 100) : null;

  const publicUrl = (t: string) => `${window.location.origin}/f/${t}`;

  return (
    <PageShell
      title="RESPOSTAS E PENDÊNCIAS"
      description="NPS, anamneses recebidas e links enviados que ainda não foram respondidos."
      primaryAction={<Button className="gap-2" onClick={() => setOpen(true)}><Plus size={14} /> Registrar NPS</Button>}
      summary={
        <>
          <SummaryCard label="Respostas NPS" value={nps.length} />
          <SummaryCard label="NPS (-100 a 100)" value={npsScore != null ? npsScore : "—"} accent="blue" />
          <SummaryCard label="Detratores" value={detr} accent="red" />
          <SummaryCard label="Anamneses" value={anam.length} accent="green" />
        </>
      }
    >
      <Tabs defaultValue="nps">
        <TabsList>
          <TabsTrigger value="nps">NPS</TabsTrigger>
          <TabsTrigger value="anamnese">Anamneses</TabsTrigger>
          <TabsTrigger value="pendencias">Pendências</TabsTrigger>
        </TabsList>

        <TabsContent value="nps">
          <div className="rounded-xl border bg-card overflow-hidden">
            {loading ? <LoadingState /> : nps.length === 0 ? <EmptyState message="Nenhuma resposta de NPS no período." /> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Data</TableHead><TableHead>Pessoa</TableHead><TableHead>Nota</TableHead>
                  <TableHead>Classificação</TableHead><TableHead>Comentário</TableHead><TableHead>Origem</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {nps.map(n => (
                    <TableRow key={n.id}>
                      <TableCell>{new Date(n.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="font-medium">{n.lead_name || (n.client_id ? `Aluno #${n.client_id}` : "—")}</TableCell>
                      <TableCell className="font-barlow font-bold">{n.score}</TableCell>
                      <TableCell>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-dm ${CLASS_LABEL[n.classification]?.cls}`}>
                          {CLASS_LABEL[n.classification]?.label}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate">{n.comment || "—"}</TableCell>
                      <TableCell>{n.source === "manual" ? "Manual" : "Link"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="anamnese">
          <div className="space-y-2">
            {loading ? <LoadingState /> : anam.length === 0 ? <EmptyState message="Nenhuma anamnese no período." /> : (
              anam.map(a => (
                <div key={a.id} className="rounded-xl border bg-card p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-barlow font-bold text-sm">
                      {a.lead_name || (a.client_id ? `Aluno #${a.client_id}` : "Lead sem nome")}
                    </p>
                    <span className="text-xs text-muted-foreground font-dm">
                      {new Date(a.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-dm">
                    {[
                      ["Objetivo", a.objective], ["Histórico de treino", a.training_history],
                      ["Lesões", a.injuries], ["Dores", a.pain], ["Limitações", a.limitations],
                      ["Restrições", a.restrictions], ["Sono", a.sleep], ["Estresse", a.stress], ["Rotina", a.routine],
                    ].map(([label, value]) => (
                      <div key={label as string}>
                        <span className="text-muted-foreground uppercase text-[10px]">{label}</span>
                        <p>{(value as string) || "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="pendencias">
          <div className="rounded-xl border bg-card overflow-hidden">
            {loading ? <LoadingState /> : pending.length === 0 ? <EmptyState message="Nenhum link pendente." /> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Enviado</TableHead><TableHead>Tipo</TableHead><TableHead>Pessoa</TableHead>
                  <TableHead>Status</TableHead><TableHead className="text-right">Cobrar</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pending.map(l => (
                    <TableRow key={l.id}>
                      <TableCell>{new Date(l.sent_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell>{l.kind === "anamnese" ? "Anamnese" : l.kind === "nps" ? "NPS" : "Formulário"}</TableCell>
                      <TableCell className="font-medium">{l.lead_name || "—"}</TableCell>
                      <TableCell>{l.status === "viewed" ? "Visualizado" : "Enviado"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => l.phone
                            ? openWhatsApp(l.phone, `Olá ${l.lead_name || ""}! Seu formulário ainda está pendente: ${publicUrl(l.token)}`)
                            : toast.error("Sem telefone cadastrado")}>
                          <MessageCircle size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar NPS</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Pessoa</Label>
              <Input value={draft.lead_name} onChange={e => setDraft({ ...draft, lead_name: e.target.value })} /></div>
            <div><Label>Nota (0 a 10)</Label>
              <Select value={draft.score} onValueChange={v => setDraft({ ...draft, score: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 11 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>{i} — {i <= 6 ? "Detrator" : i <= 8 ? "Neutro" : "Promotor"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Comentário</Label>
              <Textarea rows={3} value={draft.comment} onChange={e => setDraft({ ...draft, comment: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground font-dm">
              Notas de 0 a 6 geram automaticamente uma ocorrência de experiência EVO e uma tarefa de contato.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={saveNps} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}