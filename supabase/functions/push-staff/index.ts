import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { sendToSubscriptions, type Sub } from "../_shared/push.ts";

const BodySchema = z.object({
  collaborator_id: z.string().uuid(),
  title: z.string().min(1).max(120),
  body: z.string().max(500).optional(),
  url: z.string().max(300).optional(),
  kind: z.string().max(40).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: isStaff } = await admin.rpc("is_staff", { _user_id: userData.user.id });
    if (!isStaff) return json({ error: "Sem permissao para notificar colaboradores" }, 403);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { collaborator_id, title, body, url, kind } = parsed.data;

    const { data: colab, error: colabErr } = await admin
      .from("collaborators")
      .select("id, full_name, auth_user_id")
      .eq("id", collaborator_id)
      .maybeSingle();
    if (colabErr) return json({ error: colabErr.message }, 500);
    if (!colab) return json({ error: "Colaborador nao encontrado" }, 404);

    // registro no mural interno do colaborador (sempre)
    await admin.from("staff_notifications").insert({
      collaborator_id,
      title,
      body: body ?? null,
      kind: kind ?? "tarefa",
      url: url ?? null,
    });

    if (!colab.auth_user_id) {
      return json({ ok: true, sent: 0, failed: 0, message: "Colaborador sem login vinculado — aviso salvo no painel dele." });
    }

    const { data: subs, error: subErr } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("active", true)
      .eq("user_id", colab.auth_user_id);
    if (subErr) return json({ error: subErr.message }, 500);

    const list = (subs ?? []) as Sub[];
    if (!list.length) {
      return json({ ok: true, sent: 0, failed: 0, message: "Colaborador ainda nao ativou notificacoes no celular." });
    }

    const { sent, failed, staleIds } = await sendToSubscriptions(list, {
      title,
      body,
      url: url || "/pro",
      tag: "staff-task",
    });
    if (staleIds.length) await admin.from("push_subscriptions").update({ active: false }).in("id", staleIds);

    return json({ ok: true, sent, failed });
  } catch (e) {
    console.error("push-staff exception:", String(e));
    return json({ error: String(e) }, 500);
  }
});
