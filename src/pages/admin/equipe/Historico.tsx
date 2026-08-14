import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePeriod } from "@/contexts/PeriodContext";
import PageShell, { EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Log = {
  id: string; created_at: string; user_name: string | null; action: string; entity: string;
  entity_id: string | null; description: string; before_data: any; after_data: any; module: string | null;
};

const ENTITIES = [
  { key: "all", label: "Tudo" },
  { key: "collaborator", label: "Colaboradores" },
  { key: "time_entry", label: "Ponto" },
  { key: "shift_schedule", label: "Escala" },
  { key: "shift_swap", label: "Trocas de escala" },
];

export default function EquipeHistorico() {
  const { from, to, label } = usePeriod();
  const [rows, setRows] = useState<Log[]>([]);
  const [entity, setEntity] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    let q = supabase.from("audit_logs").select("*")
      .gte("created_at", `${from}T00:00:00`).lte("created_at", `${to}T23:59:59`)
      .in("entity", ["collaborator", "time_entry", "shift_schedule", "shift_swap"])
      .order("created_at", { ascending: false }).limit(300);
    if (entity !== "all") q = q.eq("entity", entity);
    const { data, error: err } = await q;
    if (err) setError(err.message);
    setRows(((data as any[]) || []) as Log[]);
    setLoading(false);
  }, [from, to, entity]);
  useEffect(() => { load(); }, [load]);

  return (
    <PageShell
      title="Histórico da Equipe"
      description={`Ações sensíveis de colaboradores, ponto e escala — período: ${label}.`}
      filters={
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>{ENTITIES.map(e => <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>)}</SelectContent>
        </Select>
      }
    >
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-dm text-red-700">
          Não foi possível carregar o histórico: {error}
        </div>
      )}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? <LoadingState /> : rows.length === 0 ? <EmptyState message="Nenhum registro no período." /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Quando</TableHead><TableHead>Responsável</TableHead><TableHead>Ação</TableHead>
                <TableHead>Antes</TableHead><TableHead>Depois</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-xs">{r.user_name || "—"}</TableCell>
                    <TableCell className="text-sm">{r.description}</TableCell>
                    <TableCell className="text-[11px] text-muted-foreground max-w-[220px] truncate">
                      {r.before_data ? JSON.stringify(r.before_data) : "—"}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground max-w-[220px] truncate">
                      {r.after_data ? JSON.stringify(r.after_data) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PageShell>
  );
}