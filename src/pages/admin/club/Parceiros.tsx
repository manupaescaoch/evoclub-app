import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageShell, { EmptyState, LoadingState, StatusBadge, SummaryCard } from "@/components/admin/gerencial/PageShell";
import { useUnit } from "@/contexts/UnitContext";
import { useAccess } from "@/contexts/AccessContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { fmtBRL } from "@/lib/finance";
import {
  AlertTriangle, Copy, KeyRound, Pencil, Plus, Store, Ticket, Trash2,
} from "lucide-react";

type Partner = {
  id: string; name: string; category: string; tag: string | null; discount_label: string | null;
  location: string | null; description: string | null; redeem_instructions: string | null;
  contact_name: string | null; contact_phone: string | null; contact_email: string | null;
  unit_ids: string[]; contract_starts_at: string | null; contract_ends_at: string | null;
  notes: string | null; active: boolean; portal_token: string | null; portal_last_seen_at: string | null;
};

type Benefit = {
  id: string; partner_id: string; label: string; benefit_type: string; value: number | null;
  rules: string | null; valid_from: string | null; valid_until: string | null;
  usage_limit: number | null; limit_period: string; active: boolean;
};

export const BENEFIT_TYPES: { key: string; label: string; hint: string }[] = [
  { key: "percent", label: "Desconto percentual", hint: "% sobre o valor da compra" },
  { key: "fixed", label: "Desconto fixo", hint: "valor fixo em R$" },
  { key: "courtesy", label: "Cortesia", hint: "benefício gratuito" },
  { key: "other", label: "Outro", hint: "economia estimada em R$" },
];

export const LIMIT_PERIODS: { key: string; label: string }[] = [
  { key: "day", label: "por dia" },
  { key: "week", label: "por semana" },
  { key: "month", label: "por mês" },
  { key: "year", label: "por ano" },
  { key: "total", label: "no total" },
];

export const benefitSummary = (b: { benefit_type: string; value: number | null }) => {
  const v = Number(b.value || 0);
  if (b.benefit_type === "percent") return `${v}% de desconto`;
  if (b.benefit_type === "fixed") return `${fmtBRL(v)} de desconto`;
  if (b.benefit_type === "courtesy") return "Cortesia";
  return v ? `Economia estimada ${fmtBRL(v)}` : "Benefício especial";
};

const dateBR = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR") : "—");
const daysLeft = (d: string | null) => {
  if (!d) return null;
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return Math.round((new Date(`${d}T12:00:00`).getTime() - new Date(today.toDateString()).getTime()) / 86400000);
};

const emptyPartner = () => ({
  name: "", category: "Lifestyle", tag: "", discount_label: "", location: "",
  description: "", redeem_instructions: "", contact_name: "", contact_phone: "", contact_email: "",
  unit_ids: [] as string[], contract_starts_at: "", contract_ends_at: "", notes: "", active: true,
});

const emptyBenefit = () => ({
  label: "", benefit_type: "percent", value: "10", rules: "",
  valid_from: "", valid_until: "", usage_limit: "", limit_period: "month", active: true,
});

export default function Parceiros() {
  const { units } = useUnit();
  const { can } = useAccess();
  const canEdit = can("club", "edit");
  const canDelete = can("club", "delete");

  const [partners, setPartners] = useState<Partner[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const [pOpen, setPOpen] = useState(false);
  const [pForm, setPForm] = useState<any>(emptyPartner());
  const [pEditing, setPEditing] = useState<Partner | null>(null);

  const [bOpen, setBOpen] = useState(false);
  const [bForm, setBForm] = useState<any>(emptyBenefit());
  const [bEditing, setBEditing] = useState<Benefit | null>(null);
  const [bPartner, setBPartner] = useState<Partner | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [p, b] = await Promise.all([
      supabase.from("partners").select("*").order("name"),
      supabase.from("partner_benefits").select("*").order("label"),
    ]);
    if (p.error || b.error) { setError((p.error || b.error)!.message); setLoading(false); return; }
    setPartners(((p.data || []) as any[]).map(x => ({ ...x, unit_ids: x.unit_ids || [] })) as Partner[]);
    setBenefits(((b.data || []) as any[]).map(x => ({ ...x, value: x.value === null ? null : Number(x.value) })) as Benefit[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter(p =>
      p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) ||
      (p.contact_name || "").toLowerCase().includes(q));
  }, [partners, search]);

  const expiring = useMemo(() => partners.filter(p => {
    const d = daysLeft(p.contract_ends_at);
    return p.active && d !== null && d <= 30;
  }), [partners]);

  const unitNames = (ids: string[]) =>
    ids.length === 0 ? "Todas as unidades" : ids.map(id => units.find(u => u.id === id)?.name ?? "—").join(", ");

  /* ---------- parceiro ---------- */
  const openPartner = (p?: Partner) => {
    if (p) {
      setPEditing(p);
      setPForm({
        name: p.name, category: p.category, tag: p.tag ?? "", discount_label: p.discount_label ?? "",
        location: p.location ?? "", description: p.description ?? "", redeem_instructions: p.redeem_instructions ?? "",
        contact_name: p.contact_name ?? "", contact_phone: p.contact_phone ?? "", contact_email: p.contact_email ?? "",
        unit_ids: p.unit_ids ?? [], contract_starts_at: p.contract_starts_at ?? "",
        contract_ends_at: p.contract_ends_at ?? "", notes: p.notes ?? "", active: p.active,
      });
    } else { setPEditing(null); setPForm(emptyPartner()); }
    setPOpen(true);
  };

  const savePartner = async () => {
    if (!pForm.name.trim()) { toast.error("Informe o nome do parceiro."); return; }
    setBusy(true);
    const payload = {
      ...pForm,
      tag: pForm.tag || null, discount_label: pForm.discount_label || null, location: pForm.location || null,
      description: pForm.description || null, redeem_instructions: pForm.redeem_instructions || null,
      contact_name: pForm.contact_name || null, contact_phone: pForm.contact_phone || null,
      contact_email: pForm.contact_email || null, notes: pForm.notes || null,
      contract_starts_at: pForm.contract_starts_at || null, contract_ends_at: pForm.contract_ends_at || null,
    };
    const { error } = pEditing
      ? await supabase.from("partners").update(payload as any).eq("id", pEditing.id)
      : await supabase.from("partners").insert(payload as any);
    setBusy(false);
    if (error) { toast.error("Não foi possível salvar o parceiro."); return; }
    logAudit({
      action: pEditing ? "update" : "create", module: "club", entity: "partners",
      entity_id: pEditing?.id ?? null,
      description: `Parceiro ${pEditing ? "atualizado" : "cadastrado"} — ${payload.name}`,
      before: pEditing as any, after: payload as any,
    });
    toast.success("Parceiro salvo.");
    setPOpen(false); load();
  };

  const removePartner = async (p: Partner) => {
    if (!confirm(`Excluir o parceiro "${p.name}" e seus benefícios?`)) return;
    setBusy(true);
    const { error } = await supabase.from("partners").delete().eq("id", p.id);
    setBusy(false);
    if (error) { toast.error("Não foi possível excluir o parceiro."); return; }
    logAudit({
      action: "delete", module: "club", entity: "partners", entity_id: p.id,
      description: `Parceiro excluído — ${p.name}`, before: p as any,
    });
    toast.success("Parceiro excluído.");
    load();
  };

  const rotateToken = async (p: Partner) => {
    if (!confirm(p.portal_token
      ? `Gerar um novo link do portal para "${p.name}"? O link anterior deixa de funcionar.`
      : `Gerar o link de acesso ao portal para "${p.name}"?`)) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("partner_portal_rotate" as any, { _partner_id: p.id });
    setBusy(false);
    if (error || !data) { toast.error("Não foi possível gerar o link."); return; }
    const url = `${window.location.origin}/parceiro/${data}`;
    await navigator.clipboard?.writeText(url).catch(() => {});
    logAudit({
      action: "update", module: "club", entity: "partners", entity_id: p.id,
      description: `Link do portal do parceiro ${p.portal_token ? "regenerado" : "gerado"} — ${p.name}`,
      metadata: { sensitive: true },
    });
    toast.success("Link gerado e copiado para a área de transferência.");
    load();
  };

  const copyLink = async (p: Partner) => {
    if (!p.portal_token) return;
    await navigator.clipboard?.writeText(`${window.location.origin}/parceiro/${p.portal_token}`).catch(() => {});
    toast.success("Link do portal copiado.");
  };

  /* ---------- benefício ---------- */
  const openBenefit = (partner: Partner, b?: Benefit) => {
    setBPartner(partner);
    if (b) {
      setBEditing(b);
      setBForm({
        label: b.label, benefit_type: b.benefit_type, value: b.value ?? "", rules: b.rules ?? "",
        valid_from: b.valid_from ?? "", valid_until: b.valid_until ?? "",
        usage_limit: b.usage_limit ?? "", limit_period: b.limit_period, active: b.active,
      });
    } else { setBEditing(null); setBForm(emptyBenefit()); }
    setBOpen(true);
  };

  const saveBenefit = async () => {
    if (!bPartner) return;
    if (!bForm.label.trim()) { toast.error("Informe o título do benefício."); return; }
    setBusy(true);
    const payload = {
      partner_id: bPartner.id, label: bForm.label, benefit_type: bForm.benefit_type,
      value: bForm.value === "" ? null : Number(bForm.value),
      rules: bForm.rules || null,
      valid_from: bForm.valid_from || null, valid_until: bForm.valid_until || null,
      usage_limit: bForm.usage_limit === "" ? null : Number(bForm.usage_limit),
      limit_period: bForm.limit_period, active: bForm.active,
    };
    const { error } = bEditing
      ? await supabase.from("partner_benefits").update(payload as any).eq("id", bEditing.id)
      : await supabase.from("partner_benefits").insert(payload as any);
    setBusy(false);
    if (error) { toast.error("Não foi possível salvar o benefício."); return; }
    logAudit({
      action: bEditing ? "update" : "create", module: "club", entity: "partner_benefits",
      entity_id: bEditing?.id ?? null,
      description: `Benefício ${bEditing ? "atualizado" : "criado"} — ${bPartner.name} · ${payload.label}`,
      before: bEditing as any, after: payload as any,
    });
    toast.success("Benefício salvo.");
    setBOpen(false); load();
  };

  const removeBenefit = async (b: Benefit, partner: Partner) => {
    if (!confirm(`Excluir o benefício "${b.label}"?`)) return;
    setBusy(true);
    const { error } = await supabase.from("partner_benefits").delete().eq("id", b.id);
    setBusy(false);
    if (error) { toast.error("Não foi possível excluir o benefício."); return; }
    logAudit({
      action: "delete", module: "club", entity: "partner_benefits", entity_id: b.id,
      description: `Benefício excluído — ${partner.name} · ${b.label}`, before: b as any,
    });
    toast.success("Benefício excluído.");
    load();
  };

  const toggleUnit = (id: string) => setPForm((f: any) => ({
    ...f,
    unit_ids: f.unit_ids.includes(id) ? f.unit_ids.filter((u: string) => u !== id) : [...f.unit_ids, id],
  }));

  return (
    <PageShell
      title="Parceiros e Benefícios"
      description="Cadastro de parceiros, regras de benefício, limites de uso e acesso ao portal do parceiro."
      search={{ value: search, onChange: setSearch, placeholder: "Buscar parceiro, categoria ou contato" }}
      primaryAction={canEdit && (
        <Button onClick={() => openPartner()} className="font-dm">
          <Plus size={15} className="mr-1" /> Novo parceiro
        </Button>
      )}
      summary={!loading ? (
        <>
          <SummaryCard label="Parceiros" value={partners.length} />
          <SummaryCard label="Ativos" value={partners.filter(p => p.active).length} accent="green" />
          <SummaryCard label="Benefícios ativos" value={benefits.filter(b => b.active).length} accent="blue" />
          <SummaryCard label="Contratos a vencer (30d)" value={expiring.length} accent={expiring.length ? "yellow" : "default"} />
        </>
      ) : undefined}
    >
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
          <p className="text-sm font-dm text-red-700">Não foi possível carregar os parceiros. {error}</p>
          <Button variant="outline" size="sm" onClick={load}>Tentar novamente</Button>
        </div>
      ) : loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState message="Nenhum parceiro encontrado. Cadastre o primeiro parceiro do EVO Club." />
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const list = benefits.filter(b => b.partner_id === p.id);
            const d = daysLeft(p.contract_ends_at);
            return (
              <div key={p.id} className="rounded-xl border border-border bg-card">
                <div className="p-4 flex flex-wrap items-start justify-between gap-3 border-b border-border">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Store size={16} className="text-primary" />
                      <p className="font-barlow font-bold text-lg text-foreground leading-none">{p.name}</p>
                      <StatusBadge status={p.active ? "active" : "inactive"} />
                      {d !== null && d <= 30 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-dm">
                          <AlertTriangle size={11} />
                          {d < 0 ? `contrato vencido há ${Math.abs(d)}d` : `contrato vence em ${d}d`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-dm text-muted-foreground mt-1">
                      {p.category}{p.location ? ` · ${p.location}` : ""} · {unitNames(p.unit_ids)}
                    </p>
                    <p className="text-xs font-dm text-muted-foreground mt-0.5">
                      Contato: {p.contact_name || "—"}{p.contact_phone ? ` · ${p.contact_phone}` : ""}
                      {p.contact_email ? ` · ${p.contact_email}` : ""}
                    </p>
                    <p className="text-xs font-dm text-muted-foreground mt-0.5">
                      Contrato: {dateBR(p.contract_starts_at)} → {dateBR(p.contract_ends_at)}
                      {p.portal_last_seen_at ? ` · portal acessado em ${new Date(p.portal_last_seen_at).toLocaleDateString("pt-BR")}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {canEdit && (
                      <>
                        <Button size="sm" variant="outline" className="font-dm" onClick={() => openBenefit(p)}>
                          <Ticket size={14} className="mr-1" /> Benefício
                        </Button>
                        <Button size="sm" variant="outline" className="font-dm" onClick={() => openPartner(p)}>
                          <Pencil size={14} className="mr-1" /> Editar
                        </Button>
                        {p.portal_token && (
                          <Button size="sm" variant="ghost" className="font-dm" onClick={() => copyLink(p)}>
                            <Copy size={14} className="mr-1" /> Copiar link
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="font-dm" disabled={busy} onClick={() => rotateToken(p)}>
                          <KeyRound size={14} className="mr-1" /> {p.portal_token ? "Novo link" : "Gerar link"}
                        </Button>
                      </>
                    )}
                    {canDelete && (
                      <Button size="sm" variant="ghost" className="font-dm text-red-600" disabled={busy} onClick={() => removePartner(p)}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  {list.length === 0 ? (
                    <p className="text-xs font-dm text-muted-foreground">
                      Nenhum benefício cadastrado para este parceiro.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {list.map(b => {
                        const bd = daysLeft(b.valid_until);
                        return (
                          <div key={b.id} className="rounded-lg border border-border p-3 flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-dm text-sm text-foreground flex items-center gap-2">
                                {b.label}
                                <StatusBadge status={b.active ? "active" : "inactive"} />
                                {bd !== null && bd <= 30 && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px]">
                                    {bd < 0 ? "vencido" : `vence em ${bd}d`}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs font-dm text-muted-foreground mt-0.5">
                                {benefitSummary(b)} · limite {b.usage_limit ?? "livre"}
                                {b.usage_limit ? ` ${LIMIT_PERIODS.find(l => l.key === b.limit_period)?.label ?? ""} por aluno` : ""}
                                {" · "}vigência {dateBR(b.valid_from)} → {dateBR(b.valid_until)}
                              </p>
                              {b.rules && <p className="text-xs font-dm text-muted-foreground mt-0.5">Regras: {b.rules}</p>}
                            </div>
                            {canEdit && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="font-dm" onClick={() => openBenefit(p, b)}>
                                  <Pencil size={13} />
                                </Button>
                                {canDelete && (
                                  <Button size="sm" variant="ghost" className="font-dm text-red-600" onClick={() => removeBenefit(b, p)}>
                                    <Trash2 size={13} />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Parceiro */}
      <Dialog open={pOpen} onOpenChange={setPOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-barlow">{pEditing ? "Editar parceiro" : "Novo parceiro"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="font-dm text-xs">Nome *</Label>
              <Input value={pForm.name} onChange={e => setPForm({ ...pForm, name: e.target.value })} className="font-dm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="font-dm text-xs">Categoria</Label>
                <Input value={pForm.category} onChange={e => setPForm({ ...pForm, category: e.target.value })} className="font-dm" /></div>
              <div><Label className="font-dm text-xs">Selo (opcional)</Label>
                <Input value={pForm.tag} onChange={e => setPForm({ ...pForm, tag: e.target.value })} className="font-dm" /></div>
              <div><Label className="font-dm text-xs">Responsável</Label>
                <Input value={pForm.contact_name} onChange={e => setPForm({ ...pForm, contact_name: e.target.value })} className="font-dm" /></div>
              <div><Label className="font-dm text-xs">Telefone</Label>
                <Input value={pForm.contact_phone} onChange={e => setPForm({ ...pForm, contact_phone: e.target.value })} className="font-dm" /></div>
              <div><Label className="font-dm text-xs">E-mail</Label>
                <Input value={pForm.contact_email} onChange={e => setPForm({ ...pForm, contact_email: e.target.value })} className="font-dm" /></div>
              <div><Label className="font-dm text-xs">Endereço</Label>
                <Input value={pForm.location} onChange={e => setPForm({ ...pForm, location: e.target.value })} className="font-dm" /></div>
              <div><Label className="font-dm text-xs">Início do contrato</Label>
                <Input type="date" value={pForm.contract_starts_at} onChange={e => setPForm({ ...pForm, contract_starts_at: e.target.value })} className="font-dm" /></div>
              <div><Label className="font-dm text-xs">Fim do contrato</Label>
                <Input type="date" value={pForm.contract_ends_at} onChange={e => setPForm({ ...pForm, contract_ends_at: e.target.value })} className="font-dm" /></div>
            </div>
            <div>
              <Label className="font-dm text-xs">Unidades participantes</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {units.map(u => (
                  <button key={u.id} type="button" onClick={() => toggleUnit(u.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-dm border ${
                      pForm.unit_ids.includes(u.id) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                    }`}>
                    {u.name}
                  </button>
                ))}
              </div>
              <p className="text-[11px] font-dm text-muted-foreground mt-1">
                Nenhuma selecionada = benefício válido em todas as unidades.
              </p>
            </div>
            <div><Label className="font-dm text-xs">Chamada do benefício (vitrine do app)</Label>
              <Input value={pForm.discount_label} onChange={e => setPForm({ ...pForm, discount_label: e.target.value })} className="font-dm" placeholder="Ex: 15% OFF" /></div>
            <div><Label className="font-dm text-xs">Descrição</Label>
              <Textarea rows={2} value={pForm.description} onChange={e => setPForm({ ...pForm, description: e.target.value })} className="font-dm" /></div>
            <div><Label className="font-dm text-xs">Instruções de resgate</Label>
              <Textarea rows={2} value={pForm.redeem_instructions} onChange={e => setPForm({ ...pForm, redeem_instructions: e.target.value })} className="font-dm" /></div>
            <div><Label className="font-dm text-xs">Observações internas</Label>
              <Textarea rows={2} value={pForm.notes} onChange={e => setPForm({ ...pForm, notes: e.target.value })} className="font-dm" /></div>
            <div className="flex items-center gap-2">
              <Switch checked={pForm.active} onCheckedChange={v => setPForm({ ...pForm, active: v })} />
              <span className="text-sm font-dm text-foreground">Parceiro ativo</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPOpen(false)} className="font-dm">Cancelar</Button>
            <Button onClick={savePartner} disabled={busy} className="font-dm">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Benefício */}
      <Dialog open={bOpen} onOpenChange={setBOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-barlow">
              {bEditing ? "Editar benefício" : "Novo benefício"}{bPartner ? ` — ${bPartner.name}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="font-dm text-xs">Título *</Label>
              <Input value={bForm.label} onChange={e => setBForm({ ...bForm, label: e.target.value })} className="font-dm" placeholder="Ex: 15% no almoço" /></div>
            <div>
              <Label className="font-dm text-xs">Tipo de benefício</Label>
              <select value={bForm.benefit_type} onChange={e => setBForm({ ...bForm, benefit_type: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-dm">
                {BENEFIT_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              <p className="text-[11px] font-dm text-muted-foreground mt-1">
                {BENEFIT_TYPES.find(t => t.key === bForm.benefit_type)?.hint}
              </p>
            </div>
            <div><Label className="font-dm text-xs">Valor</Label>
              <Input type="number" step="0.01" value={bForm.value} onChange={e => setBForm({ ...bForm, value: e.target.value })} className="font-dm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="font-dm text-xs">Válido de</Label>
                <Input type="date" value={bForm.valid_from} onChange={e => setBForm({ ...bForm, valid_from: e.target.value })} className="font-dm" /></div>
              <div><Label className="font-dm text-xs">Válido até</Label>
                <Input type="date" value={bForm.valid_until} onChange={e => setBForm({ ...bForm, valid_until: e.target.value })} className="font-dm" /></div>
              <div><Label className="font-dm text-xs">Limite por aluno</Label>
                <Input type="number" min="1" value={bForm.usage_limit} onChange={e => setBForm({ ...bForm, usage_limit: e.target.value })} className="font-dm" placeholder="livre" /></div>
              <div>
                <Label className="font-dm text-xs">Período do limite</Label>
                <select value={bForm.limit_period} onChange={e => setBForm({ ...bForm, limit_period: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-dm">
                  {LIMIT_PERIODS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
                </select>
              </div>
            </div>
            <div><Label className="font-dm text-xs">Regras de uso</Label>
              <Textarea rows={3} value={bForm.rules} onChange={e => setBForm({ ...bForm, rules: e.target.value })} className="font-dm"
                placeholder="Ex: válido de segunda a quinta, não cumulativo com outras promoções" /></div>
            <div className="flex items-center gap-2">
              <Switch checked={bForm.active} onCheckedChange={v => setBForm({ ...bForm, active: v })} />
              <span className="text-sm font-dm text-foreground">Benefício ativo</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBOpen(false)} className="font-dm">Cancelar</Button>
            <Button onClick={saveBenefit} disabled={busy} className="font-dm">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}