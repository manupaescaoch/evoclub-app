import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { sendToSubscriptions, type Sub } from "../_shared/push.ts";

const BodySchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().max(500).optional(),
  url: z.string().max(300).optional(),
  target: z.enum(["student", "unit", "all"]),
  client_id: z.number().int().positive().optional(),
  unit_id: z.string().uuid().optional(),
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

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: canManage } = await admin.rpc("can_manage_training", {
      _user_id: userData.user.id,
    });
    if (!canManage) return json({ error: "Sem permissao para enviar notificacoes" }, 403);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { title, body, url, target, client_id, unit_id } = parsed.data;

    if (target === "student" && !client_id) return json({ error: "Selecione o aluno" }, 400);
    if (target === "unit" && !unit_id) return json({ error: "Selecione a unidade" }, 400);

    let clientIds: number[] | null = null;
    if (target === "student") {
      clientIds = [client_id!];
    } else if (target === "unit") {
      const { data: clients, error } = await admin
        .from("clients")
        .select("id")
        .eq("unit_id", unit_id!);
      if (error) return json({ error: error.message }, 500);
      clientIds = (clients ?? []).map((c) => c.id as number);
    }

    let q = admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("active", true);
    if (clientIds) {
      if (clientIds.length === 0) return json({ error: "Nenhum aluno nesse destino" }, 400);
      q = q.in("client_id", clientIds);
    }
    const { data: subs, error: subErr } = await q;
    if (subErr) return json({ error: subErr.message }, 500);

    const list = (subs ?? []) as Sub[];
    if (list.length === 0) {
      return json({ ok: true, sent: 0, failed: 0, message: "Nenhum aluno com notificacoes ativas nesse destino" });
    }

    const { sent, failed, staleIds } = await sendToSubscriptions(list, {
      title,
      body,
      url: url || "/",
      tag: "staff-message",
    });

    if (staleIds.length) {
      await admin.from("push_subscriptions").update({ active: false }).in("id", staleIds);
    }

    await admin.from("push_notifications").insert({
      title,
      body: body ?? null,
      url: url ?? null,
      target,
      kind: "staff_message",
      client_id: target === "student" ? client_id : null,
      unit_id: target === "unit" ? unit_id : null,
      sent_count: sent,
      failed_count: failed,
      created_by: userData.user.email ?? null,
    });

    return json({ ok: true, sent, failed });
  } catch (e) {
    console.error("push-send exception:", String(e));
    return json({ error: String(e) }, 500);
  }
});
