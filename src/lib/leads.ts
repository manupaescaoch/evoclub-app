// Utilitários do módulo de Leads (EVO Club) — pt-BR, fuso de Brasília (UTC-3)

export const BR_OFFSET = "-03:00";

export const STATUS_FUNIL = [
  "novo",
  "contato_inicial",
  "aula_agendada",
  "aula_realizada",
  "follow_up",
  "negociacao",
  "convertido",
  "perdido",
] as const;
export type StatusFunil = (typeof STATUS_FUNIL)[number];

export const STATUS_LABEL: Record<StatusFunil, string> = {
  novo: "Novo",
  contato_inicial: "Contato Inicial",
  aula_agendada: "Experimental Agendada",
  aula_realizada: "Experimental Realizada",
  follow_up: "Follow Up",
  negociacao: "Negociação",
  convertido: "Convertido",
  perdido: "Perdido",
};

export const STATUS_BADGE: Record<StatusFunil, string> = {
  novo: "bg-muted text-muted-foreground",
  contato_inicial: "bg-muted text-muted-foreground",
  aula_agendada: "bg-sky-100 text-sky-700",
  aula_realizada: "bg-violet-100 text-violet-700",
  follow_up: "bg-amber-100 text-amber-700",
  negociacao: "bg-amber-100 text-amber-700",
  convertido: "bg-emerald-100 text-emerald-700",
  perdido: "bg-red-100 text-red-700",
};

export const EM_NEGOCIACAO: StatusFunil[] = ["aula_agendada", "aula_realizada", "negociacao", "follow_up"];

export const NIVEIS = ["alto", "medio", "baixo"] as const;
export type Nivel = (typeof NIVEIS)[number];
export const NIVEL_LABEL: Record<Nivel, string> = { alto: "Alto", medio: "Médio", baixo: "Baixo" };
export const NIVEL_BADGE: Record<Nivel, string> = {
  alto: "bg-emerald-100 text-emerald-700",
  medio: "bg-amber-100 text-amber-700",
  baixo: "bg-muted text-muted-foreground",
};

export const TAXA_LABEL: Record<string, string> = { pendente: "Taxa pendente", pago: "Taxa paga", isento: "Isento" };
export const TAXA_BADGE: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-700",
  pago: "bg-emerald-100 text-emerald-700",
  isento: "bg-muted text-muted-foreground",
};

export const ORIGENS = [
  "WhatsApp",
  "Instagram",
  "Tráfego Pago",
  "Indicação",
  "Visita Presencial",
  "Embaixador / Parceria",
] as const;

/** Telefone: mantém apenas dígitos. */
export const onlyDigits = (v?: string | null) => (v || "").replace(/\D/g, "");

export const formatPhone = (v?: string | null) => {
  const d = onlyDigits(v);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v || "—";
};

export const waLink = (v?: string | null) => {
  const d = onlyDigits(v);
  if (!d) return null;
  return `https://wa.me/${d.length > 11 ? d : `55${d}`}`;
};

const strip = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Padroniza a origem agrupando variações de grafia, acento e caixa. */
export function normalizeOrigem(raw?: string | null): string {
  const s = strip(raw || "");
  if (!s) return "Não informado";
  if (/(whats|wpp|zap)/.test(s)) return "WhatsApp";
  if (/(insta|ig|direct)/.test(s)) return "Instagram";
  if (/(trafego|trafego pago|ads|meta ads|google ads|anuncio|pago)/.test(s)) return "Tráfego Pago";
  if (/(indica|amigo|aluno indicou)/.test(s)) return "Indicação";
  if (/(visita|presencial|porta|passante|balcao|recepcao)/.test(s)) return "Visita Presencial";
  if (/(embaixador|parceria|parceiro|convenio)/.test(s)) return "Embaixador / Parceria";
  if (/(site|landing|formulario|form)/.test(s)) return "Site";
  return (raw || "").trim().replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const APELIDOS: Record<string, string> = {
  manu: "MANUEL PAES",
  manuel: "MANUEL PAES",
  emanuel: "MANUEL PAES",
  bia: "BEATRIZ SILVA",
  ju: "JULIANA SANTOS",
  recepcao: "RECEPÇÃO",
  comercial: "COMERCIAL",
  sistema: "SISTEMA",
};

/** Padroniza o cadastrador: apelidos viram nome completo em caixa alta. */
export function normalizeCadastrador(raw?: string | null): string {
  const s = strip(raw || "");
  if (!s) return "NÃO INFORMADO";
  if (APELIDOS[s]) return APELIDOS[s];
  const first = s.split(" ")[0];
  if (APELIDOS[first] && s.split(" ").length === 1) return APELIDOS[first];
  return (raw || "").trim().replace(/\s+/g, " ").toUpperCase();
}

/** Nível de interesse calculado por score quando não foi informado manualmente. */
export function interesseScore(lead: {
  status_funil: string;
  data_aula_experimental?: string | null;
  status_taxa_experimental?: string | null;
  nivel_interesse?: string | null;
}): Nivel {
  if (lead.nivel_interesse) return lead.nivel_interesse as Nivel;
  let score = 0;
  if (lead.status_funil === "convertido") score += 5;
  if (["negociacao", "aula_realizada"].includes(lead.status_funil)) score += 3;
  if (["aula_agendada", "follow_up"].includes(lead.status_funil)) score += 2;
  if (lead.data_aula_experimental) score += 1;
  if (lead.status_taxa_experimental === "pago") score += 2;
  if (lead.status_funil === "perdido") score -= 5;
  if (score >= 4) return "alto";
  if (score >= 2) return "medio";
  return "baixo";
}

// ---------- Período ----------
export type PeriodKey =
  | "all" | "7" | "15" | "30" | "60" | "90" | "mes_atual" | "mes_passado" | "custom";

export const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "all", label: "Todo período" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "15", label: "Últimos 15 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "60", label: "Últimos 60 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "mes_atual", label: "Mês atual" },
  { value: "mes_passado", label: "Mês passado" },
  { value: "custom", label: "Personalizado" },
];

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Data "de hoje" no fuso de Brasília. */
export const brNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

/** Converte data (+hora opcional) para timestamptz com offset -03:00 explícito. */
export const brTimestamp = (date: string, time?: string | null) =>
  `${date}T${(time || "00:00").slice(0, 5)}:00${BR_OFFSET}`;

export function periodRange(
  key: PeriodKey,
  custom?: { from?: string; to?: string }
): { from: string | null; to: string | null } {
  const today = brNow();
  if (key === "all") return { from: null, to: null };
  if (key === "custom") return { from: custom?.from || null, to: custom?.to || null };
  if (key === "mes_atual") {
    return {
      from: isoDay(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: isoDay(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    };
  }
  if (key === "mes_passado") {
    return {
      from: isoDay(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: isoDay(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
  }
  const days = Number(key);
  const start = new Date(today);
  start.setDate(today.getDate() - (days - 1));
  return { from: isoDay(start), to: isoDay(today) };
}

export function periodLabel(key: PeriodKey, custom?: { from?: string; to?: string }) {
  if (key === "custom" && custom?.from && custom?.to) return `${fmtDate(custom.from)} a ${fmtDate(custom.to)}`;
  return PERIOD_OPTIONS.find((p) => p.value === key)?.label || "Todo período";
}

export const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const d = v.length <= 10 ? new Date(`${v}T12:00:00`) : new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: v.length <= 10 ? undefined : "America/Sao_Paulo" });
};

export const fmtTime = (v?: string | null) => (v ? v.slice(0, 5) : "—");
