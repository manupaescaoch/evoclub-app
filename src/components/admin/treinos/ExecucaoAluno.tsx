import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronRight, Activity } from "lucide-react";

type LogRow = {
  id: string;
  client_id: number;
  session_name: string | null;
  workout_date: string;
  status: string;
  started_at: string;
  finished_at: string | null;
};

type SetRow = {
  id: string;
  workout_log_id: string;
  exercise_name: string;
  prescribed_sets: number | null;
  prescribed_reps: string | null;
  prescribed_load: string | null;
  performed_sets: number | null;
  performed_reps: string | null;
  performed_load: string | null;
  completed: boolean;
  exercise_order: number;
  order_index: number;
};

const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR");

const diff = (a: string | null | number | undefined, b: string | null | number | undefined) => {
  const x = a === null || a === undefined || a === "" ? null : String(a);
  const y = b === null || b === undefined || b === "" ? null : String(b);
  return x !== null && y !== null && x !== y;
};

/**
 * Visão de adesão real: o que foi prescrito vs o que o aluno executou.
 * Passe clientId para filtrar por aluno; sem clientId lista os registros mais recentes.
 */
const ExecucaoAluno = ({
  clientId,
  title = "EXECUÇÃO DO ALUNO",
  limit = 15,
}: {
  clientId?: number;
  title?: string;
  limit?: number;
}) => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [names, setNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sets, setSets] = useState<Record<string, SetRow[]>>({});

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("workout_logs")
        .select("id, client_id, session_name, workout_date, status, started_at, finished_at")
        .order("workout_date", { ascending: false })
        .order("started_at", { ascending: false })
        .limit(limit);
      if (clientId) q = q.eq("client_id", clientId);
      const { data } = await q;
      if (!alive) return;
      const rows = (data || []) as LogRow[];
      setLogs(rows);
      if (!clientId && rows.length) {
        const ids = [...new Set(rows.map(r => r.client_id))];
        const { data: cs } = await supabase.from("clients").select("id, name").in("id", ids);
        if (alive) setNames(Object.fromEntries((cs || []).map(c => [c.id, c.name])));
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [open, clientId, limit]);

  const toggleLog = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (sets[id]) return;
    const { data } = await supabase
      .from("workout_log_sets")
      .select("*")
      .eq("workout_log_id", id)
      .order("exercise_order")
      .order("order_index");
    setSets(prev => ({ ...prev, [id]: (data || []) as SetRow[] }));
  };

  const last30 = logs.filter(l => {
    const d = new Date(`${l.workout_date}T12:00:00`);
    return Date.now() - d.getTime() <= 30 * 864e5 && l.status === "completed";
  }).length;

  return (
    <div className="mt-6 bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
      >
        <Activity size={16} className="text-primary" />
        <span className="font-barlow font-bold text-sm text-foreground flex-1">{title}</span>
        {open && logs.length > 0 && (
          <span className="text-[11px] font-dm text-muted-foreground">
            {last30} treino{last30 !== 1 ? "s" : ""} em 30 dias
          </span>
        )}
        {open ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3">
          {loading && <p className="text-sm font-dm text-muted-foreground">Carregando...</p>}
          {!loading && logs.length === 0 && (
            <p className="text-sm font-dm text-muted-foreground">Nenhum treino executado registrado.</p>
          )}
          <div className="space-y-2">
            {logs.map(l => {
              const rows = sets[l.id] || [];
              return (
                <div key={l.id} className="border border-border rounded-lg">
                  <button onClick={() => toggleLog(l.id)} className="w-full flex items-center gap-2 px-3 py-2 text-left">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-dm font-bold text-foreground truncate">
                        {l.session_name || "Treino"}
                        {!clientId && names[l.client_id] ? ` · ${names[l.client_id]}` : ""}
                      </p>
                      <p className="text-[11px] font-dm text-muted-foreground">
                        {fmtDate(l.workout_date)} · {l.status === "completed" ? "Concluído" : "Em andamento"}
                      </p>
                    </div>
                    {expanded === l.id ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                  </button>
                  {expanded === l.id && (
                    <div className="border-t border-border px-3 py-2">
                      {rows.length === 0 ? (
                        <p className="text-[12px] font-dm text-muted-foreground">Nenhuma série registrada.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {rows.map(r => {
                            const loadDiff = diff(r.prescribed_load, r.performed_load);
                            const repsDiff = diff(r.prescribed_reps, r.performed_reps) || diff(r.prescribed_sets, r.performed_sets);
                            return (
                              <div key={r.id} className="flex items-center gap-2 text-[12px] font-dm">
                                <span className="flex-1 min-w-0 truncate text-foreground">{r.exercise_name}</span>
                                <span className="text-muted-foreground shrink-0">
                                  {r.prescribed_sets ?? "-"}x{r.prescribed_reps || "-"}
                                  {r.prescribed_load ? ` · ${r.prescribed_load}kg` : ""}
                                </span>
                                <span className="text-muted-foreground shrink-0">→</span>
                                <span className={`shrink-0 font-bold ${loadDiff || repsDiff ? "text-primary" : "text-foreground"}`}>
                                  {r.performed_sets ?? "-"}x{r.performed_reps || "-"}
                                  {r.performed_load ? ` · ${r.performed_load}kg` : ""}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecucaoAluno;