/** Metas semanais de séries por grupo muscular (adulto treinado natural).
 *  Grandes 12–16 · médios 10–14 · pequenos/estabilizadores 8–10.
 *  Auxiliar conta 0,5 série (ver useTrainingPlan). */
export const WEEKLY_SET_TARGETS: Record<string, number> = {
  // grandes
  "Peitoral": 14,
  "Latíssimo do dorso": 14,
  "Quadríceps": 14,
  "Posterior de coxa": 12,
  "Glúteos": 14,
  // médios
  "Trapézio": 12,
  "Bíceps": 12,
  "Tríceps": 12,
  // deltoides: meta somada ~12 séries/semana (4 por porção)
  "Deltoide anterior": 4,
  "Deltoide lateral": 6,
  "Deltoide posterior": 6,
  // pequenos / estabilizadores
  "Braquial": 8,
  "Braquiorradial": 8,
  "Gastrocnêmio": 10,
  "Sóleo": 8,
  "Reto abdominal": 10,
  "Oblíquos": 8,
  "Core": 10,
  "Eretor da coluna": 8,
  "Adutores": 8,
  "Glúteo médio": 10,
  "Antebraço": 8,
  "Flexores do antebraço": 8,
  "Extensores do antebraço": 8,
};

/** Grupos que não entram no volume de força. */
export const NON_STRENGTH_GROUPS = ["Cardio", "Cardiovascular"];

/** Meta semanal do grupo (fallback conservador para grupos novos). */
export const weeklyTarget = (group: string) => WEEKLY_SET_TARGETS[group] ?? 10;
