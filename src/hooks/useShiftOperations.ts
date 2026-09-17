import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ShiftId = "manha" | "tarde" | "noite";

export type ShiftCollaborator = {
  id: string;
  full_name: string;
  role_title: string | null;
  photo_url: string | null;
  unit_id: string | null;
  shift_start: string | null;
  shift_end: string | null;
  shift_weekdays: number[] | null;
};

export type ShiftPresence = {
  id: string;
  shift: ShiftId;
  collaborator_id: string;
  present: boolean;
  confirmed_at: string | null;
  break_slot: string | null;
};

export type ShiftChange = {
  id: string;
  shift: ShiftId;
  outgoing_collaborator_id: string | null;
  incoming_collaborator_id: string;
  reason: string | null;
  created_at: string;
  cancelled_at: string | null;
};

const minutes = (time: string | null) => {
  if (!time) return null;
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + (minute || 0);
};

export const shiftForTime = (time: string): ShiftId => {
  const value = minutes(time) ?? 0;
  if (value < 12 * 60) return "manha";
  if (value < 18 * 60) return "tarde";
  return "noite";
};

export const SHIFT_LABEL: Record<ShiftId, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

export function useShiftOperations(dateISO: string, unitId: string | null) {
  const [collaborators, setCollaborators] = useState<ShiftCollaborator[]>([]);
  const [presence, setPresence] = useState<ShiftPresence[]>([]);
  const [supportIds, setSupportIds] = useState<string[]>([]);
  const [changes, setChanges] = useState<ShiftChange[]>([]);
  const [maxPerProfessional, setMaxPerProfessional] = useState(2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!unitId) {
      setCollaborators([]);
      setPresence([]);
      setSupportIds([]);
      setChanges([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [people, presences, support, dayChanges, settings] = await Promise.all([
      supabase.from("collaborators").select("id,full_name,role_title,photo_url,unit_id,shift_start,shift_end,shift_weekdays").eq("status", "active").order("full_name"),
      supabase.from("staff_shift_presence" as any).select("id,shift,collaborator_id,present,confirmed_at,break_slot").eq("unit_id", unitId).eq("shift_date", dateISO),
      supabase.from("staff_shift_support" as any).select("collaborator_id").eq("unit_id", unitId).eq("shift_date", dateISO),
      supabase.from("staff_shift_changes" as any).select("id,shift,outgoing_collaborator_id,incoming_collaborator_id,reason,created_at,cancelled_at").eq("unit_id", unitId).eq("shift_date", dateISO).order("created_at"),
      supabase.from("operation_settings" as any).select("max_students_per_professional").eq("unit_id", unitId).maybeSingle(),
    ]);
    const firstError = people.error || presences.error || support.error || dayChanges.error || settings.error;
    if (firstError) setError(firstError.message);
    setCollaborators(((people.data as any[]) || []) as ShiftCollaborator[]);
    setPresence(((presences.data as any[]) || []) as ShiftPresence[]);
    setSupportIds(((support.data as any[]) || []).map(row => row.collaborator_id));
    setChanges(((dayChanges.data as any[]) || []) as ShiftChange[]);
    setMaxPerProfessional(Number((settings.data as any)?.max_students_per_professional || 2));
    setLoading(false);
  }, [dateISO, unitId]);

  useEffect(() => { load(); }, [load]);

  const teams = useMemo(() => {
    const weekday = new Date(`${dateISO}T12:00:00`).getDay();
    const result: Record<ShiftId, ShiftCollaborator[]> = { manha: [], tarde: [], noite: [] };
    collaborators.forEach(person => {
      if (person.unit_id !== unitId) return;
      if (person.shift_weekdays?.length && !person.shift_weekdays.includes(weekday)) return;
      const start = minutes(person.shift_start);
      const end = minutes(person.shift_end);
      if (start == null || end == null) return;
      if (start < 12 * 60 && end > 5 * 60) result.manha.push(person);
      if (start < 18 * 60 && end > 12 * 60) result.tarde.push(person);
      if (end > 18 * 60) result.noite.push(person);
    });
    changes.filter(change => !change.cancelled_at).forEach(change => {
      if (change.outgoing_collaborator_id) {
        result[change.shift] = result[change.shift].filter(person => person.id !== change.outgoing_collaborator_id);
      }
      const incoming = collaborators.find(person => person.id === change.incoming_collaborator_id);
      if (incoming && !result[change.shift].some(person => person.id === incoming.id)) result[change.shift].push(incoming);
    });
    return result;
  }, [collaborators, changes, dateISO, unitId]);

  return { collaborators, teams, presence, supportIds, changes, maxPerProfessional, loading, error, reload: load };
}