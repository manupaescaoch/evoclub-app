/** Os 12 grupos musculares oficiais (ordem de exibição fixa). */
export const OFFICIAL_MUSCLE_GROUPS = [
  "Peitoral",
  "Dorsal",
  "Quadríceps",
  "Deltóides",
  "Posterior",
  "Glúteos",
  "Adutores",
  "Panturrilha",
  "Abdômen",
  "Bíceps",
  "Tríceps",
  "Trapézio",
] as const;

export type OfficialMuscleGroup = (typeof OFFICIAL_MUSCLE_GROUPS)[number];

/** Metas semanais de séries por grupo oficial (adulto treinado natural).
 *  Recalibradas somando as metas dos grupos detalhados que foram fundidos:
 *  Dorsal = Latíssimo (14) · Deltóides = anterior 4 + lateral 6 + posterior 6
 *  Panturrilha = Gastrocnêmio 10 + Sóleo 8 · Abdômen = Reto 10 + Oblíquos 8 + Core 10
 *  Acessório conta 0,5 série (ver useTrainingPlan). */
export const WEEKLY_SET_TARGETS: Record<string, number> = {
  Peitoral: 14,
  Dorsal: 14,
  Quadríceps: 14,
  Deltóides: 16,
  Posterior: 12,
  Glúteos: 14,
  Adutores: 8,
  Panturrilha: 18,
  Abdômen: 28,
  Bíceps: 12,
  Tríceps: 12,
  Trapézio: 12,
};

/** Grupos que não entram no volume de força. */
export const NON_STRENGTH_GROUPS = ["Cardio", "Cardiovascular"];

/** Meta semanal do grupo (fallback conservador para grupos fora da lista). */
export const weeklyTarget = (group: string) => WEEKLY_SET_TARGETS[group] ?? 10;

/** Normaliza um valor vindo do banco para um dos 12 grupos oficiais (ou null). */
export const toOfficialGroup = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const v = raw.trim();
  return (OFFICIAL_MUSCLE_GROUPS as readonly string[]).includes(v) ? v : null;
};
