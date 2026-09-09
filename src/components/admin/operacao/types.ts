export type Prioridade = "critico" | "hoje" | "programado" | "concluido";

export type RecordKind = "lead" | "client" | "task" | "renewal" | "form";

/** Registro normalizado usado em todas as listas da página Operação. */
export type OpRecord = {
  key: string;
  kind: RecordKind;
  nome: string;
  telefone: string | null;
  responsavel: string;
  responsavelId: string | null;
  unidadeId: string | null;
  unidade: string;
  motivo: string;
  dataPrevista: string | null;
  atrasoDias: number;
  ultimoContato: string | null;
  proximaAcao: string;
  status: string;
  prioridade: Prioridade;
  leadId?: string;
  clientId?: number;
  taskId?: string;
  renewalId?: string;
  alertId?: string;
  /** data da experimental, quando aplicável */
  expData?: string | null;
  expHora?: string | null;
  requiresEvidence?: boolean;
};

export type Agendamento = {
  leadId: string;
  nome: string;
  telefone: string | null;
  data: string;
  hora: string | null;
  tipo: string;
  responsavel: string;
  unidadeId: string | null;
  unidade: string;
  anamnese: "respondida" | "pendente" | "nao_enviada";
  confirmado: boolean;
  confirmadoEm: string | null;
  lembrete: boolean;
  cancelado: boolean;
  motivoCancelamento: string | null;
  observacoes: string | null;
};

export type Evento = {
  id: string;
  titulo: string;
  hora: string | null;
  responsavel: string;
  categoria: string;
  status: string;
  unidade: string;
};

export type Tarefa = {
  id: string;
  titulo: string;
  hora: string | null;
  responsavel: string;
  responsavelId: string | null;
  setor: string;
  unidadeId: string | null;
  unidade: string;
  prioridade: string;
  status: "pendente" | "em_andamento" | "concluida" | "atrasada" | "nao_realizada";
  concluidaEm: string | null;
  requiresEvidence: boolean;
  evidenceUrl: string | null;
  dueDate: string | null;
};

export type ListKey =
  | "followups"
  | "followupsMatriculados"
  | "followupGerente"
  | "ausentes"
  | "expSemana"
  | "expRealizadas"
  | "expAmanhaSemConfirmacao"
  | "anamnesesPendentes"
  | "tarefasAtrasadas"
  | "renovacoesSemContato"
  | "noShowSemReagendamento";
