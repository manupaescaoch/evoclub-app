import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Range, inRange, isPaid, isValidLead, pct, previousRange, safeDiv, monthInfo,
} from "@/lib/comercial";

export type Lead = {
  id: string;
  nome: string;
  telefone: string | null;
  unidade_id: string;
  origem: string | null;
  plataforma: string | null;
  campanha: string | null;
  conjunto: string | null;
  anuncio: string | null;
  criativo: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  primeiro_canal: string | null;
  status_funil: string;
  qualidade: string | null;
  duplicado: boolean | null;
  motivo_desqualificacao: string | null;
  responsavel_id: string | null;
  atendido_por: string | null;
  primeiro_contato_at: string | null;
  primeira_resposta_at: string | null;
  data_aula_experimental: string | null;
  matricula_client_id: number | null;
  created_at: string;
};

export type Interacao = {
  id: string;
  lead_id: string;
  unidade_id: string;
  agendou_experimental: boolean;
  data_experimental: string | null;
  hora_experimental: string | null;
  compareceu: boolean | null;
  fechou_matricula: boolean;
  data_fechamento: string | null;
  valor_plano: number | null;
  plano_escolhido: string | null;
  atendido_por: string | null;
  quem_agendou: string | null;
  status_confirmacao: string | null;
  reagendada: boolean | null;
  responsavel_presencial: string | null;
  motivo_nao_fechamento: string | null;
  created_at: string;
};

export type AdRow = {
  id: string;
  unit_id: string | null;
  date: string;
  platform: string;
  ad_account: string | null;
  campaign: string | null;
  adset: string | null;
  ad: string | null;
  status: string | null;
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  conversations: number;
};

export type Enrollment = {
  id: string;
  client_id: number;
  unit_id: string | null;
  trial_booking_id: string | null;
  seller_id: string | null;
  first_monthly_value: number | null;
  enrollment_date: string;
};

export type ContactLog = {
  id: string;
  unit_id: string | null;
  lead_id: string | null;
  channel: string | null;
  result: string | null;
  owner_id: string | null;
  next_follow_up_at: string | null;
  created_at: string;
};

export type Collab = { id: string; full_name: string; unit_id: string | null; role_title: string | null };

export type ClientRow = {
  id: number;
  name: string;
  unit_id: string | null;
  plan: string | null;
  plan_value: number | null;
  created_at: string;
  contract_start: string | null;
};

export type Filters = {
  unitId: string | null;
  range: Range;
  origem: string;
  plataforma: string;
  campanha: string;
  responsavel: string;
};

export type Snapshot = {
  conversas: number;
  leads: number;
  leadsValidos: number;
  leadsQualificados: number;
  agendadas: number;
  realizadas: number;
  noShows: number;
  confirmadas: number;
  reagendadas: number;
  matriculas: number;
  matriculasDeExperimental: number;
  matriculasMesmoDia: number;
  matriculasTrafego: number;
  receitaContratada: number;
  receitaAtribuida: number;
  ticket: number;
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  adConversations: number;
};

const empty: Snapshot = {
  conversas: 0, leads: 0, leadsValidos: 0, leadsQualificados: 0, agendadas: 0, realizadas: 0,
  noShows: 0, confirmadas: 0, reagendadas: 0, matriculas: 0, matriculasDeExperimental: 0,
  matriculasMesmoDia: 0, matriculasTrafego: 0, receitaContratada: 0, receitaAtribuida: 0,
  ticket: 0, spend: 0, reach: 0, impressions: 0, clicks: 0, adConversations: 0,
};

export type Raw = {
  leads: Lead[];
  interacoes: Interacao[];
  ads: AdRow[];
  enrollments: Enrollment[];
  logs: ContactLog[];
  clients: ClientRow[];
  collabs: Collab[];
  metas: any[];
  activeClients: number;
};

const emptyRaw: Raw = {
  leads: [], interacoes: [], ads: [], enrollments: [], logs: [], clients: [], collabs: [], metas: [], activeClients: 0,
};

/** matrícula = registro de conversão; quando a unidade ainda não usa conversões, cai para a interação fechada */
export const enrollmentValue = (e: Enrollment, clients: ClientRow[]) =>
  Number(e.first_monthly_value) || Number(clients.find((c) => c.id === e.client_id)?.plan_value) || 0;

export function useComercial(filters: Filters) {
  const [raw, setRaw] = useState<Raw>(emptyRaw);
  const [loading, setLoading] = useState(true);

  const prev = useMemo(() => previousRange(filters.range), [filters.range]);
  const fetchFrom = prev.from;
  const fetchTo = filters.range.to;

  const load = useCallback(async () => {
    setLoading(true);
    const uid = filters.unitId;
    const fromTs = `${fetchFrom}T00:00:00`;
    const toTs = `${fetchTo}T23:59:59`;
    const { ref } = monthInfo();

    const q = <T,>(p: any) => p as Promise<{ data: T[] | null }>;

    let leadsQ = supabase.from("leads").select("*").gte("created_at", fromTs).lte("created_at", toTs);
    let interQ = supabase.from("interacoes").select("*").gte("created_at", `${fetchFrom}T00:00:00`);
    let adsQ = supabase.from("ad_metrics" as any).select("*").gte("date", fetchFrom).lte("date", fetchTo);
    let enrollQ = supabase.from("enrollment_conversions").select("*").gte("enrollment_date", fetchFrom).lte("enrollment_date", fetchTo);
    let logsQ = supabase.from("contact_logs").select("*").gte("created_at", fromTs);
    let clientsQ = supabase.from("clients").select("id,name,unit_id,plan,plan_value,created_at,contract_start");
    let metasQ = supabase.from("metas").select("*").eq("mes_referencia", ref);

    if (uid) {
      leadsQ = leadsQ.eq("unidade_id", uid);
      interQ = interQ.eq("unidade_id", uid);
      adsQ = adsQ.eq("unit_id", uid);
      enrollQ = enrollQ.eq("unit_id", uid);
      logsQ = logsQ.eq("unit_id", uid);
      clientsQ = clientsQ.eq("unit_id", uid);
      metasQ = metasQ.eq("unidade_id", uid);
    }

    const [leads, interacoes, ads, enrollments, logs, clients, collabs, metas] = await Promise.all([
      q<Lead>(leadsQ),
      q<Interacao>(interQ),
      q<AdRow>(adsQ),
      q<Enrollment>(enrollQ),
      q<ContactLog>(logsQ),
      q<ClientRow>(clientsQ),
      q<Collab>(supabase.from("collaborators").select("id,full_name,unit_id,role_title").eq("status", "active").order("full_name")),
      q<any>(metasQ),
    ]);

    const cl = clients.data || [];
    setRaw({
      leads: leads.data || [],
      interacoes: interacoes.data || [],
      ads: (ads.data as AdRow[]) || [],
      enrollments: enrollments.data || [],
      logs: logs.data || [],
      clients: cl,
      collabs: collabs.data || [],
      metas: metas.data || [],
      activeClients: cl.length,
    });
    setLoading(false);
  }, [filters.unitId, fetchFrom, fetchTo]);

  useEffect(() => { load(); }, [load]);

  /* ---------- filtros secundários (origem, plataforma, campanha, responsável) ---------- */

  const collabName = useCallback(
    (id?: string | null) => raw.collabs.find((c) => c.id === id)?.full_name ?? null,
    [raw.collabs],
  );

  const leadMatch = useCallback((l: Lead) => {
    if (filters.origem && (l.origem || "Outros") !== filters.origem) return false;
    if (filters.plataforma && (l.plataforma || "") !== filters.plataforma) return false;
    if (filters.campanha && (l.campanha || "") !== filters.campanha) return false;
    if (filters.responsavel) {
      const nome = collabName(l.responsavel_id) || l.atendido_por || "";
      if (l.responsavel_id !== filters.responsavel && nome !== collabName(filters.responsavel)) return false;
    }
    return true;
  }, [filters.origem, filters.plataforma, filters.campanha, filters.responsavel, collabName]);

  const leads = useMemo(() => raw.leads.filter(leadMatch), [raw.leads, leadMatch]);
  const leadIds = useMemo(() => new Set(leads.map((l) => l.id)), [leads]);
  const interacoes = useMemo(
    () => raw.interacoes.filter((i) => (leadIds.size ? leadIds.has(i.lead_id) : !filters.origem && !filters.plataforma && !filters.campanha && !filters.responsavel)),
    [raw.interacoes, leadIds, filters],
  );
  const ads = useMemo(() => raw.ads.filter((a) => {
    if (filters.plataforma && a.platform.toLowerCase() !== filters.plataforma.toLowerCase().replace(" ads", "")
      && a.platform !== filters.plataforma) return false;
    if (filters.campanha && (a.campaign || "") !== filters.campanha) return false;
    return true;
  }), [raw.ads, filters.plataforma, filters.campanha]);

  const leadById = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);

  /* ---------- agregação de um período ---------- */

  const snapshot = useCallback((r: Range): Snapshot => {
    const s = { ...empty };
    const periodLeads = leads.filter((l) => inRange(l.primeiro_contato_at || l.created_at, r));
    s.leads = periodLeads.length;
    s.leadsValidos = periodLeads.filter((l) => isValidLead(l.qualidade, l.duplicado)).length;
    s.leadsQualificados = periodLeads.filter((l) => l.qualidade === "qualificado").length;

    const adRows = ads.filter((a) => inRange(a.date, r));
    adRows.forEach((a) => {
      s.spend += Number(a.spend) || 0;
      s.reach += a.reach || 0;
      s.impressions += a.impressions || 0;
      s.clicks += a.clicks || 0;
      s.adConversations += a.conversations || 0;
    });
    // conversas = conversas do tráfego + primeiro contato de leads não pagos
    s.conversas = s.adConversations + periodLeads.filter((l) => !isPaid(l.plataforma) && !isPaid(l.origem)).length;

    const exps = interacoes.filter((i) => i.agendou_experimental && inRange(i.data_experimental, r));
    s.agendadas = exps.length;
    s.realizadas = exps.filter((i) => i.compareceu === true).length;
    s.noShows = exps.filter((i) => i.compareceu === false).length;
    s.confirmadas = exps.filter((i) => i.status_confirmacao === "confirmada" || i.compareceu === true).length;
    s.reagendadas = exps.filter((i) => i.reagendada).length;

    // matrículas: conversões registradas + interações fechadas sem conversão vinculada
    const ecs = raw.enrollments.filter((e) => inRange(e.enrollment_date, r));
    const ecClients = new Set(ecs.map((e) => e.client_id));
    const fechadas = interacoes.filter((i) => i.fechou_matricula && inRange(i.data_fechamento || i.created_at, r));
    const fechadasSemEc = fechadas.filter((i) => {
      const l = leadById.get(i.lead_id);
      return !(l?.matricula_client_id && ecClients.has(l.matricula_client_id));
    });

    const filtroSecundario = !!(filters.origem || filters.plataforma || filters.campanha || filters.responsavel);
    const ecsVisiveis = filtroSecundario
      ? ecs.filter((e) => leads.some((l) => l.matricula_client_id === e.client_id))
      : ecs;

    s.matriculas = ecsVisiveis.length + fechadasSemEc.length;
    s.receitaContratada =
      ecsVisiveis.reduce((a, e) => a + enrollmentValue(e, raw.clients), 0) +
      fechadasSemEc.reduce((a, i) => a + (Number(i.valor_plano) || 0), 0);
    s.ticket = safeDiv(s.receitaContratada, s.matriculas);

    s.matriculasDeExperimental =
      ecsVisiveis.filter((e) => !!e.trial_booking_id).length +
      fechadasSemEc.filter((i) => i.compareceu === true).length;
    s.matriculasMesmoDia = fechadasSemEc.filter(
      (i) => i.compareceu === true && i.data_fechamento && i.data_experimental === i.data_fechamento,
    ).length;

    const pagos = leads.filter((l) => isPaid(l.plataforma) || isPaid(l.origem));
    const pagoIds = new Set(pagos.map((l) => l.id));
    const pagoClients = new Set(pagos.map((l) => l.matricula_client_id).filter(Boolean) as number[]);
    s.matriculasTrafego =
      ecsVisiveis.filter((e) => pagoClients.has(e.client_id)).length +
      fechadasSemEc.filter((i) => pagoIds.has(i.lead_id)).length;
    s.receitaAtribuida =
      ecsVisiveis.filter((e) => pagoClients.has(e.client_id)).reduce((a, e) => a + enrollmentValue(e, raw.clients), 0) +
      fechadasSemEc.filter((i) => pagoIds.has(i.lead_id)).reduce((a, i) => a + (Number(i.valor_plano) || 0), 0);

    return s;
  }, [leads, leadById, interacoes, ads, raw.enrollments, raw.clients, filters]);

  const cur = useMemo(() => snapshot(filters.range), [snapshot, filters.range]);
  const before = useMemo(() => snapshot(prev), [snapshot, prev]);

  const taxas = useMemo(() => ({
    conversaLead: pct(cur.leads, cur.conversas),
    leadExperimental: pct(cur.agendadas, cur.leadsValidos),
    comparecimento: pct(cur.realizadas, cur.agendadas),
    experimentalMatricula: pct(cur.matriculasDeExperimental, cur.realizadas),
    geral: pct(cur.matriculas, cur.leadsValidos),
    confirmacao: pct(cur.confirmadas, cur.agendadas),
    fechamentoDia: pct(cur.matriculasMesmoDia, cur.realizadas),
    recuperacao: pct(cur.reagendadas, cur.noShows),
    aproveitamento: pct(cur.leads, cur.conversas),
  }), [cur]);

  const trafego = useMemo(() => ({
    ctr: pct(cur.clicks, cur.impressions),
    cpc: safeDiv(cur.spend, cur.clicks),
    frequencia: safeDiv(cur.impressions, cur.reach),
    custoConversa: safeDiv(cur.spend, cur.adConversations),
    cpl: safeDiv(cur.spend, cur.leadsValidos),
    custoExperimental: safeDiv(cur.spend, cur.agendadas),
    cac: safeDiv(cur.spend, cur.matriculasTrafego),
    roas: safeDiv(cur.receitaAtribuida, cur.spend),
  }), [cur]);

  return {
    loading, reload: load, raw, leads, interacoes, ads, cur, before, prev, taxas, trafego, collabName,
  };
}
