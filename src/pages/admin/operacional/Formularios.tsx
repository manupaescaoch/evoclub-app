import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageShell, { SummaryCard, EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Send, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { openWhatsApp } from "@/lib/whatsapp";
import { useUnit } from "@/contexts/UnitContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { logAudit } from "@/lib/audit";

type Form = { id: string; name: string; type: string | null; active: boolean };
type LinkRow = {
  id: string; token: string; kind: string; form_id: string | null; lead_name: string | null;
  phone: string | null; status: string; sent_at: string; viewed_at: string | null; answered_at: string | null;
};

const KINDS = [
  { value: "form", label: "Formulário" },
  { value: "anamnese", label: "Anamnese" },
  { value: "nps", label: "NPS" },
];
const STATUS_LABEL: Record<string, string> = { sent: "Enviado", viewed: "Visualizado", answered: "Respondido" };

export default function OperacionalFormularios() {
  const { filterId, selected } = useUnit();
  const { from, to } = usePeriod();
  const [forms, setForms] = useState<Form[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState<{ kind: string; form_id?: string; lead_name: string; phone: string }>({
    kind: "anamnese", lead_name: "", phone: "",
  });

  const load = async () => {
    setLoading(true);
    let lq = supabase.from("form_links").select("*")
      .gte("sent_at", `${from}T00:00:00`).lte("sent_at", `${to}T23:59:59`)
      .order("sent_at", { ascending: false });
    if (filterId) lq = lq.eq("unit_id", filterId);
    const [f, l] = await Promise.all([
      supabase.from("operational_forms").select("id,name,type,active").order("name"),
      lq,
    ]);
    if (f.error) toast.error("Erro ao carregar formulários: " + f.error.message);
    if (l.error) toast.error("Erro ao carregar links: " + l.error.message);
    setForms((f.data as Form[]) || []);
    setLinks((l.data as LinkRow[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filterId, from, to]);

  const publicUrl = (token: string) => `${window.location.origin}/f/${token}`;

  const create = async () => {
    if (!draft.lead_name.trim()) return toast.error("Informe o nome do destinatário");
    if (draft.kind === "form" && !draft.form_id) return toast.error("Selecione o formulário");
    setSending(true);
    const { data, error } = await supabase.from("form_links").insert({
      kind: draft.kind,
      form_id: draft.kind === "form" ? draft.form_id : null,
      lead_name: draft.lead_name.trim(),
      phone: draft.phone.trim() || null,
      unit_id: filterId,
    }).select().single();
    setSending(false);
    if (error) return toast.error(error.message);
    const row = data as LinkRow;
    await logAudit({
      action: "create", entity: "form_links", entity_id: row.id, module: "operacional",
      description: `Link ${draft.kind} gerado para ${draft.lead_name}`, unit_id: filterId,
    });
    setOpen(false);
    setDraft({ kind: "anamnese", lead_name: "", phone: "" });
    load();
    if (row.phone) {
      const label = KINDS.find(k => k.value === row.kind)?.label || "formulário";
      openWhatsApp(row.phone, `Olá ${row.lead_name || ""}! Preencha seu ${label} da EVO CLUB: ${publicUrl(row.token)}`);
    } else {
      toast.success("Link gerado. Copie e envie manualmente.");
    }
  };

  const copy = async (token: string) => {
    await navigator.clipboard.writeText(publicUrl(token));
    toast.success("Link copiado");
  };

  const resend = (row: LinkRow) => {
    if (!row.phone) return toast.error("Sem telefone cadastrado neste envio");
    const label = KINDS.find(k => k.value === row.kind)?.label || "formulário";
    openWhatsApp(row.phone, `Olá ${row.lead_name || ""}! Seu ${label} ainda está pendente: ${publicUrl(row.token)}`);
  };

  const stats = {
    sent: links.length,
    viewed: links.filter(l => l.status === "viewed").length,
    answered: links.filter(l => l.status === "answered").length,
    pending: links.filter(l => l.status !== "answered").length,
  };

  return (
    <PageShell
      title="FORMULÁRIOS"
      description="Envio de formulários, anamnese e NPS por link individual rastreável no WhatsApp."
      primaryAction={<Button className="gap-2" onClick={() => setOpen(true)}><Send size={14} /> Enviar link</Button>}
      summary={
        <>
          <SummaryCard label="Enviados" value={stats.sent} />
          <SummaryCard label="Visualizados" value={stats.viewed} accent="blue" />
          <SummaryCard label="Respondidos" value={stats.answered} accent="green" />
          <SummaryCard label="Pendentes" value={stats.pending} accent="yellow" />
        </>
      }
    >
      <Tabs defaultValue="envios">
        <TabsList>
          <TabsTrigger value="envios">Envios</TabsTrigger>
          <TabsTrigger value="modelos">Modelos</TabsTrigger>
        </TabsList>

        <TabsContent value="envios">
          <div className="rounded-xl border bg-card overflow-hidden">
            {loading ? <LoadingState /> : links.length === 0 ? <EmptyState message="Nenhum link enviado no período." /> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Enviado</TableHead><TableHead>Tipo</TableHead><TableHead>Destinatário</TableHead>
                  <TableHead>Telefone</TableHead><TableHead>Status</TableHead><TableHead>Visualizado</TableHead>
                  <TableHead>Respondido</TableHead><TableHead className="text-right">Ações</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {links.map(l => (
                    <TableRow key={l.id}>
                      <TableCell>{new Date(l.sent_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell>{KINDS.find(k => k.value === l.kind)?.label}</TableCell>
                      <TableCell className="font-medium">{l.lead_name || "—"}</TableCell>
                      <TableCell>{l.phone || "—"}</TableCell>
                      <TableCell>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-dm ${
                          l.status === "answered" ? "bg-green-100 text-green-700"
                          : l.status === "viewed" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                          {STATUS_LABEL[l.status]}
                        </span>
                      </TableCell>
                      <TableCell>{l.viewed_at ? new Date(l.viewed_at).toLocaleString("pt-BR") : "—"}</TableCell>
                      <TableCell>{l.answered_at ? new Date(l.answered_at).toLocaleString("pt-BR") : "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(l.token)} title="Copiar link"><Copy size={14} /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => resend(l)} title="Reenviar no WhatsApp"><MessageCircle size={14} /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="modelos">
          <div className="rounded-xl border bg-card overflow-hidden">
            {loading ? <LoadingState /> : forms.length === 0
              ? <EmptyState message="Nenhum modelo cadastrado. Crie em Operacional > Automações." />
              : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Modelo</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {forms.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.name}</TableCell>
                        <TableCell>{f.type || "—"}</TableCell>
                        <TableCell>{f.active ? "Ativo" : "Inativo"}</TableCell>
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
          <DialogHeader><DialogTitle>Enviar link rastreável</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo</Label>
              <Select value={draft.kind} onValueChange={v => setDraft({ ...draft, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KINDS.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {draft.kind === "form" && (
              <div>
                <Label>Modelo de formulário</Label>
                <Select value={draft.form_id || ""} onValueChange={v => setDraft({ ...draft, form_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{forms.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Nome do destinatário *</Label>
              <Input value={draft.lead_name} onChange={e => setDraft({ ...draft, lead_name: e.target.value })} /></div>
            <div><Label>WhatsApp (com DDD)</Label>
              <Input value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} placeholder="55119..." /></div>
            {!filterId && selected && (
              <p className="text-xs text-muted-foreground font-dm">
                Visão consolidada: o link será criado sem unidade. Selecione uma unidade para vinculá-lo.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={create} disabled={sending}>{sending ? "Gerando..." : "Gerar e enviar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}