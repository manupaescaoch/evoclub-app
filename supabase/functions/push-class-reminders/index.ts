import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendToSubscriptions, type Sub } from "../_shared/push.ts";

const TZ = "America/Sao_Paulo";

// Retorna { weekday: 0-6, minutes: minutos desde 00:00 } no horario de Brasilia
function brazilNow() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekday = days.indexOf(map.weekday);
  const hour = parseInt(map.hour === "24" ? "0" : map.hour, 10);
  const minutes = hour * 60 + parseInt(map.minute, 10);
  return { weekday, minutes };
}

function toMinutes(time: string) {
  const [h, m] = time.split(":");
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

function hhmm(time: string) {
  return time.slice(0, 5);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { weekday, minutes } = brazilNow();

    const { data: classes, error: clsErr } = await admin
      .from("classes")
      .select("id, name, start_time, day_of_week, unit_id")
      .eq("day_of_week", weekday);
    if (clsErr) return json({ error: clsErr.message }, 500);

    // Janela de 25 a 35 minutos antes do inicio da aula
    const due = (classes ?? []).filter((c) => {
      const diff = toMinutes(String(c.start_time)) - minutes;
      return diff >= 25 && diff <= 35;
    });

    if (due.length === 0) return json({ ok: true, classes: 0, sent: 0 });

    const classIds = due.map((c) => c.id as string);

    const { data: bookings, error: bkErr } = await admin
      .from("class_bookings")
      .select("id, class_id, client_id, status")
      .in("class_id", classIds)
      .not("client_id", "is", null);
    if (bkErr) return json({ error: bkErr.message }, 500);

    const active = (bookings ?? []).filter(
      (b) => !b.status || ["confirmed", "confirmada", "booked", "reservado", "ativo"].includes(String(b.status).toLowerCase()),
    );
    if (active.length === 0) return json({ ok: true, classes: due.length, sent: 0 });

    // Evita reenvio: lembretes ja disparados nas ultimas 2 horas
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await admin
      .from("push_notifications")
      .select("booking_id")
      .eq("kind", "class_reminder")
      .gte("created_at", since);
    const alreadySent = new Set((recent ?? []).map((r) => r.booking_id as string));

    const pending = active.filter((b) => !alreadySent.has(b.id as string));
    if (pending.length === 0) return json({ ok: true, classes: due.length, sent: 0 });

    const classById = new Map(due.map((c) => [c.id as string, c]));
    const clientIds = [...new Set(pending.map((b) => b.client_id as number))];

    const { data: subs, error: subErr } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, client_id")
      .eq("active", true)
      .in("client_id", clientIds);
    if (subErr) return json({ error: subErr.message }, 500);

    const subsByClient = new Map<number, Sub[]>();
    for (const s of subs ?? []) {
      const cid = s.client_id as number;
      const arr = subsByClient.get(cid) ?? [];
      arr.push(s as Sub);
      subsByClient.set(cid, arr);
    }

    let totalSent = 0;
    let totalFailed = 0;
    const staleAll: string[] = [];
    const logs: Record<string, unknown>[] = [];

    for (const b of pending) {
      const cls = classById.get(b.class_id as string);
      const target = subsByClient.get(b.client_id as number) ?? [];
      if (!cls || target.length === 0) continue;

      const { sent, failed, staleIds } = await sendToSubscriptions(target, {
        title: "Sua aula comeca em 30 minutos",
        body: `${cls.name ?? "Aula"} as ${hhmm(String(cls.start_time))}. Bora treinar!`,
        url: "/",
        tag: `class-${cls.id}`,
      });
      totalSent += sent;
      totalFailed += failed;
      staleAll.push(...staleIds);

      logs.push({
        title: "Sua aula comeca em 30 minutos",
        body: `${cls.name ?? "Aula"} as ${hhmm(String(cls.start_time))}`,
        url: "/",
        target: "student",
        kind: "class_reminder",
        client_id: b.client_id,
        unit_id: cls.unit_id ?? null,
        booking_id: b.id,
        sent_count: sent,
        failed_count: failed,
        created_by: "sistema",
      });
    }

    if (staleAll.length) {
      await admin.from("push_subscriptions").update({ active: false }).in("id", staleAll);
    }
    if (logs.length) {
      const { error } = await admin.from("push_notifications").insert(logs);
      if (error) console.error("erro ao registrar lembretes:", error.message);
    }

    return json({ ok: true, classes: due.length, reminders: logs.length, sent: totalSent, failed: totalFailed });
  } catch (e) {
    console.error("push-class-reminders exception:", String(e));
    return json({ error: String(e) }, 500);
  }
});
