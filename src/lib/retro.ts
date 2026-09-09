/**
 * Retrospectiva EVO — tipos, narrativa automática e montagem dos stories.
 * Regra de ouro: nada é estimado. Se o dado não existe, o card não aparece.
 */

export type RetroPeriodKind = "entrada" | "contrato" | "12m" | "ano" | "custom";

export const PERIOD_LABEL: Record<RetroPeriodKind, string> = {
  entrada: "Desde que entrou na EVO",
  contrato: "Contrato atual",
  "12m": "Últimos 12 meses",
  ano: "Ano atual",
  custom: "Período personalizado",
};

export type RetroStatus =
  | "aguardando" | "gerada" | "revisada" | "enviada" | "visualizada"
  | "renovacao_iniciada" | "renovado" | "nao_renovado";

export const STATUS_LABEL: Record<string, string> = {
  aguardando: "Aguardando geração",
  gerada: "Gerada",
  revisada: "Revisada",
  enviada: "Enviada",
  visualizada: "Visualizada pelo aluno",
  renovacao_iniciada: "Renovação iniciada",
  renovado: "Renovado",
  nao_renovado: "Não renovado",
};

export const STATUS_STYLE: Record<string, string> = {
  aguardando: "bg-muted text-muted-foreground",
  gerada: "bg-blue-50 text-blue-700",
  revisada: "bg-indigo-50 text-indigo-700",
  enviada: "bg-amber-50 text-amber-700",
  visualizada: "bg-emerald-50 text-emerald-700",
  renovacao_iniciada: "bg-primary/10 text-primary",
  renovado: "bg-green-50 text-green-700",
  nao_renovado: "bg-red-50 text-red-700",
};

export type Retrospective = {
  id: string;
  client_id: number;
  unit_id: string | null;
  period_kind: RetroPeriodKind;
  period_from: string;
  period_to: string;
  status: RetroStatus;
  trigger: string | null;
  snapshot: RetroSnapshot | null;
  highlights: RetroHighlight[];
  hidden_cards: string[];
  card_order: string[];
  custom_texts: Record<string, string>;
  team_message: string | null;
  team_message_kind: string | null;
  team_message_url: string | null;
  team_message_name: string | null;
  next_cycle: Record<string, string>;
  generated_at: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  sent_at: string | null;
  sent_channel: string | null;
  first_viewed_at: string | null;
  views: number;
  renewal_outcome: string | null;
  version: number;
  created_at: string;
};

export type RetroHighlight = { key: string; value: number | string; label: string };

export type RetroSnapshot = {
  allowed?: boolean;
  client?: any;
  period?: { from: string; to: string; weeks: number };
  frequency?: any;
  workouts?: any;
  assessments?: any;
  health?: any;
  photos?: any;
  ranking?: any;
  achievements?: any[];
  community?: any;
  timeline?: { at: string; kind: string; title: string; detail?: string }[];
  badges?: { code: string; label: string; description: string | null }[];
  metrics?: Record<string, number>;
};

export const CARD_KEYS = [
  "abertura", "resumo", "frequencia", "treinos", "constancia", "ranking",
  "corpo", "fotos", "saude", "avaliacoes", "comunidade", "destaques",
  "mensagem", "proximo", "renovacao",
] as const;

export const CARD_LABEL: Record<string, string> = {
  abertura: "Abertura personalizada",
  resumo: "Resumo geral",
  frequencia: "Check-ins e frequência",
  treinos: "Treinos realizados",
  constancia: "Constância e selos",
  ranking: "Ranking",
  corpo: "Evolução corporal",
  fotos: "Fotos de evolução",
  saude: "Saúde e bem-estar",
  avaliacoes: "Avaliações e acompanhamento",
  comunidade: "Participação na comunidade",
  destaques: "Momentos de destaque",
  mensagem: "Mensagem da equipe",
  proximo: "Próximo ciclo",
  renovacao: "Renovação",
};

export const SENSITIVE_CARDS = ["saude", "fotos"];

export const DOW_NAMES = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
export const DOW_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export const MEASURE_LABEL: Record<string, string> = {
  torax: "Tórax", cintura: "Cintura", abdomen: "Abdômen", quadril: "Quadril",
  braco_direito: "Braço direito", braco_esquerdo: "Braço esquerdo",
  perna_direita: "Perna direita", perna_esquerda: "Perna esquerda",
  panturrilha_direita: "Panturrilha direita", panturrilha_esquerda: "Panturrilha esquerda",
};

export const BIO_LABEL: Record<string, { label: string; unit: string }> = {
  weight: { label: "Peso", unit: "kg" },
  body_fat_pct: { label: "Gordura", unit: "%" },
  fat_mass: { label: "Massa de gordura", unit: "kg" },
  muscle_mass: { label: "Massa muscular", unit: "kg" },
  lean_mass: { label: "Massa magra", unit: "kg" },
  body_water: { label: "Água corporal", unit: "%" },
  visceral_fat: { label: "Gordura visceral", unit: "" },
  basal_metabolism: { label: "Metabolismo basal", unit: "kcal" },
  bmi: { label: "IMC", unit: "" },
};

export const monthLabel = (ym?: string | null) => {
  if (!ym) return "—";
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

export const monthShort = (ym?: string | null) => {
  if (!ym) return "—";
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "short" });
};

export const fmtDate = (d?: string | null) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR") : "—";

export const num = (v: any): number | null =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v);

export const nice = (v: any, digits = 0) => {
  const n = num(v);
  return n === null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: digits });
};

/** Direção desejada, conforme o objetivo cadastrado do aluno. */
export type Direction = "down" | "up" | "neutral";
export function objectiveDirection(objective?: string | null): Direction {
  const o = (objective || "").toLowerCase();
  if (/emagre|perder|redu|gordura|definic|definiç|seca/.test(o)) return "down";
  if (/hipertrof|massa|ganho|forç|forc|volume/.test(o)) return "up";
  return "neutral";
}

export type EvolutionItem = {
  key: string; label: string; unit: string;
  first: number; last: number; delta: number; deltaPct: number | null;
  favorable: boolean | null;
};

/** Evolução corporal comparando primeira x última avaliação do período. */
export function bodyEvolution(snap: RetroSnapshot): EvolutionItem[] {
  const dir = objectiveDirection(snap.client?.objective || snap.health?.anamnesis_objective);
  const items: EvolutionItem[] = [];
  const bio = snap.assessments?.bio;
  if (bio?.first && bio?.last) {
    Object.keys(BIO_LABEL).forEach((k) => {
      const a = num(bio.first[k]); const b = num(bio.last[k]);
      if (a === null || b === null || a === b) return;
      const delta = Number((b - a).toFixed(1));
      const wantsDown = k === "body_fat_pct" || k === "fat_mass" || k === "visceral_fat"
        || ((k === "weight" || k === "bmi") && dir === "down");
      const wantsUp = k === "lean_mass" || k === "muscle_mass"
        || ((k === "weight" || k === "bmi") && dir === "up");
      items.push({
        key: k, label: BIO_LABEL[k].label, unit: BIO_LABEL[k].unit,
        first: a, last: b, delta,
        deltaPct: a !== 0 ? Number(((delta / a) * 100).toFixed(1)) : null,
        favorable: wantsDown ? delta < 0 : wantsUp ? delta > 0 : null,
      });
    });
  }
  (snap.assessments?.measures || []).forEach((m: any) => {
    const a = num(m.first); const b = num(m.last);
    if (a === null || b === null || a === b) return;
    const delta = Number((b - a).toFixed(1));
    items.push({
      key: m.key, label: MEASURE_LABEL[m.key] || m.key, unit: "cm",
      first: a, last: b, delta,
      deltaPct: a !== 0 ? Number(((delta / a) * 100).toFixed(1)) : null,
      favorable: dir === "down" ? delta < 0 : dir === "up" ? delta > 0 : null,
    });
  });
  return items;
}

/** Destaque corporal mais relevante para o objetivo do aluno. */
export function mainBodyHighlight(snap: RetroSnapshot): EvolutionItem | null {
  const items = bodyEvolution(snap).filter((i) => i.favorable === true);
  if (!items.length) return null;
  return items.sort((a, b) => Math.abs(b.deltaPct ?? 0) - Math.abs(a.deltaPct ?? 0))[0];
}

export function evolutionPhrase(i: EvolutionItem): string {
  const abs = Math.abs(i.delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const verb = i.delta < 0 ? "reduziu" : "ganhou";
  if (i.unit === "%") return `Você ${verb} ${abs} pontos percentuais de ${i.label.toLowerCase()}.`;
  return `Você ${verb} ${abs} ${i.unit} de ${i.label.toLowerCase()}.`;
}

/** Abertura personalizada, adaptada ao período real. */
export function openingText(snap: RetroSnapshot): string {
  const months = num(snap.client?.months_as_student) ?? 0;
  if (months >= 12) {
    const y = Math.floor(months / 12);
    return `Há ${y} ${y > 1 ? "anos" : "ano"}, você escolheu cuidar mais de você. Desde então, muita coisa mudou.`;
  }
  if (months >= 2) return `Há ${months} meses, você escolheu cuidar mais de você. Desde então, muita coisa mudou.`;
  return "Você começou agora, e o que já construiu está aqui.";
}

/** Tom construtivo quando a frequência ficou baixa. */
export function toneText(snap: RetroSnapshot): string {
  const pct = num(snap.frequency?.pct) ?? 0;
  const total = num(snap.frequency?.total) ?? 0;
  if (total === 0) return "Seu histórico está começando agora. Cada presença a partir de hoje entra nesta retrospectiva.";
  if (pct >= 100) return "Você superou a sua própria meta de frequência.";
  if (pct >= 80) return "Sua constância ficou acima de 80% da meta combinada.";
  if (pct >= 50) return "Você manteve uma presença consistente ao longo do período.";
  return "Mesmo com períodos de menor frequência, você retomou seus treinos e manteve sua conexão com a EVO.";
}

export type Story = {
  key: string;
  kicker?: string;
  value?: string;
  suffix?: string;
  title: string;
  lines: string[];
  bars?: { label: string; value: number }[];
};

type BuildOpts = {
  hidden?: string[];
  hideHealth?: boolean;
  hidePhotos?: boolean;
  teamMessage?: string | null;
  teamMessageName?: string | null;
  nextCycle?: Record<string, string> | null;
  texts?: Record<string, string> | null;
  social?: boolean;
};

/** Monta a sequência de stories 9:16 apenas com o que tem dado real. */
export function buildStories(snap: RetroSnapshot, opts: BuildOpts = {}): Story[] {
  const hidden = new Set(opts.hidden || []);
  const t = opts.texts || {};
  const out: Story[] = [];
  const push = (s: Story) => {
    if (hidden.has(s.key)) return;
    out.push({ ...s, lines: t[s.key] ? [t[s.key]] : s.lines });
  };

  const f = snap.frequency || {};
  const w = snap.workouts || {};

  push({
    key: "abertura",
    kicker: snap.client?.unit_name || "EVO CLUB",
    title: `${snap.client?.first_name || "Você"}, olha tudo o que você construiu na EVO.`,
    lines: [openingText(snap), snap.client?.plan ? `Plano ${snap.client.plan}` : ""].filter(Boolean),
  });

  if (num(f.total)) {
    push({
      key: "frequencia", kicker: "PRESENÇAS", value: nice(f.total),
      title: `Você esteve presente ${nice(f.total)} vezes.`,
      lines: [
        f.fav_dow !== null && f.fav_dow !== undefined ? `Seu dia favorito para treinar foi ${DOW_NAMES[f.fav_dow]}.` : "",
        f.best_month ? `${monthLabel(f.best_month)} foi o seu mês mais consistente.` : "",
        num(f.pct) !== null ? `${nice(f.pct)}% da meta de frequência combinada.` : "",
      ].filter(Boolean),
      bars: (f.by_month || []).map((m: any) => ({ label: monthShort(m.month), value: Number(m.total) })),
    });
  }

  if (num(w.total)) {
    push({
      key: "treinos", kicker: "TREINOS", value: nice(w.total),
      title: `Você concluiu ${nice(w.total)} treinos.`,
      lines: [
        w.top_session ? `O treino ${w.top_session} foi o mais realizado.` : "",
        num(w.minutes) ? `${nice(Math.round(Number(w.minutes) / 60))} horas de treino registradas.` : "",
        (w.top_exercises || [])[0］ ? "" : "",
      ].filter(Boolean),
    });
  }

  if (num(f.best_week_streak) && Number(f.best_week_streak) >= 2) {
    push({
      key: "constancia", kicker: "CONSTÂNCIA", value: nice(f.best_week_streak), suffix: "semanas",
      title: "Sua maior sequência em atividade.",
      lines: [
        `${nice(f.active_weeks)} semanas ativas no período.`,
        toneText(snap),
      ],
    });
  }

  if ((w.load_records || []).length) {
    const r = w.load_records[0];
    push({
      key: "recorde", kicker: "RECORDE DE CARGA", value: `+${nice(r.delta, 1)}`, suffix: "kg",
      title: `Seu maior avanço de carga aconteceu no ${String(r.name).toLowerCase()}.`,
      lines: [`De ${nice(r.first, 1)} kg para ${nice(r.best, 1)} kg.`],
    });
  }

  const body = mainBodyHighlight(snap);
  if (body) {
    push({
      key: "corpo", kicker: "EVOLUÇÃO", value: `${body.delta > 0 ? "+" : ""}${nice(body.delta, 1)}`,
      suffix: body.unit,
      title: evolutionPhrase(body),
      lines: [`De ${nice(body.first, 1)} para ${nice(body.last, 1)} ${body.unit}.`],
    });
  }

  if (snap.ranking && !snap.ranking.opt_out && num(snap.ranking.top_pct) !== null) {
    push({
      key: "ranking", kicker: "RANKING", value: `${nice(snap.ranking.top_pct)}%`,
      title: `Você está entre os ${nice(snap.ranking.top_pct)}% mais ativos da sua unidade.`,
      lines: [],
    });
  }

  if ((snap.badges || []).length) {
    push({
      key: "selos", kicker: "SELOS", value: String((snap.badges || []).length),
      title: "Selos conquistados no período.",
      lines: (snap.badges || []).slice(0, 5).map((b) => b.label),
    });
  }

  if (!opts.hideHealth && !opts.social && snap.health) {
    const h = snap.health;
    const lines: string[] = [];
    const a = num(h.first_half?.energy); const b = num(h.second_half?.energy);
    if (a !== null && b !== null && b > a) lines.push("Seu acompanhamento registrou melhora na percepção de disposição.");
    if (num(h.adaptations)) lines.push(`Durante o período, seu treino recebeu ${nice(h.adaptations)} adaptações para manter segurança e continuidade.`);
    if (num(h.checkins)) lines.push(`${nice(h.checkins)} check-ins diários respondidos no app.`);
    if (lines.length) push({ key: "saude", kicker: "ACOMPANHAMENTO", title: "Saúde e bem-estar", lines });
  }

  if (num(snap.community?.indications)) {
    push({
      key: "comunidade", kicker: "COMUNIDADE", value: nice(snap.community.indications),
      title: "Indicações que você fez para a EVO.",
      lines: num(snap.community.indications_converted)
        ? [`${nice(snap.community.indications_converted)} amigos matriculados por indicação sua.`] : [],
    });
  }

  if (opts.teamMessage) {
    push({
      key: "mensagem", kicker: "MENSAGEM DA EQUIPE",
      title: opts.teamMessage,
      lines: opts.teamMessageName ? [`— ${opts.teamMessageName}`] : [],
    });
  }

  const nc = opts.nextCycle || {};
  if (!opts.social && (nc.objective || nc.frequency || nc.priority)) {
    push({
      key: "proximo", kicker: "PRÓXIMO CICLO", title: "Seu próximo objetivo",
      lines: [nc.objective, nc.frequency, nc.priority, nc.recommendation].filter(Boolean) as string[],
    });
  }

  if (!opts.social) {
    push({
      key: "renovacao", kicker: "PRÓXIMO NÍVEL",
      title: "Você construiu muito até aqui. Vamos para o próximo nível?",
      lines: [],
    });
  }

  return out;
}
