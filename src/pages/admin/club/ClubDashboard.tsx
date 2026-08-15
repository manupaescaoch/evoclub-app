import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageShell, { EmptyState, LoadingState, SummaryCard } from "@/components/admin/gerencial/PageShell";
import { UnitSelect, PeriodSelect } from "@/components/admin/ScopeSelectors";
import { useUnit } from "@/contexts/UnitContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { fmtBRL } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trophy, Users } from "lucide-react";

type Ranking = {
  partner_id: string | null; partner_name: string; category: string | null;
  redemptions: number; students: number; total_saved: number;
};
type Dash = {
  redemptions: number; unique_students: number; total_saved: number;
  total_purchase: number; avg_saved: number; active_partners: number;
  partner_ranking: Ranking[];
};
type Alert = {
  kind: string; partner_id: string; partner_name: string;
  benefit_id: string | null; label: string; expires_at: string; days_left: number;
};

const dateBR = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR");

export default function ClubDashboard() {
  const { filterId, selected } = useUnit();
  const { from, to, label } = usePeriod();
  const [data, setData] = useState<Dash | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [dash, al] = await Promise.all([
      supabase.rpc("club_dashboard" as any, { _unit_id: filterId, _from: from, _to: to }),
      supabase.rpc("club_alerts" as any, { _days: 30 }),
    ]);
    if (dash.error) { setError(dash.error.message); setLoading(false); return; }
    const d = (dash.data || {}) as any;
    setData({
      redemptions: Number(d.redemptions || 0),
      unique_students: Number(d.unique_students || 0),
      total_saved: Number(d.total_saved || 0),
      total_purchase: Number(d.total_purchase || 0),
      avg_saved: Number(d.avg_saved || 0),
      active_partners: Number(d.active_partners || 0),
      partner_ranking: ((d.partner_ranking || []) as any[]).map(r => ({
        ...r, redemptions: Number(r.redemptions), students: Number(r.students), total_saved: Number(r.total_saved),
      })),
    });
    setAlerts(((al.data || []) as any[]) as Alert[]);
    setLoading(false);
  }, [filterId, from, to]);

  useEffect(() => { load(); }, [load]);

  const max = data?.partner_ranking[0]?.redemptions || 1;

  return (
    <PageShell
      title="EVO Club"
      description="Resgates, economia gerada e desempenho dos parceiros no período."
      filters={<><UnitSelect /><PeriodSelect /></>}
      summary={data && !loading ? (
        <>
          <SummaryCard label="Resgates no período" value={data.redemptions} accent="blue" />
          <SummaryCard label="Alunos únicos" value={data.unique_students} />
          <SummaryCard label="Economia gerada" value={fmtBRL(data.total_saved)} accent="green" />
          <SummaryCard label="Parceiros ativos" value={data.active_partners} />
        </>
      ) : undefined}
    >
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
          <p className="text-sm font-dm text-red-700">Não foi possível carregar o painel do Club. {error}</p>
          <Button variant="outline" size="sm" onClick={load}>Tentar novamente</Button>
        </div>
      ) : loading ? (
        <LoadingState />
      ) : (
        <>
          {alerts.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-dm text-sm font-semibold text-amber-800 flex items-center gap-1.5 mb-2">
                <AlertTriangle size={15} /> Vencimentos nos próximos 30 dias
              </p>
              <div className="space-y-1.5">
                {alerts.map(a => (
                  <div key={`${a.kind}-${a.benefit_id ?? a.partner_id}`} className="flex flex-wrap items-center justify-between gap-2 text-xs font-dm">
                    <span className="text-amber-900">
                      <strong>{a.partner_name}</strong> · {a.kind === "contract" ? "contrato" : `benefício “${a.label}”`}
                    </span>
                    <span className="text-amber-700">
                      {dateBR(a.expires_at)} · {a.days_left < 0 ? `vencido há ${Math.abs(a.days_left)} dias` : `${a.days_left} dias`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <SummaryCard label="Compras registradas" value={fmtBRL(data!.total_purchase)} />
            <SummaryCard label="Economia média por resgate" value={fmtBRL(data!.avg_saved)} />
            <SummaryCard label="Período" value={label} />
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Trophy size={16} className="text-primary" />
              <p className="font-barlow font-bold text-base text-foreground">Ranking de parceiros por uso</p>
            </div>
            {data!.partner_ranking.length === 0 ? (
              <EmptyState message={`Nenhum resgate confirmado ${selected ? "" : ""}neste período.`} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-dm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2 font-medium">#</th>
                      <th className="px-4 py-2 font-medium">Parceiro</th>
                      <th className="px-4 py-2 font-medium">Categoria</th>
                      <th className="px-4 py-2 font-medium">Resgates</th>
                      <th className="px-4 py-2 font-medium">Alunos</th>
                      <th className="px-4 py-2 font-medium">Economia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.partner_ranking.map((r, i) => (
                      <tr key={r.partner_id ?? i} className="border-b border-border last:border-0">
                        <td className="px-4 py-2 font-barlow font-bold text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-2 text-foreground">
                          {r.partner_name}
                          <div className="mt-1 h-1.5 rounded-full bg-muted w-32">
                            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(r.redemptions / max) * 100}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{r.category ?? "—"}</td>
                        <td className="px-4 py-2 font-barlow font-bold text-foreground">{r.redemptions}</td>
                        <td className="px-4 py-2 text-muted-foreground flex items-center gap-1"><Users size={13} /> {r.students}</td>
                        <td className="px-4 py-2 text-green-700">{fmtBRL(r.total_saved)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}