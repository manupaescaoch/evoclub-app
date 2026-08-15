import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fmtBRL } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Building2, CalendarRange, ShieldOff, Ticket, TrendingUp, Users } from "lucide-react";

type Portal = {
  partner: {
    id: string; name: string; category: string; active: boolean;
    contact_name: string | null; location: string | null;
    contract_starts_at: string | null; contract_ends_at: string | null;
    contract_days_left: number | null;
  };
  benefits: {
    id: string; label: string; benefit_type: string; value: number | null; rules: string | null;
    valid_from: string | null; valid_until: string | null;
    usage_limit: number | null; limit_period: string; active: boolean;
  }[];
  totals: {
    redemptions: number; students: number; total_saved: number; total_purchase: number;
    month_redemptions: number; month_saved: number;
  };
  redemptions: {
    id: string; redeemed_at: string; benefit_label: string;
    purchase_amount: number | null; amount_saved: number | null;
    student: string; member_code: string | null;
  }[];
};

const TYPE_LABEL: Record<string, string> = {
  percent: "Desconto percentual", fixed: "Desconto fixo", courtesy: "Cortesia", other: "Benefício",
};
const PERIOD_LABEL: Record<string, string> = {
  day: "por dia", week: "por semana", month: "por mês", year: "por ano", total: "no total",
};

const dateBR = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR") : "—");

const Card = ({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4">
    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-dm flex items-center gap-1.5">{icon}{label}</p>
    <p className="font-barlow font-bold text-2xl text-slate-900 mt-1">{value}</p>
  </div>
);

export default function PortalParceiro() {
  const { token = "" } = useParams();
  const [data, setData] = useState<Portal | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null); setDenied(null);
    const { data: res, error: err } = await supabase.rpc("partner_portal_open" as any, { p_token: token });
    setLoading(false);
    if (err) { setError("Não foi possível carregar o portal agora."); return; }
    const r = (res || {}) as any;
    if (!r.ok) { setDenied(r.reason || "Link inválido"); return; }
    setData({
      partner: r.partner,
      benefits: (r.benefits || []).map((b: any) => ({ ...b, value: b.value === null ? null : Number(b.value) })),
      totals: {
        redemptions: Number(r.totals?.redemptions || 0),
        students: Number(r.totals?.students || 0),
        total_saved: Number(r.totals?.total_saved || 0),
        total_purchase: Number(r.totals?.total_purchase || 0),
        month_redemptions: Number(r.totals?.month_redemptions || 0),
        month_saved: Number(r.totals?.month_saved || 0),
      },
      redemptions: (r.redemptions || []) as Portal["redemptions"],
    });
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm font-dm text-slate-500">Carregando portal...</div>;
  }

  if (denied) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-200 mx-auto flex items-center justify-center">
            <ShieldOff size={22} className="text-slate-500" />
          </div>
          <h1 className="font-barlow font-bold text-xl text-slate-900">Acesso indisponível</h1>
          <p className="text-sm font-dm text-slate-600">{denied}. Peça um novo link à equipe do EVO Club.</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-sm font-dm text-red-600">{error ?? "Portal indisponível."}</p>
          <Button variant="outline" size="sm" onClick={load} className="font-dm">Tentar novamente</Button>
        </div>
      </div>
    );
  }

  const p = data.partner;
  const expiring = p.contract_days_left !== null && p.contract_days_left <= 30;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-5 py-6">
          <p className="text-[11px] font-dm uppercase tracking-[0.2em] text-slate-400">Portal do Parceiro · EVO Club</p>
          <h1 className="font-barlow font-bold text-2xl md:text-3xl mt-1">{p.name}</h1>
          <p className="text-sm font-dm text-slate-300 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1"><Building2 size={13} /> {p.category}</span>
            {p.location && <span>{p.location}</span>}
            <span className="inline-flex items-center gap-1">
              <CalendarRange size={13} /> Vigência {dateBR(p.contract_starts_at)} → {dateBR(p.contract_ends_at)}
            </span>
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-6 space-y-5">
        {expiring && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5" />
            <p className="text-xs font-dm text-amber-800">
              {p.contract_days_left! < 0
                ? `Seu contrato venceu há ${Math.abs(p.contract_days_left!)} dias.`
                : `Seu contrato vence em ${p.contract_days_left} dias (${dateBR(p.contract_ends_at)}).`}
              {" "}Fale com a equipe do EVO Club para renovar a parceria.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card label="Resgates no mês" value={data.totals.month_redemptions} icon={<Ticket size={12} />} />
          <Card label="Economia no mês" value={fmtBRL(data.totals.month_saved)} icon={<TrendingUp size={12} />} />
          <Card label="Resgates totais" value={data.totals.redemptions} />
          <Card label="Alunos atendidos" value={data.totals.students} icon={<Users size={12} />} />
        </div>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="font-barlow font-bold text-base text-slate-900">Seus benefícios ativos</h2>
          </div>
          {data.benefits.length === 0 ? (
            <p className="p-6 text-center text-sm font-dm text-slate-500">Nenhum benefício cadastrado ainda.</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {data.benefits.map(b => (
                <div key={b.id} className="p-4">
                  <p className="font-dm text-sm text-slate-900 flex items-center gap-2">
                    {b.label}
                    {!b.active && <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">inativo</span>}
                  </p>
                  <p className="text-xs font-dm text-slate-500 mt-0.5">
                    {TYPE_LABEL[b.benefit_type] ?? "Benefício"}
                    {b.value != null && b.benefit_type === "percent" ? ` · ${b.value}%` : ""}
                    {b.value != null && b.benefit_type !== "percent" && b.benefit_type !== "courtesy" ? ` · ${fmtBRL(b.value)}` : ""}
                    {" · "}limite {b.usage_limit ?? "livre"}{b.usage_limit ? ` ${PERIOD_LABEL[b.limit_period] ?? ""} por aluno` : ""}
                    {" · "}até {dateBR(b.valid_until)}
                  </p>
                  {b.rules && <p className="text-xs font-dm text-slate-500 mt-0.5">Regras: {b.rules}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="font-barlow font-bold text-base text-slate-900">Resgates recebidos</h2>
            <p className="text-xs font-dm text-slate-500">Últimos 200 registros validados.</p>
          </div>
          {data.redemptions.length === 0 ? (
            <p className="p-6 text-center text-sm font-dm text-slate-500">
              Nenhum resgate registrado até agora.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-dm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 font-medium">Aluno</th>
                    <th className="px-4 py-2 font-medium">Benefício</th>
                    <th className="px-4 py-2 font-medium">Compra</th>
                    <th className="px-4 py-2 font-medium">Economia</th>
                  </tr>
                </thead>
                <tbody>
                  {data.redemptions.map(r => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                        {new Date(r.redeemed_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-2 text-slate-900">
                        {r.student}
                        {r.member_code && <span className="block text-[11px] text-slate-400">{r.member_code}</span>}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{r.benefit_label}</td>
                      <td className="px-4 py-2 text-slate-600">{r.purchase_amount != null ? fmtBRL(Number(r.purchase_amount)) : "—"}</td>
                      <td className="px-4 py-2 text-emerald-700">{fmtBRL(Number(r.amount_saved || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="text-[11px] font-dm text-slate-400 text-center pb-6">
          Este portal é de acesso restrito ao parceiro e exibe apenas os dados desta parceria.
          Não compartilhe o link de acesso.
        </p>
      </main>
    </div>
  );
}