import { useMemo, useState } from "react";
import { ArrowLeftRight, CalendarDays, Check, CheckCheck, Radio, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUnit } from "@/contexts/UnitContext";
import { brToday } from "@/hooks/useGradeDay";
import { SHIFT_LABEL, ShiftId, useShiftOperations } from "@/hooks/useShiftOperations";

const SHIFTS: ShiftId[] = ["manha", "tarde", "noite"];

export default function ProTurnos() {
  const { filterId } = useUnit();
  const [day, setDay] = useState(brToday());
  const [changing, setChanging] = useState<{ shift: ShiftId; outgoing: string } | null>(null);
  const [incoming, setIncoming] = useState("");
  const [reason, setReason] = useState("");
  const { collaborators, teams, presence, supportIds, changes, loading, error, reload } = useShiftOperations(day, filterId);

  const presenceByPerson = useMemo(() => new Map(presence.map(row => [`${row.shift}:${row.collaborator_id}`, row])), [presence]);

  const confirm = async (shift: ShiftId, collaboratorId: string, present = true) => {
    if (!filterId) return;
    const { error: err } = await supabase.from("staff_shift_presence" as any).upsert({
      unit_id: filterId, shift_date: day, shift, collaborator_id: collaboratorId,
      present, confirmed_at: present ? new Date().toISOString() : null,
    }, { onConflict: "unit_id,shift_date,shift,collaborator_id" });
    if (err) return toast.error(err.message);
    reload();
  };

  const confirmAll = async (shift: ShiftId) => {
    if (!filterId) return;
    const rows = teams[shift].map(person => ({
      unit_id: filterId, shift_date: day, shift, collaborator_id: person.id,
      present: true, confirmed_at: new Date().toISOString(),
    }));
    if (!rows.length) return;
    const { error: err } = await supabase.from("staff_shift_presence" as any).upsert(rows, { onConflict: "unit_id,shift_date,shift,collaborator_id" });
    if (err) return toast.error(err.message);
    toast.success("Equipe confirmada no turno.");
    reload();
  };

  const toggleSupport = async (shift: ShiftId, collaboratorId: string) => {
    if (!filterId) return;
    if (supportIds.includes(collaboratorId)) {
      const { error: err } = await supabase.from("staff_shift_support" as any).delete().eq("unit_id", filterId).eq("shift_date", day).eq("shift", shift).eq("collaborator_id", collaboratorId);
      if (err) return toast.error(err.message);
    } else {
      const { error: err } = await supabase.from("staff_shift_support" as any).insert({ unit_id: filterId, shift_date: day, shift, collaborator_id: collaboratorId });
      if (err) return toast.error(err.message);
    }
    reload();
  };

  const saveChange = async () => {
    if (!filterId || !changing || !incoming) return;
    const { error: err } = await supabase.from("staff_shift_changes" as any).insert({
      unit_id: filterId, shift_date: day, shift: changing.shift,
      outgoing_collaborator_id: changing.outgoing, incoming_collaborator_id: incoming,
      reason: reason.trim() || null,
    });
    if (err) return toast.error(err.message);
    toast.success("Substituição aplicada somente nesta data.");
    setChanging(null); setIncoming(""); setReason(""); reload();
  };

  const undo = async (id: string) => {
    const { error: err } = await supabase.from("staff_shift_changes" as any).update({ cancelled_at: new Date().toISOString() }).eq("id", id);
    if (err) return toast.error(err.message);
    reload();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-barlow text-2xl font-extrabold uppercase">Turnos</h1>
        <p className="font-dm text-xs text-muted-foreground">Equipe, presença, Rádio Apoio e substituições do dia.</p>
      </div>
      <label className="flex h-14 items-center gap-3 rounded-xl border border-border bg-card px-4">
        <CalendarDays size={18} className="text-primary" />
        <span className="font-dm text-xs font-semibold text-muted-foreground">DATA</span>
        <Input type="date" value={day} onChange={event => setDay(event.target.value || brToday())} className="ml-auto h-10 w-auto border-0 p-0 text-right shadow-none" />
      </label>

      {loading && <p className="py-10 text-center text-sm text-muted-foreground">Carregando turnos...</p>}
      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      {!loading && !error && SHIFTS.map(shift => {
        const people = teams[shift];
        const pending = people.filter(person => !presenceByPerson.get(`${shift}:${person.id}`)?.confirmed_at);
        const activeChanges = changes.filter(change => change.shift === shift && !change.cancelled_at);
        return (
          <section key={shift} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-barlow text-base font-extrabold uppercase">{SHIFT_LABEL[shift]}</h2>
              <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">{people.length} profissionais</span>
            </div>
            <Button className="mt-3 h-10 w-full text-xs" variant={pending.length ? "default" : "secondary"} disabled={!pending.length} onClick={() => confirmAll(shift)}>
              <CheckCheck size={15} /> {pending.length ? `Confirmar todos (${pending.length})` : "Turno todo confirmado"}
            </Button>
            <div className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border">
              {people.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">Nenhum profissional escalado.</p>}
              {people.map(person => {
                const row = presenceByPerson.get(`${shift}:${person.id}`);
                const supported = supportIds.includes(person.id);
                return (
                  <div key={person.id} className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-barlow text-xs font-bold text-primary">{person.full_name.slice(0, 2).toUpperCase()}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{person.full_name}</span><span className="block truncate text-[10px] text-muted-foreground">{person.role_title || "Equipe"}</span></span>
                      <Button size="icon" className="h-9 w-9" variant={row?.present ? "default" : "outline"} onClick={() => confirm(shift, person.id, !row?.present)} aria-label={`Confirmar ${person.full_name}`}><Check size={15} /></Button>
                      <Button size="icon" className="h-9 w-9" variant={supported ? "default" : "outline"} onClick={() => toggleSupport(shift, person.id)} aria-label={`Rádio Apoio ${person.full_name}`}><Radio size={15} /></Button>
                      <Button size="icon" className="h-9 w-9" variant="outline" onClick={() => { setChanging({ shift, outgoing: person.id }); setIncoming(""); setReason(""); }} aria-label={`Substituir ${person.full_name}`}><ArrowLeftRight size={15} /></Button>
                    </div>
                    {changing?.shift === shift && changing.outgoing === person.id && (
                      <div className="mt-3 space-y-2 border-t border-border pt-3">
                        <Select value={incoming} onValueChange={setIncoming}><SelectTrigger className="h-11"><SelectValue placeholder="Escolha o substituto" /></SelectTrigger><SelectContent>{collaborators.filter(candidate => candidate.id !== person.id && !people.some(member => member.id === candidate.id)).map(candidate => <SelectItem key={candidate.id} value={candidate.id}>{candidate.full_name}</SelectItem>)}</SelectContent></Select>
                        <Input value={reason} onChange={event => setReason(event.target.value)} placeholder="Motivo (opcional)" />
                        <div className="flex gap-2"><Button className="flex-1" disabled={!incoming} onClick={saveChange}>Salvar troca</Button><Button variant="outline" onClick={() => setChanging(null)}>Cancelar</Button></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {activeChanges.map(change => (
              <div key={change.id} className="mt-3 flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-xs">
                <ArrowLeftRight size={14} className="text-primary" />
                <span className="min-w-0 flex-1">{collaborators.find(item => item.id === change.outgoing_collaborator_id)?.full_name || "Equipe"} → {collaborators.find(item => item.id === change.incoming_collaborator_id)?.full_name || "Substituto"}{change.reason ? ` · ${change.reason}` : ""}</span>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => undo(change.id)} aria-label="Desfazer troca"><RotateCcw size={14} /></Button>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}