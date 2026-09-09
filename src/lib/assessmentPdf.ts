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

type Item = { label: string; unit?: string; value: number | null; compare?: number | null };

const nf = (v: number | null | undefined, digits = 1) =>
  v == null || Number.isNaN(Number(v))
    ? null
    : Number(v).toLocaleString("pt-BR", { maximumFractionDigits: digits });

const delta = (a: number | null | undefined, b: number | null | undefined) => {
  if (a == null || b == null) return "—";
  const d = Number(a) - Number(b);
  if (Math.abs(d) < 0.001) return "0";
  return `${d > 0 ? "+" : ""}${Number(d.toFixed(2))}`;
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const imcRange = (v: number | null) => {
  if (v == null) return "";
  if (v < 18.5) return "Abaixo do peso";
  if (v < 25) return "Faixa normal";
  if (v < 30) return "Sobrepeso";
  return "Obesidade";
};

const tableRows = (items: Item[], withCompare: boolean) =>
  items
    .map(i => {
      const val = nf(i.value, 1);
      const unit = i.unit ? ` ${esc(i.unit)}` : "";
      return `<tr>
        <td class="k">${esc(i.label)}</td>
        <td class="v">${val == null ? "—" : `${val}${unit}`}</td>
        ${
          withCompare
            ? `<td class="v">${nf(i.compare, 1) == null ? "—" : `${nf(i.compare, 1)}${unit}`}</td>
               <td class="v">${delta(i.value, i.compare)}</td>`
            : ""
        }
      </tr>`;
    })
    .join("");

const table = (items: Item[], withCompare: boolean, compareLabel?: string | null, dateLabel?: string) =>
  `<table class="grid">
    <thead><tr>
      <th class="k">Item</th>
      <th class="v">${withCompare ? esc(dateLabel || "Valor") : "Valor"}</th>
      ${withCompare ? `<th class="v">${esc(compareLabel || "")}</th><th class="v">Variação</th>` : ""}
    </tr></thead>
    <tbody>${tableRows(items, withCompare)}</tbody>
  </table>`;

const kpiCard = (label: string, value: string | null, unit: string, hint = "", accent = false) =>
  `<div class="kpi">
    <span class="kpi-l">${esc(label)}</span>
    <span class="kpi-v${accent ? " accent" : ""}">${value ?? "—"}${
      unit ? `<em>${esc(unit)}</em>` : ""
    }</span>
    ${hint ? `<span class="kpi-h">${esc(hint)}</span>` : ""}
  </div>`;

/** Abre a janela de impressão (salvar como PDF) da avaliação física. */
export function printAssessment(d: AssessmentPrintData): boolean {
  const withCompare = !!d.compareLabel;
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return false;

  const find = (...keys: string[]) =>
    d.bio.find(b => keys.some(k => norm(b.label).includes(k))) || null;

  const peso = find("peso");
  const gordura = find("gordura corporal", "% gordura", "percentual de gordura");
  const musculo = find("massa muscular", "muscular");
  const imc = find("imc");
  const kpiSet = new Set([peso, gordura, musculo, imc].filter(Boolean).map(i => i!.label));
  const bioRest = d.bio.filter(b => !kpiSet.has(b.label));

  const half = Math.ceil(d.measures.length / 2);
  const mLeft = d.measures.slice(0, half);
  const mRight = d.measures.slice(half);
  const dateLabel = fmt(d.performedAt);

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
  <title>Avaliação física — ${esc(d.studentName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Roboto+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 18mm 16mm 16mm; }
    *{box-sizing:border-box}
    html,body{margin:0;padding:0}
    body{font-family:Montserrat,Helvetica,Arial,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .mono{font-family:"Roboto Mono",ui-monospace,monospace;letter-spacing:.06em}

    /* Cabeçalho */
    .hd{background:#0b0b0f;color:#fff;padding:22px 26px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
    .hd .brand{font-family:"Roboto Mono",monospace;font-size:9.5px;font-weight:700;letter-spacing:.18em;color:#4d7cff;text-transform:uppercase;margin-bottom:8px}
    .hd h1{margin:0;font-size:24px;font-weight:400;letter-spacing:.04em;text-transform:uppercase}
    .hd .meta{font-family:"Roboto Mono",monospace;font-size:8.5px;letter-spacing:.12em;text-align:right;text-transform:uppercase;line-height:1.9;color:#b9bcc6}
    .hd .meta b{color:#fff}

    /* Faixa de identificação */
    .strip{display:flex;background:#f4f5fa;border-bottom:1px solid #e3e5ee}
    .strip>div{flex:1;padding:14px 18px;border-right:1px solid #e3e5ee}
    .strip>div:last-child{border-right:0}
    .strip .l{font-size:8px;font-weight:700;letter-spacing:.14em;color:#7a7f8c;text-transform:uppercase}
    .strip .b{font-size:13px;font-weight:700;margin-top:5px}
    .strip .n{font-size:13px;font-weight:400;margin-top:5px}

    /* Seções */
    section{margin-top:26px;break-inside:avoid;page-break-inside:avoid}
    .sh{display:flex;align-items:center;gap:10px;margin-bottom:10px}
    .sh i{font-family:"Roboto Mono",monospace;font-size:9px;font-weight:700;color:#0057FF;font-style:normal}
    .sh h2{margin:0;font-size:13.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
    .sh span{flex:1;height:1px;background:#e3e5ee}

    /* Cards */
    .kpis{display:flex;border:1px solid #e3e5ee}
    .kpi{flex:1;padding:14px 16px 16px;border-right:1px solid #e3e5ee;display:flex;flex-direction:column}
    .kpi:last-child{border-right:0}
    .kpi-l{font-size:8px;font-weight:700;letter-spacing:.14em;color:#7a7f8c;text-transform:uppercase}
    .kpi-v{font-size:26px;font-weight:400;margin-top:6px;line-height:1}
    .kpi-v.accent{color:#0057FF}
    .kpi-v em{font-size:11px;font-style:normal;color:#7a7f8c;margin-left:4px}
    .kpi-h{font-size:8.5px;color:#7a7f8c;margin-top:7px}

    /* Tabelas */
    table.grid{width:100%;border-collapse:collapse;font-size:11px}
    table.grid th{font-size:8px;font-weight:700;letter-spacing:.14em;color:#7a7f8c;text-transform:uppercase;padding:9px 6px;border-bottom:1px solid #e3e5ee}
    table.grid td{padding:10px 6px;border-bottom:1px solid #eceef4}
    table.grid tbody tr:last-child td{border-bottom:1px solid #e3e5ee}
    table.grid th.k,table.grid td.k{text-align:left}
    table.grid th.v,table.grid td.v{text-align:right;font-weight:700;white-space:nowrap}
    table.grid td.k{font-weight:400}
    tr{break-inside:avoid;page-break-inside:avoid}
    thead{display:table-header-group}

    .cols{display:flex;gap:34px}
    .cols>div{flex:1;min-width:0}

    /* Observações */
    .note{background:#f4f5fa;border-left:3px solid #0057FF;padding:16px 18px;font-size:11px;line-height:1.7;white-space:pre-wrap}

    /* Rodapé */
    .ft{position:fixed;left:0;right:0;bottom:0;display:flex;justify-content:space-between;
        font-family:"Roboto Mono",monospace;font-size:8px;letter-spacing:.14em;text-transform:uppercase;
        color:#9aa0ac;border-top:1px solid #e3e5ee;padding-top:8px}
    @media print{ .ft{position:fixed} }
  </style></head><body>

  <div class="hd">
    <div>
      <div class="brand">EVO Club</div>
      <h1>Avaliação Física</h1>
    </div>
    <div class="meta">
      Realizada em <b>${esc(dateLabel)}</b><br>
      Responsável <b>${esc(d.professional || "Equipe EVO")}</b><br>
      Situação <b>${esc(d.status || "—")}</b>${d.origin ? ` · Origem <b>${esc(d.origin)}</b>` : ""}
    </div>
  </div>

  <div class="strip">
    <div><div class="l">Aluno(a)</div><div class="b">${esc(d.studentName)}</div></div>
    <div><div class="l">Data da avaliação</div><div class="n">${esc(dateLabel)}</div></div>
    <div><div class="l">Responsável</div><div class="n">${esc(d.professional || "Equipe EVO")}</div></div>
  </div>

  ${
    withCompare
      ? `<section><div class="note">Comparação com a avaliação de ${esc(d.compareLabel || "")}.</div></section>`
      : ""
  }

  ${
    d.bio.length
      ? `<section>
    <div class="sh"><i>01</i><h2>Bioimpedância — Indicadores principais</h2><span></span></div>
    <div class="kpis">
      ${kpiCard("Peso", nf(peso?.value ?? null, 1), peso?.unit || "kg")}
      ${kpiCard("Gordura corporal", nf(gordura?.value ?? null, 1), gordura?.unit || "%", "", true)}
      ${kpiCard("Massa muscular", nf(musculo?.value ?? null, 1), musculo?.unit || "kg")}
      ${kpiCard("IMC", nf(imc?.value ?? null, 1), "", imcRange(imc?.value ?? null))}
    </div>
    ${bioRest.length ? table(bioRest, withCompare, d.compareLabel, dateLabel) : ""}
  </section>`
      : ""
  }

  ${
    d.measures.length
      ? `<section>
    <div class="sh"><i>02</i><h2>Medidas (cm)</h2><span></span></div>
    ${
      withCompare
        ? table(d.measures, true, d.compareLabel, dateLabel)
        : `<div class="cols">
             <div>${table(mLeft, false)}</div>
             <div>${mRight.length ? table(mRight, false) : ""}</div>
           </div>`
    }
  </section>`
      : ""
  }

  ${
    d.notes
      ? `<section>
    <div class="sh"><i>03</i><h2>Observações</h2><span></span></div>
    <div class="note">${esc(d.notes)}</div>
  </section>`
      : ""
  }

  <div class="ft"><span>EVO Club</span><span>${esc(d.studentName)}</span><span>${esc(dateLabel)}</span></div>
  </body></html>`;

  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
  return true;
}
