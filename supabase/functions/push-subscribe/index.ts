import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const BodySchema = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(10).max(500),
  auth: z.string().min(5).max(500),
  user_agent: z.string().max(500).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Nao autenticado" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Sessao invalida" }, 401);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: client } = await admin
      .from("clients")
      .select("id")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();

    const { error } = await admin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userData.user.id,
          client_id: client?.id ?? null,
          endpoint: parsed.data.endpoint,
          p256dh: parsed.data.p256dh,
          auth: parsed.data.auth,
          user_agent: parsed.data.user_agent ?? null,
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      );

    if (error) {
      console.error("push-subscribe erro:", error.message);
      return json({ error: error.message }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("push-subscribe exception:", String(e));
    return json({ error: String(e) }, 500);
  }
});
