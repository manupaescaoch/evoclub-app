import { useState } from "react";
import { ChevronLeft, Loader2, Sparkles } from "lucide-react";
import { useMyRetro } from "@/hooks/useRetrospectiva";
import RetroStories from "@/components/retro/RetroStories";
import RetroFullView from "@/components/retro/RetroFullView";

type Props = { onBack: () => void; onNavigate?: (screen: string) => void };

export default function RetrospectivaAlunoTab({ onBack, onNavigate }: Props) {
  const { data, loading } = useMyRetro();
  const [mode, setMode] = useState<"stories" | "completa">("stories");

  const common = data?.found ? {
    snapshot: data.snapshot || {},
    hidden: data.hidden_cards || [],
    texts: data.custom_texts || {},
    teamMessage: data.team_message || null,
    teamMessageName: data.team_message_name || null,
    nextCycle: data.next_cycle || {},
    hidePhotos: !data.snapshot?.photos?.consent,
  } : null;

  return (
    <div className="min-h-[100dvh] bg-background px-4 pb-24 pt-5">
      <header className="mb-4 flex items-center gap-3">
        <button onClick={onBack} aria-label="Voltar" className="rounded-full bg-muted p-2">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h1 className="font-barlow text-xl font-bold uppercase tracking-wide">Retrospectiva EVO</h1>
      </header>

      {loading && (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      )}

      {!loading && !data?.found && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <Sparkles className="mx-auto mb-3 h-6 w-6 text-primary" />
          <p className="font-dm text-sm text-muted-foreground">
            Sua retrospectiva ainda não foi liberada. Continue treinando: em breve a equipe libera a sua.
          </p>
        </div>
      )}

      {!loading && common && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(["stories", "completa"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`rounded-lg px-3 py-1.5 font-dm text-sm ${mode === m ? "bg-primary text-primary-foreground" : "border border-border"}`}>
                {m === "stories" ? "Stories" : "Ver tudo"}
              </button>
            ))}
          </div>
          {mode === "stories"
            ? <RetroStories {...common} fullscreen onClose={() => setMode("completa")} onRenew={() => onNavigate?.("plano")} />
            : <RetroFullView {...common} onRenew={() => onNavigate?.("plano")} />}
        </div>
      )}
    </div>
  );
}
