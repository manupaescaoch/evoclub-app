import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { addDays, brNow, diffDays, isoDay, weekOf } from "./dates";
import type { Agendamento, Evento, ListKey, OpRecord, Prioridade, Tarefa } from "./types";

type Colab = { id: string; full_name: string; phone: string | null; unit_id: string | null; role_title: string | null };

const isFollowUp = (t: any) => /follow[\s-]?up/i.test(`${t.category || ""} ${t.title || ""}`);
const isMatriculado = (t: any) =>
  /matriculad|boas[\s-]?vindas|renova|acompanhamento|relacionamento|p[oó]s[\s-]?venda/i.test(
    `${t.category || ""} ${t.title || ""} ${t.sector || ""}`,
  );
const isGerente = (t: any, colabs: Map<string, Colab>) =>
  /ger[eê]nc|gerente|manager|dire[cç]/i.test(
    `${t.sector || ""} ${t.responsible_name || ""} ${colabs.get(t.responsible_id || "")?.role_title || ""}`,
  );
const pendingTask = (t: any) => !["done", "concluida", "concluído", "cancelled", "cancelada"].includes(String(t.status || ""));

const taskStatus = (t: any, hoje: string): Tarefa["status"] => {
  if (["done", "concluida", "concluído"].includes(String(t.status))) return "concluida";
  if (["cancelled", "cancelada", "nao_realizada"].includes(String(t.status))) return "nao_realizada";
  if (t.due_date && t.due_date.slice(0, 10) < hoje) return "atrasada";
  if (["in_progress", "doing"].includes(String(t.status))) return "em_andamento";
  return "pendente";
};

export type OperacaoData = {
  loading: boolean;
  error: string | null;
  syncedAt: Date | null;
  reload: () => void;
  lists: Record<ListKey, OpRecord[]>;
  agendamentos: Agendamento[];
  eventos: Evento[];
  tarefas: Tarefa[];
  colaboradores: Colab[];
  atividades: { previstas: number; concluidas: number; andamento: number; atrasadas: number; pct: number };
  followupsVencidos: number;
  followupsHoje: number;
};

export function useOperacao(date: string) {
  const { filterId, units } = useUnit();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [raw, setRaw] = useState<any>(null);

  const unitName = useCallback(
    (id?: string | null) => units.find((u) => u.id === id)?.name || "—",
    [units],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const scope = <T,>(q: T, col: string): T => (filterId ? (q as any).eq(col, filterId) : q);

      const [leadsR, interR, tasksR, alertsR, clientsR, linksR, renewR, routinesR, colabsR, logsR] = await Promise.all([
        scope(supabase.from("leads").select("id,nome,telefone,unidade_id,status_funil,data_aula_experimental,hora_aula_experimental,atendido_por,cadastrado_por,observacoes,created_at").eq("ativo", true), "unidade_id"),
        supabase.from("interacoes").select("id,lead_id,unidade_id,tipo,descricao,data_experimental,hora_experimental,compareceu,fechou_matricula,created_at,atendido_por").order("created_at", { ascending: false }).limit(4000),
        scope(supabase.from("crm_tasks").select("*").eq("archived", false), "unit_id"),
        scope(supabase.from("crm_attendance_alerts").select("*").in("status", ["open", "pending", "aberto"]), "unit_id"),
        scope(supabase.from("clients").select("id,name,phone,unit_id,status,contract_end,crm_owner_id"), "unit_id"),
        scope(supabase.from("form_links").select("id,kind,status,lead_name,phone,client_id,unit_id,sent_at,answered_at"), "unit_id"),
        scope(supabase.from("renewal_requests").select("id,client_id,unit_id,status,cycle_end,assigned_to,first_action_at,current_plan,created_at"), "unit_id"),
        scope(supabase.from("operational_routines").select("id,unit_id,title,routine_type,kind,responsible_name,date,time,status,description"), "unit_id"),
        supabase.from("collaborators").select("id,full_name,phone,unit_id,role_title").eq("status", "active").order("full_name"),
        supabase.from("contact_logs").select("id,client_id,lead_id,created_at,result,channel").order("created_at", { ascending: false }).limit(2000),
      ]);

      const firstError = [leadsR, interR, tasksR, alertsR, clientsR, linksR, renewR, routinesR, colabsR, logsR]
        .map((r: any) => r?.error).find(Boolean);
      if (firstError) setError(firstError.message);

      setRaw({
        leads: (leadsR as any).data || [],
        inter: (interR as any).data || [],
        tasks: (tasksR as any).data || [],
        alerts: (alertsR as any).data || [],
        clients: (clientsR as any).data || [],
        links: (linksR as any).data || [],
        renew: (renewR as any).data || [],
        routines: (routinesR as any).data || [],
        colabs: (colabsR as any).data || [],
        logs: (logsR as any).data || [],
      });
      setSyncedAt(new Date());
    } catch (e: any) {
      setError(e?.message || "Falha ao carregar a operação.");
    } finally {
      setLoading(false);
    }
  }, [filterId]);

  useEffect(() => { load(); }, [load]);

  const data: OperacaoData = useMemo(() => {
    const hoje = isoDay(brNow());
    const base = date || hoje;
    const amanha = addDays(base, 1);
    const semana = weekOf(base);

    const empty: Record<ListKey, OpRecord[]> = {
      followups: [], followupsMatriculados: [], followupGerente: [], ausentes: [],
      expSemana: [], expRealizadas: [], expAmanhaSemConfirmacao: [], anamnesesPendentes: [],
      tarefasAtrasadas: [], renovacoesSemContato: [], noShowSemReagendamento: [],
    };

    if (!raw) {
      return {
        loading, error, syncedAt, reload: load, lists: empty, agendamentos: [], eventos: [], tarefas: [],
        colaboradores: [], atividades: { previstas: 0, concluidas: 0, andamento: 0, atrasadas: 0, pct: 0 },
        followupsVencidos: 0, followupsHoje: 0,
      };
    }

    const colabs: Colab[] = raw.colabs;
    const colabMap = new Map(colabs.map((c) => [c.id, c]));
    const leads: any[] = raw.leads;
    const leadMap = new Map(leads.map((l) => [l.id, l]));
    const inter: any[] = raw.inter.filter((i: any) => leadMap.has(i.lead_id));
    const clients: any[] = raw.clients;
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    /* último contato por lead / cliente */
    const lastLead = new Map<string, string>();
    inter.forEach((i) => { if (!lastLead.has(i.lead_id)) lastLead.set(i.lead_id, i.created_at); });
    const lastClient = new Map<number, string>();
    raw.logs.forEach((l: any) => {
      if (l.client_id && !lastClient.has(l.client_id)) lastClient.set(l.client_id, l.created_at);
      if (l.lead_id && !lastLead.has(l.lead_id)) lastLead.set(l.lead_id, l.created_at);
    });

    const prioridadeDe = (due: string | null, done = false): Prioridade => {
      if (done) return "concluido";
      if (!due) return "programado";
      const d = due.slice(0, 10);
      if (d < hoje) return "critico";
      if (d === hoje) return "hoje";
      return "programado";
    };
    const atraso = (due: string | null) => (due && due.slice(0, 10) < hoje ? diffDays(due.slice(0, 10), hoje) : 0);

    /* ---------- tarefas ---------- */
    const tasks: any[] = raw.tasks;
    const taskRecord = (t: any, motivo: string): OpRecord => ({
      key: `task-${t.id}`,
      kind: "task",
      nome: t.title || "Tarefa",
      telefone: t.responsible_phone || null,
      responsavel: t.responsible_name || colabMap.get(t.responsible_id || "")?.full_name || "Sem responsável",
      responsavelId: t.responsible_id || null,
      unidadeId: t.unit_id || null,
      unidade: unitName(t.unit_id),
      motivo,
      dataPrevista: t.due_date || null,
      atrasoDias: atraso(t.due_date),
      ultimoContato: null,
      proximaAcao: taskStatus(t, hoje) === "atrasada" ? "Executar imediatamente" : "Executar no prazo",
      status: taskStatus(t, hoje),
      prioridade: prioridadeDe(t.due_date, taskStatus(t, hoje) === "concluida"),
      taskId: t.id,
      requiresEvidence: !!t.requires_evidence,
    });

    const pendentes = tasks.filter(pendingTask);
    const fuComercial = pendentes.filter(
      (t) => isFollowUp(t) && !isMatriculado(t) && !isGerente(t, colabMap) && t.due_date && t.due_date.slice(0, 10) <= hoje,
    );
    const fuMatriculados = pendentes.filter((t) => isMatriculado(t) && (!t.due_date || t.due_date.slice(0, 10) <= hoje));
    const fuGerente = pendentes.filter((t) => isGerente(t, colabMap));
    const atrasadas = pendentes.filter((t) => t.due_date && t.due_date.slice(0, 10) < hoje);

    /* ---------- experimentais ---------- */
    type Aula = { lead: string; data: string; hora: string | null; compareceu: boolean | null };
    const dedup = new Map<string, Aula>();
    const push = (lead: string, d?: string | null, hora?: string | null, compareceu: boolean | null = null) => {
      if (!d) return;
      const dia = d.slice(0, 10);
      const k = `${lead}|${dia}`;
      const prev = dedup.get(k);
      dedup.set(k, { lead, data: dia, hora: hora || prev?.hora || null, compareceu: compareceu ?? prev?.compareceu ?? null });
    };
    leads.forEach((l) => push(l.id, l.data_aula_experimental, l.hora_aula_experimental));
    inter.forEach((i) => push(i.lead_id, i.data_experimental, i.hora_experimental, i.compareceu));
    const aulas = [...dedup.values()];

    const evento = (rx: RegExp) => (leadId: string, dia: string) =>
      inter.some((i) => i.lead_id === leadId && rx.test(i.tipo || "") && (i.data_experimental || "").slice(0, 10) === dia);
    const confirmado = evento(/confirma/i);
    const lembrete = evento(/lembrete/i);
    const cancelado = evento(/cancelamento/i);
    const confirmadoEm = (leadId: string, dia: string) =>
      inter.find((i) => i.lead_id === leadId && /confirma/i.test(i.tipo || "") && (i.data_experimental || "").slice(0, 10) === dia)?.created_at || null;
    const motivoCancel = (leadId: string, dia: string) =>
      inter.find((i) => i.lead_id === leadId && /cancelamento/i.test(i.tipo || "") && (i.data_experimental || "").slice(0, 10) === dia)?.descricao || null;

    const anamneseStatus = (lead: any): Agendamento["anamnese"] => {
      const tel = (lead.telefone || "").replace(/\D/g, "");
      const link = raw.links.find(
        (l: any) => l.kind === "anamnesis" &&
          ((l.lead_name && lead.nome && String(l.lead_name).toLowerCase() === String(lead.nome).toLowerCase()) ||
            (tel && String(l.phone || "").replace(/\D/g, "") === tel)),
      );
      if (!link) return "nao_enviada";
      return link.answered_at ? "respondida" : "pendente";
    };

    const aulaRecord = (a: Aula, motivo: string, proximaAcao: string, prioridade: Prioridade): OpRecord => {
      const l = leadMap.get(a.lead) || {};
      return {
        key: `aula-${a.lead}-${a.data}`,
        kind: "lead",
        nome: l.nome || "Lead",
        telefone: l.telefone || null,
        responsavel: l.atendido_por || l.cadastrado_por || "Sem responsável",
        responsavelId: null,
        unidadeId: l.unidade_id || null,
        unidade: unitName(l.unidade_id),
        motivo,
        dataPrevista: a.data,
        atrasoDias: a.data < hoje ? diffDays(a.data, hoje) : 0,
        ultimoContato: lastLead.get(a.lead) || null,
        proximaAcao,
        status: a.compareceu === true ? "compareceu" : a.compareceu === false ? "no_show" : "aguardando",
        prioridade,
        leadId: a.lead,
        expData: a.data,
        expHora: a.hora,
      };
    };

    const aulasSemana = aulas.filter((a) => a.data >= semana.from && a.data <= semana.to && !cancelado(a.lead, a.data));
    const realizadas = aulasSemana.filter((a) => a.compareceu === true);
    const amanhaSemConfirmacao = aulas.filter(
      (a) => a.data === amanha && !confirmado(a.lead, a.data) && !cancelado(a.lead, a.data),
    );
    const noShowSemReagendamento = aulas.filter((a) => {
      if (a.compareceu !== false) return false;
      const l = leadMap.get(a.lead);
      const futura = aulas.some((x) => x.lead === a.lead && x.data > a.data);
      return !futura && l?.status_funil !== "convertido" && l?.status_funil !== "perdido";
    });

    /* ---------- alunos ausentes ---------- */
    const ausentes: OpRecord[] = raw.alerts.map((al: any) => {
      const c = clientMap.get(al.client_id) || {};
      const last = (al.last_activity || "").slice(0, 10) || null;
      return {
        key: `alert-${al.id}`,
        kind: "client" as const,
        nome: c.name || "Aluno",
        telefone: c.phone || null,
        responsavel: colabMap.get(c.crm_owner_id || "")?.full_name || "Sem responsável",
        responsavelId: c.crm_owner_id || null,
        unidadeId: al.unit_id || c.unit_id || null,
        unidade: unitName(al.unit_id || c.unit_id),
        motivo: `${al.days_without || 0} dias sem treinar`,
        dataPrevista: last,
        atrasoDias: Number(al.days_without || 0),
        ultimoContato: lastClient.get(al.client_id) || null,
        proximaAcao: "Contato de reativação",
        status: al.status || "open",
        prioridade: (Number(al.days_without || 0) >= 15 ? "critico" : "hoje") as Prioridade,
        clientId: al.client_id,
        alertId: al.id,
      };
    });

    /* ---------- anamneses pendentes ---------- */
    const anamnesesPendentes: OpRecord[] = raw.links
      .filter((l: any) => l.kind === "anamnesis" && !l.answered_at)
      .map((l: any) => {
        const c = l.client_id ? clientMap.get(l.client_id) : null;
        const enviado = (l.sent_at || l.created_at || "").slice(0, 10) || null;
        return {
          key: `link-${l.id}`,
          kind: "form" as const,
          nome: c?.name || l.lead_name || "Sem nome",
          telefone: c?.phone || l.phone || null,
          responsavel: "Recepção",
          responsavelId: null,
          unidadeId: l.unit_id || null,
          unidade: unitName(l.unit_id),
          motivo: "Anamnese não respondida",
          dataPrevista: enviado,
          atrasoDias: enviado && enviado < hoje ? diffDays(enviado, hoje) : 0,
          ultimoContato: l.client_id ? lastClient.get(l.client_id) || null : null,
          proximaAcao: "Cobrar o preenchimento",
          status: l.status || "pendente",
          prioridade: (enviado && diffDays(enviado, hoje) > 3 ? "critico" : "hoje") as Prioridade,
          clientId: l.client_id || undefined,
        };
      });

    /* ---------- renovações próximas sem contato ---------- */
    const limite = addDays(hoje, 30);
    const renovacoesSemContato: OpRecord[] = raw.renew
      .filter((r: any) =>
        !r.first_action_at &&
        !["closed", "won", "lost", "concluida", "cancelada"].includes(String(r.status || "")) &&
        r.cycle_end && r.cycle_end.slice(0, 10) <= limite)
      .map((r: any) => {
        const c = clientMap.get(r.client_id) || {};
        const fim = (r.cycle_end || "").slice(0, 10);
        return {
          key: `renew-${r.id}`,
          kind: "renewal" as const,
          nome: c.name || "Aluno",
          telefone: c.phone || null,
          responsavel: colabMap.get(r.assigned_to || c.crm_owner_id || "")?.full_name || "Sem responsável",
          responsavelId: r.assigned_to || c.crm_owner_id || null,
          unidadeId: r.unit_id || c.unit_id || null,
          unidade: unitName(r.unit_id || c.unit_id),
          motivo: `Ciclo termina em ${fim ? new Date(`${fim}T12:00:00`).toLocaleDateString("pt-BR") : "—"}`,
          dataPrevista: fim || null,
          atrasoDias: fim && fim < hoje ? diffDays(fim, hoje) : 0,
          ultimoContato: lastClient.get(r.client_id) || null,
          proximaAcao: "Apresentar proposta de renovação",
          status: r.status || "open",
          prioridade: (fim && fim < hoje ? "critico" : "hoje") as Prioridade,
          clientId: r.client_id,
          renewalId: r.id,
        };
      });

    /* ---------- agendamentos de amanhã ---------- */
    const agendamentos: Agendamento[] = aulas
      .filter((a) => a.data === amanha)
      .map((a) => {
        const l = leadMap.get(a.lead) || {};
        return {
          leadId: a.lead,
          nome: l.nome || "Lead",
          telefone: l.telefone || null,
          data: a.data,
          hora: a.hora ? a.hora.slice(0, 5) : null,
          tipo: "Aula experimental",
          responsavel: l.atendido_por || l.cadastrado_por || "Sem responsável",
          unidadeId: l.unidade_id || null,
          unidade: unitName(l.unidade_id),
          anamnese: anamneseStatus(l),
          confirmado: confirmado(a.lead, a.data),
          confirmadoEm: confirmadoEm(a.lead, a.data),
          lembrete: lembrete(a.lead, a.data),
          cancelado: cancelado(a.lead, a.data),
          motivoCancelamento: motivoCancel(a.lead, a.data),
          observacoes: l.observacoes || null,
        };
      })
      .sort((x, y) => (x.hora || "99").localeCompare(y.hora || "99"));

    /* ---------- eventos do dia ---------- */
    const eventos: Evento[] = raw.routines
      .filter((r: any) => (r.date || "").slice(0, 10) === base)
      .map((r: any) => ({
        id: r.id,
        titulo: r.title || "Evento",
        hora: r.time ? r.time.slice(0, 5) : null,
        responsavel: r.responsible_name || "Sem responsável",
        categoria: r.routine_type || r.kind || "Rotina",
        status: r.status || "pendente",
        unidade: unitName(r.unit_id),
      }))
      .sort((x: Evento, y: Evento) => (x.hora || "99").localeCompare(y.hora || "99"));

    /* ---------- tarefas do dia ---------- */
    const tarefasDoDia: Tarefa[] = tasks
      .filter((t) => (t.due_date || "").slice(0, 10) === base || (taskStatus(t, hoje) === "atrasada" && base === hoje))
      .map((t) => ({
        id: t.id,
        titulo: t.title || "Tarefa",
        hora: t.due_time ? String(t.due_time).slice(0, 5) : null,
        responsavel: t.responsible_name || colabMap.get(t.responsible_id || "")?.full_name || "Sem responsável",
        responsavelId: t.responsible_id || null,
        setor: t.sector || t.category || "Geral",
        unidadeId: t.unit_id || null,
        unidade: unitName(t.unit_id),
        prioridade: t.priority || "medium",
        status: taskStatus(t, hoje),
        concluidaEm: t.completed_at || null,
        requiresEvidence: !!t.requires_evidence,
        evidenceUrl: t.evidence_url || null,
        dueDate: t.due_date || null,
      }))
      .sort((x, y) => (x.hora || "99").localeCompare(y.hora || "99"));

    const previstas = tarefasDoDia.length;
    const concluidas = tarefasDoDia.filter((t) => t.status === "concluida").length;
    const andamento = tarefasDoDia.filter((t) => t.status === "em_andamento").length;
    const atrasadasDia = tarefasDoDia.filter((t) => t.status === "atrasada").length;

    const lists: Record<ListKey, OpRecord[]> = {
      followups: fuComercial.map((t) => taskRecord(t, "Follow-up comercial pendente")),
      followupsMatriculados: fuMatriculados.map((t) => taskRecord(t, "Contato pós-matrícula pendente")),
      followupGerente: fuGerente.map((t) => taskRecord(t, "Contato atribuído ao gerente")),
      ausentes,
      expSemana: aulasSemana.map((a) => aulaRecord(a, "Experimental da semana", "Confirmar presença", a.data < hoje ? "programado" : a.data === hoje ? "hoje" : "programado")),
      expRealizadas: realizadas.map((a) => aulaRecord(a, "Experimental realizada", "Registrar desfecho comercial", "concluido")),
      expAmanhaSemConfirmacao: amanhaSemConfirmacao.map((a) => aulaRecord(a, "Experimental de amanhã sem confirmação", "Confirmar por WhatsApp", "hoje")),
      anamnesesPendentes,
      tarefasAtrasadas: atrasadas.map((t) => taskRecord(t, "Tarefa atrasada")),
      renovacoesSemContato,
      noShowSemReagendamento: noShowSemReagendamento.map((a) => aulaRecord(a, "No-show sem reagendamento", "Recuperar e reagendar", "critico")),
    };

    const ordenar = (arr: OpRecord[]) => {
      const peso: Record<Prioridade, number> = { critico: 0, hoje: 1, programado: 2, concluido: 3 };
      return [...arr].sort((a, b) => peso[a.prioridade] - peso[b.prioridade] || b.atrasoDias - a.atrasoDias);
    };
    (Object.keys(lists) as ListKey[]).forEach((k) => { lists[k] = ordenar(lists[k]); });

    return {
      loading,
      error,
      syncedAt,
      reload: load,
      lists,
      agendamentos,
      eventos,
      tarefas: tarefasDoDia,
      colaboradores: colabs,
      atividades: {
        previstas, concluidas, andamento, atrasadas: atrasadasDia,
        pct: previstas > 0 ? Math.round((concluidas / previstas) * 100) : 0,
      },
      followupsVencidos: fuComercial.filter((t) => t.due_date.slice(0, 10) < hoje).length,
      followupsHoje: fuComercial.filter((t) => t.due_date.slice(0, 10) === hoje).length,
    };
  }, [raw, date, loading, error, syncedAt, load, unitName]);

  return data;
}
