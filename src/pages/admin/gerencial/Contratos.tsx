import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Copy, Power, Send, Download, MessageCircle, FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import PageShell, { EmptyState, LoadingState, StatusBadge, SummaryCard } from "@/components/admin/gerencial/PageShell";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { printContract, CONTRACT_STATUS_LABEL, contractStatusClass } from "@/lib/contractPdf";
import { openWhatsApp } from "@/lib/whatsapp";
import { logAudit } from "@/lib/audit";
import { fmtBRL } from "@/lib/finance";

type Contract = {
  id: string; name: string; contract_type: string | null; linked_plan: string | null;
  body: string | null; renewal_rules: string | null; cancellation_rules: string | null;
  penalty_value: number | null; validity_months: number | null; status: string; updated_at: string;
};

type Issued = {
  id: string; client_id: number; title: string; body: string | null; plan: string | null;
  plan_value: number | null; starts_at: string | null; ends_at: string | null; status: string;
  version: number; channel: string | null; sent_at: string | null; sent_by_name: string | null;
  viewed_at: string | null; expires_at: string | null; signed_at: string | null;
  signature_name: string | null; signature_cpf: string | null; signature_hash: string | null;
  supersedes_id: string | null; renewal_id: string | null; created_at: string;
  client: { name: string; phone: string | null } | null;
};

const fmtD = (iso: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR") : "—");
const fmtDT = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR") : "—");

const empty: Partial<Contract> = { name: "", contract_type: "", linked_plan: "", body: "", renewal_rules: "", cancellation_rules: "", penalty_value: 0, validity_months: 12, status: "active" };

export default function Contratos() {
  const [rows, setRows] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Contract>>(empty);
  const [issueFor, setIssueFor] = useState<Contract | null>(null);
  const [clients, setClients] = useState<{ id: number; name: string; plan: string | null; plan_value: number | null; unit_id: string | null; contract_start: string | null; contract_end: string | null }[]>([]);
  const [clientId, setClientId] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<Issued[]>([]);
  const [issuedLoading, setIssuedLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("contracts").select("*").order("updated_at", { ascending: false });
    if (error) toast.error("Erro ao carregar contratos");
    setRows(data || []); setLoading(false);
  };

  const loadIssued = async () => {
    setIssuedLoading(true);
    const { data, error } = await supabase
      .from("client_contracts")
      .select("*, client:clients(name, phone)")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar contratos emitidos: " + error.message);
    setIssued((data as unknown as Issued[]) || []);
    setIssuedLoading(false);
  };

  useEffect(() => { load(); loadIssued(); }, []);

  const publicUrl = (token: string) => `${window.location.origin}/f/${token}`;

  const sendForSignature = async (r: Issued) => {
    setBusy(r.id);
    const { data, error } = await supabase.rpc("contract_send_link", { _contract: r.id, _channel: "whatsapp", _days: 7 });
    setBusy(null);
    if (error) return toast.error("Erro ao gerar link: " + error.message);
    const res = data as any;
    if (!res?.ok) return toast.error(res?.reason === "already_signed" ? "Contrato já assinado" : "Não foi possível enviar");
    await logAudit({
      action: "custom", entity: "client_contracts", entity_id: r.id, module: "gerencial",
      description: `Contrato "${r.title}" enviado para assinatura de ${r.client?.name || r.client_id}`,
    });
    const url = publicUrl(res.token);
    if (res.phone) openWhatsApp(res.phone, `Olá ${res.name || ""}! Seu contrato da EVO CLUB está pronto para assinatura: ${url}`);
    else { await navigator.clipboard.writeText(url); toast.success("Aluno sem telefone. Link copiado."); }
    loadIssued();
  };

  const newVersion = async (r: Issued) => {
    if (!confirm(`Gerar nova versão do contrato "${r.title}" (v${r.version})? A versão atual fica no histórico.`)) return;
    setBusy(r.id);
    const { data, error } = await supabase.rpc("contract_new_version", { _contract: r.id, _body: null, _title: null });
    setBusy(null);
    if (error) return toast.error("Erro ao versionar: " + error.message);
    await logAudit({
      action: "create", entity: "client_contracts", entity_id: data as unknown as string, module: "gerencial",
      description: `Nova versão (v${r.version + 1}) do contrato "${r.title}" de ${r.client?.name || r.client_id}`,
    });
    toast.success(`Versão ${r.version + 1} criada`);
    loadIssued();
  };

  const download = (r: Issued) => {
    if (!printContract(r, r.client?.name || `Aluno #${r.client_id}`)) toast.error("Libere pop-ups para baixar o PDF");
  };

  const openIssue = async (r: Contract) => {
    setClientId("");
    setIssueFor(r);
    const { data } = await supabase
      .from("clients")
      .select("id, name, plan, plan_value, unit_id, contract_start, contract_end")
      .order("name");
    setClients((data || []) as typeof clients);
  };

  const issue = async () => {
    if (!issueFor || !clientId) { toast.error("Selecione o aluno"); return; }
    const c = clients.find(x => String(x.id) === clientId);
    if (!c) return;
    setIssuing(true);
    const body = [issueFor.body, issueFor.renewal_rules && `RENOVAÇÃO\n${issueFor.renewal_rules}`, issueFor.cancellation_rules && `CANCELAMENTO\n${issueFor.cancellation_rules}`]
      .filter(Boolean).join("\n\n");
    const { error } = await supabase.from("client_contracts").insert({
      client_id: c.id,
      unit_id: c.unit_id,
      contract_id: issueFor.id,
      title: issueFor.name,
      body,
      plan: c.plan || issueFor.linked_plan,
      plan_value: c.plan_value,
      starts_at: c.contract_start,
      ends_at: c.contract_end,
    });
    setIssuing(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Contrato enviado para o app do aluno");
    setIssueFor(null);
    loadIssued();
  };

  const filtered = rows.filter(r =>
    (statusFilter === "all" || r.status === statusFilter) &&
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const save = async () => {
    if (!form.name) { toast.error("Nome é obrigatório"); return; }
    const payload: any = { ...form }; delete payload.id; delete payload.updated_at;
    const res = form.id
      ? await supabase.from("contracts").update(payload).eq("id", form.id)
      : await supabase.from("contracts").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Salvo!"); setOpen(false); setForm(empty); load();
  };

  const duplicate = async (r: Contract) => {
    const { id, updated_at, ...rest } = r as any;
    const { error } = await supabase.from("contracts").insert({ ...rest, name: `${r.name} (cópia)` });
    if (error) toast.error(error.message); else { toast.success("Duplicado"); load(); }
  };

  const toggleStatus = async (r: Contract) => {
    if (!confirm(`${r.status === "active" ? "Inativar" : "Ativar"} contrato "${r.name}"?`)) return;
    const { error } = await supabase.from("contracts").update({ status: r.status === "active" ? "inactive" : "active" }).eq("id", r.id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <PageShell
      title="Contratos"
      description="Modelos e regras contratuais da academia."
      primaryAction={
        <Button onClick={() => { setForm(empty); setOpen(true); }} className="gap-2">
          <Plus size={16} /> Novo contrato
        </Button>
      }
      search={{ value: search, onChange: setSearch, placeholder: "Buscar por nome..." }}
      filters={
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <Tabs defaultValue="modelos">
        <TabsList>
          <TabsTrigger value="modelos">Modelos</TabsTrigger>
          <TabsTrigger value="emitidos">Emitidos e assinaturas</TabsTrigger>
        </TabsList>

        <TabsContent value="modelos">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-dm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Atualizado</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.contract_type || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.linked_plan || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(r.updated_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => { setForm(r); setOpen(true); }}><Pencil size={14} /></Button>
                        <Button size="icon" variant="ghost" title="Emitir para aluno" onClick={() => openIssue(r)}><Send size={14} /></Button>
                        <Button size="icon" variant="ghost" onClick={() => duplicate(r)}><Copy size={14} /></Button>
                        <Button size="icon" variant="ghost" onClick={() => toggleStatus(r)}><Power size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </TabsContent>

        <TabsContent value="emitidos">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <SummaryCard label="Emitidos" value={issued.length} />
            <SummaryCard label="Aguardando assinatura" value={issued.filter(i => ["pending", "sent", "viewed"].includes(i.status)).length} accent="yellow" />
            <SummaryCard label="Assinados" value={issued.filter(i => i.status === "signed").length} accent="green" />
            <SummaryCard label="Expirados" value={issued.filter(i => i.status === "expired").length} accent="red" />
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {issuedLoading ? <LoadingState /> : issued.length === 0 ? (
              <EmptyState message="Nenhum contrato emitido. Use a ação 'Emitir para aluno' em Modelos." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-dm">
                  <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3">Aluno</th>
                      <th className="px-4 py-3">Contrato</th>
                      <th className="px-4 py-3">Versão</th>
                      <th className="px-4 py-3">Vigência</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Envio</th>
                      <th className="px-4 py-3">Visualizado</th>
                      <th className="px-4 py-3">Assinatura</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issued.map(r => (
                      <tr key={r.id} className="border-t border-border hover:bg-muted/30 align-top">
                        <td className="px-4 py-3 font-medium">{r.client?.name || `#${r.client_id}`}</td>
                        <td className="px-4 py-3">
                          {r.title}
                          <span className="block text-xs text-muted-foreground">
                            {r.plan || "—"}{r.plan_value ? ` · ${fmtBRL(Number(r.plan_value))}` : ""}
                            {r.renewal_id ? " · renovação" : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3">v{r.version}{r.supersedes_id ? " ↺" : ""}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{fmtD(r.starts_at)} → {fmtD(r.ends_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${contractStatusClass(r.status)}`}>
                            {CONTRACT_STATUS_LABEL[r.status] || r.status}
                          </span>
                          {r.expires_at && r.status !== "signed" && (
                            <span className="block text-[11px] text-muted-foreground">validade {fmtD(r.expires_at)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {fmtDT(r.sent_at)}
                          {r.channel ? <span className="block">{r.channel}</span> : null}
                          {r.sent_by_name ? <span className="block">por {r.sent_by_name}</span> : null}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDT(r.viewed_at)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {r.signed_at ? (
                            <>
                              {fmtDT(r.signed_at)}
                              <span className="block">{r.signature_name}{r.signature_cpf ? ` · CPF ${r.signature_cpf}` : ""}</span>
                              <span className="block break-all">cód. {(r.signature_hash || "").slice(0, 16)}</span>
                            </>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <Button size="icon" variant="ghost" title="Baixar PDF" onClick={() => download(r)}><Download size={14} /></Button>
                            {r.status !== "signed" && (
                              <Button size="icon" variant="ghost" title="Enviar link de assinatura" disabled={busy === r.id}
                                onClick={() => sendForSignature(r)}><MessageCircle size={14} /></Button>
                            )}
                            <Button size="icon" variant="ghost" title="Gerar nova versão" disabled={busy === r.id}
                              onClick={() => newVersion(r)}><FilePlus2 size={14} /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar contrato" : "Novo contrato"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2"><Label>Nome</Label><Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Tipo</Label><Input value={form.contract_type || ""} onChange={e => setForm({ ...form, contract_type: e.target.value })} /></div>
            <div><Label>Plano vinculado</Label><Input value={form.linked_plan || ""} onChange={e => setForm({ ...form, linked_plan: e.target.value })} /></div>
            <div><Label>Multa contratual (R$)</Label><Input type="number" value={form.penalty_value ?? ""} onChange={e => setForm({ ...form, penalty_value: Number(e.target.value) })} /></div>
            <div><Label>Vigência (meses)</Label><Input type="number" value={form.validity_months ?? ""} onChange={e => setForm({ ...form, validity_months: Number(e.target.value) })} /></div>
            <div className="md:col-span-2"><Label>Texto do contrato</Label><Textarea rows={4} value={form.body || ""} onChange={e => setForm({ ...form, body: e.target.value })} /></div>
            <div><Label>Regras de renovação</Label><Textarea rows={2} value={form.renewal_rules || ""} onChange={e => setForm({ ...form, renewal_rules: e.target.value })} /></div>
            <div><Label>Regras de cancelamento</Label><Textarea rows={2} value={form.cancellation_rules || ""} onChange={e => setForm({ ...form, cancellation_rules: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!issueFor} onOpenChange={o => !o && setIssueFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Emitir "{issueFor?.name}" para aluno</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">
            O aluno recebe o contrato no app, pode ler, baixar em PDF e assinar digitalmente.
          </p>
          <div>
            <Label>Aluno</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {clients.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}{c.plan ? ` — ${c.plan}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueFor(null)}>Cancelar</Button>
            <Button disabled={issuing} onClick={issue}>{issuing ? "Enviando..." : "Emitir contrato"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}