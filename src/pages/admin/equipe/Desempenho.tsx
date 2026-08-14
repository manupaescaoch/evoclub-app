import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { useAccess } from "@/contexts/AccessContext";
import PageShell, { SummaryCard, EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Medal } from "lucide-react";

type Score = {
  collaborator_id: string; full_name: string; role_title: string | null; unit_id: string | null;
  unique_students: number; sessions_done: number; trials: number; conversions: number;
  avg_stars: number | null; plans_updated: number; assessments: number;
  score: number; rank: number; breakdown: Record<string, { peso: number; pontos: number }>;
};

const LABELS: Record<string, string> = {
  alunos_unicos: "Alunos únicos acompanhados",
  treinos_realizados: "Treinos realizados",
  experimentais: "Experimentais",
  conversoes: "Conversões",
  media_estrelas: "Média de estrelas",
  treinos_atualizados: "Treinos atualizados",
  avaliacoes: "Avaliações",
};

export default function Desempenho() {
  const { filterId } = useUnit();
  const { from, to, label } = usePeriod();
  const { can, collaboratorId } = useAccess();
  const [rows, setRows] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Score | null>(null);

  const canSeeComposition = can("equipe", "sensitive");

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

  const visible = useMemo(
    () => canSeeComposition ? rows : rows.filter(r => r.collaborator_id === collaboratorId),
    [rows, canSeeComposition, collaboratorId],
  );
  const mine = rows.find(r => r.collaborator_id === collaboratorId);
  const podium = rows.slice(0, 3);

  return (
    <PageShell
      title="Desempenho"
      description={`Indicadores, score de 0 a 100 e ranking de destaque — período: ${label}.`}
      summary={
        <>
          <SummaryCard label="Colaboradores avaliados" value={rows.length} />
          <SummaryCard label="Destaque" value={podium[0]?.full_name || "—"} accent="yellow" />
          <SummaryCard label="Meu score" value={mine ? mine.score : "—"} accent="blue" />
          <SummaryCard label="Minha posição" value={mine ? `${mine.rank}º` : "—"} accent="green" />
        </>
      }
    >
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-dm text-red-700">
          Não foi possível carregar o desempenho: {error}
        </div>
      )}

      {!loading && podium.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {podium.map((p, i) => (
            <div key={p.collaborator_id} className={`rounded-xl border p-4 ${i === 0 ? "border-amber-300 bg-amber-50" : "border-border bg-card"}`}>
              <div className="flex items-center gap-2">
                {i === 0 ? <Trophy size={16} className="text-amber-600" /> : <Medal size={16} className="text-muted-foreground" />}
                <span className="text-xs font-dm uppercase tracking-wide text-muted-foreground">{i + 1}º lugar</span>
              </div>
              <p className="font-barlow font-bold text-lg mt-1">{p.full_name}</p>
              <p className="text-xs text-muted-foreground font-dm">{p.role_title || "—"}</p>
              <p className="font-barlow font-bold text-2xl mt-2">{p.score}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? <LoadingState /> : visible.length === 0 ? (
          <EmptyState message="Nenhum indicador no período selecionado." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>#</TableHead><TableHead>Colaborador</TableHead><TableHead>Alunos</TableHead>
                <TableHead>Treinos</TableHead><TableHead>Exper.</TableHead><TableHead>Conv.</TableHead>
                <TableHead>Estrelas</TableHead><TableHead>Fichas</TableHead><TableHead>Avaliações</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {visible.map(r => (
                  <TableRow key={r.collaborator_id} className={r.collaborator_id === collaboratorId ? "bg-primary/5" : ""}>
                    <TableCell>{r.rank}º</TableCell>
                    <TableCell className="font-medium">{r.full_name}
                      <div className="text-xs text-muted-foreground">{r.role_title || "—"}</div>
                    </TableCell>
                    <TableCell>{r.unique_students}</TableCell>
                    <TableCell>{r.sessions_done}</TableCell>
                    <TableCell>{r.trials}</TableCell>
                    <TableCell>{r.conversions}</TableCell>
                    <TableCell>{r.avg_stars ? Number(r.avg_stars).toFixed(1) : "—"}</TableCell>
                    <TableCell>{r.plans_updated}</TableCell>
                    <TableCell>{r.assessments}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-barlow font-bold text-base">{r.score}</span>
                      {canSeeComposition && (
                        <Button size="sm" variant="ghost" className="ml-1" onClick={() => setDetail(r)}>composição</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {!canSeeComposition && (
        <p className="text-xs text-muted-foreground font-dm">
          A composição do score (peso de cada indicador) fica visível apenas para a gestão autorizada.
        </p>
      )}

      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Composição do score — {detail?.full_name}</DialogTitle></DialogHeader>
          <ul className="divide-y divide-border text-sm font-dm">
            {detail && Object.entries(detail.breakdown || {}).map(([k, v]) => (
              <li key={k} className="py-2 flex items-center gap-2">
                <span>{LABELS[k] || k}</span>
                <span className="ml-auto text-xs text-muted-foreground">peso {v.peso}</span>
                <span className="font-barlow font-bold w-12 text-right">{v.pontos}</span>
              </li>
            ))}
          </ul>
          <p className="font-barlow font-bold text-lg">Total: {detail?.score}</p>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}