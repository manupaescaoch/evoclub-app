import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { usePeriod } from "@/contexts/PeriodContext";
import PageShell, { SummaryCard, EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";

type Row = {
  id: string; client_id: number; note: string | null; status: string | null;
  handled_by: string | null; handled_at: string | null; created_at: string;
};

const STATUS: Record<string, string> = { open: "Nova", following: "Em acompanhamento", resolved: "Resolvida" };

export default function Ocorrencias() {
  const { filterId, isConsolidated } = useUnit();
  const { from, to, label } = usePeriod();
  const [rows, setRows] = useState<Row[]>([]);
  const [clients, setClients] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError(null);
      const cq = supabase.from("clients").select("id,name,unit_id");
      const { data: cData, error: cErr } = filterId ? await cq.eq("unit_id", filterId) : await cq;
      if (!alive) return;
      if (cErr) { setError(cErr.message); setLoading(false); return; }
      const map: Record<number, string> = {};
      (cData || []).forEach((c: any) => { map[c.id] = c.name; });

      let q = supabase.from("pain_reports").select("*").order("created_at", { ascending: false });
      if (!isConsolidated) {
        const ids = Object.keys(map).map(Number);
        q = q.in("client_id", ids.length ? ids : [-1]);
      }
      const { data, error: err } = await q;
      if (!alive) return;
      if (err) setError(err.message);
      setClients(map);
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [filterId, isConsolidated]);

  const inPeriod = useMemo(
    () => rows.filter(r => r.created_at.slice(0, 10) >= from && r.created_at.slice(0, 10) <= to),
    [rows, from, to]
  );

  const stats = useMemo(() => ({
    novas: inPeriod.filter(r => (r.status ?? "open") === "open").length,
    acomp: inPeriod.filter(r => r.status === "following").length,
    resolv: inPeriod.filter(r => r.status === "resolved").length,
    total: inPeriod.length,
  }), [inPeriod]);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return inPeriod
      .filter(r => status === "all" || (r.status ?? "open") === status)
      .filter(r => !s || (clients[r.client_id] || "").toLowerCase().includes(s) || (r.note || "").toLowerCase().includes(s));
  }, [inPeriod, status, search, clients]);

  return (
    <PageShell
      title="Ocorrências"
      description={`Fila única de ocorrências da operação — período: ${label}. Hoje concentra dor e desconforto; os demais tipos entram no bloco de Ocorrências.`}
      search={{ value: search, onChange: setSearch, placeholder: "Buscar aluno ou relato..." }}
      filters={
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-dm">
          <option value="all">Todos os status</option>
          <option value="open">Nova</option>
          <option value="following">Em acompanhamento</option>
          <option value="resolved">Resolvida</option>
        </select>
      }
      summary={
        <>
          <SummaryCard label="Novas" value={stats.novas} accent="red" />
          <SummaryCard label="Em acompanhamento" value={stats.acomp} accent="yellow" />
          <SummaryCard label="Resolvidas" value={stats.resolv} accent="green" />
          <SummaryCard label="Total no período" value={stats.total} />
        </>
      }
    >
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-dm text-red-700">
          Não foi possível carregar as ocorrências: {error}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? <LoadingState /> : list.length === 0 ? (
          <EmptyState message="Nenhuma ocorrência no período selecionado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-dm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Aluno</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Relato</th>
                  <th className="px-4 py-3">Abertura</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{clients[r.client_id] || `#${r.client_id}`}</td>
                    <td className="px-4 py-3">Dor / desconforto</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-md truncate">{r.note || "—"}</td>
                    <td className="px-4 py-3">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3">{STATUS[r.status || "open"] || r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
