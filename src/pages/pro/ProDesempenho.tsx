import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/contexts/AccessContext";
import { useUnit } from "@/contexts/UnitContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { AlertTriangle, Medal, RefreshCw, Trophy } from "lucide-react";

type Score = {
  collaborator_id: string; full_name: string; role_title: string | null;
  unique_students: number; sessions_done: number; trials: number; conversions: number;
  avg_stars: number | null; plans_updated: number; assessments: number;
  score: number; rank: number;
};

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-2xl border border-border bg-card px-3 py-3">
    <p className="font-barlow font-black text-2xl leading-none">{value}</p>
    <p className="font-dm text-[10px] text-muted-foreground mt-1.5">{label}</p>
  </div>
);

export default function ProDesempenho() {
  const { collaboratorId } = useAccess();
  const { filterId } = useUnit();
  const { from, to, label } = usePeriod();
  const [rows, setRows] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error: err } = await supabase.rpc("collaborator_scores" as any, {
      _unit_id: filterId, _from: from, _to: to,
    });
    if (err) setError(err.message);
    setRows(((data as any[]) || []) as Score[]);
    setLoading(false);
  }, [filterId, from, to]);
  useEffect(() => { load(); }, [load]);

  const me = rows.find(r => r.collaborator_id === collaboratorId);
  const top = rows.slice(0, 5);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-barlow font-bold text-xl">MEU DESEMPENHO</h1>
        <p className="font-dm text-xs text-muted-foreground">{label}</p>
      </div>

      {loading && <p className="py-10 text-center font-dm text-sm text-muted-foreground">Calculando seu score...</p>}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-dm text-sm text-red-700">
          <p className="flex items-center gap-2"><AlertTriangle size={16} /> {error}</p>
          <button onClick={load} className="mt-3 h-10 w-full rounded-lg bg-white border border-red-200 font-semibold flex items-center justify-center gap-2">
            <RefreshCw size={14} /> Tentar de novo
          </button>
        </div>
      )}

      {!loading && !error && !me && (
        <div className="rounded-xl border border-border bg-card p-8 text-center font-dm text-sm text-muted-foreground">
          Sem dados de desempenho no período selecionado.
        </div>
      )}

      {!loading && !error && me && (
        <>
          <div className="rounded-2xl bg-[#1E1E2E] text-white p-5">
            <p className="flex items-center gap-1.5 text-[10px] font-barlow font-bold uppercase text-white/60">
              <Trophy size={12} /> Sua posição
            </p>
            <div className="flex items-end gap-3 mt-2">
              <p className="font-barlow font-black text-5xl leading-none">{me.rank}º</p>
              <p className="font-barlow font-bold text-xl leading-none pb-1">{Math.round(me.score)} pts</p>
            </div>
            <p className="font-dm text-xs text-white/70 mt-2">{me.full_name}{me.role_title ? ` · ${me.role_title}` : ""}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Stat label="Alunos acompanhados" value={me.unique_students} />
            <Stat label="Treinos realizados" value={me.sessions_done} />
            <Stat label="Experimentais" value={me.trials} />
            <Stat label="Conversões" value={me.conversions} />
            <Stat label="Média de estrelas" value={me.avg_stars != null ? me.avg_stars.toFixed(1) : "—"} />
            <Stat label="Avaliações" value={me.assessments} />
          </div>

          <section>
            <p className="font-barlow font-bold text-sm mb-2">RANKING DA EQUIPE</p>
            <div className="rounded-2xl border border-border bg-card divide-y divide-border">
              {top.map(r => (
                <div key={r.collaborator_id}
                  className={`flex items-center gap-3 px-4 py-3 ${r.collaborator_id === collaboratorId ? "bg-primary/5" : ""}`}>
                  <span className="font-barlow font-black text-lg w-7">{r.rank}º</span>
                  <span className="font-dm text-sm truncate flex-1">{r.full_name}</span>
                  {r.rank <= 3 && <Medal size={15} className="text-primary shrink-0" />}
                  <span className="font-barlow font-bold text-sm shrink-0">{Math.round(r.score)}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
