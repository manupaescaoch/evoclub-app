import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "@/components/admin/StatCard";
import VarBadge from "@/components/admin/financeiro/VarBadge";
import UltimasTransacoes from "@/components/admin/financeiro/UltimasTransacoes";
import DespesasCategoria from "@/components/admin/financeiro/DespesasCategoria";
import { useUnit } from "@/contexts/UnitContext";
import { useFinanceDashboard } from "@/hooks/useFinanceDashboard";
import {
  fmtBRL, fmtBRLShort, fmtPct, monthName, monthFull, monthRange, safePct, variation,
} from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, BarChart3, Plus, Upload } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const now = new Date();
const YEARS = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 4 + i);

const FinDashboard = () => {
  const { filterId, isConsolidated, currentUnit } = useUnit();
  const navigate = useNavigate();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [mode, setMode] = useState<"mensal" | "acumulado">("mensal");

  const d = useFinanceDashboard(filterId, year, month);
  const { cur, prevAgg, yearAgg, prevYearAgg, loading } = d;

  const range = monthRange(year, month);
  const periodo = `${monthFull(month)} de ${year}`;
  const escopo = isConsolidated ? "Consolidado de todas as unidades" : currentUnit?.name || "Unidade";

  /** link para a página de Transações preservando os filtros do dashboard */
  const txLink = (extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({ from: range.start, to: range.end, ...extra });
    if (filterId) p.set("unit", filterId);
    return `/admin/financeiro/transacoes?${p.toString()}`;
  };
  const monthLink = (mi: number) => {
    const r = monthRange(year, mi);
    const p = new URLSearchParams({ from: r.start, to: r.end });
    if (filterId) p.set("unit", filterId);
    return `/admin/financeiro/transacoes?${p.toString()}`;
  };

  const margem = safePct(cur.balance, cur.income);
  const margemPrev = safePct(prevAgg.balance, prevAgg.income);
  const despSobreRec = safePct(cur.expense, cur.income);
  const resultadoOper = cur.operIncome - cur.operExpense;
  const semCategoria = d.uncategorizedCount;

  const chartData = useMemo(
    () =>
      d.series.map((s) => ({
        ...s,
        Receitas: mode === "mensal" ? s.Entradas : s.accEntradas,
        Despesas: mode === "mensal" ? s.Saídas : s.accSaídas,
        Saldo: mode === "mensal" ? s.saldo : s.accSaldo,
      })),
    [d.series, mode],
  );
  const semDadosNoAno = !loading && d.yearCount === 0;

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
      <div className="rounded-lg border border-border bg-card p-3 card-shadow text-xs font-dm space-y-1">
        <p className="font-semibold text-foreground">{label} · {year}</p>
        <p className="text-green-600">Receitas: {fmtBRL(p.Receitas)}</p>
        <p className="text-red-500">Despesas: {fmtBRL(p.Despesas)}</p>
        <p className="text-foreground">Saldo: {fmtBRL(p.Saldo)}</p>
        <p className="text-muted-foreground">
          {p.key === 0 ? "Primeiro mês do ano" : `Saldo ${p.varSaldo >= 0 ? "↑" : "↓"} ${Math.abs(p.varSaldo).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs mês anterior`}
        </p>
        <p className="text-[10px] text-muted-foreground">Clique para ver as transações do mês</p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* filtros de período */}
      <div className="bg-card rounded-xl card-shadow p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Ano anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-dm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              onClick={() => setYear((y) => y + 1)}
              className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Próximo ano"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <p className="text-[11px] font-dm text-muted-foreground">{escopo} · {periodo}</p>
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          {Array.from({ length: 12 }, (_, i) => (
            <button
              key={i}
              onClick={() => setMonth(i)}
              className={`shrink-0 h-9 px-3 rounded-lg text-xs font-dm font-semibold transition-colors ${
                i === month ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {monthName(i)}
            </button>
          ))}
        </div>
      </div>

      {/* cards de resultado */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-card card-shadow animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            label="Saldo do mês"
            value={fmtBRLShort(cur.balance)}
            accent
            sub={cur.balance === 0 ? "Zerado" : cur.balance > 0 ? "Positivo" : "Negativo"}
          />
          <StatCard
            label="Saldo do ano"
            value={fmtBRLShort(yearAgg.balance)}
            sub={`Jan–Dez ${year} · ${yearAgg.balance === 0 ? "Zerado" : yearAgg.balance > 0 ? "Positivo" : "Negativo"}`}
          />
          <StatCard
            label="Receitas do mês"
            value={fmtBRLShort(cur.income)}
            sub={`${cur.incomeCount} ${cur.incomeCount === 1 ? "lançamento" : "lançamentos"}`}
          />
          <StatCard
            label="Despesas do mês"
            value={fmtBRLShort(cur.expense)}
            sub={`${cur.expenseCount} ${cur.expenseCount === 1 ? "lançamento" : "lançamentos"}`}
          />
          <StatCard
            label="Ticket médio"
            value={cur.ticketStudents ? fmtBRLShort(cur.ticket) : "—"}
            sub={cur.ticketStudents
              ? `${cur.ticketStudents} alunos pagantes · competência ${monthName(month)}/${year}`
              : `Sem mensalidades na competência ${monthName(month)}/${year}`}
          />
        </div>
      )}

      {/* variações vs período anterior */}
      {!loading && (
        <div className="bg-card rounded-xl card-shadow p-3 grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-2">
          {[
            { l: "Saldo", cur: cur.balance, prev: prevAgg.balance, invert: false, money: true },
            { l: "Receitas", cur: cur.income, prev: prevAgg.income, invert: false, money: true },
            { l: "Despesas", cur: cur.expense, prev: prevAgg.expense, invert: true, money: true },
            { l: "Ticket médio", cur: cur.ticket, prev: prevAgg.ticket, invert: false, money: true },
            { l: "Margem operacional", cur: margem, prev: margemPrev, invert: false, money: false },
          ].map((it) => (
            <div key={it.l}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-dm">{it.l}</p>
              <p className="text-sm font-dm font-bold text-foreground">
                {it.money ? fmtBRL(it.cur) : fmtPct(it.cur)}
              </p>
              <p className="text-[10px] font-dm text-muted-foreground">
                Anterior: {it.money ? fmtBRL(it.prev) : fmtPct(it.prev)}
              </p>
              <VarBadge value={variation(it.cur, it.prev)} invert={it.invert} label="" />
            </div>
          ))}
          <div className="col-span-2 md:col-span-5 border-t border-border pt-2 flex flex-wrap gap-x-5 gap-y-1">
            <span className="text-[10px] font-dm text-muted-foreground">
              Saldo do ano vs {year - 1}: <span className="text-foreground font-semibold">{fmtBRL(prevYearAgg.balance)}</span>
            </span>
            <VarBadge value={variation(yearAgg.balance, prevYearAgg.balance)} label={`vs ${year - 1}`} />
            <span className="text-[10px] font-dm text-muted-foreground">
              Despesas em alta significam aumento de custo.
            </span>
          </div>
        </div>
      )}

      {/* indicadores complementares */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { l: "Margem operacional", v: fmtPct(margem), s: "Saldo ÷ receitas do mês" },
            { l: "Despesas sobre receitas", v: fmtPct(despSobreRec), s: "Despesas ÷ receitas do mês" },
            { l: "Resultado operacional", v: fmtBRL(resultadoOper), s: "Sem empréstimos e transferências" },
            { l: "Sem categoria", v: String(semCategoria), s: semCategoria ? "Clique para revisar" : "Tudo categorizado" },
          ].map((it) => (
            <button
              key={it.l}
              onClick={() => it.l === "Sem categoria" && semCategoria > 0 && navigate(txLink({ category: "none" }))}
              className={`text-left bg-card rounded-xl card-shadow px-4 py-3 ${it.l === "Sem categoria" && semCategoria > 0 ? "hover:ring-1 hover:ring-primary" : ""}`}
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-dm">{it.l}</p>
              <p className="text-lg font-barlow font-bold text-foreground leading-tight">{it.v}</p>
              <p className="text-[10px] font-dm text-muted-foreground">{it.s}</p>
            </button>
          ))}
        </div>
      )}

      {/* gráfico de faturamento */}
      <div className="bg-card rounded-xl p-5 card-shadow">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
          <div>
            <p className="text-sm font-dm font-semibold text-foreground">Faturamento mensal — Entradas vs Saídas</p>
            <p className="text-[11px] font-dm text-muted-foreground">
              Fonte: lançamentos financeiros • {periodo}
            </p>
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["mensal", "acumulado"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`h-9 px-3 text-xs font-dm font-semibold capitalize ${
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-72 animate-pulse bg-background rounded-lg" />
        ) : semDadosNoAno ? (
          <div className="h-72 flex flex-col items-center justify-center text-center gap-3">
            <BarChart3 size={26} className="text-muted-foreground" />
            <p className="text-xs font-dm text-muted-foreground">Nenhum lançamento encontrado neste período</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button size="sm" className="gap-2" onClick={() => navigate("/admin/financeiro/transacoes")}>
                <Plus size={14} /> Adicionar lançamento
              </Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => navigate("/admin/financeiro/conciliacao")}>
                <Upload size={14} /> Importar transações
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-72 min-w-0 overflow-x-auto">
            <div className="h-72 min-w-[520px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} onClick={(e: any) => {
                  const i = e?.activeTooltipIndex;
                  if (typeof i === "number") navigate(monthLink(i));
                }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="m" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Bar dataKey="Receitas" fill="#16a34a" cursor="pointer" />
                  <Bar dataKey="Despesas" fill="#dc2626" cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* listas lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UltimasTransacoes
          rows={d.latest}
          loading={loading}
          conciliation={d.conciliation}
          seeAllHref={txLink()}
        />
        <DespesasCategoria
          categories={d.categories}
          total={d.totalExpense}
          loading={loading}
          uncategorizedCount={semCategoria}
          seeAllHref={txLink({ kind: "expense" })}
          categoryHref={(name) => txLink({ kind: "expense", category: name })}
          uncategorizedHref={txLink({ category: "none" })}
        />
      </div>

      {d.error && (
        <p className="text-xs font-dm text-red-500">Não foi possível carregar os lançamentos: {d.error}</p>
      )}
    </div>
  );
};

export default FinDashboard;
