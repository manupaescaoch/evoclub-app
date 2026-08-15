import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { useAccess } from "@/contexts/AccessContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Pencil, TrendingUp, Lightbulb, ArrowRight } from "lucide-react";

/* ---------- datas em fuso de Brasília ---------- */
const brNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const monthRange = (base: Date) => ({
  from: iso(new Date(base.getFullYear(), base.getMonth(), 1)),
  to: iso(new Date(base.getFullYear(), base.getMonth() + 1, 0)),
});
const weekRange = (base: Date) => {
  const start = addDays(base, -((base.getDay() + 6) % 7));
  return { from: iso(start), to: iso(addDays(start, 6)) };
};

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

type Metric = { label: string; value: string | number; hint?: string; accent?: "default" | "blue" | "green" | "yellow" | "red" };

const ACCENT: Record<string, { box: string; val: string }> = {
  default: { box: "bg-card border-border", val: "text-foreground" },
  blue: { box: "bg-blue-50 border-blue-200", val: "text-blue-700" },
  green: { box: "bg-green-50 border-green-200", val: "text-green-700" },
  yellow: { box: "bg-amber-50 border-amber-200", val: "text-amber-700" },
  red: { box: "bg-red-50 border-red-200", val: "text-red-700" },
};

const MetricBox = ({ label, value, hint, accent = "default", action }: Metric & { action?: React.ReactNode }) => {
  const a = ACCENT[accent];
  return (
    <div className={`rounded-xl border p-4 ${a.box}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-dm text-muted-foreground uppercase tracking-wide">{label}</p>
        {action}
      </div>
      <p className={`font-barlow font-bold text-2xl mt-1 ${a.val}`}>{value}</p>
      {hint && <p className="text-[11px] font-dm text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
};

const RateBox = ({ label, value, hint }: { label: string; value: number; hint: string }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <p className="text-xs font-dm text-muted-foreground uppercase tracking-wide">{label}</p>
    <p className="font-barlow font-bold text-2xl mt-1 text-foreground">{value}%</p>
    <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
    <p className="text-[11px] font-dm text-muted-foreground mt-1">{hint}</p>
  </div>
);

type Data = {
  ativos: number;
  ativosMetaId: string | null;
  ativosAnterior: number;
  totalLeads: number;
  agendadas: number;
  compareceram: number;
  naoCompareceram: number;
  matriculas: number;
  matriculasMes: number;
  ticketMes: number;
  fechouNoDia: number;
  expSemana: number;
  expHoje: number;
  expAmanha: number;
  semStatus: number;
  fuPendentes: number;
  fuMatriculados: number;
  fuGerente: number;
  confirmacoesHoje: number;
  anamneseRespondidas: number;
  anamnesePendentes: number;
  fuEnviadosHoje: number;
  fuAgendados: number;
};

const EMPTY: Data = {
  ativos: 0, ativosMetaId: null, ativosAnterior: 0, totalLeads: 0, agendadas: 0, compareceram: 0,
  naoCompareceram: 0, matriculas: 0, matriculasMes: 0, ticketMes: 0, fechouNoDia: 0, expSemana: 0,
  expHoje: 0, expAmanha: 0, semStatus: 0, fuPendentes: 0, fuMatriculados: 0, fuGerente: 0,
  confirmacoesHoje: 0, anamneseRespondidas: 0, anamnesePendentes: 0, fuEnviadosHoje: 0, fuAgendados: 0,
};

const PERIODOS = [
  { key: "mes", label: "Mês atual" },
  { key: "semana", label: "Semana" },
  { key: "hoje", label: "Hoje" },
  { key: "tudo", label: "Todos os tempos" },
] as const;
type PeriodoKey = (typeof PERIODOS)[number]["key"];

export default function CrmDashboard() {
  const { filterId } = useUnit();
  const { can } = useAccess();
  const canEdit = can("crm", "edit");

  const [periodo, setPeriodo] = useState<PeriodoKey>("mes");
  const [tab, setTab] = useState<"diario" | "periodo">("diario");
  const [d, setD] = useState<Data>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [editAtivos, setEditAtivos] = useState<string | null>(null);

  const hoje = useMemo(() => brNow(), []);
  const range = useMemo(() => {
    if (periodo === "hoje") return { from: iso(hoje), to: iso(hoje) };
    if (periodo === "semana") return weekRange(hoje);
    if (periodo === "mes") return monthRange(hoje);
    return { from: "1900-01-01", to: "2999-12-31" };
  }, [periodo, hoje]);

  const load = useCallback(async () => {
    setLoading(true);
    const hj = iso(hoje);
    const amanha = iso(addDays(hoje, 1));
    const semana = weekRange(hoje);
    const mes = monthRange(hoje);
    const mesAnterior = monthRange(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1));

    const scope = <T,>(q: T): T => (filterId ? (q as any).eq("unidade_id", filterId) : q);
    const scopeUnit = <T,>(q: T): T => (filterId ? (q as any).eq("unit_id", filterId) : q);

    const [leadsRes, interRes, metasRes, clientesRes, tarefasRes, anamneseRes, linksRes] = await Promise.all([
      scope(supabase.from("leads").select("id,status_funil,nivel_interesse,data_aula_experimental,created_at,unidade_id").eq("ativo", true)),
      supabase.from("interacoes").select("id,lead_id,tipo,compareceu,fechou_matricula,data_fechamento,data_experimental,valor_plano,created_at").order("created_at", { ascending: false }).limit(5000),
      scope(supabase.from("metas").select("id,mes_referencia,alunos_ativos")),
      scopeUnit(supabase.from("clients").select("id,status")),
      scopeUnit(supabase.from("crm_tasks").select("id,title,category,sector,status,due_date,created_at,archived").eq("archived", false)),
      scopeUnit(supabase.from("anamnesis").select("id,created_at")),
      scopeUnit(supabase.from("form_links").select("id,kind,status,sent_at,answered_at")),
    ]);

    const leads = (leadsRes.data as any[]) || [];
    const leadIds = new Set(leads.map((l) => l.id));
    const inter = (((interRes.data as any[]) || [])).filter((i) => leadIds.has(i.lead_id));
    const metas = (metasRes.data as any[]) || [];
    const clientes = (clientesRes.data as any[]) || [];
    const tarefas = (tarefasRes.data as any[]) || [];
    const anamneses = (anamneseRes.data as any[]) || [];
    const links = (linksRes.data as any[]) || [];

    const inRange = (v?: string | null) => !!v && v.slice(0, 10) >= range.from && v.slice(0, 10) <= range.to;
    const inMes = (v?: string | null) => !!v && v.slice(0, 10) >= mes.from && v.slice(0, 10) <= mes.to;
    const inSemana = (v?: string | null) => !!v && v.slice(0, 10) >= semana.from && v.slice(0, 10) <= semana.to;

    /* experimentais: data no lead + agendamentos registrados em interações */
    const agendamentos: { data: string | null; compareceu: boolean | null; lead: string }[] = [
      ...leads.filter((l) => l.data_aula_experimental).map((l) => ({ data: l.data_aula_experimental as string, compareceu: null as boolean | null, lead: l.id })),
      ...inter.filter((i) => i.data_experimental).map((i) => ({ data: i.data_experimental as string, compareceu: i.compareceu, lead: i.lead_id })),
    ];
    const dedup = new Map<string, { data: string; compareceu: boolean | null }>();
    agendamentos.forEach((a) => {
      if (!a.data) return;
      const k = `${a.lead}|${a.data.slice(0, 10)}`;
      const prev = dedup.get(k);
      dedup.set(k, { data: a.data.slice(0, 10), compareceu: a.compareceu ?? prev?.compareceu ?? null });
    });
    const aulas = [...dedup.values()];
    const aulasPeriodo = aulas.filter((a) => inRange(a.data));

    const compareceramReais = aulasPeriodo.filter((a) => a.compareceu === true).length;
    const naoCompareceram = aulasPeriodo.filter((a) => a.compareceu === false).length;

    const fechamentos = inter.filter((i) => i.fechou_matricula);
    const matriculas = fechamentos.filter((i) => inRange(i.data_fechamento || i.created_at)).length;
    const fechMes = fechamentos.filter((i) => inMes(i.data_fechamento || i.created_at));
    const valores = fechMes.map((i) => Number(i.valor_plano) || 0).filter((v) => v > 0);
    const ticketMes = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
    const fechouNoDia = fechamentos.filter(
      (i) => i.data_experimental && (i.data_fechamento || "").slice(0, 10) === i.data_experimental.slice(0, 10) && inRange(i.data_fechamento),
    ).length;

    /* alunos ativos: valor informado na meta do mês, senão contagem real */
    const metaMes = metas.find((m) => (m.mes_referencia || "").slice(0, 7) === mes.from.slice(0, 7));
    const metaAnt = metas.find((m) => (m.mes_referencia || "").slice(0, 7) === mesAnterior.from.slice(0, 7));
    const ativosReais = clientes.filter((c) => c.status === "AT").length;

    /* follow ups (tarefas do CRM) */
    const isFU = (t: any) => /follow/i.test(`${t.category || ""} ${t.title || ""}`);
    const pendente = (t: any) => t.status !== "done" && t.status !== "concluida" && t.status !== "concluído";
    const fuPendentes = tarefas.filter((t) => isFU(t) && pendente(t)).length;
    const fuAgendados = tarefas.filter((t) => isFU(t) && pendente(t) && t.due_date).length;
    const fuEnviadosHoje = tarefas.filter((t) => isFU(t) && !pendente(t) && (t.created_at || "").slice(0, 10) === hj).length;

    const ultimaInteracao = (leadId: string) => {
      const l = inter.filter((i) => i.lead_id === leadId)[0];
      return (l?.created_at || "").slice(0, 10);
    };
    const diasDe = (dataIso: string) =>
      dataIso ? Math.floor((new Date(hj).getTime() - new Date(dataIso).getTime()) / 86400000) : 999;

    const fuMatriculados = leads.filter(
      (l) => l.status_funil === "convertido" && diasDe(ultimaInteracao(l.id)) >= 7,
    ).length;
    const fuGerente = leads.filter(
      (l) => ["negociacao", "follow_up"].includes(l.status_funil) && diasDe(ultimaInteracao(l.id)) >= 3,
    ).length;

    const confirmacoesHoje = inter.filter(
      (i) => /confirma|lembrete/i.test(i.tipo || "") && (i.created_at || "").slice(0, 10) === hj,
    ).length;

    const anamneseRespondidas = anamneses.filter((a) => (a.created_at || "").slice(0, 10) === hj).length;
    const anamnesePendentes = links.filter((l) => l.kind === "anamnesis" && !l.answered_at).length;

    const semStatus = aulas.filter(
      (a) => a.data < hj && a.compareceu === null,
    ).length;

    setD({
      ativos: metaMes?.alunos_ativos ?? ativosReais,
      ativosMetaId: metaMes?.id ?? null,
      ativosAnterior: metaAnt?.alunos_ativos ?? 0,
      totalLeads: leads.length,
      agendadas: aulasPeriodo.length,
      compareceram: compareceramReais,
      naoCompareceram,
      matriculas,
      matriculasMes: fechMes.length,
      ticketMes,
      fechouNoDia,
      expSemana: aulas.filter((a) => inSemana(a.data)).length,
      expHoje: aulas.filter((a) => a.data === hj).length,
      expAmanha: aulas.filter((a) => a.data === amanha).length,
      semStatus,
      fuPendentes,
      fuMatriculados,
      fuGerente,
      confirmacoesHoje,
      anamneseRespondidas,
      anamnesePendentes,
      fuEnviadosHoje,
      fuAgendados,
    });
    setLoading(false);
  }, [filterId, range, hoje]);

  useEffect(() => { load(); }, [load]);

  const salvarAtivos = async () => {
    const val = Number(editAtivos);
    if (!Number.isFinite(val) || val < 0) { toast.error("Informe um número válido."); return; }
    const mes = monthRange(hoje);
    const { error } = await supabase
      .from("metas")
      .upsert(
        { unidade_id: filterId, mes_referencia: mes.from, alunos_ativos: val } as any,
        { onConflict: "unidade_id,mes_referencia" },
      );
    if (error) { toast.error(error.message); return; }
    toast.success("Alunos ativos atualizado.");
    setEditAtivos(null);
    load();
  };

  const taxaLeadExp = pct(d.agendadas, d.totalLeads);
  const taxaPresenca = pct(d.compareceram, d.agendadas);
  const taxaExpMat = pct(d.matriculas, d.agendadas);
  const conversaoGeral = pct(d.matriculas, d.totalLeads);

  const diagnostico = (() => {
    if (loading) return "Carregando indicadores...";
    if (d.totalLeads === 0) return "Ainda não há leads registrados no período. Prioridade: alimentar a base de leads.";
    if (taxaPresenca < 70) return "Boa geração de leads, mas ainda há perda relevante entre agendamento e comparecimento. Prioridade: reforçar confirmação pré-aula e follow-up.";
    if (taxaExpMat < 60) return "Comparecimento saudável, porém a conversão na experimental está abaixo do ideal. Prioridade: qualificar a apresentação de planos no dia da aula.";
    if (taxaLeadExp < 50) return "Conversão boa, mas poucos leads chegam a agendar. Prioridade: velocidade de primeiro contato e oferta da aula experimental.";
    return "Funil equilibrado. Prioridade: manter volume de leads e velocidade de resposta.";
  })();

  const funil = [
    { label: "Leads", value: d.totalLeads, hint: "Base de leads da unidade" },
    { label: "Experimentais", value: d.agendadas, hint: "Agendadas no período", taxa: taxaLeadExp },
    { label: "Compareceram", value: d.compareceram, hint: "À experimental", taxa: taxaPresenca },
    { label: "Matrículas", value: d.matriculas, hint: "Fechadas no período", taxa: taxaExpMat },
  ];

  const atividades: Metric[] = [
    { label: "Experimentais do dia", value: d.expHoje, hint: "aulas experimentais hoje" },
    { label: "Experimentais da semana", value: d.expSemana, hint: "agendadas nesta semana" },
    { label: "Confirmações experimentais", value: d.confirmacoesHoje, hint: "lembretes registrados hoje" },
    { label: "Anamneses respondidas", value: d.anamneseRespondidas, hint: "respondidas hoje" },
    { label: "Anamneses pendentes", value: d.anamnesePendentes, hint: "aguardando resposta", accent: "yellow" },
    { label: "Follow-ups enviados", value: d.fuEnviadosHoje, hint: "concluídos hoje" },
    { label: "Follow-ups agendados", value: d.fuAgendados, hint: "programados", accent: "blue" },
  ];

  return (
    <div className="space-y-5">
      {/* período */}
      <div className="flex flex-wrap items-center gap-1.5">
        {PERIODOS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriodo(p.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-dm font-semibold ${
              periodo === p.key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* indicadores principais */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {editAtivos !== null ? (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
            <p className="text-xs font-dm text-muted-foreground uppercase tracking-wide">Alunos ativos</p>
            <Input
              autoFocus
              value={editAtivos}
              onChange={(e) => setEditAtivos(e.target.value.replace(/\D/g, ""))}
              className="h-8 mt-1 font-dm"
            />
            <div className="flex gap-1.5 mt-2">
              <Button size="sm" className="h-7 text-[11px]" onClick={salvarAtivos}>Salvar</Button>
              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setEditAtivos(null)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <MetricBox
            label="Alunos ativos"
            value={loading ? "…" : d.ativos}
            hint={`Mês anterior: ${d.ativosAnterior}`}
            accent="blue"
            action={
              canEdit ? (
                <button
                  onClick={() => setEditAtivos(String(d.ativos))}
                  className="text-[11px] font-dm text-primary inline-flex items-center gap-1"
                >
                  <Pencil size={11} /> Editar
                </button>
              ) : undefined
            }
          />
        )}
        <MetricBox label="Total de leads" value={loading ? "…" : d.totalLeads} hint="Base cadastrada" />
        <MetricBox label="Experimentais agendadas" value={loading ? "…" : d.agendadas} hint="No período" accent="blue" />
        <MetricBox label="Compareceram" value={loading ? "…" : d.compareceram} hint="Compareceram à experimental" accent="green" />
        <MetricBox label="Matrículas" value={loading ? "…" : d.matriculas} hint="Período selecionado" accent="green" />
        <MetricBox label="Conversão geral" value={loading ? "…" : `${conversaoGeral}%`} hint="Leads → matrículas" accent="yellow" />
      </div>

      {/* taxas do funil */}
      <div>
        <h2 className="font-barlow font-bold text-lg mb-2">Taxas do funil</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <RateBox label="Lead vira experimental" value={taxaLeadExp} hint={`${d.agendadas} de ${d.totalLeads} leads`} />
          <RateBox label="Comparecimento" value={taxaPresenca} hint={`${d.compareceram} de ${d.agendadas} agendadas`} />
          <RateBox label="Experimental vira matrícula" value={taxaExpMat} hint={`${d.matriculas} de ${d.agendadas} experimentais`} />
        </div>
      </div>

      {/* funil comercial */}
      <Card className="p-4">
        <h2 className="font-barlow font-bold text-lg mb-3">Funil comercial</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {funil.map((f) => (
            <div key={f.label} className="rounded-xl border border-border p-4">
              {f.taxa != null && (
                <span className="inline-block text-[10px] font-dm font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary mb-1">
                  {f.taxa}%
                </span>
              )}
              <p className="text-xs font-dm text-muted-foreground uppercase tracking-wide">{f.label}</p>
              <p className="font-barlow font-bold text-2xl">{loading ? "…" : f.value}</p>
              <p className="text-[11px] font-dm text-muted-foreground">{f.hint}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-sm font-dm">
          <p className="rounded-lg bg-muted/50 p-3">
            <strong>Conversão geral: {conversaoGeral}%</strong>
            <span className="block text-xs text-muted-foreground">{d.totalLeads} leads → {d.matriculas} matrículas</span>
          </p>
          <p className="rounded-lg bg-muted/50 p-3">
            <strong>Fechamento no dia da experimental: {pct(d.fechouNoDia, d.compareceram)}%</strong>
            <span className="block text-xs text-muted-foreground">{d.fechouNoDia} de {d.compareceram} comparecimentos</span>
          </p>
          <p className="rounded-lg bg-muted/50 p-3">
            <strong>Ticket médio do mês: {brl(d.ticketMes)}</strong>
            <span className="block text-xs text-muted-foreground">{d.matriculasMes} matrículas fechadas no mês</span>
          </p>
        </div>
      </Card>

      {/* diagnóstico */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4 md:col-span-2">
          <h2 className="font-barlow font-bold text-lg flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" /> Diagnóstico da semana
          </h2>
          <p className="text-sm font-dm text-muted-foreground mt-1">{diagnostico}</p>
        </Card>
        <Card className="p-4 bg-primary/5 border-primary/30">
          <h2 className="font-barlow font-bold text-lg flex items-center gap-2">
            <Lightbulb size={16} className="text-primary" /> Dica estratégica
          </h2>
          <p className="text-sm font-dm text-muted-foreground mt-1">
            Leads com primeiro contato em até 5 minutos convertem 2,3x mais.
          </p>
        </Card>
      </div>

      {/* operação do dia */}
      <div>
        <h2 className="font-barlow font-bold text-lg mb-2">Operação do dia</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <MetricBox label="Follow ups pendentes" value={loading ? "…" : d.fuPendentes} hint="aguardando" accent="yellow" />
          <MetricBox label="FU matriculados" value={loading ? "…" : d.fuMatriculados} hint="aguardando contato" accent="blue" />
          <MetricBox label="FU gerente" value={loading ? "…" : d.fuGerente} hint="aguardando contato" accent="red" />
          <MetricBox label="Não compareceram" value={loading ? "…" : d.naoCompareceram} hint="No período" accent="red" />
          <MetricBox label="Experimentais da semana" value={loading ? "…" : d.expSemana} hint="Esta semana" />
          <MetricBox label="Taxa de comparecimento" value={loading ? "…" : `${taxaPresenca}%`} hint={`${d.compareceram} de ${d.agendadas}`} accent="green" />
        </div>
      </div>

      {/* controle diário / visão do período */}
      <Card className="p-4 space-y-4">
        <div className="flex gap-1.5">
          {([["diario", "Controle diário"], ["periodo", "Visão do período"]] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-dm font-semibold ${
                tab === k ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {tab === "diario" ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-dm text-muted-foreground uppercase tracking-wide">Eventos de hoje</p>
                <p className="font-barlow font-bold text-2xl">{loading ? "…" : d.expHoje}</p>
                <p className="text-[11px] font-dm text-muted-foreground">
                  {d.expHoje === 0 ? "Nenhum evento agendado para hoje" : "experimentais agendadas para hoje"}
                </p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-dm text-muted-foreground uppercase tracking-wide">Agendamentos para amanhã</p>
                <p className="font-barlow font-bold text-2xl">{loading ? "…" : d.expAmanha}</p>
                <p className="text-[11px] font-dm text-muted-foreground">
                  {d.expAmanha === 0 ? "Nenhum agendamento pendente para amanhã" : "experimentais para amanhã"}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-barlow font-bold text-base mb-2">Atividades do dia</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {atividades.map((a) => (
                  <MetricBox key={a.label} {...a} value={loading ? "…" : a.value} />
                ))}
              </div>
              <Link to="/admin/leads/dashboard" className="inline-flex items-center gap-1 text-sm font-dm text-primary mt-3">
                Ver relatório completo <ArrowRight size={14} />
              </Link>
            </div>

            <div>
              <h3 className="font-barlow font-bold text-base mb-2">Pendências do dia</h3>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-dm font-semibold text-amber-800">
                    Experimentais sem status comercial: {loading ? "…" : d.semStatus}
                  </p>
                  <p className="text-xs font-dm text-amber-700">Aulas já realizadas sem presença ou desfecho registrado.</p>
                </div>
                <Link to="/admin/leads?status=aula_agendada">
                  <Button size="sm" variant="outline" className="h-8 text-[11px]">Ver</Button>
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricBox label="Leads no período" value={loading ? "…" : d.totalLeads} />
            <MetricBox label="Experimentais agendadas" value={loading ? "…" : d.agendadas} accent="blue" />
            <MetricBox label="Compareceram" value={loading ? "…" : d.compareceram} accent="green" />
            <MetricBox label="Não compareceram" value={loading ? "…" : d.naoCompareceram} accent="red" />
            <MetricBox label="Matrículas" value={loading ? "…" : d.matriculas} accent="green" />
            <MetricBox label="Fechamento no dia" value={loading ? "…" : d.fechouNoDia} />
            <MetricBox label="Ticket médio do mês" value={loading ? "…" : brl(d.ticketMes)} />
            <MetricBox label="Conversão geral" value={loading ? "…" : `${conversaoGeral}%`} accent="yellow" />
          </div>
        )}
      </Card>
    </div>
  );
}
