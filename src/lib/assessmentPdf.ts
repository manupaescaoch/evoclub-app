const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const fmt = (iso?: string | null) =>
  iso ? new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("pt-BR") : "—";

export type AssessmentPrintField = { label: string; unit?: string };

export type AssessmentPrintData = {
  studentName: string;
  performedAt: string | null;
  professional: string | null;
  status: string | null;
  notes: string | null;
  origin: string | null;
  measures: { label: string; value: number | null; compare?: number | null }[];
  bio: { label: string; unit?: string; value: number | null; compare?: number | null }[];
  compareLabel?: string | null;
};

const delta = (a: number | null | undefined, b: number | null | undefined) => {
  if (a == null || b == null) return "—";
  const d = Number(a) - Number(b);
  if (Math.abs(d) < 0.001) return "0";
  return `${d > 0 ? "+" : ""}${Number(d.toFixed(2))}`;
};

const rows = (
  items: { label: string; unit?: string; value: number | null; compare?: number | null }[],
  withCompare: boolean
) =>
  items
    .map(
      i => `<tr><td>${esc(i.label)}${i.unit ? ` (${esc(i.unit)})` : ""}</td>
      <td>${i.value ?? "—"}</td>
      ${withCompare ? `<td>${i.compare ?? "—"}</td><td>${delta(i.value, i.compare)}</td>` : ""}</tr>`
    )
    .join("");

/** Abre a janela de impressão (salvar como PDF) da avaliação física. */
export function printAssessment(d: AssessmentPrintData): boolean {
  const withCompare = !!d.compareLabel;
  const w = window.open("", "_blank", "width=820,height=920");
  if (!w) return false;
  const head = withCompare
    ? `<tr><th>Item</th><th>${esc(fmt(d.performedAt))}</th><th>${esc(d.compareLabel || "")}</th><th>Variação</th></tr>`
    : `<tr><th>Item</th><th>Valor</th></tr>`;
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
  <title>Avaliação física — ${esc(d.studentName)}</title>
  <style>
    body{font-family:Helvetica,Arial,sans-serif;color:#111;margin:36px;line-height:1.5}
    h1{font-size:20px;letter-spacing:1px;text-transform:uppercase;margin:0 0 2px}
    h2{font-size:13px;text-transform:uppercase;letter-spacing:1px;margin:22px 0 6px;color:#0057FF}
    .muted{color:#666;font-size:12px;margin:0}
    table{border-collapse:collapse;width:100%;font-size:12px;margin-top:4px}
    th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
    th{background:#f4f5fa}
    pre{white-space:pre-wrap;font-family:inherit;font-size:12px}
  </style></head><body>
  <h1>EVO Club — Avaliação física</h1>
  <p class="muted">${esc(d.studentName)} · realizada em ${fmt(d.performedAt)}</p>
  <p class="muted">Responsável: ${esc(d.professional || "Equipe EVO")} · situação ${esc(d.status || "—")}${
    d.origin ? ` · origem ${esc(d.origin)}` : ""
  }</p>
  ${withCompare ? `<p class="muted">Comparação com a avaliação de ${esc(d.compareLabel || "")}.</p>` : ""}
  <h2>Medidas (cm)</h2>
  <table>${head}${rows(d.measures, withCompare)}</table>
  <h2>Bioimpedância</h2>
  <table>${head}${rows(d.bio, withCompare)}</table>
  ${d.notes ? `<h2>Observações</h2><pre>${esc(d.notes)}</pre>` : ""}
  </body></html>`);
  w.document.close();
  w.focus();
  w.print();
  return true;
}
