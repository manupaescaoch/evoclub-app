import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SW_PATH = "/push-sw.js";

export type PushState =
  | "loading"
  | "unsupported"
  | "denied"
  | "off"
  | "on";

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as any).standalone === true;

const urlBase64ToUint8Array = (base64: string) => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

export const usePushNotifications = () => {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const needsInstallOnIOS = isIOS() && !isStandalone();

  const refresh = useCallback(async () => {
    if (!supported) { setState("unsupported"); return; }
    if (Notification.permission === "denied") { setState("denied"); return; }
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      setState(sub && Notification.permission === "granted" ? "on" : "off");
    } catch {
      setState("off");
    }
  }, [supported]);

  useEffect(() => { refresh(); }, [refresh]);

  const enable = useCallback(async () => {
    setError(null);
    if (!supported) { setState("unsupported"); return false; }
    setBusy(true);
    try {
      const cfg = await supabase.functions.invoke("push-config");
      const publicKey = (cfg.data as { publicKey?: string } | null)?.publicKey;
      if (!publicKey) {
        setError("As notificações ainda não foram configuradas pela equipe. Tente novamente mais tarde.");
        return false;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        setError(
          permission === "denied"
            ? "Permissão negada. Libere as notificações nas configurações do navegador."
            : "Permissão não concedida.",
        );
        return false;
      }

      const reg = await navigator.serviceWorker.register(SW_PATH);
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const { error: fnError } = await supabase.functions.invoke("push-subscribe", {
        body: {
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
          user_agent: navigator.userAgent.slice(0, 400),
        },
      });
      if (fnError) {
        setError("Não foi possível salvar sua inscrição. Tente novamente.");
        return false;
      }

      setState("on");
      return true;
    } catch (e) {
      console.error("Erro ao ativar push:", e);
      setError("Não foi possível ativar as notificações neste dispositivo.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported]);

  const disable = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await supabase.functions.invoke("push-unsubscribe", { body: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setState("off");
      return true;
    } catch (e) {
      console.error("Erro ao desativar push:", e);
      setError("Não foi possível desativar agora.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, error, supported, needsInstallOnIOS, isIOS: isIOS(), enable, disable, refresh };
};
