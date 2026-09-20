import { jsPDF } from "jspdf";

export type EvoAssessmentPdfData = {
  id: string;
  studentName: string;
  performedAt: string | null;
  professional: string | null;
  unitName: string | null;
  notes: string | null;
  bio: Record<string, any> | null;
  previous: { performedAt: string | null; bio: Record<string, any> | null } | null;
};

const BLUE = "#0057FF";
const BLACK = "#101218";
const INK = "#151820";
const MUTED = "#747B8A";
const PALE = "#F2F4F8";
const LINE = "#DDE1EA";
const GREEN = "#16A36A";
const YELLOW = "#E9A116";
const RED = "#D64545";

const LABELS: Record<string, { label: string; unit: string }> = {
  weight: { label: "Peso", unit: "kg" },
  skeletal_muscle_mass: { label: "Massa muscular esquelética", unit: "kg" },
  muscle_mass: { label: "Massa muscular", unit: "kg" },
  fat_mass: { label: "Massa de gordura", unit: "kg" },
  body_fat_pct: { label: "Percentual de gordura", unit: "%" },
  bmi: { label: "IMC", unit: "kg/m²" },
  visceral_fat: { label: "Gordura visceral", unit: "" },
  waist_hip_ratio: { label: "Relação cintura-quadril", unit: "" },
  basal_metabolism: { label: "Taxa metabólica basal", unit: "kcal" },
  inbody_score: { label: "Pontuação geral", unit: "/ 100" },
  total_body_water: { label: "Água corporal total", unit: "L" },
  protein: { label: "Proteína", unit: "kg" },
  minerals: { label: "Minerais", unit: "kg" },
  lean_mass: { label: "Massa livre de gordura", unit: "kg" },
  obesity_degree: { label: "Grau de obesidade", unit: "%" },
};

const SEGMENTS = [
  ["lean_arm_left", "Braço esquerdo"], ["lean_arm_right", "Braço direito"],
  ["lean_trunk", "Tronco"], ["lean_leg_left", "Perna esquerda"], ["lean_leg_right", "Perna direita"],
] as const;
const FAT_SEGMENTS = SEGMENTS.map(([key, label]) => [key.replace("lean_", "fat_"), label] as const);

const n = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const parsed = Number(String(v).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

const fmt = (v: unknown, digits = 1) => {
  const value = n(v);
  return value == null ? "—" : value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: digits });
};

const dateTime = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const parseRange = (raw: unknown): { min: number | null; max: number | null; label: string } => {
  const label = typeof raw === "string" ? raw.trim() : "";
  if (!label) return { min: null, max: null, label: "—" };
  const values = label.match(/-?\d+(?:[.,]\d+)?/g)?.map(v => Number(v.replace(",", "."))) || [];
  if (/at[eé]/i.test(label) && values.length) return { min: null, max: values[0], label };
  return { min: values[0] ?? null, max: values[1] ?? null, label };
};

const classification = (value: unknown, range: unknown) => {
  const v = n(value);
  const r = parseRange(range);
  if (v == null || (r.min == null && r.max == null)) return "";
  if (r.min != null && v < r.min) return "Abaixo";
  if (r.max != null && v > r.max) return "Acima";
  return "Normal";
};

const deltaTone = (key: string, current: number, previous: number) => {
  const d = current - previous;
  if (Math.abs(d) < 0.01) return "stable";
  if (["fat_mass", "body_fat_pct"].includes(key)) return d < 0 ? "positive" : "negative";
  if (["skeletal_muscle_mass", "muscle_mass"].includes(key)) return d > 0 ? "positive" : "negative";
  if (["visceral_fat", "waist_hip_ratio"].includes(key)) return d < 0 ? "positive" : "negative";
  return "neutral";
};

const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const assessmentPdfFileName = (studentName: string, performedAt: string | null) => {
  const d = performedAt ? new Date(performedAt) : new Date();
  const day = Number.isNaN(d.getTime()) ? "sem-data" : d.toLocaleDateString("pt-BR").replace(/\//g, "-");
  return `avaliacao-evo-${slug(studentName)}-${day}.pdf`;
};

export function generateAssessmentEvoPdf(data: EvoAssessmentPdfData): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const bio = data.bio || {};
  const ranges = (bio.reference_ranges || {}) as Record<string, string>;
  const segmental = (bio.segmental_meta || {}) as Record<string, { percentage?: number | null; classification?: string | null }>;
  const W = 210;
  const margin = 12;

  const footer = (page: number) => {
    doc.setDrawColor(LINE); doc.line(margin, 286, W - margin, 286);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(MUTED);
    doc.text("EVO CLUB • A escolha de quem busca excelência", margin, 291);
    doc.text(String(page).padStart(2, "0"), W - margin, 291, { align: "right" });
  };
  const mark = (x: number, y: number) => {
    doc.setFillColor(BLUE);
    doc.rect(x, y, 15, 2.8, "F"); doc.rect(x, y + 5.3, 13.2, 2.8, "F"); doc.rect(x, y + 10.6, 15, 2.8, "F");
  };
  const header = (title: string, subtitle: string, page: number) => {
    doc.setFillColor(BLACK); doc.rect(0, 0, W, 31, "F"); mark(margin, 8.5);
    doc.setTextColor("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text("EVO CLUB", 33, 15.5);
    doc.setFontSize(12); doc.text(title.toUpperCase(), W - margin, 13.5, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor("#AEB4C0"); doc.text(subtitle, W - margin, 20, { align: "right" });
    footer(page);
  };
  const section = (title: string, y: number) => {
    doc.setFillColor(BLUE); doc.roundedRect(margin, y - 4.5, 1.5, 6.5, 0.7, 0.7, "F");
    doc.setTextColor(INK); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text(title.toUpperCase(), margin + 4, y);
  };
  const writeLines = (text: string, x: number, y: number, width: number, size = 9, color = INK, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(color);
    const lines = doc.splitTextToSize(text, width); doc.text(lines, x, y); return y + lines.length * size * 0.38;
  };
  const card = (label: string, value: unknown, unit: string, x: number, y: number, w: number, tone = BLUE) => {
    doc.setFillColor(PALE); doc.roundedRect(x, y, w, 23, 3, 3, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(MUTED); doc.text(label.toUpperCase(), x + 5, y + 7);
    doc.setFontSize(17); doc.setTextColor(INK); doc.text(fmt(value), x + 5, y + 17);
    doc.setFontSize(7); doc.setTextColor(MUTED); if (unit) doc.text(unit, x + 24, y + 17);
    doc.setFillColor(tone); doc.roundedRect(x + 5, y + 20, 13, 1, .5, .5, "F");
  };
  const indicator = (key: string, x: number, y: number, w: number) => {
    const item = LABELS[key]; const value = bio[key]; const r = parseRange(ranges[key]);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(INK); doc.text(item.label, x, y);
    doc.text(`${fmt(value)}${item.unit ? ` ${item.unit}` : ""}`, x + w, y, { align: "right" });
    doc.setFillColor("#E2E5EC"); doc.roundedRect(x, y + 4, w, 2.4, 1.2, 1.2, "F");
    const v = n(value);
    if (v != null && r.min != null && r.max != null && r.max > r.min) {
      doc.setFillColor("#B9DACD"); doc.rect(x + w * .18, y + 4, w * .38, 2.4, "F");
      const span = Math.max(r.max - r.min, 1); const pos = Math.max(0, Math.min(1, .18 + ((v - r.min) / span) * .38));
      doc.setFillColor(BLUE); doc.circle(x + pos * w, y + 5.2, 1.8, "F");
      doc.setFont("helvetica", "normal"); doc.setFontSize(5.8); doc.setTextColor(MUTED); doc.text(`Faixa ${r.label}`, x, y + 10);
    } else {
      doc.setFillColor(BLUE); doc.circle(x + w * .5, y + 5.2, 1.8, "F");
      doc.setFont("helvetica", "normal"); doc.setFontSize(5.8); doc.setTextColor(MUTED); doc.text("Faixa não informada no laudo", x, y + 10);
    }
  };

  // Página 1
  header("Avaliação de composição corporal", dateTime(data.performedAt), 1);
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(INK); doc.text(data.studentName.toUpperCase(), margin, 45);
  doc.setFontSize(7); doc.setTextColor(MUTED); doc.text(`ID ${bio.device_client_id || data.id.slice(0, 8)}`, margin, 52);
  const ident = [bio.sex, bio.age != null ? `${fmt(bio.age, 0)} anos` : null, bio.height_cm != null ? `${fmt(bio.height_cm, 0)} cm` : null].filter(Boolean).join("  •  ");
  if (ident) doc.text(ident, W - margin, 49, { align: "right" });
  doc.text([data.unitName, data.professional].filter(Boolean).join("  •  ") || "Equipe EVO", W - margin, 54, { align: "right" });
  section("Resumo executivo", 66);
  const mainCards = [
    ["Peso", bio.weight, "kg", BLUE],
    ["Massa muscular", bio.skeletal_muscle_mass ?? bio.muscle_mass, "kg", BLUE],
    ["Gordura corporal", bio.body_fat_pct, "%", YELLOW],
    ["Pontuação", bio.inbody_score, "/ 100", GREEN],
  ].filter(([, value]) => n(value) != null) as [string, unknown, string, string][];
  const gap = 5; const cw = mainCards.length ? (W - margin * 2 - gap * (mainCards.length - 1)) / mainCards.length : 42;
  mainCards.forEach(([label, value, unit, tone], i) => card(label, value, unit, margin + (cw + gap) * i, 72, cw, tone));
  section("Indicadores principais", 108);
  const keys = ["weight", "skeletal_muscle_mass", "fat_mass", "body_fat_pct", "bmi", "visceral_fat"].filter(key => n(bio[key]) != null);
  keys.forEach((key, i) => indicator(key, margin + (i % 2) * 99, 118 + Math.floor(i / 2) * 22, 88));
  const controls = [["Peso recomendado", "ideal_weight"], ["Controle de peso", "weight_control"], ["Controle de gordura", "fat_control"], ["Controle muscular", "muscle_control"]].filter(([, key]) => n(bio[key]) != null);
  if (controls.length) { section("Controle corporal", 188);
  doc.setFillColor(PALE); doc.roundedRect(margin, 194, W - margin * 2, 8 + controls.length * 8, 3, 3, "F");
  controls.forEach(([label, key], i) => {
    const y = 202 + i * 8; doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(INK); doc.text(label, margin + 5, y);
    doc.setFont("helvetica", "bold"); doc.text(`${fmt(bio[key])} kg`, 140, y, { align: "right" });
    if (i < controls.length - 1) { doc.setDrawColor(LINE); doc.line(margin + 5, y + 3, W - margin - 5, y + 3); }
  }); }
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(BLUE); doc.text("LEITURA OBJETIVA", margin, 246);
  const objective: string[] = [];
  if (n(bio.skeletal_muscle_mass ?? bio.muscle_mass) != null) objective.push("A composição muscular foi registrada para acompanhamento da evolução.");
  const fatClass = classification(bio.body_fat_pct, ranges.body_fat_pct);
  if (fatClass) objective.push(`O percentual de gordura está classificado como ${fatClass.toLowerCase()} conforme a faixa do laudo original.`);
  if (n(bio.visceral_fat) != null) objective.push(`O nível de gordura visceral registrado é ${fmt(bio.visceral_fat, 0)}.`);
  writeLines(objective.slice(0, 2).join(" ") || "Os dados disponíveis foram organizados para acompanhamento profissional.", margin, 254, W - margin * 2, 9, INK, true);

  // Página 2
  doc.addPage(); header("Composição e indicadores", "Dados organizados a partir da avaliação registrada", 2);
  const table = (title: string, keysList: string[], startY: number) => {
    section(title, startY); let y = startY + 10;
    keysList.filter(key => n(bio[key]) != null).forEach(key => {
      const item = LABELS[key]; const cls = classification(bio[key], ranges[key]);
      doc.setDrawColor(LINE); doc.line(margin + 4, y + 5, W - margin - 4, y + 5);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(INK); doc.text(item.label, margin + 4, y);
      doc.setFont("helvetica", "bold"); doc.text(`${fmt(bio[key])}${item.unit ? ` ${item.unit}` : ""}`, 126, y, { align: "right" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(MUTED); doc.text(parseRange(ranges[key]).label, 158, y, { align: "right" });
      if (cls) { doc.setFillColor(cls === "Normal" ? GREEN : YELLOW); doc.roundedRect(164, y - 4.5, 31, 7, 3.5, 3.5, "F"); doc.setTextColor("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.text(cls.toUpperCase(), 179.5, y, { align: "center" }); }
      y += 12;
    });
    return y;
  };
  let py = table("Composição corporal", ["total_body_water", "protein", "minerals", "fat_mass", "lean_mass", "skeletal_muscle_mass"], 46);
  py = table("Indicadores metabólicos e de risco", ["basal_metabolism", "waist_hip_ratio", "visceral_fat", "obesity_degree", "bmi", "body_fat_pct"], Math.max(py + 5, 126));
  section("Notas da avaliação", Math.min(py + 5, 234));
  doc.setFillColor(PALE); doc.roundedRect(margin, Math.min(py + 11, 240), W - margin * 2, 31, 3, 3, "F");
  const noteY = Math.min(py + 18, 247);
  writeLines("• Os intervalos apresentados são os informados pelo equipamento no laudo original.\n• A leitura deve ser combinada com histórico, objetivo, rotina e avaliação profissional.\n• Este documento reorganiza os dados e não substitui diagnóstico médico.", margin + 6, noteY, W - margin * 2 - 12, 7.2);

  // Página 3
  doc.addPage(); header("Análise segmentar", "Distribuição de massa magra e gordura", 3);
  section("Massa magra e gordura segmentar", 46);
  const segmentBox = (items: readonly (readonly [string, string])[], x: number, y: number, title: string) => {
    doc.setFillColor(PALE); doc.roundedRect(x, y, 89, 92, 4, 4, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(MUTED); doc.text(title.toUpperCase(), x + 6, y + 10);
    const available = items.filter(([key]) => n(bio[key]) != null || segmental[key]?.percentage != null || segmental[key]?.classification);
    if (!available.length) { doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(MUTED); doc.text("Sem dados disponíveis", x + 6, y + 24); }
    available.forEach(([key, label], i) => {
      const yy = y + 23 + i * 13; const meta = segmental[key] || {};
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(INK); doc.text(label, x + 6, yy);
      doc.setFont("helvetica", "bold"); if (bio[key] != null) doc.text(`${fmt(bio[key], 2)} kg`, x + 82, yy, { align: "right" });
      const sub = [meta.percentage != null ? `${fmt(meta.percentage)}%` : null, meta.classification || null].filter(Boolean).join("  •  ");
      if (sub) { doc.setFont("helvetica", "normal"); doc.setFontSize(5.8); doc.setTextColor(meta.classification === "Normal" ? GREEN : YELLOW); doc.text(sub, x + 6, yy + 5); }
      if (i < available.length - 1) { doc.setDrawColor(LINE); doc.line(x + 6, yy + 7, x + 83, yy + 7); }
    });
  };
  segmentBox(SEGMENTS, margin, 55, "Massa magra"); segmentBox(FAT_SEGMENTS, 109, 55, "Gordura");
  section("Leitura segmentar", 164);
  doc.setFillColor(BLACK); doc.roundedRect(margin, 172, W - margin * 2, 58, 4, 4, "F");
  const left = n(bio.lean_arm_left); const right = n(bio.lean_arm_right); const legL = n(bio.lean_leg_left); const legR = n(bio.lean_leg_right);
  const readings: string[] = [];
  if (left != null && right != null) readings.push(`Braços com diferença de ${fmt(Math.abs(left - right), 2)} kg entre os lados.`);
  if (legL != null && legR != null) readings.push(`Pernas com diferença de ${fmt(Math.abs(legL - legR), 2)} kg entre os lados.`);
  const fatEntries = FAT_SEGMENTS.map(([key, label]) => ({ label, value: n(bio[key]) })).filter(v => v.value != null) as { label: string; value: number }[];
  if (fatEntries.length) readings.push(`Maior massa de gordura segmentar registrada em ${fatEntries.sort((a, b) => b.value - a.value)[0].label.toLowerCase()}.`);
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor("#8CAEFF"); doc.text("DISTRIBUIÇÃO E EQUILÍBRIO", margin + 7, 185);
  writeLines(readings.slice(0, 3).join(" ") || "Não há dados segmentares suficientes para uma leitura comparativa.", margin + 7, 196, W - margin * 2 - 14, 10, "#FFFFFF", true);

  // Página 4
  doc.addPage(); header("Comparativo de avaliações", data.previous ? `Comparação com ${dateTime(data.previous.performedAt)}` : "Histórico de evolução", 4);
  section(data.previous ? "Evolução desde a avaliação anterior" : "Primeira avaliação registrada", 46);
  const compareKeys = ["weight", "skeletal_muscle_mass", "fat_mass", "body_fat_pct", "bmi", "visceral_fat", "waist_hip_ratio", "basal_metabolism", "inbody_score"];
  let cy = 60;
  doc.setFillColor(PALE); doc.rect(margin, cy - 7, W - margin * 2, 9, "F");
  ["Indicador", "Anterior", "Atual", "Variação"].forEach((h, i) => { doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(MUTED); doc.text(h.toUpperCase(), [margin + 4, 115, 148, 195][i], cy - 1, { align: i ? "right" : "left" }); });
  cy += 8;
  compareKeys.filter(key => n(bio[key]) != null).forEach(key => {
    const current = n(bio[key]); const previous = n(data.previous?.bio?.[key]); const item = LABELS[key];
    doc.setDrawColor(LINE); doc.line(margin + 3, cy + 5, W - margin - 3, cy + 5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.2); doc.setTextColor(INK); doc.text(item.label, margin + 4, cy);
    doc.text(previous == null ? "—" : `${fmt(previous)} ${item.unit}`.trim(), 115, cy, { align: "right" });
    doc.setFont("helvetica", "bold"); doc.text(`${fmt(current)} ${item.unit}`.trim(), 148, cy, { align: "right" });
    if (current != null && previous != null) {
      const d = current - previous; const pct = previous === 0 ? null : (d / previous) * 100; const tone = deltaTone(key, current, previous);
      doc.setTextColor(tone === "positive" ? GREEN : tone === "negative" ? RED : tone === "stable" ? MUTED : BLUE);
      doc.text(`${d > 0 ? "+" : ""}${fmt(d, 2)}${pct == null ? "" : ` (${pct > 0 ? "+" : ""}${fmt(pct, 1)}%)`}`, 195, cy, { align: "right" });
    } else { doc.setTextColor(MUTED); doc.text("—", 195, cy, { align: "right" }); }
    cy += 12;
  });
  section("Resumo da evolução", Math.max(cy + 6, 185));
  const summaryY = Math.max(cy + 14, 193);
  doc.setFillColor(PALE); doc.roundedRect(margin, summaryY - 6, W - margin * 2, 48, 4, 4, "F");
  if (!data.previous) {
    writeLines("Primeira avaliação registrada", margin + 7, summaryY + 5, 160, 11, INK, true);
    writeLines("A comparação será disponibilizada automaticamente após a próxima avaliação. Nenhuma estimativa foi criada para este laudo.", margin + 7, summaryY + 16, 160, 8, MUTED);
  } else {
    const changes = compareKeys.flatMap(key => { const c = n(bio[key]); const p = n(data.previous?.bio?.[key]); return c != null && p != null ? [{ key, tone: deltaTone(key, c, p) }] : []; });
    const positive = changes.filter(v => v.tone === "positive").map(v => LABELS[v.key].label);
    const negative = changes.filter(v => v.tone === "negative").map(v => LABELS[v.key].label);
    const stable = changes.filter(v => v.tone === "stable").map(v => LABELS[v.key].label);
    const lines = [positive.length ? `Principais melhorias: ${positive.join(", ")}.` : "Não há melhoria classificável nos dados disponíveis.", negative.length ? `Pontos de atenção: ${negative.join(", ")}.` : "Nenhum ponto de atenção classificável.", stable.length ? `Indicadores estáveis: ${stable.join(", ")}.` : "As demais mudanças são informativas ou não possuem contexto suficiente."].join(" ");
    writeLines(lines, margin + 7, summaryY + 5, W - margin * 2 - 14, 8.5, INK, true);
  }
  if (data.notes) writeLines(`Observações do avaliador: ${data.notes}`, margin, 270, W - margin * 2, 7, MUTED);
  return doc.output("blob");
}
