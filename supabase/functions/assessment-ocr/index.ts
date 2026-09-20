import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const NUM_FIELDS = [
  "weight", "total_body_water", "protein", "minerals", "fat_mass", "lean_mass",
  "skeletal_muscle_mass", "muscle_mass", "body_fat_pct", "body_water", "bmi",
  "basal_metabolism", "waist_hip_ratio", "visceral_fat", "obesity_degree",
  "inbody_score", "ideal_weight", "weight_control", "fat_control", "muscle_control",
  "lean_arm_left", "lean_arm_right", "lean_trunk", "lean_leg_left", "lean_leg_right",
  "fat_arm_left", "fat_arm_right", "fat_trunk", "fat_leg_left", "fat_leg_right",
  "height_cm", "age",
];
const TEXT_FIELDS = ["student_name", "device_client_id", "measured_at", "sex", "device_model"];
const RANGE_KEYS = [
  "weight", "skeletal_muscle_mass", "fat_mass", "body_fat_pct", "bmi", "visceral_fat",
  "total_body_water", "protein", "minerals", "lean_mass", "basal_metabolism",
  "waist_hip_ratio", "obesity_degree",
];
const SEGMENT_KEYS = [
  "lean_arm_left", "lean_arm_right", "lean_trunk", "lean_leg_left", "lean_leg_right",
  "fat_arm_left", "fat_arm_right", "fat_trunk", "fat_leg_left", "fat_leg_right",
];

function schema() {
  const props: Record<string, unknown> = {};
  for (const k of NUM_FIELDS) props[k] = { type: ["number", "null"] };
  for (const k of TEXT_FIELDS) props[k] = { type: ["string", "null"] };
  props["low_confidence"] = { type: "array", items: { type: "string" } };
  props["reference_ranges"] = {
    type: "object", additionalProperties: false, required: RANGE_KEYS,
    properties: Object.fromEntries(RANGE_KEYS.map(k => [k, { type: ["string", "null"] }])),
  };
  props["segmental_meta"] = {
    type: "object", additionalProperties: false, required: SEGMENT_KEYS,
    properties: Object.fromEntries(SEGMENT_KEYS.map(k => [k, {
      type: "object", additionalProperties: false, required: ["percentage", "classification"],
      properties: { percentage: { type: ["number", "null"] }, classification: { type: ["string", "null"] } },
    }])),
  };
  return {
    type: "object",
    additionalProperties: false,
    required: [...NUM_FIELDS, ...TEXT_FIELDS, "low_confidence", "reference_ranges", "segmental_meta"],
    properties: props,
  };
}

const SYSTEM = `Você extrai dados de laudos de bioimpedância (principalmente InBody) em português.
Regras absolutas:
- Use APENAS valores impressos no documento. Nunca calcule, estime ou invente.
- Campo não encontrado no documento = null.
- Converta vírgula decimal para ponto (ex.: "79,1" -> 79.1). Nunca use separador de milhar.
- measured_at deve ser ISO 8601 (ex.: 2026-09-20T08:30:00) usando a data e hora do laudo; se só houver data, use T12:00:00.
- sex: "masculino" ou "feminino".
- height_cm em centímetros. Percentuais sem o símbolo.
- Se o documento tiver várias páginas, considere todas.
- reference_ranges: copie literalmente a faixa impressa para cada indicador; se não existir, null.
- segmental_meta: para cada região, extraia o percentual e a classificação impressos; se ausente, null.
- low_confidence: liste os nomes dos campos cuja leitura ficou duvidosa.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "IA não configurada." }, 500);

    const { fileBase64, mime, fileName } = await req.json().catch(() => ({}));
    if (!fileBase64 || !mime) return json({ error: "Arquivo inválido." }, 400);

    const isPdf = String(mime).includes("pdf");
    const part = isPdf
      ? { type: "input_file", filename: fileName || "laudo.pdf", file_data: `data:application/pdf;base64,${fileBase64}` }
      : { type: "input_image", image_url: `data:${mime};base64,${fileBase64}` };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        store: false,
        instructions: SYSTEM,
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: "Extraia os dados deste laudo de bioimpedância." },
            part,
          ],
        }],
        text: { format: { type: "json_schema", name: "laudo", strict: true, schema: schema() } },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      const msg = res.status === 402
        ? "Créditos de IA esgotados. Recarregue para continuar importando."
        : res.status === 429
          ? "Muitas leituras ao mesmo tempo. Tente novamente em instantes."
          : `Falha ao ler o documento (${res.status}).`;
      console.error("gateway error", res.status, body.slice(0, 500));
      return json({ error: msg }, res.status === 402 || res.status === 429 ? res.status : 502);
    }

    // SSE: acumula o texto final
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let out = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") out += ev.delta;
          if (ev.type === "response.completed" && ev.response?.output_text) {
            if (!out) out = Array.isArray(ev.response.output_text) ? ev.response.output_text.join("") : String(ev.response.output_text);
          }
        } catch { /* ignora linha parcial */ }
      }
    }

    if (!out.trim()) return json({ error: "Não foi possível ler os dados do documento." }, 422);

    let data: Record<string, unknown>;
    try { data = JSON.parse(out); }
    catch { return json({ error: "Leitura incompleta do documento. Tente outro arquivo." }, 422); }

    return json({ ok: true, data });
  } catch (e) {
    console.error(e);
    return json({ error: "Falha no processamento do documento." }, 500);
  }
});
