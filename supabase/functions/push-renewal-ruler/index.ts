import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendToSubscriptions, type Sub } from "../_shared/push.ts";

const TZ = "America/Sao_Paulo";
const MILESTONES = [21, 14, 7];

function brazilToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date()); // YYYY-MM-DD
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const today = brazilToday();
    const targets = MILESTONES.map((m) => ({ milestone: m, date: addDays(today, m) }));

    const { data: clients, error } = await admin
      .from("clients")
      .select("id, name, unit_id, contract_end")
      .in("contract_end", targets.map((t) => t.date));
    if (error) return json({ error: error.message }, 500);
    if (!clients?.length) return json({ ok: true, sent: 0 });

    const byDate = new Map(targets.map((t) => [t.date, t.milestone]));
    let sent = 0;

    for (const c of clients) {
      const milestone = byDate.get(String(c.contract_end).slice(0, 10));
      if (!milestone) continue;

      const { error: dupErr } = await admin.from("renewal_reminders").insert({
        client_id: c.id,
        cycle_end: c.contract_end,
        milestone,
      });
      if (dupErr) continue; // aviso ja enviado

      const title = `Seu plano vence em ${milestone} dias`;
      const body =
        milestone === 7
          ? "Ultima semana do seu ciclo. Garanta sua renovacao e continue evoluindo."
          : "Renove agora e mantenha sua sequencia de treinos sem pausa.";

      await admin.from("notifications").insert({
        client_id: c.id,
        title,
        body,
        kind: "renewal_ruler",
        url: "/",
      });

      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("active", true)
        .eq("client_id", c.id);

      const list = (subs ?? []) as Sub[];
      if (!list.length) continue;

      const res = await sendToSubscriptions(list, { title, body, url: "/", tag: `renewal-${milestone}` });
      sent += res.sent;
      if (res.staleIds.length) {
        await admin.from("push_subscriptions").update({ active: false }).in("id", res.staleIds);
      }

      await admin.from("push_notifications").insert({
        title,
        body,
        url: "/",
        target: "student",
        kind: "renewal_ruler",
        client_id: c.id,
        unit_id: c.unit_id ?? null,
        sent_count: res.sent,
        failed_count: res.failed,
      });
    }

    return json({ ok: true, sent });
  } catch (e) {
    console.error("push-renewal-ruler exception:", String(e));
    return json({ error: String(e) }, 500);
  }
});
