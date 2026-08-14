import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { useAccess } from "@/contexts/AccessContext";
import PageShell, { SummaryCard, EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, ShieldAlert } from "lucide-react";

type Row = {
  id: string; client_id: number | null; client_name: string | null; unit_id: string | null;
  type: string; severity: string; title: string; description: string | null;
  status: string; owner_id: string | null; owner_name: string | null;
  resolution_note: string | null; resolved_at: string | null;
  source_table: string | null; created_at: string;
};
type Collab = { id: string; full_name: string };

const TYPES: Record<string, string> = {
  dor: "Dor / desconforto",
  denuncia: "Denúncia na comunidade",
  limitacao: "Limitação do aluno",
  acesso: "Acesso / catraca",
  equipamento: "Equipamento",
  limpeza: "Limpeza / estrutura",
  atendimento: "Atendimento",
  financeiro: "Financeiro",
  outro: "Outro",
};
const STATUS: Record<string, string> = { aberta: "Aberta", em_andamento: "Em andamento", resolvida: "Resolvida" };
const STATUS_STYLE: Record<string, string> = {
  aberta: "bg-red-50 text-red-700",
  em_andamento: "bg-amber-50 text-amber-700",
  resolvida: "bg-green-50 text-green-700",
};
const SEV: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };

export default function Ocorrencias() {
  const { filterId, units } = useUnit();
  const { from, to, label } = usePeriod();
  const { can } = useAccess();
  const [rows, setRows] = useState<Row[]>([]);
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [detail, setDetail] = useState<Row | null>(null);
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);

  const canEdit = can("ocorrencias", "edit");
  const canCoord = can("ocorrencias", "sensitive");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [{ data, error: err }, { data: cо }] = await Promise.all([
      supabase.rpc("occurrence_list" as any, { _unit_id: filterId, _from: from, _to: to }),
      supabase.from("collaborators").select("id,full_name").eq("status", "active").order("full_name"),
    ]);
    if (err) setError(err.message);
    setRows(((data as any[]) || []) as Row[]);
    setCollabs(((cо as any[]) || []) as Collab[]);
    setLoading(false);
  }, [filterId, from, to]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => ({
    abertas: rows.filter(r => r.status === "aberta").length,
    andamento: rows.filter(r => r.status === "em_andamento").length,
    resolvidas: rows.filter(r => r.status === "resolvida").length,
    dor: rows.filter(r => r.type === "dor" && r.status !== "resolvida").length,
  }), [rows]);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows
      .filter(r => status === "all" || r.status === status)
      .filter(r => type === "all" || r.type === type)
      .filter(r => !s
        || (r.client_name || "").toLowerCase().includes(s)
        || r.title.toLowerCase().includes(s)
        || (r.description || "").toLowerCase().includes(s));
  }, [rows, status, type, search]);

  const setStatusRpc = async (r: Row, next: string) => {
    if (r.type === "dor" && next === "resolvida" && !canCoord) {
      toast.error("Ocorrências de dor só podem ser resolvidas pela coordenação.");
      return;
    }
    const { data, error: err } = await supabase.rpc("occurrence_set_status" as any, {
      _id: r.id, _status: next, _note: note || null,
    });
    if (err) { toast.error(err.message); return; }
    const res = (data || {}) as { ok?: boolean; reason?: string };
    if (!res.ok) {
      toast.error(res.reason === "coordination_only"
        ? "Ocorrências de dor só podem ser resolvidas pela coordenação."
        : "Não foi possível atualizar a ocorrência.");
      return;
    }
    toast.success(`Ocorrência marcada como ${STATUS[next].toLowerCase()}.`);
    setDetail(null); setNote("");
    load();
  };

  const assign = async (r: Row, collaboratorId: string) => {
    const { error: err } = await supabase.rpc("occurrence_assign" as any, {
      _id: r.id, _collaborator_id: collaboratorId || null,
    });
    if (err) { toast.error(err.message); return; }
    toast.success("Responsável atualizado.");
    load();
  };

  return (
    <PageShell
      title="OCORRÊNCIAS"
      description={`Fila única de ocorrências da operação — período: ${label}. Dor, denúncias, limitações, acesso, equipamento e estrutura no mesmo lugar.`}
      primaryAction={canEdit ? (
        <Button className="gap-2" onClick={() => setCreating(true)}><Plus size={14} /> Nova ocorrência</Button>
      ) : undefined}
      search={{ value: search, onChange: setSearch, placeholder: "Buscar aluno, título ou relato..." }}
      filters={
        <>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-dm">
            <option value="all">Todos os status</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={type} onChange={e => setType(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-dm">
            <option value="all">Todos os tipos</option>
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </>
      }
      summary={
        <>
          <SummaryCard label="Abertas" value={stats.abertas} accent="red" />
          <SummaryCard label="Em andamento" value={stats.andamento} accent="yellow" />
          <SummaryCard label="Resolvidas" value={stats.resolvidas} accent="green" />
          <SummaryCard label="Dor em aberto" value={stats.dor} accent="red" />
        </>
      }
    >
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-dm text-red-700">
          Não foi possível carregar as ocorrências: {error}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? <LoadingState /> : list.length === 0 ? (
          <EmptyState message="Nenhuma ocorrência no período selecionado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-dm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Aluno</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Ocorrência</th>
                  <th className="px-4 py-3">Abertura</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.client_name || (r.client_id ? `#${r.client_id}` : "—")}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        {r.type === "dor" && <ShieldAlert size={13} className="text-red-500" />}
                        {TYPES[r.type] || r.type}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">Gravidade {SEV[r.severity] || r.severity}</span>
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <span className="block font-medium">{r.title}</span>
                      <span className="block text-xs text-muted-foreground truncate">{r.description || "—"}</span>
                    </td>
                    <td className="px-4 py-3">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3">
                      {canEdit ? (
                        <select value={r.owner_id || ""} onChange={e => assign(r, e.target.value)}
                          className="h-8 rounded-lg border border-border bg-card px-2 text-xs font-dm max-w-[150px]">
                          <option value="">Sem responsável</option>
                          {collabs.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                        </select>
                      ) : (r.owner_name || "—")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${STATUS_STYLE[r.status]}`}>
                        {STATUS[r.status] || r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" className="h-7 text-[11px]"
                        onClick={() => { setDetail(r); setNote(r.resolution_note || ""); }}>
                        Tratar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!detail} onOpenChange={v => { if (!v) { setDetail(null); setNote(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-barlow">{detail?.title}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm font-dm">
              <p className="text-muted-foreground">
                {TYPES[detail.type] || detail.type} · {detail.client_name || "sem aluno"} ·{" "}
                {new Date(detail.created_at).toLocaleString("pt-BR")}
              </p>
              <p className="rounded-lg bg-muted/40 p-3 whitespace-pre-wrap">{detail.description || "Sem descrição."}</p>
              {detail.type === "dor" && !canCoord && (
                <p className="text-xs text-amber-700">
                  Você pode acompanhar, mas a resolução de ocorrências de dor é exclusiva da coordenação.
                </p>
              )}
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Registro do atendimento</label>
                <Textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                  placeholder="O que foi feito, orientação dada, encaminhamento..." />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {detail && canEdit && (
              <>
                <Button variant="outline" onClick={() => setStatusRpc(detail, "aberta")}>Reabrir</Button>
                <Button variant="outline" onClick={() => setStatusRpc(detail, "em_andamento")}>Em andamento</Button>
                <Button
                  disabled={detail.type === "dor" && !canCoord}
                  onClick={() => setStatusRpc(detail, "resolvida")}>
                  Resolver
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NovaOcorrencia open={creating} onOpenChange={setCreating} onCreated={load}
        units={units.map(u => ({ id: u.id, name: u.name }))} defaultUnit={filterId} />
    </PageShell>
  );
}

function NovaOcorrencia({ open, onOpenChange, onCreated, units, defaultUnit }: {
  open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void;
  units: { id: string; name: string }[]; defaultUnit: string | null;
}) {
  const [type, setType] = useState("outro");
  const [severity, setSeverity] = useState("media");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [unitId, setUnitId] = useState(defaultUnit || "");
  const [clientQuery, setClientQuery] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);
  const [options, setOptions] = useState<{ id: number; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setUnitId(defaultUnit || ""); }, [open, defaultUnit]);

  useEffect(() => {
    const q = clientQuery.trim();
    if (q.length < 2) { setOptions([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      const { data } = await supabase.from("clients").select("id,name").ilike("name", `%${q}%`).limit(8);
      if (alive) setOptions(((data as any[]) || []) as { id: number; name: string }[]);
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [clientQuery]);

  const save = async () => {
    if (!title.trim()) { toast.error("Informe um título."); return; }
    setSaving(true);
    const { error } = await supabase.from("occurrences" as any).insert({
      type, severity, title: title.trim(), description: description.trim() || null,
      client_id: clientId, unit_id: unitId || null, status: "aberta",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Ocorrência registrada.");
    setTitle(""); setDescription(""); setClientId(null); setClientQuery("");
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-barlow">NOVA OCORRÊNCIA</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm font-dm">
          <div className="grid grid-cols-2 gap-2">
            <select value={type} onChange={e => setType(e.target.value)} className="h-9 rounded-lg border border-border bg-card px-2">
              {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={severity} onChange={e => setSeverity(e.target.value)} className="h-9 rounded-lg border border-border bg-card px-2">
              {Object.entries(SEV).map(([k, v]) => <option key={k} value={k}>Gravidade {v}</option>)}
            </select>
          </div>
          <select value={unitId} onChange={e => setUnitId(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-card px-2">
            <option value="">Sem unidade definida</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título da ocorrência" />
          <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Descreva o que aconteceu" />
          <div>
            <Input value={clientQuery} onChange={e => { setClientQuery(e.target.value); setClientId(null); }}
              placeholder="Vincular a um aluno (opcional)" />
            {!!options.length && !clientId && (
              <div className="mt-1 rounded-lg border border-border divide-y">
                {options.map(o => (
                  <button key={o.id} type="button" className="block w-full text-left px-3 py-1.5 text-xs hover:bg-muted"
                    onClick={() => { setClientId(o.id); setClientQuery(o.name); setOptions([]); }}>
                    {o.name}
                  </button>
                ))}
              </div>
            )}
            {clientId && <p className="text-[11px] text-muted-foreground mt-1">Aluno vinculado: {clientQuery}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Registrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
