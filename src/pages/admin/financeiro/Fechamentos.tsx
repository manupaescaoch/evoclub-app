import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { fmtBRL, monthName, monthRange } from "@/lib/finance";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import { Lock, Unlock, RefreshCw } from "lucide-react";

type Closing = {
  id: string; unit_id: string | null; period_start: string; period_end: string;
  status: string; totals: any; notes: string | null;
  closed_by_name: string | null; closed_at: string;
  reopened_by_name: string | null; reopened_at: string | null;
};

const Fechamentos = () => {
  const { filterId, units } = useUnit();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [rows, setRows] = useState<Closing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("financial_closings").select("*").order("period_start", { ascending: false }).limit(120);
    if (filterId) q = q.eq("unit_id", filterId);
    const { data } = await q;
    setRows((data || []) as Closing[]);
    setLoading(false);
  }, [filterId]);

  useEffect(() => { load(); }, [load]);

  const range = useMemo(() => monthRange(year, month), [year, month]);
  const current = rows.find(r => r.period_start === range.start && r.period_end === range.end);

  const close = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("fin_close_period", { _unit: filterId || null, _start: range.start, _end: range.end, _notes: notes || null });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    logAudit({ action: "custom", module: "financeiro", entity: "financial_closings", description: `Período fechado ${range.start} a ${range.end}`, unit_id: filterId });
    toast.success("Período fechado");
    setNotes("");
    load();
  };

  const reopen = async (c: Closing) => {
    const reason = prompt("Motivo da reabertura (obrigatório):");
    if (!reason) return;
    setBusy(true);
    const { error } = await supabase.rpc("fin_reopen_period", { _id: c.id, _reason: reason });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    logAudit({ action: "custom", module: "financeiro", entity: "financial_closings", entity_id: c.id, description: `Período reaberto ${c.period_start} a ${c.period_end} — ${reason}`, unit_id: c.unit_id });
    toast.success("Período reaberto");
    load();
  };

  const unitName = (id: string | null) => (id ? units.find(u => u.id === id)?.name || "—" : "Consolidado");

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl p-4 card-shadow space-y-3">
        <p className="text-sm font-dm font-semibold text-foreground">Fechar período</p>
        <div className="flex flex-wrap items-center gap-2">
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="h-9 rounded-lg border border-border bg-background px-3 text-sm font-dm">
            {Array.from({ length: 12 }).map((_, i) => <option key={i} value={i}>{monthName(i)}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="h-9 rounded-lg border border-border bg-background px-3 text-sm font-dm">
            {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observação do fechamento (opcional)"
            className="h-9 flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 text-sm font-dm" />
          {current?.status === "closed" ? (
            <button disabled={busy} onClick={() => reopen(current)} className="h-9 px-3 rounded-lg border border-border text-sm font-dm flex items-center gap-1.5 disabled:opacity-50"><Unlock size={14} /> Reabrir</button>
          ) : (
            <button disabled={busy} onClick={close} className="h-9 px-3 rounded-lg bg-primary text-white text-sm font-dm flex items-center gap-1.5 disabled:opacity-50"><Lock size={14} /> Fechar período</button>
          )}
          <button onClick={load} className="h-9 px-3 rounded-lg border border-border text-sm font-dm flex items-center gap-1.5"><RefreshCw size={14} /></button>
        </div>
        <p className="text-[11px] font-dm text-muted-foreground">
          Após o fechamento, nenhum lançamento com data dentro do período pode ser criado, editado ou excluído. Somente a gerência (admin) pode reabrir, e a reabertura fica registrada com motivo e responsável.
        </p>
      </div>

      <div className="bg-card rounded-xl card-shadow overflow-x-auto">
        <div className="px-4 py-3 border-b border-border"><p className="text-sm font-dm font-semibold text-foreground">Períodos</p></div>
        <table className="w-full text-xs font-dm">
          <thead>
            <tr className="border-b border-border text-left">
              {["Período", "Unidade", "Status", "Receitas", "Despesas", "Resultado", "Fechado por", "Ação"].map(h => (
                <th key={h} className="px-4 py-2 text-muted-foreground font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Carregando...</td></tr> :
             rows.length === 0 ? <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Nenhum período fechado ainda</td></tr> :
             rows.map(r => {
              const inc = Number(r.totals?.income || 0), exp = Number(r.totals?.expense || 0);
              return (
                <tr key={r.id} className="border-b border-border">
                  <td className="px-4 py-2 text-foreground">
                    {new Date(r.period_start + "T12:00:00").toLocaleDateString("pt-BR")} — {new Date(r.period_end + "T12:00:00").toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{unitName(r.unit_id)}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${r.status === "closed" ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700"}`}>
                      {r.status === "closed" ? "Fechado" : "Reaberto"}
                    </span>
                  </td>
                  <td className="px-4 py-2">{fmtBRL(inc)}</td>
                  <td className="px-4 py-2">{fmtBRL(exp)}</td>
                  <td className={`px-4 py-2 font-semibold ${inc - exp >= 0 ? "text-green-600" : "text-red-500"}`}>{fmtBRL(inc - exp)}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {r.closed_by_name || "—"}
                    {r.reopened_at && <span className="block text-[10px]">reaberto por {r.reopened_by_name || "—"}</span>}
                  </td>
                  <td className="px-4 py-2">
                    {r.status === "closed" && (
                      <button disabled={busy} onClick={() => reopen(r)} className="h-7 px-2 rounded-lg border border-border disabled:opacity-50">Reabrir</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Fechamentos;
