// Utilitários e taxonomia da página Comercial.
// Regra geral: divisão por zero devolve 0 e a UI mostra "Sem dados".

export const safeDiv = (num: number, den: number) => (den ? num / den : 0);
export const pct = (num: number, den: number) => (den ? (num / den) * 100 : 0);

export const fmtInt = (v: number) => new Intl.NumberFormat("pt-BR").format(Math.round(v || 0));
export const fmtMoney = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(v || 0);
export const fmtMoney0 = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
export const fmtPct1 = (v: number) => `${(v || 0).toFixed(1).replace(".", ",")}%`;
export const fmtDec = (v: number, d = 2) => (v || 0).toFixed(d).replace(".", ",");
/** métrica sem base de cálculo no período */
export const orDash = (den: number, render: () => string) => (den ? render() : "Sem dados");

export const variation = (cur: number, prev: number) => {
  if (!prev) return cur ? 100 : 0;
  return ((cur - prev) / Math.abs(prev)) * 100;
};

export const ORIGENS = [
  "Meta Ads",
  "Google Ads",
  "Instagram orgânico",
  "Google orgânico",
  "Site",
  "WhatsApp direto",
  "Indicação",
  "Embaixadores",
  "Eventos",
  "Passante",
  "Reativação",
  "Outros",
] as const;

export const PLATAFORMAS = ["Meta Ads", "Google Ads", "Orgânico", "Direto", "Offline"] as const;

/** origens consideradas mídia paga para CPL, CAC e ROAS */
export const PAID_RE = /meta|facebook|instagram ads|google ads|ads|tr[aá]fego|pago/i;
export const isPaid = (v?: string | null) => !!v && PAID_RE.test(v);

export const QUALIDADES = [
  { value: "valido", label: "Lead válido", valid: true },
  { value: "qualificado", label: "Lead qualificado", valid: true },
  { value: "duplicado", label: "Duplicado", valid: false },
  { value: "numero_invalido", label: "Número inválido", valid: false },
  { value: "sem_resposta", label: "Sem resposta", valid: false },
  { value: "fora_regiao", label: "Fora da região", valid: false },
  { value: "gympass", label: "Busca Gympass ou TotalPass", valid: false },
  { value: "sem_capacidade", label: "Sem capacidade financeira", valid: false },
  { value: "sem_interesse", label: "Sem interesse", valid: false },
  { value: "outro", label: "Outro motivo", valid: false },
] as const;

export const qualidadeLabel = (v?: string | null) =>
  QUALIDADES.find((q) => q.value === (v || "valido"))?.label ?? "Lead válido";
export const isValidLead = (qualidade?: string | null, duplicado?: boolean | null) =>
  !duplicado && (QUALIDADES.find((q) => q.value === (qualidade || "valido"))?.valid ?? true);

/* ---------- datas (fuso de Brasília) ---------- */

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const brToday = () => {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export type Range = { from: string; to: string };

export type PeriodKey =
  | "hoje" | "ontem" | "semana" | "mes" | "d7" | "d30" | "custom";

export const PERIOD_LABEL: Record<PeriodKey, string> = {
  hoje: "Hoje",
  ontem: "Ontem",
  semana: "Semana atual",
  mes: "Mês atual",
  d7: "Últimos 7 dias",
  d30: "Últimos 30 dias",
  custom: "Personalizado",
};

export const periodRange = (key: PeriodKey, custom?: Range): Range => {
  const t = brToday();
  switch (key) {
    case "hoje":
      return { from: iso(t), to: iso(t) };
    case "ontem": {
      const y = addDays(t, -1);
      return { from: iso(y), to: iso(y) };
    }
    case "semana": {
      const start = addDays(t, -((t.getDay() + 6) % 7)); // segunda
      return { from: iso(start), to: iso(t) };
    }
    case "d7":
      return { from: iso(addDays(t, -6)), to: iso(t) };
    case "d30":
      return { from: iso(addDays(t, -29)), to: iso(t) };
    case "custom":
      return custom && custom.from && custom.to ? custom : { from: iso(t), to: iso(t) };
    case "mes":
    default:
      return { from: iso(new Date(t.getFullYear(), t.getMonth(), 1)), to: iso(t) };
  }
};

/** período imediatamente anterior, do mesmo tamanho */
export const previousRange = ({ from, to }: Range): Range => {
  const a = new Date(`${from}T12:00:00`);
  const b = new Date(`${to}T12:00:00`);
  const days = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
  return { from: iso(addDays(a, -days)), to: iso(addDays(b, -days)) };
};

export const inRange = (value: string | null | undefined, r: Range) => {
  if (!value) return false;
  const d = value.slice(0, 10);
  return d >= r.from && d <= r.to;
};

export const monthInfo = () => {
  const t = brToday();
  const total = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  const elapsed = t.getDate();
  return { total, elapsed, remaining: total - elapsed, ref: iso(new Date(t.getFullYear(), t.getMonth(), 1)) };
};

export const waLink = (phone?: string | null) => {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return null;
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}`;
};

/** cores fixas por etapa do funil — as mesmas em todos os gráficos da página */
export const STAGE_COLOR: Record<string, string> = {
  conversas: "hsl(var(--primary) / 0.35)",
  leads: "hsl(var(--primary) / 0.55)",
  agendadas: "hsl(var(--primary) / 0.7)",
  comparecimentos: "hsl(var(--primary) / 0.85)",
  matriculas: "hsl(var(--primary))",
};
