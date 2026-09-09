import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const headers = { ...corsHeaders, "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const agentKey = req.headers.get("x-agent-key") ?? "";
    if (!agentKey) return json({ error: "missing x-agent-key" }, 401);

    const { data: device } = await admin
      .from("turnstile_devices")
      .select("id, unit_id, active, name")
      .eq("agent_key", agentKey)
      .maybeSingle();

    if (!device || !device.active) return json({ error: "invalid agent key" }, 401);

    await admin.from("turnstile_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", device.id);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const url = new URL(req.url);
    const action = (body as any).action ?? url.searchParams.get("action") ?? "roster";

    if (action === "roster") {
      const { data, error } = await admin.rpc("turnstile_roster", { _unit: device.unit_id });
      if (error) return json({ error: error.message }, 400);
      return json({ device: device.name, unit_id: device.unit_id, people: data ?? [] });
    }

    if (action === "events") {
      const events = Array.isArray((body as any).events) ? (body as any).events : [];
      if (!events.length) return json({ inserted: 0 });

      // Resolve alunos por id ou CPF (apenas dígitos)
      const cpfs = events.map((e: any) => String(e.identifier ?? "").replace(/\D/g, "")).filter(Boolean);
      const map = new Map<string, number>();
      if (cpfs.length) {
        const { data: clients } = await admin
          .from("clients")
          .select("id, cpf")
          .not("cpf", "is", null);
        for (const c of clients ?? []) {
          const digits = String(c.cpf ?? "").replace(/\D/g, "");
          if (digits) map.set(digits, c.id as number);
        }
      }

      const rows = events.map((e: any) => {
        const digits = String(e.identifier ?? "").replace(/\D/g, "");
        return {
          device_id: device.id,
          unit_id: device.unit_id,
          client_id: e.client_id ?? map.get(digits) ?? null,
          identifier: e.identifier ?? null,
          direction: e.direction === "out" ? "out" : "in",
          method: e.method ?? null,
          allowed: e.allowed !== false,
          reason: e.reason ?? null,
          event_at: e.event_at ?? new Date().toISOString(),
          raw: e.raw ?? e,
        };
      });

      const { error } = await admin.from("turnstile_access_events").insert(rows);
      if (error) {
        console.error("insert events failed:", error.message);
        return json({ error: error.message }, 400);
      }
      return json({ inserted: rows.length });
    }

    return json({ error: `unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("catraca-agent error:", e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
