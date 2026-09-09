export const fmtBRL = (v: number) =>
  `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtBRLShort = (v: number) =>
  `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const monthName = (m: number) =>
  ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][m] || "";

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const monthRange = (year: number, month: number) => {
  const start = new Date(year, month, 1).toISOString().slice(0, 10);
  const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  return { start, end };
};

export const yearRange = (year: number) => ({
  start: `${year}-01-01`,
  end: `${year}-12-31`,
});

export const monthFull = (m: number) =>
  ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][m] || "";

/** percentual formatado; divisão por zero sempre volta 0% */
export const fmtPct = (v: number) =>
  `${(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

/** divisão protegida — sem dado, devolve 0 */
export const safePct = (num: number, den: number) => (den ? (num / den) * 100 : 0);

/** variação percentual entre dois períodos equivalentes */
export const variation = (current: number, previous: number) => {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
};

/** rótulo de variação já pronto para exibição */
export const fmtVar = (v: number) =>
  `${v > 0 ? "↑" : v < 0 ? "↓" : ""} ${Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`.trim();

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  overdue: "Atrasado",
  cancelled: "Cancelado",
  scheduled: "Agendado",
  draft: "Rascunho",
  validated: "Validada",
  approved: "Aprovada",
};

export const PRIORITY_LABEL: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};