import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X, Share2 } from "lucide-react";
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

const GRADIENTS = [
  "from-primary via-blue-600 to-indigo-900",
  "from-indigo-900 via-primary to-blue-500",
  "from-blue-950 via-indigo-800 to-primary",
  "from-primary via-indigo-700 to-slate-900",
];

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

  const maxBar = Math.max(1, ...(cur.bars || []).map((b) => b.value));
  const isLast = i === stories.length - 1;

  return (
    <div className={p.fullscreen
      ? "fixed inset-0 z-50 mx-auto w-full max-w-[430px] overflow-hidden bg-black"
      : "relative mx-auto w-full max-w-[390px]"}>
      <div
        className={`relative w-full overflow-hidden bg-gradient-to-b ${GRADIENTS[i % GRADIENTS.length]} text-white ${
          p.fullscreen ? "h-[100dvh] rounded-none" : "aspect-[9/16] rounded-3xl"}`}
      >
        {/* progresso */}
        <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 p-3">
          {stories.map((s, idx) => (
            <span key={s.key} className={`h-1 flex-1 rounded-full ${idx <= i ? "bg-white" : "bg-white/30"}`} />
          ))}
        </div>

        {p.onClose && (
          <button onClick={p.onClose} aria-label="Fechar" className="absolute right-3 top-6 z-20 rounded-full bg-black/20 p-1.5">
            <X className="h-4 w-4" />
          </button>
        )}

        {/* zonas de toque */}
        <button aria-label="Anterior" onClick={() => setI((v) => Math.max(v - 1, 0))}
          className="absolute bottom-0 left-0 top-0 z-10 w-1/3" />
        <button aria-label="Próximo" onClick={() => setI((v) => Math.min(v + 1, stories.length - 1))}
          className="absolute bottom-0 right-0 top-0 z-10 w-2/3" />

        <div className="relative z-0 flex h-full flex-col justify-end gap-4 p-6 pb-10">
          {cur.kicker && (
            <p className="font-dm text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{cur.kicker}</p>
          )}
          {cur.value && (
            <p className="font-barlow text-[68px] font-bold leading-none tracking-tight">
              {cur.value}
              {cur.suffix && <span className="ml-1 text-2xl font-semibold">{cur.suffix}</span>}
            </p>
          )}
          <h2 className="font-barlow text-3xl font-bold uppercase leading-tight">{cur.title}</h2>
          <div className="space-y-1.5">
            {cur.lines.map((l, idx) => (
              <p key={idx} className="font-dm text-sm leading-snug text-white/85">{l}</p>
            ))}
          </div>

          {!!(cur.bars || []).length && (
            <div className="flex h-24 items-end gap-1.5 pt-2">
              {cur.bars!.map((b) => (
                <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-white/85" style={{ height: `${(b.value / maxBar) * 76}px` }} />
                  <span className="font-dm text-[9px] uppercase text-white/70">{b.label}</span>
                </div>
              ))}
            </div>
          )}

          {isLast && (p.onRenew || p.onShare) && (
            <div className="relative z-20 flex flex-col gap-2 pt-2">
              {p.onRenew && (
                <button onClick={p.onRenew}
                  className="rounded-xl bg-white py-3 font-barlow text-base font-bold uppercase text-primary">
                  Quero renovar
                </button>
              )}
              {p.onShare && (
                <button onClick={p.onShare}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/40 py-2.5 font-dm text-sm font-semibold">
                  <Share2 className="h-4 w-4" /> Compartilhar
                </button>
              )}
            </div>
          )}

          <p className="font-barlow text-xs font-bold uppercase tracking-widest text-white/60">
            EVO CLUB {p.snapshot.client?.unit_name ? `• ${p.snapshot.client.unit_name}` : ""}
          </p>
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
