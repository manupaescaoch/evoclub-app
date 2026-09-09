import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OverviewRow } from "@/hooks/useClient360";
import { EmptyState, LoadingState, SummaryCard } from "@/components/admin/gerencial/PageShell";
import { Trophy, Ticket } from "lucide-react";

const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
const money = (v?: number | null) =>
  `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const PERIODS = [
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
  { key: "year", label: "Ano" },
] as const;
type PeriodKey = typeof PERIODS[number]["key"];

const periodStart = (p: PeriodKey) => {
  const now = new Date();
  if (p === "week") {
    const day = now.getDay();
    now.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  } else if (p === "month") {
    now.setDate(1);
  } else {
    now.setMonth(0, 1);
  }
  return now.toISOString().slice(0, 10);
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando validação",
  confirmed: "Validado",
  rejected: "Recusado",
  cancelled: "Cancelado",
};
const statusClass = (s: string) =>
  s === "confirmed" ? "bg-green-100 text-green-700"
  : s === "pending" ? "bg-amber-100 text-amber-700"
  : "bg-gray-100 text-gray-600";

export default function ClubEvoTab({ c }: { c: OverviewRow }) {
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [ranking, setRanking] = useState<any[]>([]);
  const [rankLoading, setRankLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [r, a] = await Promise.all([
        c.auth_user_id
          ? supabase
              .from("club_redemptions")
              .select("id, status, amount_saved, purchase_amount, benefit_label, redeemed_at, confirmed_at, source, partners(name)")
              .eq("student_id", c.auth_user_id)
              .order("redeemed_at", { ascending: false })
              .limit(100)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from("client_achievements")
          .select("id, unlocked_at, achievements(name, description, category, icon)")
          .eq("client_id", c.id)
          .order("unlocked_at", { ascending: false }),
      ]);
      if (!alive) return;
      setRedemptions((r.data as any[]) || []);
      setAchievements((a.data as any[]) || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [c.id, c.auth_user_id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setRankLoading(true);
      const { data } = await supabase.rpc("ranking_scores" as any, {
        _unit_id: c.unit_id ?? undefined,
        _from: periodStart(period),
      });
      if (!alive) return;
      setRanking(((data as any[]) || []).filter(r => Number(r.points) > 0));
      setRankLoading(false);
    })();
    return () => { alive = false; };
  }, [c.unit_id, period]);

  const me = useMemo(() => {
    const i = ranking.findIndex(r => Number(r.client_id) === c.id);
    return i < 0 ? null : { ...ranking[i], pos: i + 1 };
  }, [ranking, c.id]);

  const confirmed = redemptions.filter(r => r.status === "confirmed");
  const saved = confirmed.reduce((s, r) => s + Number(r.amount_saved || 0), 0);
  const pending = redemptions.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Resgates validados" value={confirmed.length} accent="green" />
        <SummaryCard label="Aguardando validação" value={pending} accent={pending ? "yellow" : "default"} />
        <SummaryCard label="Economia acumulada" value={money(saved)} accent="blue" />
        <SummaryCard label="Conquistas" value={achievements.length} />
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-dm font-medium flex items-center gap-1.5">
            <Trophy size={13} /> Ranking na unidade
          </p>
          <div className="flex gap-1.5">
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-dm border ${
                  period === p.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {rankLoading ? <LoadingState /> : !ranking.length ? (
          <EmptyState message="Sem pontuação registrada neste período." />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <SummaryCard label="Posição" value={me ? `${me.pos}º de ${ranking.length}` : "Fora do ranking"} />
              <SummaryCard label="Score" value={me ? Number(me.points) : 0} accent="blue" />
              <SummaryCard label="Treinos no período" value={me?.workouts ?? "—"} />
            </div>
            <div className="space-y-1.5">
              {ranking.slice(0, 10).map((r, i) => (
                <div key={r.client_id}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-dm ${
                    Number(r.client_id) === c.id ? "bg-primary/10 text-foreground" : "text-muted-foreground"}`}>
                  <span className="truncate">{i + 1}º · {r.name}</span>
                  <span className="shrink-0 font-medium">{Number(r.points)} Score</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-dm font-medium mb-3 flex items-center gap-1.5">
          <Ticket size={13} /> Histórico de uso do EVO Club
        </p>
        {loading ? <LoadingState /> : !c.auth_user_id ? (
          <EmptyState message="Aluno sem login vinculado — sem histórico do Club." />
        ) : !redemptions.length ? (
          <EmptyState message="Nenhum resgate solicitado até agora." />
        ) : (
          <div className="space-y-2">
            {redemptions.map(r => (
              <div key={r.id} className="flex items-start justify-between gap-2 border-b border-border pb-2 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-dm text-foreground truncate">
                    {r.partners?.name || "Parceiro"}{r.benefit_label ? ` · ${r.benefit_label}` : ""}
                  </p>
                  <p className="text-[11px] font-dm text-muted-foreground">
                    Solicitado {fmtDateTime(r.redeemed_at)}
                    {r.confirmed_at ? ` · validado ${fmtDateTime(r.confirmed_at)}` : ""}
                    {r.purchase_amount ? ` · compra ${money(r.purchase_amount)}` : ""}
                    {r.amount_saved ? ` · economia ${money(r.amount_saved)}` : ""}
                  </p>
                </div>
                <span className={`text-[10px] font-dm px-2 py-0.5 rounded-full shrink-0 ${statusClass(r.status)}`}>
                  {STATUS_LABEL[r.status] || r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-dm font-medium mb-3">
          Conquistas desbloqueadas
        </p>
        {loading ? <LoadingState /> : !achievements.length ? (
          <EmptyState message="Nenhuma conquista desbloqueada." />
        ) : (
          <div className="space-y-2">
            {achievements.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-dm text-foreground truncate">{a.achievements?.name || "Conquista"}</p>
                  <p className="text-[11px] font-dm text-muted-foreground truncate">
                    {a.achievements?.description || a.achievements?.category || "—"}
                  </p>
                </div>
                <span className="text-[11px] font-dm text-muted-foreground shrink-0">{fmtDateTime(a.unlocked_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
