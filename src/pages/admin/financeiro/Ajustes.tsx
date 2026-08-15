import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import StatCard from "@/components/admin/StatCard";
import { fmtBRL, fmtBRLShort } from "@/lib/finance";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import { Plus, RefreshCw } from "lucide-react";

type Adj = {
  id: string; unit_id: string | null; transaction_id: string | null;
  client_name: string | null; kind: string; amount: number;
  reason: string | null; coupon: string | null; status: string;
  created_by_name: string | null; created_at: string;
};

type Tx = { id: string; description: string | null; amount: number; date: string; status: string; client_id: number | null };

const KIND_LABEL: Record<string, string> = {
  discount: "Desconto",
  refund: "Estorno",
  chargeback: "Chargeback",
  writeoff: "Baixa por perda",
};

const Ajustes = () => {
  const { filterId } = useUnit();
  const [rows, setRows] = useState<Adj[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ transaction_id: "", kind: "discount", amount: "", reason: "", coupon: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("financial_adjustments").select("*").order("created_at", { ascending: false }).limit(300);
    if (filterId) q = q.eq("unit_id", filterId);
    let tq = supabase.from("transactions").select("id, description, amount, date, status, client_id")
      .eq("kind", "income").order("date", { ascending: false }).limit(200);
    if (filterId) tq = tq.eq("unit_id", filterId);
    const [{ data }, { data: t }] = await Promise.all([q, tq]);
    setRows(((data || []) as Adj[]).map(r => ({ ...r, amount: Number(r.amount) })));
    setTxs(((t || []) as Tx[]).map(r => ({ ...r, amount: Number(r.amount) })));
    setLoading(false);
  }, [filterId]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => rows.filter(r => kindFilter === "all" || r.kind === kindFilter), [rows, kindFilter]);
  const totals = useMemo(() => ({
    discount: rows.filter(r => r.kind === "discount").reduce((s, r) => s + r.amount, 0),
    refund: rows.filter(r => r.kind === "refund" || r.kind === "chargeback").reduce((s, r) => s + r.amount, 0),
    writeoff: rows.filter(r => r.kind === "writeoff").reduce((s, r) => s + r.amount, 0),
  }), [rows]);

  const save = async () => {
    if (!form.transaction_id || !Number(form.amount)) { toast.error("Selecione o lançamento e informe o valor"); return; }
    setSaving(true);
    const { error } = await supabase.rpc("fin_adjust", {
      _transaction_id: form.transaction_id,
      _kind: form.kind,
      _amount: Number(form.amount),
      _reason: form.reason || null,
      _coupon: form.coupon || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    logAudit({ action: "create", module: "financeiro", entity: "financial_adjustments", description: `${KIND_LABEL[form.kind]} de ${fmtBRL(Number(form.amount))}`, after: form as any });
    toast.success(`${KIND_LABEL[form.kind]} registrado`);
    setOpen(false);
    setForm({ transaction_id: "", kind: "discount", amount: "", reason: "", coupon: "" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={kindFilter} onChange={e => setKindFilter(e.target.value)} className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-dm">
          <option value="all">Todos os tipos</option>
          {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={load} className="h-9 px-3 rounded-lg border border-border bg-card text-sm font-dm flex items-center gap-1.5 hover:bg-background"><RefreshCw size={14} /> Atualizar</button>
        <button onClick={() => setOpen(true)} className="h-9 px-3 rounded-lg bg-primary text-white text-sm font-dm flex items-center gap-1.5 ml-auto"><Plus size={14} /> Novo ajuste</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Descontos" value={fmtBRLShort(totals.discount)} accent />
        <StatCard label="Estornos" value={fmtBRLShort(totals.refund)} />
        <StatCard label="Baixas por perda" value={fmtBRLShort(totals.writeoff)} />
      </div>

      <div className="bg-card rounded-xl card-shadow overflow-x-auto">
        <div className="px-4 py-3 border-b border-border"><p className="text-sm font-dm font-semibold text-foreground">Histórico de ajustes</p></div>
        <table className="w-full text-xs font-dm">
          <thead>
            <tr className="border-b border-border text-left">
              {["Data", "Tipo", "Aluno", "Motivo", "Cupom", "Responsável", "Valor"].map(h => (
                <th key={h} className={`px-4 py-2 text-muted-foreground font-medium ${h === "Valor" ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Carregando...</td></tr> :
             filtered.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum ajuste registrado</td></tr> :
             filtered.map(r => (
              <tr key={r.id} className="border-b border-border">
                <td className="px-4 py-2">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-2 text-foreground">{KIND_LABEL[r.kind] || r.kind}</td>
                <td className="px-4 py-2">{r.client_name || "—"}</td>
                <td className="px-4 py-2 text-muted-foreground">{r.reason || "—"}</td>
                <td className="px-4 py-2 text-muted-foreground">{r.coupon || "—"}</td>
                <td className="px-4 py-2 text-muted-foreground">{r.created_by_name || "—"}</td>
                <td className="px-4 py-2 text-right font-semibold">{fmtBRL(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-card rounded-2xl w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h2 className="font-barlow font-bold text-xl text-foreground">NOVO AJUSTE</h2>
            <select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm font-dm">
              {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={form.transaction_id} onChange={e => setForm({ ...form, transaction_id: e.target.value })} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm font-dm">
              <option value="">Selecione o lançamento...</option>
              {txs.map(t => (
                <option key={t.id} value={t.id}>
                  {new Date(t.date + "T12:00:00").toLocaleDateString("pt-BR")} · {t.description || "Receita"} · {fmtBRL(t.amount)}
                </option>
              ))}
            </select>
            <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Valor" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm font-dm" />
            <input value={form.coupon} onChange={e => setForm({ ...form, coupon: e.target.value })} placeholder="Cupom (opcional)" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm font-dm" />
            <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Motivo / justificativa" rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-dm" />
            <p className="text-[11px] font-dm text-muted-foreground">Descontos reduzem o valor do lançamento. Estornos geram uma despesa vinculada. Baixa por perda cancela o título.</p>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setOpen(false)} className="h-9 px-4 rounded-lg border border-border text-sm font-dm">Cancelar</button>
              <button disabled={saving} onClick={save} className="h-9 px-4 rounded-lg bg-primary text-white text-sm font-dm disabled:opacity-50">{saving ? "Salvando..." : "Registrar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ajustes;
