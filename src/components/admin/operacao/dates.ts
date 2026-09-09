/** Datas sempre no fuso de Brasília. */
export const brNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
const pad = (n: number) => String(n).padStart(2, "0");
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return isoDay(d);
};
export const weekOf = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  const start = new Date(d);
  start.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return { from: isoDay(start), to: addDays(isoDay(start), 6) };
};
export const diffDays = (a: string, b: string) =>
  Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000);
export const fmtDate = (v?: string | null) =>
  v ? new Date(`${v.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";
export const fmtDateTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "—";
export const fmtTime = (v?: string | null) => (v ? v.slice(0, 5) : null);
