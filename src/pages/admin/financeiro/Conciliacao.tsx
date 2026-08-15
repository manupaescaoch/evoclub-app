import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { useAccess } from "@/contexts/AccessContext";
import StatCard from "@/components/admin/StatCard";
import { fmtBRL } from "@/lib/finance";
import { logAudit } from "@/lib/audit";
import { parseStatement } from "@/lib/bankImport";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Upload, Wand2, Plus, Check, EyeOff, Scissors, Link2, RefreshCw, Building2, AlertTriangle,
} from "lucide-react";

type Account = {
  id: string; unit_id: string | null; name: string; bank_name: string | null;
  agency: string | null; account_number: string | null; provider: string;
  opening_balance: number; status: string; last_sync_at: string | null;
};

type Movement = {
  id: string; bank_account_id: string; unit_id: string | null; posted_at: string;
  amount: number; direction: string; description: string | null; memo: string | null;
  bank_ref: string | null; status: string; match_type: string | null; match_id: string | null;
  match_confidence: number | null; notes: string | null; parent_id: string | null;
};

type Candidate = {
  target_type: string; target_id: string; client_id: number | null; label: string;
  due_date: string | null; amount: number; exact: boolean; confidence: number;
};

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-muted text-muted-foreground" },
  suggested: { label: "Sugerida", className: "bg-amber-100 text-amber-700" },
  reconciled: { label: "Conciliada", className: "bg-green-100 text-green-700" },
  ignored: { label: "Ignorada", className: "bg-muted text-muted-foreground line-through" },
  split: { label: "Dividida", className: "bg-blue-100 text-blue-700" },
};

const FILTERS = [
  { key: "pending", label: "Pendentes" },
  { key: "suggested", label: "Sugeridas" },
  { key: "reconciled", label: "Conciliadas" },
  { key: "ignored", label: "Ignoradas" },
  { key: "all", label: "Todas" },
];

const dateBR = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR") : "—");

const Conciliacao = () => {
  const { filterId, units } = useUnit();
  const { financialRelease, can } = useAccess();
  const fileRef = useRef<HTMLInputElement>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [accOpen, setAccOpen] = useState(false);
  const [accForm, setAccForm] = useState<any>(null);

  const [linkFor, setLinkFor] = useState<Movement | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candLoading, setCandLoading] = useState(false);

  const [splitFor, setSplitFor] = useState<Movement | null>(null);
  const [splitParts, setSplitParts] = useState("");

  const [entryFor, setEntryFor] = useState<Movement | null>(null);
  const [entryForm, setEntryForm] = useState({ category_name: "", cost_center: "", description: "" });
  const [costCenters, setCostCenters] = useState<string[]>([]);

  const loadAccounts = useCallback(async () => {
    const { data, error } = await supabase.from("bank_accounts").select("*").order("name");
    if (error) { setError(error.message); return; }
    const list = ((data || []) as any[]).filter(a => !filterId || a.unit_id === filterId || a.unit_id === null) as Account[];
    setAccounts(list);
    setAccountId(prev => (prev && list.some(a => a.id === prev) ? prev : list[0]?.id ?? null));
  }, [filterId]);

  const loadMovements = useCallback(async () => {
    if (!accountId) { setMovements([]); setLoading(false); return; }
    setLoading(true); setError(null);
    let q = supabase.from("bank_transactions").select("*")
      .eq("bank_account_id", accountId)
      .order("posted_at", { ascending: false })
      .limit(500);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) { setError(error.message); setLoading(false); return; }
    setMovements(((data || []) as any[]).map(m => ({ ...m, amount: Number(m.amount) })) as Movement[]);
    setLoading(false);
  }, [accountId, filter]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => { loadMovements(); }, [loadMovements]);
  useEffect(() => {
    supabase.from("cost_centers").select("name").eq("active", true).order("name")
      .then(({ data }) => setCostCenters(((data || []) as any[]).map(c => c.name)));
  }, []);

  const totals = useMemo(() => {
    const inflow = movements.filter(m => m.direction === "in").reduce((s, m) => s + Math.abs(m.amount), 0);
    const outflow = movements.filter(m => m.direction === "out").reduce((s, m) => s + Math.abs(m.amount), 0);
    return {
      inflow, outflow,
      pending: movements.filter(m => m.status === "pending").length,
      suggested: movements.filter(m => m.status === "suggested").length,
    };
  }, [movements]);

  /* ---------- import ---------- */
  const onFile = async (file: File) => {
    if (!accountId) { toast.error("Cadastre e selecione uma conta bancária"); return; }
    setBusy(true);
    try {
      const text = await file.text();
      const { source, movements: parsed } = parseStatement(file.name, text);
      if (!parsed.length) { toast.error("Nenhuma movimentação reconhecida no arquivo"); return; }

      const acc = accounts.find(a => a.id === accountId);
      const { data: batch, error: bErr } = await supabase.from("bank_import_batches").insert({
        bank_account_id: accountId, unit_id: acc?.unit_id ?? filterId ?? null,
        source, file_name: file.name, total_rows: parsed.length,
      } as any).select("id").single();
      if (bErr) throw bErr;

      const refs = parsed.map(p => p.bank_ref).filter(Boolean) as string[];
      const existing = new Set<string>();
      if (refs.length) {
        const { data: dup } = await supabase.from("bank_transactions")
          .select("bank_ref").eq("bank_account_id", accountId).in("bank_ref", refs);
        ((dup || []) as any[]).forEach(d => d.bank_ref && existing.add(d.bank_ref));
      }
      const rows = parsed.filter(p => !p.bank_ref || !existing.has(p.bank_ref)).map(p => ({
        bank_account_id: accountId,
        unit_id: acc?.unit_id ?? filterId ?? null,
        batch_id: (batch as any).id,
        posted_at: p.posted_at,
        amount: p.amount,
        direction: p.direction,
        description: p.description,
        memo: p.memo,
        bank_ref: p.bank_ref,
        raw: p.raw ?? null,
      }));
      let imported = 0;
      if (rows.length) {
        const { data: ins, error: iErr } = await supabase.from("bank_transactions").insert(rows as any).select("id");
        if (iErr) throw iErr;
        imported = (ins || []).length;
      }
      await supabase.from("bank_import_batches").update({
        imported_rows: imported, duplicate_rows: parsed.length - imported,
      } as any).eq("id", (batch as any).id);

      const { data: match, error: mErr } = await supabase.rpc("bank_auto_match" as any, {
        _bank_account_id: accountId, _batch_id: (batch as any).id,
      });
      if (mErr) throw mErr;

      logAudit({
        action: "create", module: "financeiro", entity: "bank_import_batches",
        entity_id: (batch as any).id, unit_id: acc?.unit_id ?? filterId,
        description: `Extrato importado (${source.toUpperCase()}) — ${imported} movimentações`,
        after: { file: file.name, imported, duplicates: parsed.length - imported, match } as any,
      });
      const r = (match || {}) as any;
      toast.success(`${imported} movimentações importadas · ${r.auto ?? 0} conciliadas automaticamente · ${r.suggested ?? 0} sugestões`);
      loadMovements();
    } catch (e: any) {
      toast.error(e.message || "Falha ao importar o extrato");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const runAutoMatch = async () => {
    if (!accountId) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("bank_auto_match" as any, { _bank_account_id: accountId, _batch_id: null });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const r = (data || {}) as any;
    toast.success(`${r.auto ?? 0} conciliadas · ${r.suggested ?? 0} sugestões`);
    loadMovements();
  };

  /* ---------- ações ---------- */
  const guard = () => {
    if (!financialRelease) { toast.error("Ação exige Liberação Financeira"); return false; }
    return true;
  };

  const reconcile = async (m: Movement, targetType: string, targetId: string, label?: string) => {
    if (!guard()) return;
    setBusy(true);
    const { error } = await supabase.rpc("bank_reconcile" as any, {
      _movement_id: m.id, _target_type: targetType, _target_id: targetId,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    logAudit({
      action: "update", module: "financeiro", entity: "bank_transactions", entity_id: m.id,
      unit_id: m.unit_id, description: `Movimentação conciliada — ${fmtBRL(Math.abs(m.amount))}${label ? ` · ${label}` : ""}`,
      after: { target_type: targetType, target_id: targetId } as any,
    });
    toast.success("Movimentação conciliada");
    setLinkFor(null);
    loadMovements();
  };

  const setStatus = async (m: Movement, status: "pending" | "ignored") => {
    if (!guard()) return;
    setBusy(true);
    const { error } = await supabase.rpc("bank_set_status" as any, { _movement_id: m.id, _status: status, _notes: null });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    logAudit({
      action: "update", module: "financeiro", entity: "bank_transactions", entity_id: m.id, unit_id: m.unit_id,
      description: status === "ignored" ? "Movimentação ignorada na conciliação" : "Movimentação reaberta",
    });
    toast.success(status === "ignored" ? "Movimentação ignorada" : "Movimentação reaberta");
    loadMovements();
  };

  const openLink = async (m: Movement) => {
    setLinkFor(m); setCandidates([]); setCandLoading(true);
    const { data, error } = await supabase.rpc("bank_match_candidates" as any, { _movement_id: m.id });
    setCandLoading(false);
    if (error) { toast.error(error.message); return; }
    setCandidates(((data || []) as any[]).map(c => ({ ...c, amount: Number(c.amount) })) as Candidate[]);
  };

  const doSplit = async () => {
    if (!splitFor || !guard()) return;
    const parts = splitParts.split(/[,\n;]/).map(p => Number(p.replace(",", "."))).filter(n => Number.isFinite(n) && n > 0);
    if (parts.length < 2) { toast.error("Informe ao menos duas partes"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("bank_split" as any, { _movement_id: splitFor.id, _parts: parts });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    logAudit({
      action: "update", module: "financeiro", entity: "bank_transactions", entity_id: splitFor.id,
      unit_id: splitFor.unit_id, description: `Movimentação dividida em ${parts.length} partes`, after: { parts } as any,
    });
    toast.success("Movimentação dividida");
    setSplitFor(null); setSplitParts(""); setFilter("pending"); loadMovements();
  };

  const doEntry = async () => {
    if (!entryFor || !guard()) return;
    if (!entryForm.category_name.trim()) { toast.error("Informe a categoria"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("bank_create_entry" as any, {
      _movement_id: entryFor.id,
      _category_name: entryForm.category_name,
      _cost_center: entryForm.cost_center || null,
      _client_id: null,
      _description: entryForm.description || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    logAudit({
      action: "create", module: "financeiro", entity: "transactions", unit_id: entryFor.unit_id,
      description: `Lançamento criado pela conciliação — ${fmtBRL(Math.abs(entryFor.amount))}`,
      after: { ...entryForm, movement_id: entryFor.id } as any,
    });
    toast.success("Lançamento criado e conciliado");
    setEntryFor(null); setEntryForm({ category_name: "", cost_center: "", description: "" });
    loadMovements();
  };

  const saveAccount = async () => {
    if (!accForm?.name?.trim()) { toast.error("Informe o nome da conta"); return; }
    setBusy(true);
    const payload = { ...accForm, unit_id: accForm.unit_id || null, opening_balance: Number(accForm.opening_balance || 0) };
    const { error } = accForm.id
      ? await supabase.from("bank_accounts").update(payload as any).eq("id", accForm.id)
      : await supabase.from("bank_accounts").insert(payload as any);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    logAudit({
      action: accForm.id ? "update" : "create", module: "financeiro", entity: "bank_accounts",
      entity_id: accForm.id ?? null, unit_id: payload.unit_id,
      description: `Conta bancária ${accForm.id ? "atualizada" : "cadastrada"} — ${payload.name}`, after: payload,
    });
    toast.success("Conta salva");
    setAccOpen(false); setAccForm(null); loadAccounts();
  };

  const canEdit = can("financeiro", "edit");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={accountId ?? ""}
          onChange={e => setAccountId(e.target.value || null)}
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-dm min-w-[220px]"
        >
          {accounts.length === 0 && <option value="">Nenhuma conta bancária</option>}
          {accounts.map(a => (
            <option key={a.id} value={a.id}>
              {a.name}{a.bank_name ? ` · ${a.bank_name}` : ""}{a.unit_id ? "" : " · Consolidado"}
            </option>
          ))}
        </select>
        {canEdit && (
          <Button variant="outline" size="sm" className="gap-1.5"
            onClick={() => { setAccForm({ name: "", bank_name: "", agency: "", account_number: "", account_type: "checking", provider: "manual", opening_balance: 0, unit_id: filterId || "", status: "active" }); setAccOpen(true); }}>
            <Building2 size={14} /> Nova conta
          </Button>
        )}
        <input ref={fileRef} type="file" accept=".ofx,.csv,.txt" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        <Button size="sm" className="gap-1.5" disabled={!accountId || busy || !canEdit} onClick={() => fileRef.current?.click()}>
          <Upload size={14} /> Importar extrato (OFX/CSV)
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" disabled={!accountId || busy} onClick={runAutoMatch}>
          <Wand2 size={14} /> Conciliar automaticamente
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5" disabled={busy} onClick={() => { loadAccounts(); loadMovements(); }}>
          <RefreshCw size={14} /> Atualizar
        </Button>
      </div>

      {!financialRelease && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5" />
          <p className="text-xs font-dm text-amber-800">
            Você pode importar e consultar o extrato, mas conciliar, ignorar, dividir e criar lançamento exigem
            <strong> Liberação Financeira</strong>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Entradas no extrato" value={fmtBRL(totals.inflow)} accent />
        <StatCard label="Saídas no extrato" value={fmtBRL(totals.outflow)} />
        <StatCard label="Pendentes" value={totals.pending} sub="sem correspondência" />
        <StatCard label="Sugestões" value={totals.suggested} sub="conferência manual" />
      </div>

      <div className="bg-card rounded-xl p-2 card-shadow flex gap-1.5 flex-wrap w-fit">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-dm ${filter === f.key ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl card-shadow overflow-x-auto">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-dm font-semibold text-foreground">Movimentações bancárias</p>
        </div>
        {error ? (
          <div className="p-6 text-center space-y-2">
            <p className="text-sm font-dm text-red-500">{error}</p>
            <Button variant="outline" size="sm" onClick={loadMovements}>Tentar novamente</Button>
          </div>
        ) : loading ? (
          <div className="p-8 text-center text-sm font-dm text-muted-foreground">Carregando movimentações...</div>
        ) : movements.length === 0 ? (
          <div className="p-8 text-center text-sm font-dm text-muted-foreground">
            {accounts.length === 0
              ? "Cadastre uma conta bancária para começar a conciliação."
              : "Nenhuma movimentação neste filtro. Importe um extrato OFX/CSV."}
          </div>
        ) : (
          <table className="w-full text-xs font-dm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Data", "Descrição", "Identificador", "Valor", "Situação", ""].map(h => (
                  <th key={h} className="px-3 py-2 text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movements.map(m => {
                const st = STATUS[m.status] || STATUS.pending;
                return (
                  <tr key={m.id} className="border-b border-border">
                    <td className="px-3 py-2 whitespace-nowrap">{dateBR(m.posted_at)}</td>
                    <td className="px-3 py-2 text-foreground">
                      {m.description || "Movimentação"}
                      {m.memo && <span className="block text-[11px] text-muted-foreground">{m.memo}</span>}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{m.bank_ref || "—"}</td>
                    <td className={`px-3 py-2 font-semibold ${m.direction === "in" ? "text-green-600" : "text-red-500"}`}>
                      {m.direction === "in" ? "+" : "−"}{fmtBRL(Math.abs(m.amount))}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${st.className}`}>{st.label}</span>
                      {m.status === "suggested" && m.match_confidence != null && (
                        <span className="block text-[11px] text-muted-foreground">{Number(m.match_confidence).toFixed(0)}% de aderência</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1 justify-end">
                        {m.status === "suggested" && m.match_type && m.match_id && (
                          <Button size="sm" variant="default" className="h-7 gap-1 text-[11px]" disabled={busy}
                            onClick={() => reconcile(m, m.match_type!, m.match_id!)}>
                            <Check size={12} /> Conciliar
                          </Button>
                        )}
                        {["pending", "suggested"].includes(m.status) && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" disabled={busy} onClick={() => openLink(m)}>
                              <Link2 size={12} /> Vincular
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" disabled={busy}
                              onClick={() => { setEntryFor(m); setEntryForm({ category_name: "", cost_center: "", description: m.description || "" }); }}>
                              <Plus size={12} /> Criar lançamento
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" disabled={busy}
                              onClick={() => { setSplitFor(m); setSplitParts(""); }}>
                              <Scissors size={12} /> Dividir
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" disabled={busy} onClick={() => setStatus(m, "ignored")}>
                              <EyeOff size={12} /> Ignorar
                            </Button>
                          </>
                        )}
                        {m.status === "ignored" && (
                          <Button size="sm" variant="ghost" className="h-7 text-[11px]" disabled={busy} onClick={() => setStatus(m, "pending")}>
                            Reabrir
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[11px] font-dm text-muted-foreground">
        Integração Open Finance: as contas guardam provedor e identificador externo, e cada movimentação guarda o
        identificador bancário único — quando a conexão do provedor estiver disponível, o feed entra pela mesma
        estrutura, sem retrabalho. Até então, a importação OFX/CSV é o caminho oficial.
      </p>

      {/* Vincular */}
      <Dialog open={!!linkFor} onOpenChange={o => !o && setLinkFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Vincular movimentação</DialogTitle></DialogHeader>
          {linkFor && (
            <p className="text-xs font-dm text-muted-foreground">
              {dateBR(linkFor.posted_at)} · {linkFor.description} · {fmtBRL(Math.abs(linkFor.amount))}
            </p>
          )}
          <div className="max-h-72 overflow-y-auto space-y-2">
            {candLoading ? (
              <p className="text-sm font-dm text-muted-foreground py-6 text-center">Buscando correspondências...</p>
            ) : candidates.length === 0 ? (
              <p className="text-sm font-dm text-muted-foreground py-6 text-center">
                Nenhuma cobrança compatível. Use "Criar lançamento" para registrar essa movimentação.
              </p>
            ) : candidates.map(c => (
              <div key={`${c.target_type}-${c.target_id}`} className="border border-border rounded-lg p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-dm text-foreground">{c.label}</p>
                  <p className="text-[11px] font-dm text-muted-foreground">
                    {dateBR(c.due_date)} · {fmtBRL(Number(c.amount))} · {c.exact ? "correspondência exata" : `${Number(c.confidence).toFixed(0)}% de aderência`}
                  </p>
                </div>
                <Button size="sm" disabled={busy} onClick={() => linkFor && reconcile(linkFor, c.target_type, c.target_id, c.label)}>
                  Conciliar
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dividir */}
      <Dialog open={!!splitFor} onOpenChange={o => !o && setSplitFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Dividir movimentação</DialogTitle></DialogHeader>
          {splitFor && (
            <p className="text-xs font-dm text-muted-foreground">
              Valor total: {fmtBRL(Math.abs(splitFor.amount))}. Informe as partes separadas por vírgula — a soma precisa fechar com o total.
            </p>
          )}
          <Input value={splitParts} onChange={e => setSplitParts(e.target.value)} placeholder="Ex: 150, 250,50" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSplitFor(null)}>Cancelar</Button>
            <Button onClick={doSplit} disabled={busy}>Dividir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Criar lançamento */}
      <Dialog open={!!entryFor} onOpenChange={o => !o && setEntryFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Criar lançamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Descrição</Label>
              <Input value={entryForm.description} onChange={e => setEntryForm({ ...entryForm, description: e.target.value })} />
            </div>
            <div><Label>Categoria *</Label>
              <Input value={entryForm.category_name} onChange={e => setEntryForm({ ...entryForm, category_name: e.target.value })}
                placeholder="Ex: mensalidades, taxas, marketing" />
            </div>
            <div><Label>Centro de custo</Label>
              <select value={entryForm.cost_center} onChange={e => setEntryForm({ ...entryForm, cost_center: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-dm">
                <option value="">—</option>
                {costCenters.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryFor(null)}>Cancelar</Button>
            <Button onClick={doEntry} disabled={busy}>Criar e conciliar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conta bancária */}
      <Dialog open={accOpen} onOpenChange={setAccOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{accForm?.id ? "Editar" : "Nova"} conta bancária</DialogTitle></DialogHeader>
          {accForm && (
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={accForm.name} onChange={e => setAccForm({ ...accForm, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Banco</Label><Input value={accForm.bank_name} onChange={e => setAccForm({ ...accForm, bank_name: e.target.value })} /></div>
                <div><Label>Agência</Label><Input value={accForm.agency} onChange={e => setAccForm({ ...accForm, agency: e.target.value })} /></div>
                <div><Label>Conta</Label><Input value={accForm.account_number} onChange={e => setAccForm({ ...accForm, account_number: e.target.value })} /></div>
                <div><Label>Saldo inicial</Label><Input type="number" step="0.01" value={accForm.opening_balance} onChange={e => setAccForm({ ...accForm, opening_balance: e.target.value })} /></div>
              </div>
              <div>
                <Label>Unidade</Label>
                <select value={accForm.unit_id || ""} onChange={e => setAccForm({ ...accForm, unit_id: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-dm">
                  <option value="">Consolidado EVO</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Origem do feed</Label>
                <select value={accForm.provider} onChange={e => setAccForm({ ...accForm, provider: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-dm">
                  <option value="manual">Importação manual (OFX/CSV)</option>
                  <option value="open_finance">Open Finance (quando disponível)</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccOpen(false)}>Cancelar</Button>
            <Button onClick={saveAccount} disabled={busy}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Conciliacao;