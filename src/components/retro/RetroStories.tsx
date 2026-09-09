import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, X, Share2, CalendarDays, BarChart3, Target, Clock,
  Dumbbell, Flame, TrendingUp, Crown, Star, HeartPulse, Users, Quote, Rocket, CalendarCheck,
} from "lucide-react";
import { RetroSnapshot, buildStories, Story } from "@/lib/retro";

type Props = {
  snapshot: RetroSnapshot;
  hidden?: string[];
  texts?: Record<string, string> | null;
  teamMessage?: string | null;
  teamMessageName?: string | null;
  nextCycle?: Record<string, string> | null;
  hideHealth?: boolean;
  hidePhotos?: boolean;
  social?: boolean;
  onClose?: () => void;
  onRenew?: () => void;
  onShare?: () => void;
  /** Ocupa a tela inteira (sem rolagem), estilo stories. */
  fullscreen?: boolean;
};

type Theme = {
  bg: string;
  motto: string;
  icons: React.ElementType[];
  mark: React.ElementType | null;
};

const THEMES: Record<string, Theme> = {
  abertura: {
    bg: "linear-gradient(160deg,#0057FF 0%,#0B2FB8 45%,#050B2E 100%)",
    motto: "DISCIPLINA HOJE, RESULTADOS SEMPRE.",
    icons: [Star, CalendarDays], mark: null,
  },
  frequencia: {
    bg: "linear-gradient(150deg,#0B2FB8 0%,#0057FF 40%,#04081F 100%)",
    motto: "EVOLUIR TAMBÉM É CONSTÂNCIA.",
    icons: [CalendarDays, BarChart3, Target], mark: null,
  },
  treinos: {
    bg: "linear-gradient(155deg,#040C2B 0%,#0B37C9 55%,#0057FF 100%)",
    motto: "MAIS QUE TREINO.",
    icons: [BarChart3, Clock, Dumbbell], mark: Dumbbell,
  },
  constancia: {
    bg: "linear-gradient(150deg,#101A4D 0%,#2B2E8C 50%,#0057FF 100%)",
    motto: "EVOLUIR TAMBÉM É ESTAR PRESENTE.",
    icons: [CalendarDays, BarChart3], mark: Flame,
  },
  recorde: {
    bg: "linear-gradient(150deg,#0057FF 0%,#0A2BA8 55%,#050B2E 100%)",
    motto: "DISCIPLINA HOJE, RESULTADOS SEMPRE.",
    icons: [TrendingUp, Dumbbell], mark: TrendingUp,
  },
  corpo: {
    bg: "linear-gradient(160deg,#0057FF 0%,#0730BE 50%,#071142 100%)",
    motto: "SEU CORPO REGISTRA O SEU ESFORÇO.",
    icons: [BarChart3, TrendingUp], mark: BarChart3,
  },
  ranking: {
    bg: "linear-gradient(155deg,#050D33 0%,#0B37C9 60%,#0057FF 100%)",
    motto: "MESMA ENERGIA. RESULTADOS REAIS.",
    icons: [Crown], mark: Crown,
  },
  selos: {
    bg: "linear-gradient(160deg,#0B1B63 0%,#0057FF 55%,#0A2BA8 100%)",
    motto: "CADA SELO É UMA ESCOLHA REPETIDA.",
    icons: [Star, Star, Star, Star, Star], mark: Star,
  },
  saude: {
    bg: "linear-gradient(155deg,#0057FF 0%,#0A2599 55%,#04091F 100%)",
    motto: "CUIDAR DE VOCÊ É TREINO TAMBÉM.",
    icons: [HeartPulse, CalendarCheck, BarChart3], mark: HeartPulse,
  },
  comunidade: {
    bg: "linear-gradient(150deg,#0A2BA8 0%,#0057FF 50%,#050B2E 100%)",
    motto: "JUNTOS VAMOS MAIS LONGE.",
    icons: [Users], mark: Users,
  },
  mensagem: {
    bg: "linear-gradient(160deg,#0057FF 0%,#0B2FB8 45%,#040A26 100%)",
    motto: "DISCIPLINA CONSTRÓI LIBERDADE",
    icons: [], mark: Quote,
  },
  proximo: {
    bg: "linear-gradient(155deg,#04091F 0%,#0B37C9 60%,#0057FF 100%)",
    motto: "O PRÓXIMO CICLO COMEÇA AGORA.",
    icons: [Target, CalendarDays, Rocket], mark: Rocket,
  },
  renovacao: {
    bg: "linear-gradient(160deg,#0057FF 0%,#0A2BA8 50%,#050B2E 100%)",
    motto: "PRÓXIMO NÍVEL.",
    icons: [], mark: Rocket,
  },
};

const FALLBACK: Theme = {
  bg: "linear-gradient(160deg,#0057FF 0%,#0B2FB8 50%,#050B2E 100%)",
  motto: "DISCIPLINA HOJE, RESULTADOS SEMPRE.",
  icons: [Star], mark: null,
};

export default function RetroStories(p: Props) {
  const stories = useMemo<Story[]>(
    () => buildStories(p.snapshot, {
      hidden: p.hidden, hideHealth: p.hideHealth, hidePhotos: p.hidePhotos,
      teamMessage: p.teamMessage, teamMessageName: p.teamMessageName,
      nextCycle: p.nextCycle, texts: p.texts, social: p.social,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.snapshot, p.hidden, p.texts, p.teamMessage, p.nextCycle, p.hideHealth, p.hidePhotos, p.social]
  );
  const [i, setI] = useState(0);
  const cur = stories[Math.min(i, stories.length - 1)];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setI((v) => Math.min(v + 1, stories.length - 1));
      if (e.key === "ArrowLeft") setI((v) => Math.max(v - 1, 0));
      if (e.key === "Escape") p.onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stories.length, p.onClose]);

  useEffect(() => {
    if (!p.fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [p.fullscreen]);

  if (!cur) {
    return (
      <div className="flex items-center justify-center p-8 font-dm text-sm text-muted-foreground">
        Ainda não há dados suficientes para montar a retrospectiva.
      </div>
    );
  }

  const theme = THEMES[cur.key] || FALLBACK;
  const Mark = theme.mark;
  const bars = cur.bars || [];
  const maxBar = Math.max(1, ...bars.map((b) => b.value));
  const isLast = i === stories.length - 1;
  const unit = p.snapshot.client?.unit_name;

  return (
    <div className={p.fullscreen
      ? "fixed inset-0 z-50 mx-auto w-full max-w-[430px] overflow-hidden bg-black"
      : "relative mx-auto w-full max-w-[390px]"}>
      <div
        style={{ background: theme.bg }}
        className={`relative w-full overflow-hidden text-white ${
          p.fullscreen ? "h-[100dvh] rounded-none" : "aspect-[9/16] rounded-[28px]"}`}
      >
        {/* orbes decorativos */}
        <div className="pointer-events-none absolute -right-24 -top-16 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-white/[0.07] blur-2xl" />
        <div className="pointer-events-none absolute bottom-1/4 right-[-30%] h-[420px] w-[420px] rounded-full border border-white/10" />

        {Mark && (
          <Mark className="pointer-events-none absolute -right-6 top-1/3 h-56 w-56 text-white/[0.07]" strokeWidth={1} />
        )}

        {/* progresso */}
        <div className={`absolute left-0 right-0 z-20 flex gap-1.5 px-4 ${p.fullscreen ? "safe-top pt-3" : "top-3"}`}>
          {stories.map((s, idx) => (
            <span key={s.key}
              className={`h-[3px] flex-1 rounded-full transition-all ${
                idx < i ? "bg-white/90" : idx === i ? "bg-white shadow-[0_0_10px_2px_rgba(255,255,255,0.55)]" : "bg-white/25"}`} />
          ))}
        </div>

        {p.onClose && (
          <button onClick={p.onClose} aria-label="Fechar"
            className={`absolute right-3 z-30 rounded-full bg-black/25 p-2 backdrop-blur ${p.fullscreen ? "top-12" : "top-8"}`}>
            <X className="h-4 w-4" />
          </button>
        )}

        {/* zonas de toque */}
        <button aria-label="Anterior" onClick={() => setI((v) => Math.max(v - 1, 0))}
          className="absolute bottom-0 left-0 top-0 z-10 w-1/3" />
        <button aria-label="Próximo" onClick={() => setI((v) => Math.min(v + 1, stories.length - 1))}
          className="absolute bottom-0 right-0 top-0 z-10 w-2/3" />

        {/* mote vertical */}
        <p className="pointer-events-none absolute right-5 top-[14%] z-0 max-w-[92px] text-right font-dm text-[9px] font-medium uppercase leading-[1.7] tracking-[0.22em] text-white/45">
          {theme.motto}
        </p>

        <div className={`relative z-0 flex h-full flex-col gap-5 px-6 ${
          p.fullscreen
            ? "pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(4.5rem+env(safe-area-inset-top))]"
            : "pb-8 pt-12"}`}>

          {cur.kicker && (
            <p className="font-dm text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">{cur.kicker}</p>
          )}

          {cur.value && (
            <p className="font-barlow text-[92px] font-bold leading-[0.82] tracking-tight drop-shadow-[0_6px_30px_rgba(0,0,0,0.35)]">
              {cur.value}
              {cur.suffix && <span className="ml-2 align-baseline text-[34px] font-semibold text-white/75">{cur.suffix}</span>}
            </p>
          )}

          <h2 className={`font-barlow font-bold uppercase leading-[0.98] tracking-tight ${
            cur.title.length > 70 ? "text-[26px]" : "text-[32px]"}`}>
            {cur.title}
          </h2>

          {!!cur.lines.length && (
            <div className="space-y-3">
              {cur.lines.map((l, idx) => {
                const Icon = theme.icons[idx % Math.max(1, theme.icons.length)];
                return (
                  <div key={idx} className="flex items-start gap-3">
                    {Icon && theme.icons.length > 0 && (
                      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 backdrop-blur">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                    )}
                    <p className="font-dm text-[15px] leading-snug text-white/90">{l}</p>
                  </div>
                );
              })}
            </div>
          )}

          {!!bars.length && (
            <div className="mt-auto">
              <p className="mb-2 font-dm text-[9px] font-semibold uppercase tracking-[0.28em] text-white/55">
                Seus treinos por mês
              </p>
              <div className="flex h-[130px] items-end gap-2">
                {bars.map((b) => {
                  const top = b.value === maxBar;
                  return (
                    <div key={b.label} className="flex flex-1 flex-col items-center gap-1.5">
                      <span className={`font-barlow text-[11px] font-bold ${top ? "text-white" : "text-white/70"}`}>
                        {b.value}
                      </span>
                      <div
                        className={`w-full rounded-t-lg ${top
                          ? "bg-gradient-to-t from-white/60 to-white shadow-[0_0_16px_rgba(255,255,255,0.5)]"
                          : "bg-gradient-to-t from-white/20 to-white/55"}`}
                        style={{ height: `${Math.max(8, (b.value / maxBar) * 88)}px` }}
                      />
                      <span className="font-dm text-[8px] font-semibold uppercase tracking-widest text-white/60">
                        {b.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isLast && (p.onRenew || p.onShare) && (
            <div className="relative z-20 mt-auto flex flex-col gap-2">
              {p.onRenew && (
                <button onClick={p.onRenew}
                  className="rounded-2xl bg-white py-3.5 font-barlow text-base font-bold uppercase tracking-wide text-primary">
                  Quero renovar
                </button>
              )}
              {p.onShare && (
                <button onClick={p.onShare}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/40 py-3 font-dm text-sm font-semibold">
                  <Share2 className="h-4 w-4" /> Compartilhar
                </button>
              )}
            </div>
          )}

          <div className={`flex items-center gap-3 ${bars.length || isLast ? "pt-2" : "mt-auto"}`}>
            <p className="font-barlow text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">
              EVO CLUB{unit ? ` • ${unit}` : ""}
            </p>
            <span className="h-px flex-1 bg-white/25" />
          </div>
        </div>
      </div>

      {!p.fullscreen && (
        <div className="mt-3 flex items-center justify-between">
          <button onClick={() => setI((v) => Math.max(v - 1, 0))} disabled={i === 0}
            className="flex items-center gap-1 font-dm text-xs text-muted-foreground disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <span className="font-dm text-xs text-muted-foreground">{i + 1} / {stories.length}</span>
          <button onClick={() => setI((v) => Math.min(v + 1, stories.length - 1))} disabled={isLast}
            className="flex items-center gap-1 font-dm text-xs text-muted-foreground disabled:opacity-40">
            Próximo <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
