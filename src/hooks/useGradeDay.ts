import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type GradeSlot = {
  class_id: string;
  name: string | null;
  trainer: string | null;
  start_time: string;
  end_time: string;
  unit_id: string | null;
  capacity: number;
  booked: number;
  present: number;
  absent: number;
  trials: number;
  waiting: number;
  blocked: boolean;
  reason: string | null;
  capacity_override: number | null;
};

export type GradeStudent = {
  booking_id: string;
  class_id: string;
  client_id: number | null;
  student_name: string;
  avatar_url: string | null;
  muscle_group: string | null;
  attendance_status: string;
  kind: string | null;
  is_trial: boolean;
  collaborator_id: string | null;
  professor_name: string | null;
  started_at: string | null;
  locked: boolean;
  waitlisted: boolean;
  waitlist_position: number | null;
};

export type Professor = { id: string; full_name: string; photo_url: string | null; role_title: string | null };

export const brToday = () => {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const brNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

/** minutos até o início da aula na data selecionada (negativo = já começou) */
export const minutesUntil = (dateISO: string, startTime: string) => {
  const [y, m, d] = dateISO.split("-").map(Number);
  const start = new Date(y, m - 1, d, parseInt(startTime.slice(0, 2), 10), parseInt(startTime.slice(3, 5), 10) || 0, 0);
  return Math.round((start.getTime() - brNow().getTime()) / 60000);
};

export function useGradeDay(dateISO: string, unitId: string | null) {
  const [slots, setSlots] = useState<GradeSlot[]>([]);
  const [roster, setRoster] = useState<GradeStudent[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [s, r, p] = await Promise.all([
      supabase.rpc("grade_day_slots" as any, { _class_date: dateISO, _unit_id: unitId }),
      supabase.rpc("grade_day_roster" as any, { _class_date: dateISO, _unit_id: unitId }),
      supabase.from("collaborators").select("id,full_name,photo_url,role_title").eq("status", "active").order("full_name"),
    ]);
    if (s.error || r.error) setError((s.error || r.error)!.message);
    setSlots(((s.data || []) as GradeSlot[]));
    setRoster(((r.data || []) as GradeStudent[]));
    setProfessors(((p.data || []) as Professor[]));
    setLoading(false);
  }, [dateISO, unitId]);

  useEffect(() => { load(); }, [load]);

  return { slots, roster, professors, loading, error, reload: load };
}

export const STATUS_LABEL: Record<string, string> = {
  agendado: "Agendado",
  presente: "Presente",
  faltou: "Faltou",
  cancelou: "Cancelou",
  espera: "Lista de espera",
};

export const STATUS_STYLE: Record<string, string> = {
  agendado: "bg-blue-50 text-blue-700",
  presente: "bg-green-50 text-green-700",
  faltou: "bg-red-50 text-red-700",
  cancelou: "bg-muted text-muted-foreground",
  espera: "bg-amber-50 text-amber-700",
};

export const RPC_REASONS: Record<string, string> = {
  forbidden: "Você não tem permissão para esta ação.",
  reason_required: "Informe o motivo.",
  below_booked: "A nova capacidade é menor que o número de alunos já agendados.",
  distribution_not_open: "A distribuição abre 20 minutos antes do horário.",
  professor_full: "Este professor já está com 2 alunos neste horário.",
  session_locked: "O treino já foi iniciado — professor travado na sessão.",
  invalid_status: "Status inválido.",
  not_found: "Registro não encontrado.",
  slot_blocked: "Horário bloqueado.",
  already_handled: "Este registro já foi tratado.",
  class_full: "A aula está lotada — ajuste as vagas antes de confirmar.",
  coordination_only: "Ocorrências de dor só podem ser resolvidas pela coordenação.",
};