import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { usePeriod } from "@/contexts/PeriodContext";
import PageShell, { SummaryCard, EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";

type Row = {
  id: string; client_id: number; scheduled_at: string | null; performed_at: string | null;
  professional_name: string | null; status: string | null;
};

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "agenda", label: "Agenda" },
  { key: "historico", label: "Histórico" },
] as const;

const STATUS: Record<string, string> = {
  scheduled: "Agendada", present: "Presente", missed: "Faltou",
  cancelled: "Cancelou", done: "Realizada",
};

export default function Avaliacoes() {
  const { filterId, isConsolidated } = useUnit();
  const { from, to, label } = usePeriod();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("dashboard");
  const [rows, setRows] = useState<Row[]>([]);
  const [clients, setClients] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

      const ids = Object.keys(map).map(Number);
      let q = supabase.from("physical_assessments").select("*").order("scheduled_at", { ascending: false });
      if (!isConsolidated) q = q.in("client_id", ids.length ? ids : [-1]);
      const { data, error: err } = await q;
      if (!alive) return;
      if (err) setError(err.message);
      setClients(map);
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [filterId, isConsolidated]);

  const inPeriod = useMemo(() => rows.filter(r => {
    const d = (r.scheduled_at || r.performed_at || "").slice(0, 10);
    return d >= from && d <= to;
  }), [rows, from, to]);

  const stats = useMemo(() => {
    const done = inPeriod.filter(r => r.performed_at || r.status === "done").length;
    const scheduled = inPeriod.filter(r => !r.performed_at && (r.status ?? "scheduled") === "scheduled").length;
    const missed = inPeriod.filter(r => r.status === "missed").length;
    const evaluated = new Set(rows.filter(r => r.performed_at).map(r => r.client_id));
    const never = Object.keys(clients).map(Number).filter(id => !evaluated.has(id)).length;
    return { done, scheduled, missed, never };
  }, [inPeriod, rows, clients]);

  const list = useMemo(() => {
    const base = tab === "historico" ? rows.filter(r => r.performed_at) : inPeriod;
    const s = search.trim().toLowerCase();
    return s ? base.filter(r => (clients[r.client_id] || "").toLowerCase().includes(s)) : base;
  }, [tab, rows, inPeriod, search, clients]);

  return (
    <PageShell
      title="Avaliações"
      description={`Avaliação física: agenda, execução e histórico — período: ${label}.`}
      search={{ value: search, onChange: setSearch, placeholder: "Buscar aluno..." }}
      summary={
        <>
          <SummaryCard label="Realizadas no período" value={stats.done} accent="green" />
          <SummaryCard label="Agendadas" value={stats.scheduled} accent="blue" />
          <SummaryCard label="Faltas" value={stats.missed} accent="red" />
          <SummaryCard label="Nunca avaliados" value={stats.never} accent="yellow" />
        </>
      }
    >
      <div className="bg-card rounded-xl p-1.5 card-shadow flex gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-dm whitespace-nowrap transition-colors ${
              tab === t.key ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-dm text-red-700">
          Não foi possível carregar as avaliações: {error}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? <LoadingState /> : list.length === 0 ? (
          <EmptyState message="Nenhuma avaliação neste período. A agenda, o registro de medidas e a bioimpedância entram no bloco de Avaliações." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-dm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Aluno</th>
                  <th className="px-4 py-3">Agendada</th>
                  <th className="px-4 py-3">Realizada</th>
                  <th className="px-4 py-3">Profissional</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{clients[r.client_id] || `#${r.client_id}`}</td>
                    <td className="px-4 py-3">{r.scheduled_at ? new Date(r.scheduled_at).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-3">{r.performed_at ? new Date(r.performed_at).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-3">{r.professional_name || "—"}</td>
                    <td className="px-4 py-3">{STATUS[r.status || "scheduled"] || r.status}</td>
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
