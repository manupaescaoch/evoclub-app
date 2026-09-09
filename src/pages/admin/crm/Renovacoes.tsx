import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageShell, { SummaryCard, EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, MessageCircle, FileSignature, History } from "lucide-react";
import { toast } from "sonner";
import { openWhatsApp } from "@/lib/whatsapp";
import { useUnit } from "@/contexts/UnitContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { logAudit } from "@/lib/audit";
import { fmtBRL } from "@/lib/finance";

export const RENEWAL_STATUS: { value: string; label: string }[] = [
  { value: "not_started", label: "Não iniciado" },
  { value: "retro_available", label: "Retrospectiva disponível" },
  { value: "retro_viewed", label: "Retrospectiva visualizada" },
  { value: "proposal_sent", label: "Proposta enviada" },
  { value: "proposal_viewed", label: "Proposta visualizada" },
  { value: "contract_sent", label: "Contrato enviado" },
  { value: "contract_signed", label: "Contrato assinado" },
  { value: "payment_pending", label: "Pagamento pendente" },
  { value: "renewed", label: "Renovado" },
];
const STATUS_LABEL: Record<string, string> = Object.fromEntries(RENEWAL_STATUS.map(s => [s.value, s.label]));

type Row = {
  id: string; client_id: number; unit_id: string | null; status: string;
  cycle_end: string | null; current_plan: string | null; current_value: number | null;
  proposal_plan: string | null; proposal_value: number | null;
  next_cycle_start: string | null; next_cycle_end: string | null;
  assigned_to: string | null; contract_id: string | null; created_at: string; closed_at: string | null;
  notes: string | null;
  client: { name: string; phone: string | null } | null;
  collaborator: { full_name: string } | null;
};
type Collab = { id: string; full_name: string; role_title: string | null };
type Event = { id: string; status: string | null; actor_name: string | null; note: string | null; created_at: string };
type Model = { id: string; name: string; body: string | null; renewal_rules: string | null; cancellation_rules: string | null };

const fmtDate = (iso: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR") : "—");
const daysLeft = (iso: string | null) => {
  if (!iso) return null;
  const br = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Math.round((d.getTime() - new Date(br.toDateString()).getTime()) / 86400000);
};
const statusClass = (s: string) =>
  s === "renewed" ? "bg-green-100 text-green-700"
  : s === "payment_pending" ? "bg-red-100 text-red-700"
  : s === "not_started" ? "bg-gray-100 text-gray-600"
  : "bg-blue-100 text-blue-700";

export default function Renovacoes() {
  const { filterId } = useUnit();
  const { from, to, label } = usePeriod();
  const [rows, setRows] = useState<Row[]>([]);
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [active, setActive] = useState<Row | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [evLoading, setEvLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<{ proposal_plan: string; proposal_value: string; next_cycle_start: string; next_cycle_end: string; notes: string }>(
    { proposal_plan: "", proposal_value: "", next_cycle_start: "", next_cycle_end: "", notes: "" }
  );
  const [modelId, setModelId] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("renewal_requests")
      .select("*, client:clients(name, phone), collaborator:collaborators(full_name)")
      .order("cycle_end", { ascending: true, nullsFirst: false });
    if (filterId) q = q.eq("unit_id", filterId);
    const [r, c, m, d] = await Promise.all([
      q,
      supabase.from("collaborators").select("id, full_name, role_title").order("full_name"),
      supabase.from("contracts").select("id, name, body, renewal_rules, cancellation_rules").eq("status", "active").order("name"),
      supabase.rpc("renewal_dashboard", { _unit: filterId, _from: from, _to: to }),
    ]);
    if (r.error) toast.error("Erro ao carregar renovações: " + r.error.message);
    if (d.error) toast.error("Erro ao carregar painel: " + d.error.message);
    setRows((r.data as unknown as Row[]) || []);
    setCollabs((c.data as Collab[]) || []);
    setModels((m.data as Model[]) || []);
    setDash(d.data || null);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filterId, from, to]);

  const sync = async () => {
    setSyncing(true);
    const { data, error } = await supabase.rpc("renewal_ruler");
    setSyncing(false);
    if (error) return toast.error("Erro na régua: " + error.message);
    const res = data as any;
    toast.success(`Régua atualizada: ${res?.renewals ?? 0} renovações, ${res?.alerts ?? 0} alertas`);
    await logAudit({ action: "custom", entity: "renewal_requests", description: "Régua de renovações executada", module: "crm", unit_id: filterId });
    load();
  };

  const openRow = async (r: Row) => {
    setActive(r);
    setModelId("");
    setDraft({
      proposal_plan: r.proposal_plan || r.current_plan || "",
      proposal_value: r.proposal_value != null ? String(r.proposal_value) : (r.current_value != null ? String(r.current_value) : ""),
      next_cycle_start: r.next_cycle_start || "",
      next_cycle_end: r.next_cycle_end || "",
      notes: r.notes || "",
    });
    setEvLoading(true);
    const { data, error } = await supabase.from("renewal_events").select("*").eq("renewal_id", r.id).order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar histórico: " + error.message);
    setEvents((data as Event[]) || []);
    setEvLoading(false);
  };

  const saveProposal = async () => {
    if (!active) return;
    setSaving(true);
    const { error } = await supabase.from("renewal_requests").update({
      proposal_plan: draft.proposal_plan || null,
      proposal_value: draft.proposal_value ? Number(draft.proposal_value) : null,
      next_cycle_start: draft.next_cycle_start || null,
      next_cycle_end: draft.next_cycle_end || null,
      notes: draft.notes || null,
    }).eq("id", active.id);
    setSaving(false);
    if (error) return toast.error("Erro ao salvar: " + error.message);
    await logAudit({ action: "update", entity: "renewal_requests", entity_id: active.id, module: "crm", unit_id: filterId,
      description: `Proposta de renovação atualizada (${active.client?.name || active.client_id})` });
    toast.success("Proposta salva");
    load();
  };

  const publicUrl = (token: string) => `${window.location.origin}/f/${token}`;

  const sendLink = async (kind: "retrospectiva" | "proposta") => {
    if (!active) return;
    const { data, error } = await supabase.rpc("renewal_link", { _id: active.id, _kind: kind });
    if (error) return toast.error("Erro ao gerar link: " + error.message);
    const res = data as any;
    if (!res?.ok) return toast.error("Não foi possível gerar o link");
    await logAudit({ action: "custom", entity: "renewal_requests", entity_id: active.id, module: "crm", unit_id: filterId,
      description: `Link de ${kind} enviado para ${res.name || "aluno"}` });
    const url = publicUrl(res.token);
    if (res.phone) {
      openWhatsApp(res.phone, kind === "retrospectiva"
        ? `Olá ${res.name || ""}! Sua retrospectiva EVO está pronta: ${url}`
        : `Olá ${res.name || ""}! Preparamos sua proposta de renovação: ${url}`);
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Aluno sem telefone. Link copiado.");
    }
    load();
    openRow({ ...active });
  };

  const setStatus = async (status: string) => {
    if (!active) return;
    const { data, error } = await supabase.rpc("renewal_set_status", { _id: active.id, _status: status, _note: null });
    if (error) return toast.error("Erro ao mudar etapa: " + error.message);
    if (!(data as any)?.ok) return toast.error("Etapa inválida");
    await logAudit({ action: "update", entity: "renewal_requests", entity_id: active.id, module: "crm", unit_id: filterId,
      description: `Etapa da renovação alterada para ${STATUS_LABEL[status]}`, before: { status: active.status }, after: { status } });
    toast.success("Etapa atualizada");
    setActive({ ...active, status });
    load();
    openRow({ ...active, status });
  };

  const assign = async (collaborator: string) => {
    if (!active) return;
    const { error } = await supabase.rpc("renewal_assign", { _id: active.id, _collaborator: collaborator, _note: null });
    if (error) return toast.error("Erro ao reatribuir: " + error.message);
    await logAudit({ action: "update", entity: "renewal_requests", entity_id: active.id, module: "crm", unit_id: filterId,
      description: `Renovação reatribuída para ${collabs.find(c => c.id === collaborator)?.full_name || collaborator}` });
    toast.success("Responsável atualizado");
    load();
    openRow({ ...active, assigned_to: collaborator });
  };

  const issueContract = async () => {
    if (!active) return;
    const m = models.find(x => x.id === modelId);
    if (!m) return toast.error("Selecione o modelo de contrato");
    setSaving(true);
    const body = [m.body, m.renewal_rules && `RENOVAÇÃO\n${m.renewal_rules}`, m.cancellation_rules && `CANCELAMENTO\n${m.cancellation_rules}`]
      .filter(Boolean).join("\n\n");
    const { data, error } = await supabase.from("client_contracts").insert({
      client_id: active.client_id,
      unit_id: active.unit_id,
      contract_id: m.id,
      renewal_id: active.id,
      title: m.name,
      body,
      plan: draft.proposal_plan || active.current_plan,
      plan_value: draft.proposal_value ? Number(draft.proposal_value) : active.current_value,
      starts_at: draft.next_cycle_start || active.next_cycle_start,
      ends_at: draft.next_cycle_end || active.next_cycle_end,
    }).select("id").single();
    if (error) { setSaving(false); return toast.error("Erro ao emitir contrato: " + error.message); }
    const send = await supabase.rpc("contract_send_link", { _contract: (data as any).id, _channel: "whatsapp", _days: 7 });
    setSaving(false);
    if (send.error) return toast.error("Contrato criado, mas o link falhou: " + send.error.message);
    const res = send.data as any;
    await logAudit({ action: "create", entity: "client_contracts", entity_id: (data as any).id, module: "crm", unit_id: active.unit_id,
      description: `Contrato "${m.name}" emitido pela renovação de ${active.client?.name || active.client_id}` });
    const url = publicUrl(res.token);
    if (res.phone) openWhatsApp(res.phone, `Olá ${res.name || ""}! Seu contrato de renovação está pronto para assinatura: ${url}`);
    else { await navigator.clipboard.writeText(url); toast.success("Link do contrato copiado."); }
    toast.success("Contrato enviado para assinatura");
    load();
    openRow({ ...active, status: "contract_sent" });
  };

  const filtered = useMemo(() => rows.filter(r =>
    (statusFilter === "all" || r.status === statusFilter) &&
    (r.client?.name || "").toLowerCase().includes(search.toLowerCase())
  ), [rows, statusFilter, search]);

  const stats = {
    total: rows.length,
    urgent: rows.filter(r => (daysLeft(r.cycle_end) ?? 99) <= 7 && r.status !== "renewed").length,
    renewed: rows.filter(r => r.status === "renewed").length,
    open: rows.filter(r => r.status !== "renewed").length,
  };

  return (
    <PageShell
      title="RENOVAÇÕES"
      description="Fila de renovação da Recepção: retrospectiva, proposta, contrato e fechamento."
      primaryAction={
        <Button className="gap-2" onClick={sync} disabled={syncing}>
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> {syncing ? "Atualizando..." : "Atualizar régua"}
        </Button>
      }
      search={{ value: search, onChange: setSearch, placeholder: "Buscar aluno..." }}
      filters={
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as etapas</SelectItem>
            {RENEWAL_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      }
      summary={
        <>
          <SummaryCard label="Na régua" value={stats.total} />
          <SummaryCard label="Vencendo em 7 dias" value={stats.urgent} accent={stats.urgent > 0 ? "red" : "default"} />
          <SummaryCard label="Em aberto" value={stats.open} accent="yellow" />
          <SummaryCard label="Renovados" value={stats.renewed} accent="green" />
        </>
      }
    >
      <Tabs defaultValue="fila">
        <TabsList>
          <TabsTrigger value="fila">Fila</TabsTrigger>
          <TabsTrigger value="painel">Painel</TabsTrigger>
        </TabsList>

        <TabsContent value="fila">
          <div className="rounded-xl border bg-card overflow-hidden">
            {loading ? <LoadingState /> : filtered.length === 0 ? (
              <EmptyState message="Nenhuma renovação na fila. Use 'Atualizar régua' para carregar vencimentos dos próximos 30 dias." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Aluno</TableHead><TableHead>Vencimento</TableHead><TableHead>Dias</TableHead>
                    <TableHead>Plano atual</TableHead><TableHead>Proposta</TableHead><TableHead>Próximo ciclo</TableHead>
                    <TableHead>Etapa</TableHead><TableHead>Recepcionista</TableHead><TableHead className="text-right">Ações</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filtered.map(r => {
                      const dl = daysLeft(r.cycle_end);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium"><a href={`/admin/clientes/${r.client_id}?tab=retrospectiva`} className="hover:text-primary hover:underline">{r.client?.name || `#${r.client_id}`}</a></TableCell>
                          <TableCell>{fmtDate(r.cycle_end)}</TableCell>
                          <TableCell className={dl != null && dl <= 7 ? "text-red-600 font-medium" : ""}>{dl ?? "—"}</TableCell>
                          <TableCell>{r.current_plan || "—"}{r.current_value ? ` · ${fmtBRL(Number(r.current_value))}` : ""}</TableCell>
                          <TableCell>{r.proposal_plan || "—"}{r.proposal_value ? ` · ${fmtBRL(Number(r.proposal_value))}` : ""}</TableCell>
                          <TableCell>{fmtDate(r.next_cycle_start)} → {fmtDate(r.next_cycle_end)}</TableCell>
                          <TableCell>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-dm ${statusClass(r.status)}`}>
                              {STATUS_LABEL[r.status] || r.status}
                            </span>
                          </TableCell>
                          <TableCell>{r.collaborator?.full_name || "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => openRow(r)}>Tratar</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="painel">
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <SummaryCard label={`Vencimentos (${label})`} value={dash?.total ?? 0} />
              <SummaryCard label="Renovados" value={dash?.renewed ?? 0} accent="green" />
              <SummaryCard label="Taxa de renovação" value={`${dash?.rate ?? 0}%`} accent="blue" />
            </div>
            <div className="rounded-xl border bg-card overflow-hidden">
              {loading ? <LoadingState /> : !dash?.by_collaborator?.length ? (
                <EmptyState message="Sem renovações atribuídas no período." />
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Recepcionista</TableHead><TableHead>Renovações fechadas</TableHead>
                    <TableHead>Casos tratados</TableHead><TableHead>Tempo médio (dias)</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {dash.by_collaborator.map((c: any) => (
                      <TableRow key={c.collaborator}>
                        <TableCell className="font-medium">{c.collaborator}</TableCell>
                        <TableCell>{c.renewed}</TableCell>
                        <TableCell>{c.total}</TableCell>
                        <TableCell>{c.avg_days ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!active} onOpenChange={o => !o && setActive(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{active?.client?.name || "Renovação"} · vence {fmtDate(active?.cycle_end || null)}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Plano atual" value={active?.current_plan || "—"} />
            <SummaryCard label="Valor atual" value={active?.current_value ? fmtBRL(Number(active.current_value)) : "—"} />
            <SummaryCard label="Etapa" value={STATUS_LABEL[active?.status || ""] || "—"} accent="blue" />
            <SummaryCard label="Dias restantes" value={daysLeft(active?.cycle_end || null) ?? "—"} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Plano proposto</Label>
              <Input value={draft.proposal_plan} onChange={e => setDraft({ ...draft, proposal_plan: e.target.value })} /></div>
            <div><Label>Valor proposto (R$)</Label>
              <Input type="number" value={draft.proposal_value} onChange={e => setDraft({ ...draft, proposal_value: e.target.value })} /></div>
            <div><Label>Início do próximo ciclo</Label>
              <Input type="date" value={draft.next_cycle_start} onChange={e => setDraft({ ...draft, next_cycle_start: e.target.value })} /></div>
            <div><Label>Fim do próximo ciclo</Label>
              <Input type="date" value={draft.next_cycle_end} onChange={e => setDraft({ ...draft, next_cycle_end: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Observações</Label>
              <Textarea rows={2} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={saveProposal} disabled={saving}>{saving ? "Salvando..." : "Salvar proposta"}</Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => sendLink("retrospectiva")}>
              <MessageCircle size={14} /> Enviar retrospectiva
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => sendLink("proposta")}>
              <MessageCircle size={14} /> Enviar proposta
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Etapa</Label>
              <Select value={active?.status || ""} onValueChange={setStatus}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{RENEWAL_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Recepcionista responsável</Label>
              <Select value={active?.assigned_to || ""} onValueChange={assign}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {collabs.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}{c.role_title ? ` — ${c.role_title}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border p-3 space-y-2">
            <p className="text-sm font-dm font-medium flex items-center gap-2"><FileSignature size={14} /> Contrato da renovação</p>
            <div className="flex flex-col md:flex-row gap-2 md:items-end">
              <div className="flex-1">
                <Label>Modelo</Label>
                <Select value={modelId} onValueChange={setModelId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o modelo" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={issueContract} disabled={saving}>
                {saving ? "Emitindo..." : "Emitir e enviar para assinatura"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground font-dm">
              O contrato nasce vinculado a esta renovação e o aluno assina pelo link seguro do WhatsApp.
            </p>
          </div>

          <div className="rounded-xl border p-3">
            <p className="text-sm font-dm font-medium flex items-center gap-2 mb-2"><History size={14} /> Histórico da renovação</p>
            {evLoading ? <LoadingState /> : events.length === 0 ? <EmptyState message="Sem etapas registradas." /> : (
              <div className="space-y-2">
                {events.map(e => (
                  <div key={e.id} className="border-b border-border pb-2 last:border-0">
                    <p className="text-sm font-dm">{e.status ? (STATUS_LABEL[e.status] || e.status) : "Atualização"}</p>
                    <p className="text-[11px] font-dm text-muted-foreground">
                      {new Date(e.created_at).toLocaleString("pt-BR")}
                      {e.actor_name ? ` · ${e.actor_name}` : ""}{e.note ? ` · ${e.note}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
