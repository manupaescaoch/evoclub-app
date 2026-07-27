import { supabase } from "@/integrations/supabase/client";

export type AuditAction = "create" | "update" | "delete" | "login" | "logout" | "custom";

export type AuditPayload = {
  action: AuditAction;
  entity: string;
  entity_id?: string | number | null;
  description: string;
  metadata?: Record<string, any>;
  unit_id?: string | null;
};

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
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    } as any);
  } catch (e) {
    // fire-and-forget
    console.warn("audit log failed", e);
  }
}

export const logCreate = (entity: string, entity_id: any, description: string, metadata?: any, unit_id?: string | null) =>
  logAudit({ action: "create", entity, entity_id, description, metadata, unit_id });

export const logUpdate = (entity: string, entity_id: any, description: string, metadata?: any, unit_id?: string | null) =>
  logAudit({ action: "update", entity, entity_id, description, metadata, unit_id });

export const logDelete = (entity: string, entity_id: any, description: string, metadata?: any, unit_id?: string | null) =>
  logAudit({ action: "delete", entity, entity_id, description, metadata, unit_id });