import { supabase } from "@/integrations/supabase/client";

export type AuditAction = "create" | "update" | "delete" | "login" | "logout" | "custom";

export type AuditPayload = {
  action: AuditAction;
  entity: string;
  entity_id?: string | number | null;
  description: string;
  metadata?: Record<string, any>;
  unit_id?: string | null;
  /** módulo do menu: clientes, financeiro, gerencial, equipe... */
  module?: string;
  /** estado anterior e posterior para ações sensíveis */
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
};

function deviceInfo() {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  const mobile = /Mobi|Android|iPhone|iPad/i.test(ua);
  const platform = (navigator as any).platform || "";
  return `${mobile ? "Mobile" : "Desktop"}${platform ? ` · ${platform}` : ""}`;
}

/** Mantém apenas os campos que mudaram, para o par antes/depois ficar legível. */
export function diffFields(before: Record<string, any> | null | undefined, after: Record<string, any> | null | undefined) {
  const b: Record<string, any> = {};
  const a: Record<string, any> = {};
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  keys.forEach(k => {
    const bv = before?.[k];
    const av = after?.[k];
    if (JSON.stringify(bv ?? null) !== JSON.stringify(av ?? null)) { b[k] = bv ?? null; a[k] = av ?? null; }
  });
  return { before: b, after: a };
}

export async function logAudit(p: AuditPayload) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const meta = session.user.user_metadata as any;
    const user_name = meta?.full_name || meta?.name || session.user.email?.split("@")[0] || "Usuário";
    const user_email = session.user.email || null;
    await supabase.from("audit_logs").insert({
      user_id: session.user.id,
      user_name,
      user_email,
      action: p.action,
      entity: p.entity,
      entity_id: p.entity_id != null ? String(p.entity_id) : null,
      description: p.description,
      metadata: p.metadata || {},
      unit_id: p.unit_id ?? null,
      module: p.module ?? null,
      before_data: p.before ?? null,
      after_data: p.after ?? null,
      device: deviceInfo(),
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    } as any);
  } catch (e) {
    // fire-and-forget
    console.warn("audit log failed", e);
  }
}

export const logCreate = (entity: string, entity_id: any, description: string, metadata?: any, unit_id?: string | null, module?: string) =>
  logAudit({ action: "create", entity, entity_id, description, metadata, unit_id, module, after: metadata });

export const logUpdate = (entity: string, entity_id: any, description: string, metadata?: any, unit_id?: string | null, module?: string) =>
  logAudit({ action: "update", entity, entity_id, description, metadata, unit_id, module });

export const logDelete = (entity: string, entity_id: any, description: string, metadata?: any, unit_id?: string | null, module?: string) =>
  logAudit({ action: "delete", entity, entity_id, description, metadata, unit_id, module, before: metadata });

/** Log de alteração sensível com antes/depois já diferenciado. */
export const logSensitive = (opts: {
  entity: string; entity_id: any; description: string; module?: string; unit_id?: string | null;
  before?: Record<string, any> | null; after?: Record<string, any> | null; metadata?: Record<string, any>;
}) => {
  const d = diffFields(opts.before, opts.after);
  return logAudit({
    action: "update",
    entity: opts.entity,
    entity_id: opts.entity_id,
    description: opts.description,
    module: opts.module,
    unit_id: opts.unit_id ?? null,
    metadata: { sensitive: true, ...(opts.metadata || {}) },
    before: d.before,
    after: d.after,
  });
};
