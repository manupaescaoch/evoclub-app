import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronLeft, Plus, Copy, Trash2, ChevronDown, Dumbbell, Save, Send,
  History, BookmarkPlus, Wand2,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import ExerciseLibraryPicker from "@/components/admin/prescrever/ExerciseLibraryPicker";
import NewPlanDialog from "@/components/admin/prescrever/NewPlanDialog";
import SetPresetDialog, { type PresetRecord, type PresetSetRow } from "@/components/admin/prescrever/SetPresetDialog";

// ===== types =====
type SetRow = {
  id: string;
  set_type: string;
  sets: number;
  reps: string;
  load: string;
  rest_seconds: number;
  time_seconds: number | null;
  incline: string;
  cadence: string;
  distance_km: string;
  pace: string;
  method_id: string | null;
  notes: string;
};

type SessionExercise = {
  id: string;
  exercise_id: string | null;
  exercise_name: string;
  notes: string;
  sets: SetRow[];
};

type Session = {
  id: string;
  name: string;
  day_of_week: string | null;
  session_number: number | null;
  notes: string;
  exercises: SessionExercise[];
};

type Week = {
  id: string;
  week_number: number;
  sessions: Session[];
};

const GOALS = ["Hipertrofia", "Emagrecimento", "Força", "Condicionamento", "Qualidade de vida", "Reabilitação/adaptação", "Performance", "Outro"];
const LEVELS = ["Iniciante", "Intermediário", "Avançado"];
const FREQS = ["2x", "3x", "4x", "5x", "6x", "Personalizado"];
const DAYS = [
  { value: "segunda", label: "Segunda" }, { value: "terca", label: "Terça" },
  { value: "quarta", label: "Quarta" }, { value: "quinta", label: "Quinta" },
  { value: "sexta", label: "Sexta" }, { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
];
const SET_TYPES = [
  { value: "reps_load", label: "Repetições e carga" },
  { value: "reps_load_time", label: "Repetições, carga e tempo" },
  { value: "reps_time", label: "Repetições e tempo" },
  { value: "time_incline", label: "Tempo e inclinação" },
  { value: "run", label: "Corrida" },
  { value: "cadence", label: "Cadência" },
  { value: "notes_only", label: "Observações" },
];

// Quais campos cada tipo de série exibe
const FIELDS_BY_TYPE: Record<string, {
  sets?: boolean; reps?: boolean; load?: boolean; rest?: boolean;
  time?: boolean; incline?: boolean; distance?: boolean; pace?: boolean; cadence?: boolean;
  notesOnly?: boolean;
}> = {
  reps_load:       { sets: true, reps: true, load: true, rest: true },
  reps_load_time:  { sets: true, reps: true, load: true, time: true, rest: true },
  reps_time:       { sets: true, reps: true, time: true, rest: true },
  time_incline:    { sets: true, time: true, incline: true, rest: true },
  run:             { sets: true, distance: true, time: true, pace: true, rest: true },
  cadence:         { sets: true, reps: true, load: true, cadence: true, rest: true },
  notes_only:      { notesOnly: true },
};

const newId = () => "tmp_" + Math.random().toString(36).slice(2, 10);
const defaultSet = (): SetRow => ({
  id: newId(), set_type: "reps_load", sets: 1, reps: "12", load: "",
  rest_seconds: 60, time_seconds: null, incline: "", cadence: "",
  distance_km: "", pace: "", method_id: null, notes: "",
});

// ============================================================================

const PrescreverEditor = () => {
  const { clientId: cidParam, planId: planIdParam } = useParams();
  const clientId = Number(cidParam);
  const navigate = useNavigate();
  const { canManage, loading: loadingRole } = useUserRole();

  const [client, setClient] = useState<{ id: number; name: string; status: string | null; plan: string | null } | null>(null);
  const [planId, setPlanId] = useState<string | null>(planIdParam || null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("");
  const [frequency, setFrequency] = useState("3x");
  const [orgType, setOrgType] = useState<"weekday" | "numeric">("weekday");
  const [status, setStatus] = useState<"draft" | "active" | "archived">("draft");
  const [isActive, setIsActive] = useState(false);
  const [startsAt, setStartsAt] = useState<string>(new Date().toISOString().split("T")[0]);
  const [expiresAt, setExpiresAt] = useState<string>("");

  const [weeks, setWeeks] = useState<Week[]>([]);
  const [activeWeek, setActiveWeek] = useState(0);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  const [methods, setMethods] = useState<{ id: string; name: string }[]>([]);

  const [showNewPlan, setShowNewPlan] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showSaveTpl, setShowSaveTpl] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pickerSessionId, setPickerSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // preset dialog
  const [presetTarget, setPresetTarget] = useState<{ sid: string; eid: string; mode: "picker" | "create" } | null>(null);

  // ===== load =====
  useEffect(() => {
    (async () => {
      const [clientRes, methodsRes] = await Promise.all([
        supabase.from("clients").select("id, name, status, plan").eq("id", clientId).single(),
        supabase.from("training_methods").select("id, name").order("name"),
      ]);
      setClient(clientRes.data as any);
      setMethods((methodsRes.data || []) as any);

      if (planIdParam) {
        await loadPlan(planIdParam);
      } else {
        // create blank with one week
        setWeeks([{ id: newId(), week_number: 1, sessions: [] }]);
        setShowNewPlan(true);
      }
    })();
    // eslint-disable-next-line
  }, [clientId, planIdParam]);

  const loadPlan = async (pid: string) => {
    const { data: plan } = await supabase.from("training_plans").select("*").eq("id", pid).single();
    if (!plan) return;
    setPlanId(plan.id);
    setName(plan.name); setDescription(plan.description || "");
    setGoal(plan.goal || ""); setLevel(plan.level || "");
    setFrequency(plan.frequency || "3x");
    setOrgType((plan.organization_type as any) || "weekday");
    setStatus(plan.status as any); setIsActive(plan.is_active);
    if ((plan as any).starts_at) setStartsAt((plan as any).starts_at);
    if ((plan as any).expires_at) setExpiresAt((plan as any).expires_at);

    const { data: weeksData } = await supabase.from("training_weeks")
      .select("*").eq("training_plan_id", pid).order("week_number");
    const wIds = (weeksData || []).map(w => w.id);
    const { data: sessionsData } = wIds.length
      ? await supabase.from("training_sessions").select("*").in("training_week_id", wIds).order("order_index")
      : { data: [] as any[] };
    const sIds = (sessionsData || []).map(s => s.id);
    const { data: exData } = sIds.length
      ? await supabase.from("training_session_exercises").select("*").in("training_session_id", sIds).order("order_index")
      : { data: [] as any[] };
    const eIds = (exData || []).map(e => e.id);
    const { data: setData } = eIds.length
      ? await supabase.from("training_exercise_sets").select("*").in("session_exercise_id", eIds).order("order_index")
      : { data: [] as any[] };

    const setsByEx: Record<string, SetRow[]> = {};
    (setData || []).forEach((s: any) => {
      (setsByEx[s.session_exercise_id] = setsByEx[s.session_exercise_id] || []).push({
        id: s.id, set_type: s.set_type, sets: s.sets, reps: s.reps || "",
        load: s.load || "", rest_seconds: s.rest_seconds || 0,
        time_seconds: s.time_seconds, incline: s.incline || "", cadence: s.cadence || "",
        distance_km: s.distance_km != null ? String(s.distance_km) : "",
        pace: s.pace || "",
        method_id: s.method_id, notes: s.notes || "",
      });
    });
    const exBySession: Record<string, SessionExercise[]> = {};
    (exData || []).forEach((e: any) => {
      (exBySession[e.training_session_id] = exBySession[e.training_session_id] || []).push({
        id: e.id, exercise_id: e.exercise_id, exercise_name: e.exercise_name,
        notes: e.notes || "", sets: setsByEx[e.id] || [defaultSet()],
      });
    });
    const sessionsByWeek: Record<string, Session[]> = {};
    (sessionsData || []).forEach((s: any) => {
      (sessionsByWeek[s.training_week_id] = sessionsByWeek[s.training_week_id] || []).push({
        id: s.id, name: s.name, day_of_week: s.day_of_week, session_number: s.session_number,
        notes: s.notes || "", exercises: exBySession[s.id] || [],
      });
    });
    setWeeks(((weeksData || []) as any[]).map(w => ({
      id: w.id, week_number: w.week_number, sessions: sessionsByWeek[w.id] || [],
    })));
  };

  // ===== mutations (in-memory) =====
  const updateWeek = (idx: number, fn: (w: Week) => Week) => {
    setWeeks(p => p.map((w, i) => i === idx ? fn(w) : w));
  };
  const addWeek = () => {
    setWeeks(p => [...p, { id: newId(), week_number: p.length + 1, sessions: [] }]);
    setActiveWeek(weeks.length);
  };
  const removeWeek = (idx: number) => {
    if (weeks.length <= 1) { toast.error("O plano precisa ter ao menos uma semana"); return; }
    setWeeks(p => p.filter((_, i) => i !== idx).map((w, i) => ({ ...w, week_number: i + 1 })));
    setActiveWeek(0);
  };
  const duplicateWeek = (idx: number) => {
    const src = weeks[idx];
    const copy: Week = {
      id: newId(), week_number: weeks.length + 1,
      sessions: src.sessions.map(s => ({
        ...s, id: newId(),
        exercises: s.exercises.map(e => ({
          ...e, id: newId(), sets: e.sets.map(st => ({ ...st, id: newId() })),
        })),
      })),
    };
    setWeeks(p => [...p, copy]);
    toast.success("Semana duplicada");
  };
  const addSession = (weekIdx: number) => {
    const w = weeks[weekIdx];
    const idx = w.sessions.length;
    const newSession: Session = {
      id: newId(),
      name: orgType === "weekday" ? `Treino ${String.fromCharCode(65 + idx)}` : `Treino ${idx + 1}`,
      day_of_week: null, session_number: idx + 1, notes: "", exercises: [],
    };
    updateWeek(weekIdx, w => ({ ...w, sessions: [...w.sessions, newSession] }));
    setExpandedSessions(p => ({ ...p, [newSession.id]: true }));
  };
  const updateSession = (weekIdx: number, sid: string, fn: (s: Session) => Session) => {
    updateWeek(weekIdx, w => ({ ...w, sessions: w.sessions.map(s => s.id === sid ? fn(s) : s) }));
  };
  const removeSession = (weekIdx: number, sid: string) => {
    updateWeek(weekIdx, w => ({ ...w, sessions: w.sessions.filter(s => s.id !== sid) }));
  };
  const duplicateSession = (weekIdx: number, sid: string) => {
    const w = weeks[weekIdx];
    const src = w.sessions.find(s => s.id === sid)!;
    const copy: Session = {
      ...src, id: newId(), name: src.name + " (cópia)",
      exercises: src.exercises.map(e => ({
        ...e, id: newId(), sets: e.sets.map(st => ({ ...st, id: newId() })),
      })),
    };
    updateWeek(weekIdx, w => ({ ...w, sessions: [...w.sessions, copy] }));
  };

  const addExerciseToSession = (sid: string, libEx: { id: string; name: string }) => {
    updateWeek(activeWeek, w => ({
      ...w,
      sessions: w.sessions.map(s => s.id !== sid ? s : ({
        ...s,
        exercises: [...s.exercises, {
          id: newId(), exercise_id: libEx.id, exercise_name: libEx.name,
          notes: "", sets: [defaultSet()],
        }],
      })),
    }));
    setPickerSessionId(null);
  };

  const updateExercise = (sid: string, eid: string, fn: (e: SessionExercise) => SessionExercise) => {
    updateSession(activeWeek, sid, s => ({ ...s, exercises: s.exercises.map(e => e.id === eid ? fn(e) : e) }));
  };
  const removeExercise = (sid: string, eid: string) => {
    updateSession(activeWeek, sid, s => ({ ...s, exercises: s.exercises.filter(e => e.id !== eid) }));
  };
  const duplicateExercise = (sid: string, eid: string) => {
    updateSession(activeWeek, sid, s => {
      const src = s.exercises.find(e => e.id === eid)!;
      return { ...s, exercises: [...s.exercises, { ...src, id: newId(), sets: src.sets.map(st => ({ ...st, id: newId() })) }] };
    });
  };

  const addSetRow = (sid: string, eid: string) =>
    updateExercise(sid, eid, e => ({ ...e, sets: [...e.sets, defaultSet()] }));
  const updateSetRow = (sid: string, eid: string, setId: string, patch: Partial<SetRow>) =>
    updateExercise(sid, eid, e => ({ ...e, sets: e.sets.map(s => s.id === setId ? { ...s, ...patch } : s) }));
  const removeSetRow = (sid: string, eid: string, setId: string) =>
    updateExercise(sid, eid, e => ({ ...e, sets: e.sets.length > 1 ? e.sets.filter(s => s.id !== setId) : e.sets }));
  const replicateSets = (sid: string, eid: string) =>
    updateExercise(sid, eid, e => e.sets.length
      ? ({ ...e, sets: [...e.sets, { ...e.sets[e.sets.length - 1], id: newId() }] })
      : e);

  const applyPreset = (sid: string, eid: string, preset: PresetRecord) => {
    updateExercise(sid, eid, e => ({
      ...e,
      sets: [
        ...e.sets,
        ...preset.sets.map((r: PresetSetRow) => ({
          id: newId(),
          set_type: preset.set_type,
          sets: r.sets, reps: r.reps || "", load: r.load || "",
          rest_seconds: r.rest_seconds || 0, time_seconds: r.time_seconds ?? null,
          incline: r.incline || "", cadence: r.cadence || "",
          distance_km: r.distance_km || "", pace: r.pace || "",
          method_id: null, notes: r.notes || "",
        })),
      ],
    }));
    toast.success(`Preset "${preset.name}" aplicado`);
  };

  const currentPresetCtx = (() => {
    if (!presetTarget) return null;
    const sess = weeks[activeWeek]?.sessions.find(s => s.id === presetTarget.sid);
    const ex = sess?.exercises.find(e => e.id === presetTarget.eid);
    if (!ex) return null;
    return {
      setType: ex.sets[0]?.set_type || "reps_load",
      sets: ex.sets.map(s => ({
        sets: s.sets, reps: s.reps, load: s.load, rest_seconds: s.rest_seconds,
        time_seconds: s.time_seconds, incline: s.incline, cadence: s.cadence,
        distance_km: s.distance_km, pace: s.pace, notes: s.notes,
      })),
    };
  })();

  // ===== save =====
  const persist = async (activate = false): Promise<string | null> => {
    if (!name.trim()) { toast.error("Informe o nome do plano"); return null; }
    if (activate) {
      const totalEx = weeks.reduce((acc, w) => acc + w.sessions.reduce((a, s) => a + s.exercises.length, 0), 0);
      const totalSessions = weeks.reduce((acc, w) => acc + w.sessions.length, 0);
      if (totalSessions === 0) { toast.error("Adicione ao menos uma sessão"); return null; }
      if (totalEx === 0) { toast.error("Adicione ao menos um exercício"); return null; }
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const coachId = session?.user.id || null;

      let pid = planId;
      const planPayload = {
        student_id: clientId, coach_id: coachId,
        name, description: description || null,
        goal: goal || null, level: level || null, frequency,
        organization_type: orgType,
        status: activate ? "active" : status,
        is_active: activate,
        starts_at: startsAt || null,
        expires_at: expiresAt || null,
      };

      if (!pid) {
        const { data, error } = await supabase.from("training_plans").insert(planPayload).select("id").single();
        if (error) throw error;
        pid = data.id; setPlanId(pid);
      } else {
        const { error } = await supabase.from("training_plans").update(planPayload).eq("id", pid);
        if (error) throw error;
        // wipe old structure (cascade)
        await supabase.from("training_weeks").delete().eq("training_plan_id", pid);
      }

      for (const w of weeks) {
        const { data: wRow, error: wErr } = await supabase.from("training_weeks")
          .insert({ training_plan_id: pid, week_number: w.week_number }).select("id").single();
        if (wErr) throw wErr;

        for (let si = 0; si < w.sessions.length; si++) {
          const s = w.sessions[si];
          const { data: sRow, error: sErr } = await supabase.from("training_sessions").insert({
            training_week_id: wRow.id, name: s.name, day_of_week: s.day_of_week,
            session_number: s.session_number, notes: s.notes || null, order_index: si,
          }).select("id").single();
          if (sErr) throw sErr;

          for (let ei = 0; ei < s.exercises.length; ei++) {
            const e = s.exercises[ei];
            const { data: eRow, error: eErr } = await supabase.from("training_session_exercises").insert({
              training_session_id: sRow.id, exercise_id: e.exercise_id,
              exercise_name: e.exercise_name, order_index: ei, notes: e.notes || null,
            }).select("id").single();
            if (eErr) throw eErr;

            if (e.sets.length) {
              const { error: stErr } = await supabase.from("training_exercise_sets").insert(
                e.sets.map((st, idx) => ({
                  session_exercise_id: eRow.id,
                  set_type: st.set_type, sets: st.sets, reps: st.reps || null,
                  load: st.load || null, rest_seconds: st.rest_seconds || null,
                  time_seconds: st.time_seconds, incline: st.incline || null,
                  cadence: st.cadence || null, method_id: st.method_id,
                  distance_km: st.distance_km ? Number(st.distance_km) : null,
                  pace: st.pace || null,
                  notes: st.notes || null, order_index: idx,
                }))
              );
              if (stErr) throw stErr;
            }
          }
        }
      }

      if (activate) { setStatus("active"); setIsActive(true); }
      toast.success(activate ? "Treino enviado para o aluno!" : "Plano salvo");
      return pid;
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || ""));
      return null;
    } finally {
      setSaving(false);
    }
  };

  // ===== render guards =====
  if (loadingRole) return <div className="h-64 flex items-center justify-center text-muted-foreground font-dm">Carregando...</div>;
  if (!canManage) return <div className="h-64 flex items-center justify-center text-muted-foreground font-dm">Você não tem permissão para prescrever treinos.</div>;
  if (!client) return <div className="h-64 flex items-center justify-center text-muted-foreground font-dm">Carregando aluno...</div>;

  const initials = client.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const currentWeek = weeks[activeWeek];
  const statusBadge = isActive
    ? <span className="bg-green-100 text-green-700 text-[10px] font-dm font-bold px-2 py-0.5 rounded-full">Ativo</span>
    : status === "archived"
    ? <span className="bg-gray-200 text-gray-600 text-[10px] font-dm font-bold px-2 py-0.5 rounded-full">Arquivado</span>
    : <span className="bg-yellow-100 text-yellow-700 text-[10px] font-dm font-bold px-2 py-0.5 rounded-full">Rascunho</span>;

  return (
    <div className="pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground mt-1">
          <ChevronLeft size={22} />
        </button>
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold font-barlow shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-barlow font-bold text-lg text-foreground truncate">{client.name}</h1>
            {statusBadge}
          </div>
          <p className="text-xs font-dm text-muted-foreground">
            {client.plan || "Sem plano financeiro"} {goal && `· ${goal}`}
          </p>
        </div>
      </div>

      {/* Action buttons (desktop) */}
      <div className="hidden md:flex flex-wrap gap-2 mb-4">
        <Button variant="outline" size="sm" className="font-dm gap-1.5" onClick={() => setShowNewPlan(true)}>
          <Plus size={14} /> Novo Plano
        </Button>
        <Button variant="outline" size="sm" className="font-dm gap-1.5" onClick={() => setShowCopy(true)}>
          <Copy size={14} /> Copiar Plano
        </Button>
        <Button variant="outline" size="sm" className="font-dm gap-1.5" onClick={() => setShowHistory(true)}>
          <History size={14} /> Histórico
        </Button>
        <Button variant="outline" size="sm" className="font-dm gap-1.5" onClick={() => setShowSaveTpl(true)}>
          <BookmarkPlus size={14} /> Salvar na biblioteca
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="font-dm gap-1.5" onClick={() => persist(false)} disabled={saving}>
          <Save size={14} /> Salvar rascunho
        </Button>
        <Button size="sm" className="font-dm gap-1.5" onClick={() => setShowSendConfirm(true)} disabled={saving}>
          <Send size={14} /> Enviar para aluno
        </Button>
      </div>

      {/* Plan info */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-dm font-semibold text-muted-foreground mb-1 block">Nome do plano *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Ex: Hipertrofia Fase 1"
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="text-[11px] font-dm font-semibold text-muted-foreground mb-1 block">Descrição</label>
          <input value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Descrição opcional"
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="text-[11px] font-dm font-semibold text-muted-foreground mb-1 block">Objetivo</label>
          <select value={goal} onChange={e => setGoal(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="">Selecione</option>
            {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-dm font-semibold text-muted-foreground mb-1 block">Nível</label>
          <select value={level} onChange={e => setLevel(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="">Selecione</option>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-dm font-semibold text-muted-foreground mb-1 block">Frequência</label>
          <select value={frequency} onChange={e => setFrequency(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary">
            {FREQS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-dm font-semibold text-muted-foreground mb-1 block">Organização</label>
          <div className="flex gap-2">
            <button onClick={() => setOrgType("weekday")}
              className={`flex-1 py-2 text-xs font-dm font-semibold rounded-lg border transition-colors ${orgType === "weekday" ? "bg-primary text-white border-primary" : "bg-background border-border text-foreground"}`}>
              Dias da semana
            </button>
            <button onClick={() => setOrgType("numeric")}
              className={`flex-1 py-2 text-xs font-dm font-semibold rounded-lg border transition-colors ${orgType === "numeric" ? "bg-primary text-white border-primary" : "bg-background border-border text-foreground"}`}>
              Treino numerado
            </button>
          </div>
        </div>
        <div>
          <label className="text-[11px] font-dm font-semibold text-muted-foreground mb-1 block">Início</label>
          <input type="date" value={startsAt} onChange={e => setStartsAt(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="text-[11px] font-dm font-semibold text-muted-foreground mb-1 block">Validade *</label>
          <input type="date" value={expiresAt} min={startsAt || undefined}
            onChange={e => setExpiresAt(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      </div>

      {/* Week tabs */}
      <div className="flex items-center gap-1 mb-3 overflow-x-auto">
        {weeks.map((w, i) => (
          <button key={w.id} onClick={() => setActiveWeek(i)}
            className={`px-3 py-1.5 text-xs font-dm font-semibold rounded-lg whitespace-nowrap transition-colors ${i === activeWeek ? "bg-primary text-white" : "bg-card border border-border text-foreground hover:border-primary/40"}`}>
            Semana {w.week_number}
          </button>
        ))}
        <button onClick={addWeek}
          className="px-3 py-1.5 text-xs font-dm font-semibold rounded-lg border border-dashed border-primary/40 text-primary hover:bg-primary/5 whitespace-nowrap flex items-center gap-1">
          <Plus size={12} /> Semana
        </button>
        {currentWeek && (
          <>
            <button onClick={() => duplicateWeek(activeWeek)} title="Duplicar semana"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
              <Copy size={14} />
            </button>
            <button onClick={() => removeWeek(activeWeek)} title="Remover semana"
              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50">
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>

      {/* Sessions */}
      {currentWeek && (
        <div className="space-y-3">
          {currentWeek.sessions.length === 0 && (
            <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
              <Dumbbell className="mx-auto mb-2 text-muted-foreground/40" size={32} />
              <p className="text-sm font-dm text-muted-foreground">Nenhuma sessão nesta semana.</p>
            </div>
          )}

          {currentWeek.sessions.map(s => {
            const expanded = expandedSessions[s.id] !== false;
            return (
              <div key={s.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3">
                  <button onClick={() => setExpandedSessions(p => ({ ...p, [s.id]: !expanded }))}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left">
                    <Dumbbell size={16} className="text-primary shrink-0" />
                    <input value={s.name}
                      onClick={e => e.stopPropagation()}
                      onChange={e => updateSession(activeWeek, s.id, x => ({ ...x, name: e.target.value }))}
                      className="font-dm font-bold text-sm text-foreground bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 flex-1 min-w-0" />
                  </button>
                  <div className="flex items-center gap-1.5">
                    {orgType === "weekday" ? (
                      <select value={s.day_of_week || ""}
                        onChange={e => updateSession(activeWeek, s.id, x => ({ ...x, day_of_week: e.target.value || null }))}
                        className="text-[11px] font-dm bg-background border border-border rounded px-2 py-1 focus:outline-none">
                        <option value="">Dia...</option>
                        {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    ) : (
                      <input type="number" min={1} value={s.session_number || ""}
                        onChange={e => updateSession(activeWeek, s.id, x => ({ ...x, session_number: parseInt(e.target.value) || null }))}
                        className="text-[11px] font-dm bg-background border border-border rounded px-2 py-1 w-16 focus:outline-none" placeholder="Nº" />
                    )}
                    <button onClick={() => duplicateSession(activeWeek, s.id)} className="p-1.5 hover:bg-muted rounded text-muted-foreground" title="Duplicar"><Copy size={13} /></button>
                    <button onClick={() => removeSession(activeWeek, s.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400" title="Excluir"><Trash2 size={13} /></button>
                    <button onClick={() => setExpandedSessions(p => ({ ...p, [s.id]: !expanded }))} className="p-1.5 hover:bg-muted rounded">
                      <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-border px-4 py-3 space-y-3">
                    <textarea value={s.notes}
                      onChange={e => updateSession(activeWeek, s.id, x => ({ ...x, notes: e.target.value }))}
                      placeholder="Observação geral da sessão..." rows={1}
                      className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded font-dm focus:outline-none focus:ring-1 focus:ring-primary" />

                    {s.exercises.map((e, ei) => (
                      <div key={e.id} className="border border-border rounded-lg p-3 bg-background/50">
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-dm font-bold text-muted-foreground">{ei + 1}.</span>
                            <span className="text-sm font-dm font-bold text-foreground truncate">{e.exercise_name}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => duplicateExercise(s.id, e.id)} className="p-1 hover:bg-muted rounded text-muted-foreground" title="Duplicar"><Copy size={12} /></button>
                            <button onClick={() => removeExercise(s.id, e.id)} className="p-1 hover:bg-red-50 rounded text-red-400" title="Remover"><Trash2 size={12} /></button>
                          </div>
                        </div>

                        {/* Sets editor */}
                        <div className="space-y-2">
                          {e.sets.map(st => (
                            (() => {
                              const f = FIELDS_BY_TYPE[st.set_type] || FIELDS_BY_TYPE.reps_load;
                              const inp = "px-3 py-2.5 text-sm bg-background border border-border rounded font-dm text-center focus:outline-none focus:ring-1 focus:ring-primary w-full";
                              const Field = ({ label, children }: { label: string; children: any }) => (
                                <div className="flex-1 min-w-[80px]">
                                  <label className="text-[10px] font-dm text-muted-foreground mb-0.5 block">{label}</label>
                                  {children}
                                </div>
                              );
                              return (
                            <div key={st.id} className="border-b border-border/40 last:border-0 pb-3 last:pb-0 space-y-2">
                              <div className="flex items-end gap-2">
                                <Field label="Tipo da série">
                                  <select value={st.set_type}
                                    onChange={ev => updateSetRow(s.id, e.id, st.id, { set_type: ev.target.value })}
                                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded font-dm focus:outline-none focus:ring-1 focus:ring-primary">
                                    {SET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                  </select>
                                </Field>
                                <button onClick={() => removeSetRow(s.id, e.id, st.id)} className="p-2.5 text-red-400 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                              </div>
                              {f.notesOnly ? (
                                <Field label="Observação">
                                  <input value={st.notes}
                                    onChange={ev => updateSetRow(s.id, e.id, st.id, { notes: ev.target.value })}
                                    className={`${inp} text-left`} placeholder="Observação livre..." />
                                </Field>
                              ) : (
                                <div className="flex flex-wrap items-end gap-2">
                                  {f.sets && (<Field label="Séries"><input type="number" min={1} value={st.sets}
                                    onChange={ev => updateSetRow(s.id, e.id, st.id, { sets: parseInt(ev.target.value) || 1 })} className={inp} /></Field>)}
                                  {f.reps && (<Field label="Reps"><input value={st.reps}
                                    onChange={ev => updateSetRow(s.id, e.id, st.id, { reps: ev.target.value })} className={inp} placeholder="12" /></Field>)}
                                  {f.load && (<Field label="Carga"><input value={st.load}
                                    onChange={ev => updateSetRow(s.id, e.id, st.id, { load: ev.target.value })} className={inp} placeholder="40kg" /></Field>)}
                                  {f.time && (<Field label="Tempo (s)"><input type="number" value={st.time_seconds || ""}
                                    onChange={ev => updateSetRow(s.id, e.id, st.id, { time_seconds: parseInt(ev.target.value) || null })} className={inp} /></Field>)}
                                  {f.incline && (<Field label="Incl %"><input value={st.incline}
                                    onChange={ev => updateSetRow(s.id, e.id, st.id, { incline: ev.target.value })} className={inp} /></Field>)}
                                  {f.distance && (<Field label="Dist km"><input value={st.distance_km}
                                    onChange={ev => updateSetRow(s.id, e.id, st.id, { distance_km: ev.target.value })} className={inp} /></Field>)}
                                  {f.pace && (<Field label="Ritmo"><input value={st.pace}
                                    onChange={ev => updateSetRow(s.id, e.id, st.id, { pace: ev.target.value })} className={inp} placeholder="min/km" /></Field>)}
                                  {f.cadence && (<Field label="Cadência"><input value={st.cadence}
                                    onChange={ev => updateSetRow(s.id, e.id, st.id, { cadence: ev.target.value })} className={inp} placeholder="3-0-1-0" /></Field>)}
                                  {f.rest && (<Field label="Intervalo (s)"><input type="number" value={st.rest_seconds}
                                    onChange={ev => updateSetRow(s.id, e.id, st.id, { rest_seconds: parseInt(ev.target.value) || 0 })} className={inp} /></Field>)}
                                  <Field label="Método">
                                    <select value={st.method_id || ""}
                                      onChange={ev => updateSetRow(s.id, e.id, st.id, { method_id: ev.target.value || null })}
                                      className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded font-dm focus:outline-none focus:ring-1 focus:ring-primary">
                                      <option value="">—</option>
                                      {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                  </Field>
                                  <Field label="Obs"><input value={st.notes}
                                    onChange={ev => updateSetRow(s.id, e.id, st.id, { notes: ev.target.value })} className={`${inp} text-left`} placeholder="obs" /></Field>
                                </div>
                              )}
                            </div>
                              );
                            })()
                          ))}
                          <div className="flex flex-wrap gap-2 pt-2">
                            <button onClick={() => addSetRow(s.id, e.id)}
                              className="flex-1 min-w-[120px] bg-primary text-primary-foreground text-xs font-dm font-semibold py-2 px-3 rounded-lg hover:bg-primary/90 flex items-center justify-center gap-1.5">
                              <Plus size={12} /> Adicionar série
                            </button>
                            <button onClick={() => replicateSets(s.id, e.id)}
                              className="flex-1 min-w-[120px] border border-primary text-primary text-xs font-dm font-semibold py-2 px-3 rounded-lg hover:bg-primary/5 flex items-center justify-center gap-1.5">
                              <Copy size={12} /> Replicar séries
                            </button>
                            <button onClick={() => setPresetTarget({ sid: s.id, eid: e.id, mode: "picker" })}
                              className="flex-1 min-w-[120px] border border-primary text-primary text-xs font-dm font-semibold py-2 px-3 rounded-lg hover:bg-primary/5 flex items-center justify-center gap-1.5">
                              <BookmarkPlus size={12} /> Adicionar preset
                            </button>
                          </div>
                          <button onClick={() => setPresetTarget({ sid: s.id, eid: e.id, mode: "create" })}
                            className="w-full text-center text-xs font-dm text-primary hover:underline py-1">
                            Salvar como preset
                          </button>
                        </div>
                      </div>
                    ))}

                    <button onClick={() => setPickerSessionId(s.id)}
                      className="w-full border border-dashed border-primary/40 text-primary rounded-lg py-2 text-xs font-dm font-semibold hover:bg-primary/5 flex items-center justify-center gap-1.5">
                      <Plus size={14} /> Adicionar Exercício
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <button onClick={() => addSession(activeWeek)}
            className="w-full border-2 border-dashed border-primary/30 text-primary rounded-xl py-3 flex items-center justify-center gap-2 font-dm font-semibold text-sm hover:bg-primary/5">
            <Plus size={16} /> Adicionar Sessão
          </button>
        </div>
      )}

      {/* Mobile fixed bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 flex gap-2 z-30">
        <Button variant="outline" size="sm" className="flex-1 font-dm" onClick={() => persist(false)} disabled={saving}>
          <Save size={14} /> Salvar
        </Button>
        <Button size="sm" className="flex-1 font-dm" onClick={() => setShowSendConfirm(true)} disabled={saving}>
          <Send size={14} /> Enviar
        </Button>
      </div>

      {/* Dialogs */}
      <NewPlanDialog
        open={showNewPlan}
        onClose={() => setShowNewPlan(false)}
        onManual={() => { setShowNewPlan(false); }}
        onLibrary={() => { setShowNewPlan(false); setShowCopy(true); }}
      />

      <ExerciseLibraryPicker
        open={pickerSessionId !== null}
        onClose={() => setPickerSessionId(null)}
        onSelect={ex => pickerSessionId && addExerciseToSession(pickerSessionId, { id: ex.id, name: ex.name })}
      />

      <CopyPlanDialog
        open={showCopy} onClose={() => setShowCopy(false)} clientId={clientId}
        onPickPlan={async (srcPlanId) => { await loadPlan(srcPlanId); setPlanId(null); setIsActive(false); setStatus("draft"); toast.success("Plano carregado para edição"); setShowCopy(false); }}
        onPickTemplate={async (tplId) => { await applyTemplate(tplId); setShowCopy(false); }}
        onDuplicateWeek={() => { duplicateWeek(activeWeek); setShowCopy(false); }}
      />

      <SendConfirmDialog open={showSendConfirm} onClose={() => setShowSendConfirm(false)}
        onConfirm={async () => { setShowSendConfirm(false); await persist(true); }} />

      <SaveTemplateDialog open={showSaveTpl} onClose={() => setShowSaveTpl(false)}
        defaultName={name} defaultDescription={description} defaultGoal={goal}
        onSave={async (form) => { await saveAsTemplate(form); setShowSaveTpl(false); }} />

      <HistoryDialog open={showHistory} onClose={() => setShowHistory(false)} clientId={clientId} />

      <SetPresetDialog
        open={presetTarget !== null}
        onClose={() => setPresetTarget(null)}
        initialMode={presetTarget?.mode || "picker"}
        prefillSetType={currentPresetCtx?.setType}
        prefillSets={presetTarget?.mode === "create" ? currentPresetCtx?.sets : undefined}
        onApply={(preset) => { if (presetTarget) applyPreset(presetTarget.sid, presetTarget.eid, preset); }}
      />
    </div>
  );

  // ===== template apply =====
  async function applyTemplate(tplId: string) {
    const { data: tpl } = await supabase.from("workout_templates").select("*").eq("id", tplId).single();
    if (!tpl) return;
    const { data: tplSessions } = await supabase.from("template_sessions").select("*").eq("template_id", tplId).order("sort_order");
    const sIds = (tplSessions || []).map(s => s.id);
    const { data: tplEx } = sIds.length
      ? await supabase.from("template_exercises").select("*").in("template_session_id", sIds).order("sort_order")
      : { data: [] as any[] };

    const exBySession: Record<string, any[]> = {};
    (tplEx || []).forEach((e: any) => (exBySession[e.template_session_id] = exBySession[e.template_session_id] || []).push(e));

    if (!name) setName(tpl.name);
    if (!description) setDescription(tpl.description || "");
    setWeeks([{
      id: newId(), week_number: 1,
      sessions: (tplSessions || []).map(ts => ({
        id: newId(), name: ts.name || "Treino A", day_of_week: ts.day_label, session_number: null, notes: ts.notes || "",
        exercises: (exBySession[ts.id] || []).map(te => ({
          id: newId(), exercise_id: null, exercise_name: te.name, notes: te.notes || "",
          sets: [{
            ...defaultSet(), sets: te.sets || 3, reps: te.reps || "12",
            load: te.load || "", rest_seconds: te.rest_seconds || 60,
          }],
        })),
      })),
    }]);
    setActiveWeek(0);
    toast.success("Modelo aplicado");
  }

  async function saveAsTemplate(form: { name: string; description: string; category: string }) {
    const { data: tpl, error } = await supabase.from("workout_templates").insert({
      name: form.name, description: form.description || null, category: form.category || null,
    }).select("id").single();
    if (error || !tpl) { toast.error("Erro ao salvar modelo"); return; }

    const w = weeks[0]; // first week as template
    if (!w) { toast.success("Modelo criado"); return; }
    for (let i = 0; i < w.sessions.length; i++) {
      const s = w.sessions[i];
      const { data: ts } = await supabase.from("template_sessions").insert({
        template_id: tpl.id, name: s.name, day_label: s.day_of_week, notes: s.notes || null, sort_order: i,
      }).select("id").single();
      if (ts && s.exercises.length) {
        await supabase.from("template_exercises").insert(s.exercises.map((e, ei) => ({
          template_session_id: ts.id, name: e.exercise_name,
          sets: e.sets[0]?.sets || 3, reps: e.sets[0]?.reps || "12",
          load: e.sets[0]?.load || null, rest_seconds: e.sets[0]?.rest_seconds || 60,
          notes: e.notes || null, sort_order: ei,
        })));
      }
    }
    toast.success("Modelo salvo na biblioteca");
  }
};

// ============================================================================
// Sub-dialogs
// ============================================================================

const SendConfirmDialog = ({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) => (
  <Dialog open={open} onOpenChange={v => !v && onClose()}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="font-barlow font-bold text-lg">Enviar treino para o aluno?</DialogTitle>
      </DialogHeader>
      <p className="text-sm font-dm text-muted-foreground py-2">
        O plano será liberado para o aluno e ficará ativo a partir de agora. Os planos anteriores serão arquivados automaticamente.
      </p>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} className="font-dm">Cancelar</Button>
        <Button onClick={onConfirm} className="font-dm gap-1.5"><Send size={14} /> Enviar treino</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const SaveTemplateDialog = ({ open, onClose, defaultName, defaultDescription, defaultGoal, onSave }: any) => {
  const [form, setForm] = useState({ name: defaultName || "", description: defaultDescription || "", category: defaultGoal || "" });
  useEffect(() => { setForm({ name: defaultName || "", description: defaultDescription || "", category: defaultGoal || "" }); }, [defaultName, defaultDescription, defaultGoal, open]);
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-barlow font-bold">Salvar como modelo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-dm font-semibold text-muted-foreground mb-1 block">Nome</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs font-dm font-semibold text-muted-foreground mb-1 block">Categoria</label>
            <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              placeholder="Ex: Hipertrofia, Iniciante..."
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs font-dm font-semibold text-muted-foreground mb-1 block">Descrição</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="font-dm">Cancelar</Button>
          <Button onClick={() => onSave(form)} className="font-dm">Salvar modelo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CopyPlanDialog = ({ open, onClose, clientId, onPickPlan, onPickTemplate, onDuplicateWeek }: any) => {
  const [tab, setTab] = useState<"this" | "other" | "tpl" | "week">("this");
  const [thisPlans, setThisPlans] = useState<any[]>([]);
  const [otherClients, setOtherClients] = useState<any[]>([]);
  const [otherPlans, setOtherPlans] = useState<any[]>([]);
  const [selOtherClient, setSelOtherClient] = useState<string>("");
  const [tpls, setTpls] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [a, b, c] = await Promise.all([
        supabase.from("training_plans").select("id, name, created_at, status").eq("student_id", clientId).order("created_at", { ascending: false }),
        supabase.from("clients").select("id, name").neq("id", clientId).order("name"),
        supabase.from("workout_templates").select("id, name, category").order("created_at", { ascending: false }),
      ]);
      setThisPlans(a.data || []);
      setOtherClients(b.data || []);
      setTpls(c.data || []);
    })();
  }, [open, clientId]);

  useEffect(() => {
    if (!selOtherClient) { setOtherPlans([]); return; }
    (async () => {
      const { data } = await supabase.from("training_plans").select("id, name, created_at").eq("student_id", parseInt(selOtherClient)).order("created_at", { ascending: false });
      setOtherPlans(data || []);
    })();
  }, [selOtherClient]);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle className="font-barlow font-bold">Copiar plano</DialogTitle></DialogHeader>
        <div className="flex gap-1 mb-3 text-xs font-dm">
          {[["this", "Deste aluno"], ["other", "De outro aluno"], ["tpl", "Da biblioteca"], ["week", "Duplicar semana"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k as any)}
              className={`px-2.5 py-1.5 rounded-lg font-semibold ${tab === k ? "bg-primary text-white" : "bg-muted text-foreground"}`}>{l}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {tab === "this" && thisPlans.map(p => (
            <button key={p.id} onClick={() => onPickPlan(p.id)} className="w-full text-left bg-card border border-border rounded-lg px-3 py-2 hover:border-primary/40">
              <p className="text-sm font-dm font-bold">{p.name}</p>
              <p className="text-[11px] font-dm text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")} · {p.status}</p>
            </button>
          ))}
          {tab === "this" && thisPlans.length === 0 && <p className="text-sm text-muted-foreground font-dm text-center py-4">Sem planos anteriores</p>}

          {tab === "other" && (
            <>
              <select value={selOtherClient} onChange={e => setSelOtherClient(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg font-dm focus:outline-none">
                <option value="">Selecionar aluno...</option>
                {otherClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {otherPlans.map(p => (
                <button key={p.id} onClick={() => onPickPlan(p.id)} className="w-full text-left bg-card border border-border rounded-lg px-3 py-2 hover:border-primary/40">
                  <p className="text-sm font-dm font-bold">{p.name}</p>
                  <p className="text-[11px] font-dm text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
                </button>
              ))}
            </>
          )}

          {tab === "tpl" && tpls.map(t => (
            <button key={t.id} onClick={() => onPickTemplate(t.id)} className="w-full text-left bg-card border border-border rounded-lg px-3 py-2 hover:border-primary/40">
              <p className="text-sm font-dm font-bold">{t.name}</p>
              {t.category && <p className="text-[11px] font-dm text-muted-foreground">{t.category}</p>}
            </button>
          ))}

          {tab === "week" && (
            <button onClick={onDuplicateWeek} className="w-full bg-primary text-white rounded-lg py-3 font-dm font-semibold text-sm">
              Duplicar semana atual
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const HistoryDialog = ({ open, onClose, clientId }: { open: boolean; onClose: () => void; clientId: number }) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [anam, setAnam] = useState<any[]>([]);
  const [checks, setChecks] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [a, b, c] = await Promise.all([
        supabase.from("training_plans").select("*").eq("student_id", clientId).order("created_at", { ascending: false }),
        supabase.from("anamnesis").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(5),
        supabase.from("check_ins").select("*").eq("client_id", clientId).order("checked_at", { ascending: false }).limit(10),
      ]);
      setPlans(a.data || []); setAnam(b.data || []); setChecks(c.data || []);
    })();
  }, [open, clientId]);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle className="font-barlow font-bold">Histórico do aluno</DialogTitle></DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4">
          <div>
            <h3 className="text-xs font-dm font-bold text-muted-foreground mb-2 uppercase">Planos anteriores</h3>
            {plans.length === 0 ? <p className="text-sm font-dm text-muted-foreground">Nenhum.</p> :
              plans.map(p => (
                <div key={p.id} className="bg-card border border-border rounded-lg px-3 py-2 mb-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-dm font-bold">{p.name}</p>
                    <span className="text-[10px] font-dm text-muted-foreground">{p.status}</span>
                  </div>
                  <p className="text-[11px] font-dm text-muted-foreground">
                    {p.goal && `${p.goal} · `}{new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              ))}
          </div>
          <div>
            <h3 className="text-xs font-dm font-bold text-muted-foreground mb-2 uppercase">Anamneses recentes</h3>
            {anam.length === 0 ? <p className="text-sm font-dm text-muted-foreground">Nenhuma.</p> :
              anam.map(a => (
                <div key={a.id} className="bg-card border border-border rounded-lg px-3 py-2 mb-2">
                  <p className="text-[11px] font-dm text-muted-foreground">{new Date(a.created_at).toLocaleDateString("pt-BR")}</p>
                  <p className="text-sm font-dm whitespace-pre-wrap">{a.content}</p>
                </div>
              ))}
          </div>
          <div>
            <h3 className="text-xs font-dm font-bold text-muted-foreground mb-2 uppercase">Adesão (check-ins)</h3>
            <p className="text-sm font-dm">{checks.length} check-in{checks.length !== 1 ? "s" : ""} recentes</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrescreverEditor;