import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, AlertTriangle, Lock, RefreshCw } from "lucide-react";
import { useAccess } from "@/contexts/AccessContext";
import { useUnit } from "@/contexts/UnitContext";
import {
  GradeStudent, RPC_REASONS, STATUS_LABEL, STATUS_STYLE, brToday, useGradeDay,
} from "@/hooks/useGradeDay";
import ProStudentSheet from "@/components/pro/ProStudentSheet";

const shift = (iso: string, days: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};
const pretty = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

type PlanInfo = { name: string; sessions: string[]; expires_at: string | null };

/** grupo muscular do dia: escolha do check-in + sessão correspondente da ficha ativa */
const sessionForGroup = (plan: PlanInfo | undefined, group: string | null) => {
  if (!plan) return null;
  if (group) {
    const hit = plan.sessions.find(s => s.toLowerCase().includes(group.toLowerCase()));
    if (hit) return hit;
  }
  return plan.sessions[0] || null;
};

export default function ProHoje() {
  const { can, collaboratorId } = useAccess();
  const { filterId } = useUnit();
  const [dateISO, setDateISO] = useState(brToday());
  const [scope, setScope] = useState<"meus" | "todos">("meus");
  const [plans, setPlans] = useState<Record<number, PlanInfo>>({});
  const [active, setActive] = useState<GradeStudent | null>(null);
  const { slots, roster, loading, error, reload } = useGradeDay(dateISO, filterId);

  const canManage = can("grade", "edit");

  const clientIds = useMemo(
    () => Array.from(new Set(roster.map(r => r.client_id).filter((v): v is number => !!v))),
    [roster],
  );

  useEffect(() => {
    if (clientIds.length === 0) { setPlans({}); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("training_plans")
        .select("id, name, student_id, expires_at, training_weeks(id, training_sessions(name, order_index))")
        .in("student_id", clientIds)
        .eq("is_active", true);
      if (!alive) return;
      const map: Record<number, PlanInfo> = {};
      ((data as any[]) || []).forEach(p => {
        const sessions: { name: string; order_index: number }[] = [];
        (p.training_weeks || []).forEach((w: any) => (w.training_sessions || []).forEach((s: any) => sessions.push(s)));
        sessions.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
        map[p.student_id] = {
          name: p.name,
          expires_at: p.expires_at,
          sessions: Array.from(new Set(sessions.map(s => s.name))),
        };
      });
      setPlans(map);
    })();
    return () => { alive = false; };
  }, [clientIds.join(",")]);

  const mySlots = useMemo(() => {
    const byClass: Record<string, GradeStudent[]> = {};
    roster.forEach(s => { (byClass[s.class_id] ||= []).push(s); });
    return slots
      .map(slot => {
        const all = (byClass[slot.class_id] || []).filter(s => !s.waitlisted);
        const mine = all.filter(s => s.collaborator_id && s.collaborator_id === collaboratorId);
        return { slot, all, mine, list: scope === "meus" ? mine : all };
      })
      .filter(g => (scope === "meus" ? g.mine.length > 0 : g.all.length > 0 || !g.slot.blocked));
  }, [slots, roster, collaboratorId, scope]);

  const setStatus = async (s: GradeStudent, status: string) => {
    const { data, error: err } = await supabase.rpc("set_attendance" as any, { _booking_id: s.booking_id, _status: status });
    if (err) { toast.error(err.message); return; }
    const res = (data || {}) as { ok?: boolean; reason?: string };
    if (!res.ok) { toast.error(RPC_REASONS[res.reason || ""] || "Não foi possível atualizar."); return; }
    toast.success(`${s.student_name}: ${STATUS_LABEL[status]}`);
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setDateISO(d => shift(d, -1))} aria-label="Dia anterior"
          className="h-11 w-11 rounded-xl border border-border bg-card flex items-center justify-center">
          <ChevronLeft size={20} />
        </button>
        <button onClick={() => setDateISO(brToday())}
          className="flex-1 h-11 rounded-xl bg-card border border-border font-barlow font-bold text-base uppercase">
          {dateISO === brToday() ? "HOJE" : pretty(dateISO)}
        </button>
        <button onClick={() => setDateISO(d => shift(d, 1))} aria-label="Próximo dia"
          className="h-11 w-11 rounded-xl border border-border bg-card flex items-center justify-center">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="flex gap-2">
        {(["meus", "todos"] as const).map(s => (
          <button key={s} onClick={() => setScope(s)}
            className={`flex-1 h-10 rounded-xl font-dm text-xs font-bold uppercase tracking-wide ${scope === s ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground"}`}>
            {s === "meus" ? "Meus alunos" : "Todos os horários"}
          </button>
        ))}
      </div>

      {loading && <p className="py-10 text-center font-dm text-sm text-muted-foreground">Carregando sua grade...</p>}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-dm text-sm text-red-700">
          <p className="flex items-center gap-2"><AlertTriangle size={16} /> Não foi possível carregar: {error}</p>
          <button onClick={reload} className="mt-3 h-10 w-full rounded-lg bg-white border border-red-200 font-semibold flex items-center justify-center gap-2">
            <RefreshCw size={14} /> Tentar de novo
          </button>
        </div>
      )}

      {!loading && !error && mySlots.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center font-dm text-sm text-muted-foreground">
          {scope === "meus"
            ? "Nenhum aluno distribuído para você neste dia. A distribuição abre 20 minutos antes de cada horário."
            : "Nenhum horário com alunos neste dia."}
        </div>
      )}

      {!loading && !error && mySlots.map(({ slot, list, mine, all }) => (
        <section key={slot.class_id} className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <span className="font-barlow font-black text-2xl leading-none">{slot.start_time.slice(0, 5)}</span>
            <div className="min-w-0 flex-1">
              <p className="font-dm text-xs font-semibold truncate">{slot.name || "Musculação"}</p>
              <p className="font-dm text-[11px] text-muted-foreground">
                {scope === "meus" ? `${mine.length} seu(s) aluno(s)` : `${all.length} aluno(s)`} · presentes {slot.present} · faltas {slot.absent}
              </p>
            </div>
            {slot.blocked && (
              <span className="flex items-center gap-1 text-[10px] font-barlow font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full shrink-0">
                <Lock size={10} /> BLOQUEADO
              </span>
            )}
          </div>

          <div className="divide-y divide-border">
            {list.length === 0 && (
              <p className="px-4 py-5 font-dm text-xs text-muted-foreground">Nenhum aluno neste horário.</p>
            )}
            {list.map(s => {
              const plan = s.client_id ? plans[s.client_id] : undefined;
              const session = sessionForGroup(plan, s.muscle_group);
              return (
                <div key={s.booking_id} className="px-4 py-3">
                  <button type="button" onClick={() => setActive(s)} className="w-full flex items-center gap-3 text-left">
                    {s.avatar_url ? (
                      <img src={s.avatar_url} alt={`Foto de ${s.student_name}`} className="w-11 h-11 rounded-full object-cover shrink-0" />
                    ) : (
                      <span className="w-11 h-11 rounded-full bg-primary/10 text-primary font-barlow font-bold text-sm flex items-center justify-center shrink-0">
                        {s.student_name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block font-dm text-sm font-semibold truncate">
                        {s.student_name}
                        {s.is_trial && <span className="ml-1.5 text-[9px] font-barlow font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">EXPERIMENTAL</span>}
                      </span>
                      <span className="block font-dm text-[11px] text-muted-foreground truncate">
                        {s.muscle_group ? (s.muscle_group === "inferior" ? "Inferior" : "Superior") : "Grupo não informado"}
                        {session ? ` · ${session}` : plan ? ` · ${plan.name}` : " · sem ficha ativa"}
                      </span>
                    </span>
                    <span className={`shrink-0 text-[10px] font-dm font-semibold px-2 py-1 rounded ${STATUS_STYLE[s.attendance_status] || "bg-muted"}`}>
                      {STATUS_LABEL[s.attendance_status] || s.attendance_status}
                    </span>
                  </button>

                  {canManage && (
                    <div className="flex gap-2 mt-2.5">
                      {(["presente", "faltou", "agendado"] as const).map(st => (
                        <button key={st} onClick={() => setStatus(s, st)}
                          disabled={s.attendance_status === st}
                          className={`flex-1 h-10 rounded-xl font-dm text-xs font-bold ${s.attendance_status === st ? "bg-primary text-white" : "bg-muted/60 text-foreground"}`}>
                          {STATUS_LABEL[st]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <ProStudentSheet
        student={active}
        open={!!active}
        onOpenChange={v => !v && setActive(null)}
        planName={active?.client_id ? plans[active.client_id]?.name ?? null : null}
      />
    </div>
  );
}
