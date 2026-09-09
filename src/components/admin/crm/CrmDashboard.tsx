import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { useAccess } from "@/contexts/AccessContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  Pencil, TrendingUp, TrendingDown, Lightbulb, ArrowRight, Target,
  ChevronRight, Minus, Stethoscope,
} from "lucide-react";

/* ---------- datas em fuso de Brasília ---------- */
const brNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
const fmtData = (v?: string | null) =>
  v ? new Date(`${v.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";

/* ---------- cores fixas por etapa do funil ---------- */
const STAGE = {
  leads: { text: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200", bar: "bg-slate-500" },
  agendadas: { text: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", bar: "bg-blue-600" },
  compareceram: { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", bar: "bg-emerald-600" },
  matriculas: { text: "text-primary", bg: "bg-primary/5", border: "border-primary/30", bar: "bg-primary" },
} as const;

type Metric = { label: string; value: string | number; hint?: string; accent?: "default" | "blue" | "green" | "yellow" | "red" };

const ACCENT: Record<string, { box: string; val: string }> = {
  default: { box: "bg-card border-border", val: "text-foreground" },
  blue: { box: "bg-blue-50 border-blue-200", val: "text-blue-700" },
  green: { box: "bg-green-50 border-green-200", val: "text-green-700" },
  yellow: { box: "bg-amber-50 border-amber-200", val: "text-amber-700" },
  red: { box: "bg-red-50 border-red-200", val: "text-red-700" },
};

/* ---------- variação vs período anterior ---------- */
function variation(cur: number, prev: number | null): { dir: "up" | "down" | "flat"; text: string } | null {
  if (prev === null) return null;
  if (prev === 0 && cur === 0) return { dir: "flat", text: "sem variação" };
  if (prev === 0) return { dir: "up", text: "novo no período" };
  const delta = Math.round(((cur - prev) / prev) * 100);
  if (delta === 0) return { dir: "flat", text: "estável" };
  return { dir: delta > 0 ? "up" : "down", text: `${Math.abs(delta)}%` };
}

const Delta = ({ cur, prev, sufixo }: { cur: number; prev: number | null; sufixo: string }) => {
  const v = variation(cur, prev);
  if (!v) return null;
  const Icon = v.dir === "up" ? TrendingUp : v.dir === "down" ? TrendingDown : Minus;
  const cls = v.dir === "up" ? "text-emerald-600" : v.dir === "down" ? "text-red-600" : "text-muted-foreground";
  return (
    <p className={`text-[11px] font-dm mt-0.5 inline-flex items-center gap-1 ${cls}`}>
      <Icon size={11} /> {v.text} {sufixo}
    </p>
  );
};

const MetricBox = ({
  label, value, hint, accent = "default", action, onClick, prev, cur, sufixo,
}: Metric & {
  action?: React.ReactNode; onClick?: () => void;
  prev?: number | null; cur?: number; sufixo?: string;
}) => {
  const a = ACCENT[accent];
  return (
    <div
      className={`rounded-xl border p-4 ${a.box} ${onClick ? "cursor-pointer transition hover:shadow-sm hover:border-primary/40" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-dm text-muted-foreground uppercase tracking-wide">{label}</p>
        {action ?? (onClick ? <ChevronRight size={14} className="text-muted-foreground shrink-0" /> : null)}
      </div>
      <p className={`font-barlow font-bold text-2xl mt-1 ${a.val}`}>{value}</p>
      {hint && <p className="text-[11px] font-dm text-muted-foreground mt-0.5">{hint}</p>}
      {cur !== undefined && prev !== undefined && sufixo ? <Delta cur={cur} prev={prev} sufixo={sufixo} /> : null}
    </div>
  );
};

const RateBox = ({
  label, value, num, den, base, onClick,
}: { label: string; value: number; num: number; den: number; base: string; onClick?: () => void }) => (
  <div
    className={`rounded-xl border border-border bg-card p-4 ${onClick ? "cursor-pointer transition hover:shadow-sm hover:border-primary/40" : ""}`}
    onClick={onClick}
    role={onClick ? "button" : undefined}
  >
    <div className="flex items-start justify-between gap-2">
      <p className="text-xs font-dm text-muted-foreground uppercase tracking-wide">{label}</p>
      {onClick && <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
    </div>
    <p className="font-barlow font-bold text-2xl mt-1 text-foreground">{value}%</p>
    <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
    <p className="text-[11px] font-dm text-muted-foreground mt-1">{num} de {den}</p>
    <p className="text-[11px] font-dm text-muted-foreground/80">{base}</p>
  </div>
);

const Skeleton = ({ cards = 6 }: { cards?: number }) => (
  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
    {Array.from({ length: cards }).map((_, i) => (
      <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse">
        <div className="h-3 w-2/3 rounded bg-muted" />
        <div className="h-7 w-1/2 rounded bg-muted mt-3" />
        <div className="h-2 w-3/4 rounded bg-muted mt-3" />
      </div>
    ))}
  </div>
);

/* ---------- registros de detalhamento ---------- */
type Row = { id: string; nome: string; responsavel: string; data: string; etapa: string; acao: string };
type Bucket = { count: number; rows: Row[] };
const EMPTY_BUCKET: Bucket = { count: 0, rows: [] };

type Snap = {
  leads: Bucket;
  agendadas: Bucket;
  compareceram: Bucket;
  noShow: Bucket;
  matriculas: Bucket;
  matriculasDeExp: Bucket;
  fechouNoDia: Bucket;
  receita: number;
  ticket: number;
};

const EMPTY_SNAP: Snap = {
  leads: EMPTY_BUCKET, agendadas: EMPTY_BUCKET, compareceram: EMPTY_BUCKET, noShow: EMPTY_BUCKET,
  matriculas: EMPTY_BUCKET, matriculasDeExp: EMPTY_BUCKET, fechouNoDia: EMPTY_BUCKET,
  receita: 0, ticket: 0,
};

type Data = {
  atual: Snap;
  anterior: Snap | null;
  ativos: number;
  ativosReais: number;
  metaAtivos: number;
  ativosAnterior: number | null;
  matriculasMes: number;
  ticketMes: number;
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
  atual: EMPTY_SNAP, anterior: null, ativos: 0, ativosReais: 0, metaAtivos: 0, ativosAnterior: null,
  matriculasMes: 0, ticketMes: 0, expSemana: 0, expHoje: 0, expAmanha: 0, semStatus: 0,
  fuPendentes: 0, fuMatriculados: 0, fuGerente: 0, confirmacoesHoje: 0,
  anamneseRespondidas: 0, anamnesePendentes: 0, fuEnviadosHoje: 0, fuAgendados: 0,
};

const PERIODOS = [
  { key: "mes", label: "Mês atual" },
  { key: "semana", label: "Semana" },
  { key: "hoje", label: "Hoje" },
  { key: "tudo", label: "Todos os tempos" },
] as const;
type PeriodoKey = (typeof PERIODOS)[number]["key"];

const SUFIXO: Record<PeriodoKey, string> = {
  hoje: "em relação ao dia anterior",
  semana: "em relação à semana anterior",
  mes: "em relação ao mês anterior",
  tudo: "",
};

export default function CrmDashboard() {
  const { filterId } = useUnit();
  const { can } = useAccess();
  const canEdit = can("crm", "edit");

  const [periodo, setPeriodo] = useState<PeriodoKey>("mes");
  const [tab, setTab] = useState<"diario" | "periodo">("diario");
  const [d, setD] = useState<Data>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [editAtivos, setEditAtivos] = useState<string | null>(null);
  const [editMeta, setEditMeta] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<{ title: string; rows: Row[] } | null>(null);

  const hoje = useMemo(() => brNow(), []);
  const range = useMemo(() => {
    if (periodo === "hoje") return { from: iso(hoje), to: iso(hoje) };
    if (periodo === "semana") return weekRange(hoje);
    if (periodo === "mes") return monthRange(hoje);
    return { from: "1900-01-01", to: "2999-12-31" };
  }, [periodo, hoje]);

  const rangeAnterior = useMemo(() => {
    if (periodo === "tudo") return null;
    if (periodo === "hoje") { const y = addDays(hoje, -1); return { from: iso(y), to: iso(y) }; }
    if (periodo === "semana") {
      const w = weekRange(hoje);
      const start = addDays(new Date(`${w.from}T12:00:00`), -7);
      return { from: iso(start), to: iso(addDays(start, 6)) };
    }
    return monthRange(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1));
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
      scope(supabase.from("leads").select("id,nome,status_funil,nivel_interesse,data_aula_experimental,cadastrado_por,atendido_por,created_at,unidade_id").eq("ativo", true)),
      supabase.from("interacoes").select("id,lead_id,tipo,compareceu,fechou_matricula,data_fechamento,data_experimental,valor_plano,atendido_por,created_at").order("created_at", { ascending: false }).limit(5000),
      scope(supabase.from("metas").select("id,mes_referencia,alunos_ativos,meta_alunos_ativos")),
      scopeUnit(supabase.from("clients").select("id,status")),
      scopeUnit(supabase.from("crm_tasks").select("id,title,category,sector,status,due_date,created_at,archived").eq("archived", false)),
      scopeUnit(supabase.from("anamnesis").select("id,created_at")),
      scopeUnit(supabase.from("form_links").select("id,kind,status,sent_at,answered_at")),
    ]);

    const leads = (leadsRes.data as any[]) || [];
    const leadById = new Map(leads.map((l) => [l.id, l]));
    const inter = (((interRes.data as any[]) || [])).filter((i) => leadById.has(i.lead_id));
    const metas = (metasRes.data as any[]) || [];
    const clientes = (clientesRes.data as any[]) || [];
    const tarefas = (tarefasRes.data as any[]) || [];
    const anamneses = (anamneseRes.data as any[]) || [];
    const links = (linksRes.data as any[]) || [];

    const inSemana = (v?: string | null) => !!v && v.slice(0, 10) >= semana.from && v.slice(0, 10) <= semana.to;
    const nome = (id: string) => leadById.get(id)?.nome || "Lead";
    const resp = (id: string, fallback?: string | null) =>
      fallback || leadById.get(id)?.atendido_por || leadById.get(id)?.cadastrado_por || "Sem responsável";
    const etapa = (id: string) => leadById.get(id)?.status_funil || "—";

    /* experimentais: data no lead + agendamentos registrados em interações */
    type Aula = { lead: string; data: string; compareceu: boolean | null };
    const dedup = new Map<string, Aula>();
    const push = (lead: string, data?: string | null, compareceu: boolean | null = null) => {
      if (!data) return;
      const dia = data.slice(0, 10);
      const k = `${lead}|${dia}`;
      const prev = dedup.get(k);
      dedup.set(k, { lead, data: dia, compareceu: compareceu ?? prev?.compareceu ?? null });
    };
    leads.forEach((l) => push(l.id, l.data_aula_experimental));
    inter.forEach((i) => push(i.lead_id, i.data_experimental, i.compareceu));
    const aulas = [...dedup.values()];
    const attended = new Set(aulas.filter((a) => a.compareceu === true).map((a) => `${a.lead}|${a.data}`));

    const fechamentos = inter.filter((i) => i.fechou_matricula);

    const snapshot = (r: { from: string; to: string }): Snap => {
      const inR = (v?: string | null) => !!v && v.slice(0, 10) >= r.from && v.slice(0, 10) <= r.to;

      const leadRows: Row[] = leads.filter((l) => inR(l.created_at)).map((l) => ({
        id: l.id, nome: l.nome, responsavel: resp(l.id, l.cadastrado_por),
        data: fmtData(l.created_at), etapa: l.status_funil,
        acao: l.status_funil === "novo" ? "Fazer primeiro contato" : "Seguir com follow-up",
      }));

      const aulasR = aulas.filter((a) => inR(a.data));
      const aulaRow = (a: Aula, etapaTxt: string, acao: string): Row => ({
        id: `${a.lead}|${a.data}`, nome: nome(a.lead), responsavel: resp(a.lead),
        data: fmtData(a.data), etapa: etapaTxt, acao,
      });

      const agendadasRows = aulasR.map((a) =>
        aulaRow(a, a.compareceu === true ? "Compareceu" : a.compareceu === false ? "No-show" : "Aguardando",
          a.compareceu === null ? "Confirmar presença" : a.compareceu ? "Apresentar plano" : "Reagendar"));
      const compareceramRows = aulasR.filter((a) => a.compareceu === true)
        .map((a) => aulaRow(a, "Compareceu", "Registrar desfecho comercial"));
      const noShowRows = aulasR.filter((a) => a.compareceu === false)
        .map((a) => aulaRow(a, "No-show", "Recuperar e reagendar"));

      const fechRow = (i: any, etapaTxt: string, acao: string): Row => ({
        id: i.id, nome: nome(i.lead_id), responsavel: resp(i.lead_id, i.atendido_por),
        data: fmtData(i.data_fechamento || i.created_at), etapa: etapaTxt, acao,
      });

      const fechR = fechamentos.filter((i) => inR(i.data_fechamento || i.created_at));
      const matriculasRows = fechR.map((i) => fechRow(i, etapa(i.lead_id), "Onboarding do aluno"));
      const deExp = fechR.filter((i) =>
        i.data_experimental && attended.has(`${i.lead_id}|${i.data_experimental.slice(0, 10)}`));
      const deExpRows = deExp.map((i) => fechRow(i, "Matrícula via experimental", "Onboarding do aluno"));
      const noDia = deExp.filter((i) =>
        (i.data_fechamento || "").slice(0, 10) === i.data_experimental.slice(0, 10));
      const noDiaRows = noDia.map((i) => fechRow(i, "Fechou no dia da experimental", "Onboarding do aluno"));

      const valores = fechR.map((i) => Number(i.valor_plano) || 0).filter((v) => v > 0);
      const receita = valores.reduce((a, b) => a + b, 0);

      return {
        leads: { count: leadRows.length, rows: leadRows },
        agendadas: { count: agendadasRows.length, rows: agendadasRows },
        compareceram: { count: compareceramRows.length, rows: compareceramRows },
        noShow: { count: noShowRows.length, rows: noShowRows },
        matriculas: { count: matriculasRows.length, rows: matriculasRows },
        matriculasDeExp: { count: deExpRows.length, rows: deExpRows },
        fechouNoDia: { count: noDiaRows.length, rows: noDiaRows },
        receita,
        ticket: valores.length ? receita / valores.length : 0,
      };
    };

    const atual = snapshot(range);
    const anterior = rangeAnterior ? snapshot(rangeAnterior) : null;
    const snapMes = snapshot(mes);

    /* alunos ativos e meta do mês */
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

    setD({
      atual,
      anterior,
      ativos: metaMes?.alunos_ativos ?? ativosReais,
      ativosReais,
      metaAtivos: metaMes?.meta_alunos_ativos ?? 0,
      ativosAnterior: metaAnt?.alunos_ativos ?? null,
      matriculasMes: snapMes.matriculas.count,
      ticketMes: snapMes.ticket,
      expSemana: aulas.filter((a) => inSemana(a.data)).length,
      expHoje: aulas.filter((a) => a.data === hj).length,
      expAmanha: aulas.filter((a) => a.data === amanha).length,
      semStatus: aulas.filter((a) => a.data < hj && a.compareceu === null).length,
      fuPendentes,
      fuMatriculados,
      fuGerente,
      confirmacoesHoje,
      anamneseRespondidas: anamneses.filter((a) => (a.created_at || "").slice(0, 10) === hj).length,
      anamnesePendentes: links.filter((l) => l.kind === "anamnesis" && !l.answered_at).length,
      fuEnviadosHoje,
      fuAgendados,
    });
    setLoading(false);
  }, [filterId, range, rangeAnterior, hoje]);

  useEffect(() => { load(); }, [load]);

  const salvarMetas = async (patch: Record<string, number>) => {
    const mes = monthRange(hoje);
    const { error } = await supabase
      .from("metas")
      .upsert(
        { unidade_id: filterId, mes_referencia: mes.from, ...patch } as any,
        { onConflict: "unidade_id,mes_referencia" },
      );
    if (error) { toast.error(error.message); return false; }
    load();
    return true;
  };

  const salvarAtivos = async () => {
    const val = Number(editAtivos);
    if (!Number.isFinite(val) || val < 0) { toast.error("Informe um número válido."); return; }
    if (await salvarMetas({ alunos_ativos: val })) {
      toast.success("Alunos ativos atualizado.");
      setEditAtivos(null);
    }
  };

  const salvarMetaAtivos = async () => {
    const val = Number(editMeta);
    if (!Number.isFinite(val) || val < 0) { toast.error("Informe um número válido."); return; }
    if (await salvarMetas({ meta_alunos_ativos: val })) {
      toast.success("Meta de alunos ativos salva.");
      setEditMeta(null);
    }
  };

  const a = d.atual;
  const p = d.anterior;
  const sufixo = SUFIXO[periodo];
  const prevOf = (fn: (s: Snap) => number) => (p ? fn(p) : null);

  const taxaLeadExp = pct(a.agendadas.count, a.leads.count);
  const taxaPresenca = pct(a.compareceram.count, a.agendadas.count);
  const taxaExpMat = pct(a.matriculasDeExp.count, a.compareceram.count);
  const conversaoGeral = pct(a.matriculas.count, a.leads.count);
  const taxaFechaNoDia = pct(a.fechouNoDia.count, a.compareceram.count);

  /* ---------- meta de alunos ativos ---------- */
  const metaAtivos = d.metaAtivos;
  const faltamAtivos = Math.max(metaAtivos - d.ativos, 0);
  const pctAtivos = pct(d.ativos, metaAtivos);
  const msgAtivos = metaAtivos === 0
    ? "Defina a meta de alunos ativos do mês para acompanhar o progresso."
    : d.ativos >= metaAtivos
      ? `Meta atingida com ${d.ativos - metaAtivos} aluno(s) acima do objetivo.`
      : pctAtivos >= 90
        ? `Muito perto: faltam ${faltamAtivos} aluno(s) para bater a meta.`
        : pctAtivos >= 70
          ? `No caminho: faltam ${faltamAtivos} aluno(s). Priorize conversão de experimentais e renovações.`
          : `Atenção: faltam ${faltamAtivos} aluno(s) para a meta. Reforce captação de leads e recuperação de inativos.`;

  /* ---------- diagnóstico automático ---------- */
  const diagnostico = useMemo(() => {
    if (loading) return null;
    if (a.leads.count === 0 && a.agendadas.count === 0 && a.matriculas.count === 0) return null;

    const etapas = [
      { nome: "captação → agendamento", perda: 100 - taxaLeadExp, taxa: taxaLeadExp, prioridade: "acelerar o primeiro contato e oferecer a aula experimental já no atendimento." },
      { nome: "agendamento → comparecimento", perda: 100 - taxaPresenca, taxa: taxaPresenca, prioridade: "reforçar confirmação pré-aula e recuperação de no-show." },
      { nome: "comparecimento → matrícula", perda: 100 - taxaExpMat, taxa: taxaExpMat, prioridade: "qualificar a apresentação de planos no dia da experimental." },
    ];
    const pior = [...etapas].sort((x, y) => y.perda - x.perda)[0];

    const indicadores = [
      { nome: "taxa de comparecimento", valor: taxaPresenca },
      { nome: "conversão da experimental", valor: taxaExpMat },
      { nome: "lead → experimental", valor: taxaLeadExp },
      { nome: "fechamento no dia", valor: taxaFechaNoDia },
    ];
    const piorIndicador = [...indicadores].sort((x, y) => x.valor - y.valor)[0];

    const evolucao = (() => {
      if (!p || !sufixo) return "Sem período anterior comparável.";
      const v = variation(a.matriculas.count, p.matriculas.count);
      if (!v) return "Sem período anterior comparável.";
      const dir = v.dir === "up" ? "crescimento" : v.dir === "down" ? "queda" : "estabilidade";
      return `Matrículas em ${dir} (${a.matriculas.count} vs ${p.matriculas.count}) ${sufixo}.`;
    })();

    return {
      perda: `A maior perda está entre ${pior.nome}: ${pior.perda}% dos casos não avançam (${pior.taxa}% de passagem).`,
      indicador: `Pior indicador do período: ${piorIndicador.nome}, em ${piorIndicador.valor}%.`,
      evolucao,
      prioridade: `Prioridade: ${pior.prioridade}`,
    };
  }, [loading, a, p, sufixo, taxaLeadExp, taxaPresenca, taxaExpMat, taxaFechaNoDia]);

  const funil = [
    { key: "leads", label: "Leads", bucket: a.leads, taxa: taxaLeadExp, taxaLabel: "seguem para agendamento", cor: STAGE.leads, prev: prevOf((s) => s.leads.count) },
    { key: "agendadas", label: "Experimentais agendadas", bucket: a.agendadas, taxa: taxaPresenca, taxaLabel: "comparecem", cor: STAGE.agendadas, prev: prevOf((s) => s.agendadas.count) },
    { key: "compareceram", label: "Compareceram", bucket: a.compareceram, taxa: taxaExpMat, taxaLabel: "viram matrícula", cor: STAGE.compareceram, prev: prevOf((s) => s.compareceram.count) },
    { key: "matriculas", label: "Matrículas", bucket: a.matriculas, taxa: null as number | null, taxaLabel: "", cor: STAGE.matriculas, prev: prevOf((s) => s.matriculas.count) },
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

  const abrir = (title: string, rows: Row[]) => setDetalhe({ title, rows });

  return (
    <div className="space-y-5">
      {/* período */}
      <div className="flex flex-wrap items-center gap-1.5">
        {PERIODOS.map((pp) => (
          <button
            key={pp.key}
            onClick={() => setPeriodo(pp.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-dm font-semibold ${
              periodo === pp.key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
            }`}
          >
            {pp.label}
          </button>
        ))}
      </div>

      {/* meta de alunos ativos */}
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-primary" />
            <h2 className="font-barlow font-bold text-lg">Meta de alunos ativos</h2>
          </div>
          {canEdit && editMeta === null && (
            <button onClick={() => setEditMeta(String(metaAtivos))} className="text-[11px] font-dm text-primary inline-flex items-center gap-1">
              <Pencil size={11} /> Editar meta
            </button>
          )}
        </div>

        {loading ? (
          <div className="animate-pulse mt-3 space-y-3">
            <div className="h-8 w-40 rounded bg-muted" />
            <div className="h-2.5 w-full rounded-full bg-muted" />
          </div>
        ) : (
          <>
            {editMeta !== null && (
              <div className="flex items-end gap-2 mt-3">
                <label className="text-[11px] font-dm text-muted-foreground">
                  Meta do mês
                  <Input
                    autoFocus
                    value={editMeta}
                    onChange={(e) => setEditMeta(e.target.value.replace(/\D/g, ""))}
                    className="h-9 mt-1 w-28 font-dm"
                  />
                </label>
                <Button size="sm" className="h-9" onClick={salvarMetaAtivos}>Salvar</Button>
                <Button size="sm" variant="ghost" className="h-9" onClick={() => setEditMeta(null)}>Cancelar</Button>
              </div>
            )}

            <div className="flex flex-wrap items-end justify-between gap-3 mt-3">
              <div>
                <p className="font-barlow font-bold text-3xl leading-none">
                  {metaAtivos > 0 ? `${faltamAtivos} ${faltamAtivos === 1 ? "aluno" : "alunos"} para a meta` : `${d.ativos} alunos ativos`}
                </p>
                <p className="text-sm font-dm text-muted-foreground mt-1">
                  {d.ativos} de {metaAtivos || "—"} • {metaAtivos > 0 ? `${pctAtivos}%` : "sem meta definida"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-dm text-muted-foreground uppercase tracking-wide">Percentual atingido</p>
                <p className={`font-barlow font-bold text-2xl ${d.ativos >= metaAtivos && metaAtivos > 0 ? "text-emerald-700" : "text-primary"}`}>
                  {metaAtivos > 0 ? `${pctAtivos}%` : "0%"}
                </p>
              </div>
            </div>

            <div className="h-2.5 rounded-full bg-muted mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${d.ativos >= metaAtivos && metaAtivos > 0 ? "bg-emerald-600" : "bg-primary"}`}
                style={{ width: `${Math.min(pctAtivos, 100)}%` }}
              />
            </div>
            <p className="text-xs font-dm text-muted-foreground mt-2">{msgAtivos}</p>
          </>
        )}
      </Card>

      {/* indicadores principais */}
      {loading ? (
        <Skeleton cards={6} />
      ) : (
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
              value={d.ativos}
              hint={`Contagem real: ${d.ativosReais}`}
              accent="blue"
              cur={d.ativos}
              prev={d.ativosAnterior}
              sufixo="em relação ao mês anterior"
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
          <MetricBox
            label="Total de leads" value={a.leads.count} hint="No período"
            cur={a.leads.count} prev={prevOf((s) => s.leads.count)} sufixo={sufixo}
            onClick={() => abrir("Leads do período", a.leads.rows)}
          />
          <MetricBox
            label="Experimentais agendadas" value={a.agendadas.count} hint="No período" accent="blue"
            cur={a.agendadas.count} prev={prevOf((s) => s.agendadas.count)} sufixo={sufixo}
            onClick={() => abrir("Experimentais agendadas", a.agendadas.rows)}
          />
          <MetricBox
            label="Compareceram" value={a.compareceram.count} hint="Compareceram à experimental" accent="green"
            cur={a.compareceram.count} prev={prevOf((s) => s.compareceram.count)} sufixo={sufixo}
            onClick={() => abrir("Compareceram à experimental", a.compareceram.rows)}
          />
          <MetricBox
            label="Matrículas" value={a.matriculas.count} hint="Período selecionado" accent="green"
            cur={a.matriculas.count} prev={prevOf((s) => s.matriculas.count)} sufixo={sufixo}
            onClick={() => abrir("Matrículas realizadas", a.matriculas.rows)}
          />
          <MetricBox
            label="Conversão geral" value={`${conversaoGeral}%`} hint="Leads → matrículas" accent="yellow"
            cur={conversaoGeral} prev={p ? pct(p.matriculas.count, p.leads.count) : null} sufixo={sufixo}
          />
        </div>
      )}

      {/* taxa lead → experimental + no-show + ticket */}
      {loading ? (
        <Skeleton cards={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricBox
            label="Lead → experimental" value={`${taxaLeadExp}%`}
            hint={`${a.agendadas.count} de ${a.leads.count} leads`} accent="blue"
            cur={taxaLeadExp} prev={p ? pct(p.agendadas.count, p.leads.count) : null} sufixo={sufixo}
            onClick={() => abrir("Experimentais agendadas", a.agendadas.rows)}
          />
          <MetricBox
            label="Taxa de fechamento no dia" value={`${taxaFechaNoDia}%`}
            hint={`${a.fechouNoDia.count} de ${a.compareceram.count} experimentais realizadas`} accent="green"
            cur={taxaFechaNoDia} prev={p ? pct(p.fechouNoDia.count, p.compareceram.count) : null} sufixo={sufixo}
            onClick={() => abrir("Matrículas fechadas no mesmo dia da experimental", a.fechouNoDia.rows)}
          />
          <MetricBox
            label="No-show" value={a.noShow.count} hint="Não compareceram no período" accent="red"
            cur={a.noShow.count} prev={prevOf((s) => s.noShow.count)} sufixo={sufixo}
            onClick={() => abrir("No-shows do período", a.noShow.rows)}
          />
          <MetricBox
            label="Ticket médio" value={brl(a.ticket)} hint={`${a.matriculas.count} matrículas no período`}
            cur={Math.round(a.ticket)} prev={p ? Math.round(p.ticket) : null} sufixo={sufixo}
          />
        </div>
      )}

      {/* taxas do funil */}
      <div>
        <h2 className="font-barlow font-bold text-lg mb-2">Taxas do funil</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse">
                <div className="h-3 w-2/3 rounded bg-muted" />
                <div className="h-7 w-1/3 rounded bg-muted mt-3" />
                <div className="h-2 w-full rounded bg-muted mt-3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <RateBox
              label="Lead vira experimental" value={taxaLeadExp}
              num={a.agendadas.count} den={a.leads.count}
              base="Experimentais agendadas ÷ total de leads"
              onClick={() => abrir("Experimentais agendadas", a.agendadas.rows)}
            />
            <RateBox
              label="Comparecimento" value={taxaPresenca}
              num={a.compareceram.count} den={a.agendadas.count}
              base="Compareceram ÷ experimentais agendadas"
              onClick={() => abrir("Compareceram à experimental", a.compareceram.rows)}
            />
            <RateBox
              label="Experimental vira matrícula" value={taxaExpMat}
              num={a.matriculasDeExp.count} den={a.compareceram.count}
              base="Matrículas de experimentais realizadas ÷ compareceram"
              onClick={() => abrir("Matrículas originadas de experimentais", a.matriculasDeExp.rows)}
            />
          </div>
        )}
      </div>

      {/* funil comercial visual */}
      <Card className="p-4">
        <h2 className="font-barlow font-bold text-lg mb-3">Funil comercial</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border p-4 animate-pulse">
                <div className="h-3 w-2/3 rounded bg-muted" />
                <div className="h-7 w-1/2 rounded bg-muted mt-3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-stretch gap-2 md:gap-1">
            {funil.map((f, i) => (
              <div key={f.key} className="flex flex-col md:flex-row md:items-center md:flex-1 gap-2 md:gap-1">
                <button
                  onClick={() => abrir(f.label, f.bucket.rows)}
                  className={`flex-1 text-left rounded-xl border p-4 transition hover:shadow-sm ${f.cor.bg} ${f.cor.border}`}
                >
                  <p className="text-xs font-dm text-muted-foreground uppercase tracking-wide">{f.label}</p>
                  <p className={`font-barlow font-bold text-2xl ${f.cor.text}`}>{f.bucket.count}</p>
                  {f.taxa != null && (
                    <p className="text-[11px] font-dm text-muted-foreground mt-0.5">
                      {f.taxa}% {f.taxaLabel}
                    </p>
                  )}
                  <Delta cur={f.bucket.count} prev={f.prev} sufixo={sufixo} />
                </button>
                {i < funil.length - 1 && (
                  <ChevronRight size={16} className="text-muted-foreground self-center rotate-90 md:rotate-0 shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-sm font-dm">
          <p className="rounded-lg bg-muted/50 p-3">
            <strong>Conversão geral: {conversaoGeral}%</strong>
            <span className="block text-xs text-muted-foreground">{a.leads.count} leads → {a.matriculas.count} matrículas</span>
          </p>
          <p className="rounded-lg bg-muted/50 p-3">
            <strong>Fechamento no dia da experimental: {taxaFechaNoDia}%</strong>
            <span className="block text-xs text-muted-foreground">{a.fechouNoDia.count} de {a.compareceram.count} experimentais realizadas</span>
          </p>
          <p className="rounded-lg bg-muted/50 p-3">
            <strong>Ticket médio do mês: {brl(d.ticketMes)}</strong>
            <span className="block text-xs text-muted-foreground">{d.matriculasMes} matrículas fechadas no mês</span>
          </p>
        </div>
      </Card>

      {/* diagnóstico do período */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4 md:col-span-2">
          <h2 className="font-barlow font-bold text-lg flex items-center gap-2">
            <Stethoscope size={16} className="text-primary" /> Diagnóstico do período
          </h2>
          {loading ? (
            <div className="animate-pulse space-y-2 mt-3">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-4/5 rounded bg-muted" />
              <div className="h-3 w-3/5 rounded bg-muted" />
            </div>
          ) : !diagnostico ? (
            <p className="text-sm font-dm text-muted-foreground mt-1">
              Sem dados suficientes no período e na unidade selecionados para gerar o diagnóstico.
            </p>
          ) : (
            <ul className="text-sm font-dm text-muted-foreground mt-2 space-y-1.5">
              <li>{diagnostico.perda}</li>
              <li>{diagnostico.indicador}</li>
              <li>{diagnostico.evolucao}</li>
              <li className="text-foreground font-semibold">{diagnostico.prioridade}</li>
            </ul>
          )}
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
        {loading ? <Skeleton cards={6} /> : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <MetricBox label="Follow ups pendentes" value={d.fuPendentes} hint="aguardando" accent="yellow" />
            <MetricBox label="FU matriculados" value={d.fuMatriculados} hint="aguardando contato" accent="blue" />
            <MetricBox label="FU gerente" value={d.fuGerente} hint="aguardando contato" accent="red" />
            <MetricBox
              label="Não compareceram" value={a.noShow.count} hint="No período" accent="red"
              onClick={() => abrir("No-shows do período", a.noShow.rows)}
            />
            <MetricBox label="Experimentais da semana" value={d.expSemana} hint="Esta semana" />
            <MetricBox
              label="Taxa de comparecimento" value={`${taxaPresenca}%`}
              hint={`${a.compareceram.count} de ${a.agendadas.count}`} accent="green"
              onClick={() => abrir("Compareceram à experimental", a.compareceram.rows)}
            />
          </div>
        )}
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
                {atividades.map((at) => (
                  <MetricBox key={at.label} {...at} value={loading ? "…" : at.value} />
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
            <MetricBox label="Leads no período" value={loading ? "…" : a.leads.count} onClick={() => abrir("Leads do período", a.leads.rows)} />
            <MetricBox label="Experimentais agendadas" value={loading ? "…" : a.agendadas.count} accent="blue" onClick={() => abrir("Experimentais agendadas", a.agendadas.rows)} />
            <MetricBox label="Compareceram" value={loading ? "…" : a.compareceram.count} accent="green" onClick={() => abrir("Compareceram à experimental", a.compareceram.rows)} />
            <MetricBox label="Não compareceram" value={loading ? "…" : a.noShow.count} accent="red" onClick={() => abrir("No-shows do período", a.noShow.rows)} />
            <MetricBox label="Matrículas" value={loading ? "…" : a.matriculas.count} accent="green" onClick={() => abrir("Matrículas realizadas", a.matriculas.rows)} />
            <MetricBox label="Matrículas via experimental" value={loading ? "…" : a.matriculasDeExp.count} onClick={() => abrir("Matrículas originadas de experimentais", a.matriculasDeExp.rows)} />
            <MetricBox label="Fechamento no dia" value={loading ? "…" : a.fechouNoDia.count} onClick={() => abrir("Matrículas fechadas no mesmo dia da experimental", a.fechouNoDia.rows)} />
            <MetricBox label="Conversão geral" value={loading ? "…" : `${conversaoGeral}%`} accent="yellow" />
          </div>
        )}
      </Card>

      {/* detalhamento dos indicadores */}
      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-barlow">
              {detalhe?.title} {detalhe ? `— ${detalhe.rows.length}` : ""}
            </DialogTitle>
          </DialogHeader>
          {!detalhe?.rows.length ? (
            <p className="text-sm font-dm text-muted-foreground py-6 text-center">
              Nenhum registro compõe este indicador no período e na unidade selecionados.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-sm font-dm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">Nome</th>
                    <th className="py-2 pr-3">Responsável</th>
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Etapa</th>
                    <th className="py-2">Ação recomendada</th>
                  </tr>
                </thead>
                <tbody>
                  {detalhe.rows.map((r, i) => (
                    <tr key={`${r.id}-${i}`} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 font-semibold">{r.nome}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{r.responsavel}</td>
                      <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{r.data}</td>
                      <td className="py-2 pr-3 capitalize text-muted-foreground">{String(r.etapa).replace(/_/g, " ")}</td>
                      <td className="py-2 text-muted-foreground">{r.acao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
