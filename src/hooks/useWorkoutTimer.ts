import { useCallback, useEffect, useRef, useState } from "react";

type TimerState = { pausedMs: number; pausedAt: number | null };

const key = (logId: string) => `evo.workout.timer.${logId}`;

const read = (logId: string | null): TimerState => {
  if (!logId) return { pausedMs: 0, pausedAt: null };
  try {
    const raw = localStorage.getItem(key(logId));
    if (raw) return JSON.parse(raw) as TimerState;
  } catch {
    /* armazenamento indisponível */
  }
  return { pausedMs: 0, pausedAt: null };
};

const write = (logId: string | null, s: TimerState) => {
  if (!logId) return;
  try {
    localStorage.setItem(key(logId), JSON.stringify(s));
  } catch {
    /* armazenamento indisponível */
  }
};

export const formatDuration = (totalSeconds: number) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, "0")).join(":");
};

/**
 * Cronômetro do treino baseado no horário real de início (started_at).
 * Sobrevive a troca de página, tela bloqueada, fechar/abrir o app e perda de conexão,
 * porque o tempo é sempre recalculado a partir de startedAt menos as pausas.
 */
export function useWorkoutTimer(
  logId: string | null,
  startedAt: number | null,
  initialPausedMs = 0
) {
  const [state, setState] = useState<TimerState>(() => {
    const stored = read(logId);
    return { pausedMs: Math.max(stored.pausedMs, initialPausedMs), pausedAt: stored.pausedAt };
  });
  const [, tick] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  // recarrega o estado guardado quando o registro muda
  useEffect(() => {
    if (!logId) return;
    const stored = read(logId);
    setState({ pausedMs: Math.max(stored.pausedMs, initialPausedMs), pausedAt: stored.pausedAt });
  }, [logId, initialPausedMs]);

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    const onVisible = () => tick((n) => n + 1);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [startedAt]);

  const update = useCallback(
    (next: TimerState) => {
      setState(next);
      write(logId, next);
    },
    [logId]
  );

  const pause = useCallback(() => {
    if (stateRef.current.pausedAt) return;
    update({ ...stateRef.current, pausedAt: Date.now() });
  }, [update]);

  const resume = useCallback(() => {
    const cur = stateRef.current;
    if (!cur.pausedAt) return;
    update({ pausedMs: cur.pausedMs + (Date.now() - cur.pausedAt), pausedAt: null });
  }, [update]);

  const clear = useCallback(() => {
    if (logId) {
      try {
        localStorage.removeItem(key(logId));
      } catch {
        /* ignorar */
      }
    }
    setState({ pausedMs: 0, pausedAt: null });
  }, [logId]);

  const pausedTotal = state.pausedMs + (state.pausedAt ? Date.now() - state.pausedAt : 0);
  const elapsedMs = startedAt ? Math.max(0, Date.now() - startedAt - pausedTotal) : 0;

  return {
    elapsedSeconds: Math.floor(elapsedMs / 1000),
    label: formatDuration(elapsedMs / 1000),
    paused: !!state.pausedAt,
    pausedMs: state.pausedMs,
    pause,
    resume,
    clear,
  };
}
