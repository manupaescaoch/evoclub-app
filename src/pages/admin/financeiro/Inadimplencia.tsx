import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import StatCard from "@/components/admin/StatCard";
import { fmtBRL, fmtBRLShort } from "@/lib/finance";
import { openWhatsApp } from "@/lib/whatsapp";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import { MessageCircle, RefreshCw, Ban } from "lucide-react";

type Row = {
  id: string; unit_id: string | null; unit_name: string | null;
  client_id: number | null; client_name: string | null; description: string | null;
  amount: number; due_date: string; days_late: number; bucket: string;
  phone: string | null; status: string;
};

const BUCKETS = ["1-5", "6-15", "16-30", "31-60", "60+"];

const Inadimplencia = () => {
  const { filterId } = useUnit();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bucket, setBucket] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase.rpc("fin_delinquency", { _unit: filterId || null, _ref: null });
    if (error) setError(error.message);
    setRows(((data || []) as Row[]).map(r => ({ ...r, amount: Number(r.amount) })));
    setLoading(false);
  }, [filterId]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => rows.filter(r =>
    (bucket === "all" || r.bucket === bucket) &&
    (!search.trim() || (r.client_name || "").toLowerCase().includes(search.toLowerCase()))
  ), [rows, bucket, search]);

  const totals = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.amount, 0);
    const clients = new Set(rows.map(r => r.client_id ?? r.id)).size;
    const avg = rows.length ? rows.reduce((s, r) => s + r.days_late, 0) / rows.length : 0;
    const aging = BUCKETS.map(b => ({ b, value: rows.filter(r => r.bucket === b).reduce((s, r) => s + r.amount, 0), count: rows.filter(r => r.bucket === b).length }));
    return { total, clients, avg, aging };
  }, [rows]);

  const cobrar = (r: Row) => {
    if (!r.phone) { toast.error("Aluno sem telefone cadastrado"); return; }
    openWhatsApp(r.phone, [
      `Olá, ${r.client_name || ""}!`, "",
      `Identificamos um pagamento em aberto no valor de ${fmtBRL(r.amount)}, com vencimento em ${new Date(r.due_date + "T12:00:00").toLocaleDateString("pt-BR")} (${r.days_late} dias em atraso).`,
      "", "Pode regularizar com a recepção da sua unidade? Qualquer dúvida, estamos à disposição.",
    ].join("\n"));
    logAudit({ action: "custom", module: "financeiro", entity: "cobranca", entity_id: r.id, description: `Cobrança enviada por WhatsApp — ${r.client_name || r.description}`, unit_id: r.unit_id });
  };

  const receber = async (r: Row) => {
    setBusy(r.id);
    const { error } = await supabase.from("transactions").update({ status: "paid", paid_at: new Date().toISOString().slice(0, 10) }).eq("id", r.id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    logAudit({ action: "update", module: "financeiro", entity: "transactions", entity_id: r.id, description: `Baixa de inadimplência — ${fmtBRL(r.amount)}`, unit_id: r.unit_id, before: { status: r.status }, after: { status: "paid" } });
    toast.success("Recebimento registrado");
    load();
  };

  const perda = async (r: Row) => {
    if (!confirm("Registrar baixa por perda deste valor?")) return;
    setBusy(r.id);
    const { error } = await supabase.rpc("fin_adjust", { _transaction_id: r.id, _kind: "writeoff", _amount: r.amount, _reason: "Baixa por perda (inadimplência)", _coupon: null });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    logAudit({ action: "custom", module: "financeiro", entity: "financial_adjustments", entity_id: r.id, description: `Baixa por perda — ${fmtBRL(r.amount)}`, unit_id: r.unit_id });
    toast.success("Baixa registrada");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar aluno..."
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-dm min-w-[200px]" />
        <select value={bucket} onChange={e => setBucket(e.target.value)} className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-dm">
          <option value="all">Todas as faixas</option>
          {BUCKETS.map(b => <option key={b} value={b}>{b} dias</option>)}
        </select>
        <button onClick={load} className="h-9 px-3 rounded-lg border border-border bg-card text-sm font-dm flex items-center gap-1.5 hover:bg-background">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total em atraso" value={fmtBRLShort(totals.total)} accent />
        <StatCard label="Títulos" value={rows.length} />
        <StatCard label="Alunos" value={totals.clients} />
        <StatCard label="Atraso médio" value={`${totals.avg.toFixed(0)}d`} />
      </div>

      <div className="bg-card rounded-xl card-shadow">
        <div className="px-4 py-3 border-b border-border"><p className="text-sm font-dm font-semibold text-foreground">Aging</p></div>
        <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border">
          {totals.aging.map(a => (
            <button key={a.b} onClick={() => setBucket(a.b)} className={`p-4 text-left hover:bg-background transition-colors ${bucket === a.b ? "bg-background" : ""}`}>
              <p className="text-[11px] uppercase tracking-wider font-dm text-muted-foreground">{a.b} dias</p>
              <p className="font-barlow font-bold text-xl text-foreground">{fmtBRLShort(a.value)}</p>
              <p className="text-[11px] font-dm text-muted-foreground">{a.count} título(s)</p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl card-shadow overflow-x-auto">
        <div className="px-4 py-3 border-b border-border"><p className="text-sm font-dm font-semibold text-foreground">Títulos em atraso</p></div>
        <table className="w-full text-xs font-dm">
          <thead>
            <tr className="border-b border-border text-left">
              {["Aluno", "Descrição", "Unidade", "Vencimento", "Atraso", "Valor", "Ações"].map(h => (
                <th key={h} className={`px-4 py-2 text-muted-foreground font-medium ${["Valor", "Atraso", "Ações"].includes(h) ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Carregando...</td></tr> :
             error ? <tr><td colSpan={7} className="py-8 text-center text-red-500">Erro ao carregar: {error}</td></tr> :
             filtered.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhuma inadimplência no filtro atual</td></tr> :
             filtered.map(r => (
              <tr key={r.id} className="border-b border-border">
                <td className="px-4 py-2 text-foreground">{r.client_name || "—"}</td>
                <td className="px-4 py-2 text-muted-foreground">{r.description || "—"}</td>
                <td className="px-4 py-2 text-muted-foreground">{r.unit_name || "—"}</td>
                <td className="px-4 py-2">{new Date(r.due_date + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-2 text-right text-red-500">{r.days_late}d</td>
                <td className="px-4 py-2 text-right font-semibold">{fmtBRL(r.amount)}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => cobrar(r)} title="Cobrar no WhatsApp" className="h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:bg-background"><MessageCircle size={13} /></button>
                    <button disabled={busy === r.id} onClick={() => receber(r)} className="h-7 px-2 rounded-lg bg-primary text-white disabled:opacity-50">Receber</button>
                    <button disabled={busy === r.id} onClick={() => perda(r)} title="Baixa por perda" className="h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:bg-background disabled:opacity-50"><Ban size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inadimplencia;
