import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import type { OpRecord } from "./types";

const authUser = async () => (await supabase.auth.getUser()).data.user?.id ?? null;

/** Confirma a experimental: grava histórico e marca o agendamento como confirmado. */
export async function confirmarExperimental(p: { leadId: string; unidadeId: string | null; data: string; hora: string | null }) {
  const uid = await authUser();
  const { error } = await supabase.from("interacoes").insert({
    lead_id: p.leadId,
    unidade_id: p.unidadeId,
    tipo: "confirmacao_experimental",
    descricao: `Presença confirmada em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
    data_experimental: p.data,
    hora_experimental: p.hora,
    created_by: uid,
  } as any);
  if (error) throw error;
  await logAudit({ action: "update", entity: "interacoes", entity_id: p.leadId, module: "operacional", description: `Experimental confirmada para ${p.data}`, metadata: { data: p.data } }).catch(() => {});
}

/** Reagenda a experimental preservando o histórico do agendamento anterior. */
export async function reagendarExperimental(p: {
  leadId: string; unidadeId: string | null; dataAnterior: string; novaData: string; novaHora: string | null;
}) {
  const uid = await authUser();
  const { error } = await supabase.from("interacoes").insert({
    lead_id: p.leadId,
    unidade_id: p.unidadeId,
    tipo: "reagendamento_experimental",
    descricao: `Reagendado de ${p.dataAnterior} para ${p.novaData}${p.novaHora ? ` às ${p.novaHora}` : ""}`,
    agendou_experimental: true,
    data_experimental: p.novaData,
    hora_experimental: p.novaHora,
    created_by: uid,
  } as any);
  if (error) throw error;
  const { error: e2 } = await supabase
    .from("leads")
    .update({ data_aula_experimental: p.novaData, hora_aula_experimental: p.novaHora, status_funil: "aula_agendada" } as any)
    .eq("id", p.leadId);
  if (e2) throw e2;
  await logAudit({ action: "update", entity: "leads", entity_id: p.leadId, module: "operacional", description: `Experimental reagendada de ${p.dataAnterior} para ${p.novaData}`, metadata: { de: p.dataAnterior, para: p.novaData } }).catch(() => {});
}

/** Cancela a experimental exigindo motivo, sem apagar o histórico. */
export async function cancelarExperimental(p: { leadId: string; unidadeId: string | null; data: string; motivo: string }) {
  const uid = await authUser();
  const { error } = await supabase.from("interacoes").insert({
    lead_id: p.leadId,
    unidade_id: p.unidadeId,
    tipo: "cancelamento_experimental",
    descricao: p.motivo,
    data_experimental: p.data,
    created_by: uid,
  } as any);
  if (error) throw error;
  await logAudit({ action: "update", entity: "leads", entity_id: p.leadId, module: "operacional", description: `Experimental de ${p.data} cancelada`, metadata: { motivo: p.motivo } }).catch(() => {});
}

export async function iniciarTarefa(id: string) {
  const { error } = await supabase
    .from("crm_tasks")
    .update({ status: "in_progress", started_at: new Date().toISOString() } as any)
    .eq("id", id);
  if (error) throw error;
}

export async function concluirTarefa(p: { id: string; note?: string; file?: File | null }) {
  const uid = await authUser();
  let evidence_url: string | null = null;
  if (p.file) {
    const ext = p.file.name.split(".").pop() || "dat";
    const path = `tarefas/${p.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("operacao").upload(path, p.file, { upsert: true });
    if (upErr) throw upErr;
    evidence_url = path;
  }
  const { error } = await supabase
    .from("crm_tasks")
    .update({
      status: "done",
      completed_at: new Date().toISOString(),
      completed_by: uid,
      completion_note: p.note || null,
      ...(evidence_url ? { evidence_url } : {}),
    } as any)
    .eq("id", p.id);
  if (error) throw error;
  await logAudit({ action: "update", entity: "crm_tasks", entity_id: p.id, module: "operacional", description: "Tarefa concluída na Operação", metadata: { evidencia: !!evidence_url } }).catch(() => {});
}

export async function atribuirResponsavel(p: { record: OpRecord; collaboratorId: string; nome: string }) {
  if (p.record.taskId) {
    const { error } = await supabase
      .from("crm_tasks")
      .update({ responsible_id: p.collaboratorId, responsible_name: p.nome } as any)
      .eq("id", p.record.taskId);
    if (error) throw error;
    return;
  }
  if (p.record.renewalId) {
    const { error } = await supabase
      .from("renewal_requests")
      .update({ assigned_to: p.collaboratorId } as any)
      .eq("id", p.record.renewalId);
    if (error) throw error;
    return;
  }
  if (p.record.clientId) {
    const { error } = await supabase
      .from("clients")
      .update({ crm_owner_id: p.collaboratorId } as any)
      .eq("id", p.record.clientId);
    if (error) throw error;
    return;
  }
  throw new Error("Este registro não permite atribuir responsável.");
}

/** Marca a pendência como resolvida na sua origem. */
export async function concluirPendencia(record: OpRecord) {
  if (record.taskId) return concluirTarefa({ id: record.taskId });
  if (record.alertId) {
    const { error } = await supabase
      .from("crm_attendance_alerts")
      .update({ status: "resolved", resolved_at: new Date().toISOString() } as any)
      .eq("id", record.alertId);
    if (error) throw error;
    return;
  }
  if (record.renewalId) {
    const { error } = await supabase
      .from("renewal_requests")
      .update({ first_action_at: new Date().toISOString() } as any)
      .eq("id", record.renewalId);
    if (error) throw error;
    return;
  }
  throw new Error("Registre um contato para concluir esta pendência.");
}

export const CANAIS = ["WhatsApp", "Ligação", "Presencial", "E-mail", "SMS"] as const;
export const RESULTADOS = [
  "Contato realizado", "Não respondeu", "Solicitou retorno", "Reagendado",
  "Convertido", "Sem interesse", "Número inválido",
] as const;

export async function registrarContato(p: {
  record: OpRecord;
  channel: string;
  result: string;
  note: string;
  nextAction: string;
  nextFollowUp: string;
  ownerId: string | null;
  ownerName: string | null;
}) {
  const uid = await authUser();

  const { error } = await supabase.from("contact_logs").insert({
    unit_id: p.record.unidadeId,
    client_id: p.record.clientId ?? null,
    lead_id: p.record.leadId ?? null,
    channel: p.channel,
    result: p.result,
    note: p.note || null,
    next_action: p.nextAction || null,
    next_follow_up_at: p.nextFollowUp || null,
    owner_id: p.ownerId,
    created_by: uid,
  } as any);
  if (error) throw error;

  // leads mantêm o histórico comercial em interações (usado pelo CRM)
  if (p.record.leadId) {
    await supabase.from("interacoes").insert({
      lead_id: p.record.leadId,
      unidade_id: p.record.unidadeId,
      tipo: p.channel,
      descricao: [p.result, p.note].filter(Boolean).join(" — "),
      atendido_por: p.ownerName,
      created_by: uid,
    } as any);
  }

  // próximo follow-up vira tarefa programada
  if (p.nextFollowUp) {
    await supabase.from("crm_tasks").insert({
      unit_id: p.record.unidadeId,
      title: `Follow-up — ${p.record.nome}`,
      description: p.nextAction || p.result,
      category: "follow-up",
      sector: "comercial",
      status: "todo",
      priority: "medium",
      due_date: p.nextFollowUp,
      responsible_id: p.ownerId,
      responsible_name: p.ownerName,
      responsible_phone: p.record.telefone,
      created_by: uid,
    } as any);
  }
}
