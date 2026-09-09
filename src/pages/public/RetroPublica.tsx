import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import RetroStories from "@/components/retro/RetroStories";
import RetroFullView from "@/components/retro/RetroFullView";

export default function RetroPublica() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"stories" | "completa">("stories");
  const [renewing, setRenewing] = useState(false);
  const [renewed, setRenewed] = useState(false);

  useEffect(() => {
    if (!token) return;
    (supabase as any).rpc("retro_open", { _token: token }).then(({ data, error }: any) => {
      if (error) return setErr("Não foi possível abrir a retrospectiva.");
      if (data?.error) {
        setErr(data.error === "expirado" ? "Este link expirou."
          : data.error === "revogado" ? "Este link não está mais disponível."
          : "Retrospectiva não encontrada.");
        return;
      }
      setData(data);
    });
  }, [token]);

  const renovar = async () => {
    if (!token) return;
    setRenewing(true);
    const { data, error } = await (supabase as any).rpc("retro_renew_intent", { _token: token });
    setRenewing(false);
    if (error || data?.ok === false) return toast.error("Não foi possível registrar seu interesse.");
    setRenewed(true);
    toast.success("Recebemos seu interesse! A equipe vai falar com você.");
  };

  const compartilhar = async () => {
    const url = window.location.href;
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title: "Minha Retrospectiva EVO", url }); return; } catch { /* cancelado */ }
    }
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success("Link copiado");
  };

  useEffect(() => {
    document.title = "Retrospectiva EVO";
  }, []);

  if (err) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background p-8 text-center">
        <p className="font-dm text-sm text-muted-foreground">{err}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const common = {
    snapshot: data.snapshot || {},
    hidden: data.hidden_cards || [],
    texts: data.custom_texts || {},
    teamMessage: data.team_message || null,
    teamMessageName: data.team_message_name || null,
    nextCycle: data.next_cycle || {},
    hideHealth: !data.snapshot?.health,
    hidePhotos: !data.snapshot?.photos,
    social: !!data.social,
  };

  return (
    <main className="min-h-[100dvh] bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-[420px] space-y-4">
        <h1 className="font-barlow text-center text-xl font-bold uppercase tracking-wide">Retrospectiva EVO</h1>

        <div className="flex justify-center gap-2">
          {(["stories", "completa"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-1.5 font-dm text-sm ${mode === m ? "bg-primary text-primary-foreground" : "border border-border"}`}>
              {m === "stories" ? "Stories" : "Ver tudo"}
            </button>
          ))}
        </div>

        {mode === "stories" ? (
          <RetroStories {...common}
            onShare={compartilhar}
            onRenew={data.social || renewed ? undefined : renovar} />
        ) : (
          <RetroFullView {...common} onRenew={data.social || renewed ? undefined : renovar} />
        )}

        {renewed && (
          <p className="rounded-xl bg-emerald-50 p-3 text-center font-dm text-sm text-emerald-700">
            Interesse registrado. Nossa equipe entra em contato com você.
          </p>
        )}
        {renewing && <p className="text-center font-dm text-xs text-muted-foreground">Enviando...</p>}
      </div>
    </main>
  );
}
