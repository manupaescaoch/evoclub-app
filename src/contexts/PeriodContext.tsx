import { createContext, useContext, useMemo, useState, ReactNode } from "react";

export type PeriodMode = "today" | "week" | "month" | "custom";

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** "Hoje" segue o fuso de Brasília, padrão da operação. */
export const brToday = () => {
  const now = new Date();
  const br = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return br;
};

function rangeFor(mode: PeriodMode, from: string, to: string) {
  const today = brToday();
  if (mode === "today") return { from: iso(today), to: iso(today) };
  if (mode === "week") {
    const dow = today.getDay(); // 0 dom
    const start = new Date(today); start.setDate(today.getDate() - ((dow + 6) % 7)); // segunda
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return { from: iso(start), to: iso(end) };
  }
  if (mode === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: iso(start), to: iso(end) };
  }
  return { from, to };
}

type Ctx = {
  mode: PeriodMode;
  setMode: (m: PeriodMode) => void;
  from: string;
  to: string;
  setCustom: (from: string, to: string) => void;
  label: string;
};

const PeriodContext = createContext<Ctx | null>(null);

export const PeriodProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<PeriodMode>(
    () => (localStorage.getItem("admin_period_mode") as PeriodMode) || "month"
  );
  const [customFrom, setCustomFrom] = useState(() => localStorage.getItem("admin_period_from") || iso(brToday()));
  const [customTo, setCustomTo] = useState(() => localStorage.getItem("admin_period_to") || iso(brToday()));

  const setMode = (m: PeriodMode) => { setModeState(m); localStorage.setItem("admin_period_mode", m); };
  const setCustom = (f: string, t: string) => {
    setCustomFrom(f); setCustomTo(t);
    localStorage.setItem("admin_period_from", f);
    localStorage.setItem("admin_period_to", t);
    setMode("custom");
  };

  const { from, to } = useMemo(() => rangeFor(mode, customFrom, customTo), [mode, customFrom, customTo]);

  const label = useMemo(() => {
    if (mode === "today") return "Hoje";
    if (mode === "week") return "Semana";
    if (mode === "month") return "Mês";
    const f = new Date(`${from}T12:00:00`).toLocaleDateString("pt-BR");
    const t = new Date(`${to}T12:00:00`).toLocaleDateString("pt-BR");
    return `${f} — ${t}`;
  }, [mode, from, to]);

  return (
    <PeriodContext.Provider value={{ mode, setMode, from, to, setCustom, label }}>
      {children}
    </PeriodContext.Provider>
  );
};

export const usePeriod = () => {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod must be used within PeriodProvider");
  return ctx;
};
