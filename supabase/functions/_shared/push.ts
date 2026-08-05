import webpush from "npm:web-push@3.6.7";

export type Sub = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = {
  title: string;
  body?: string | null;
  url?: string | null;
  tag?: string;
};

let configured = false;

export function vapidPublicKey() {
  return Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
}

function configure() {
  if (configured) return;
  const pub = Deno.env.get("VAPID_PUBLIC_KEY");
  const priv = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contato@evotrainingclub.com";
  if (!pub || !priv) {
    throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY nao configuradas nos secrets do projeto.");
  }
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
}

export async function sendToSubscriptions(subs: Sub[], payload: PushPayload) {
  configure();
  const json = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    url: payload.url ?? "/",
    tag: payload.tag ?? "evo",
  });

  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          json,
        );
        sent++;
      } catch (e) {
        failed++;
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) staleIds.push(s.id);
        console.error(`push falhou [${status ?? "?"}] ${s.endpoint.slice(0, 60)}: ${String(e)}`);
      }
    }),
  );

  return { sent, failed, staleIds };
}
