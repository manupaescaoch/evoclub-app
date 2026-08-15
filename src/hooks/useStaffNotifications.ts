import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/contexts/AccessContext";

export type StaffNotification = {
  id: string;
  collaborator_id: string;
  title: string;
  body: string | null;
  kind: string;
  url: string | null;
  read_at: string | null;
  created_at: string;
};

export const KIND_LABEL: Record<string, string> = {
  limitation: "Limitação de aluno",
  limitacao: "Limitação de aluno",
  pain: "Relato de dor",
  swap: "Troca de escala",
  swap_request: "Troca de escala",
  swap_decision: "Troca de escala",
  plan_expired: "Treino vencido",
  treino_vencido: "Treino vencido",
  occurrence: "Ocorrência",
  schedule: "Escala",
  task: "Tarefa",
};

/** Notificações do próprio colaborador (staff_notifications). */
export function useStaffNotifications() {
  const { collaboratorId, loading: accessLoading } = useAccess();
  const [items, setItems] = useState<StaffNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (accessLoading) return;
    if (!collaboratorId) { setItems([]); setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("staff_notifications" as any)
      .select("*")
      .eq("collaborator_id", collaboratorId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (err) setError(err.message);
    setItems(((data as any[]) || []) as StaffNotification[]);
    setLoading(false);
  }, [collaboratorId, accessLoading]);

  useEffect(() => { load(); }, [load]);

  const unread = items.filter(n => !n.read_at).length;

  const markRead = async (id: string) => {
    const now = new Date().toISOString();
    setItems(prev => prev.map(n => (n.id === id ? { ...n, read_at: n.read_at || now } : n)));
    await supabase.from("staff_notifications" as any).update({ read_at: now }).eq("id", id);
  };

  const markAllRead = async () => {
    if (!collaboratorId) return;
    const now = new Date().toISOString();
    setItems(prev => prev.map(n => (n.read_at ? n : { ...n, read_at: now })));
    await supabase.from("staff_notifications" as any)
      .update({ read_at: now }).eq("collaborator_id", collaboratorId).is("read_at", null);
  };

  return { items, loading, error, unread, reload: load, markRead, markAllRead };
}
