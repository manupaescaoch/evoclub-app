import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ShiftId = "manha" | "tarde" | "noite" | "unico";

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
  unico: "Turno único",
};

export const SHIFT_ORDER: ShiftId[] = ["manha", "tarde", "noite"];

/** feriados nacionais do Brasil (fixos + móveis pela Páscoa) */
const brHolidays = (year: number): Set<string> => {
  const dates = new Set<string>([
    `${year}-01-01`, `${year}-04-21`, `${year}-05-01`, `${year}-09-07`,
    `${year}-10-12`, `${year}-11-02`, `${year}-11-15`, `${year}-11-20`, `${year}-12-25`,
  ]);
  // Páscoa (computus)
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = new Date(Date.UTC(year, month - 1, day));
  const add = (offset: number) => {
    const dt = new Date(easter.getTime() + offset * 86400000);
    dates.add(dt.toISOString().slice(0, 10));
  };
  add(-48); add(-47); add(-2); add(0); add(60); // Carnaval seg/ter, Sexta Santa, Páscoa, Corpus Christi
  return dates;
};

/** fim de semana e feriado operam em turno único das 08h às 14h */
export const SINGLE_SHIFT_START = 8 * 60;
export const SINGLE_SHIFT_END = 14 * 60;
export const singleShiftDay = (dateISO: string): boolean => {
  const date = new Date(`${dateISO}T12:00:00`);
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return true;
  return brHolidays(date.getFullYear()).has(dateISO);
};

/** verifica se um horário pertence ao turno */
export const slotInShift = (time: string, shift: ShiftId): boolean => {
  const value = minutes(time) ?? 0;
  if (shift === "unico") return value >= SINGLE_SHIFT_START && value < SINGLE_SHIFT_END;
  return shiftForTime(time) === shift;
};

export const isShiftLeader = (person: { role_title: string | null }) =>
  /l[ií]der/i.test(person.role_title || "");

/** turno atual pelo horário de Brasília */
export const currentShift = (): ShiftId => {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return shiftForTime(`${String(now.getHours()).padStart(2, "0")}:00`);
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
      if (start == null || end == null) {
        // sem horário no cadastro: considera escalado em todos os turnos da unidade
        result.manha.push(person); result.tarde.push(person); result.noite.push(person);
        return;
      }
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

/** sincronização em tempo real por unidade (presença, distribuição, equipe) */
export function useShiftRealtime(unitId: string | null, onChange: () => void) {
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    if (!unitId) { setSynced(false); return; }
    const channel = supabase.channel(`shift-panel-${unitId}`);
    ["class_bookings", "class_assignments", "staff_shift_presence", "staff_shift_support", "staff_shift_changes"].forEach(table => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => onChange());
    });
    channel.subscribe(status => setSynced(status === "SUBSCRIBED"));
    return () => { supabase.removeChannel(channel); setSynced(false); };
  }, [unitId, onChange]);
  return synced;
}