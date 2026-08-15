import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { useAccess } from "@/contexts/AccessContext";
import { useClientOverview, OverviewRow } from "@/hooks/useClient360";
import PageShell, { SummaryCard, EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";
import Perfil360 from "@/components/admin/clientes/Perfil360";
import CrmDashboard from "@/components/admin/crm/CrmDashboard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MessageCircle, UserCog } from "lucide-react";
import { openWhatsApp } from "@/lib/whatsapp";
import { logSensitive, logUpdate } from "@/lib/audit";

type Collab = { id: string; full_name: string };

type PendKey =
  | "inadimplencia" | "renovacao" | "frequencia" | "treino"
  | "avaliacao" | "ocorrencia" | "experimental" | "sem_responsavel";

const PEND: { key: PendKey; label: string; accent: "red" | "yellow" | "blue" | "green" | "default"; test: (r: OverviewRow) => boolean }[] = [
  { key: "inadimplencia", label: "Inadimplência", accent: "red",
    test: r => r.financial_state === "overdue" || r.financial_state === "blocked" },
  { key: "renovacao", label: "Renovação", accent: "yellow",
    test: r => r.financial_state === "expiring" || (r.pending_renewals || 0) > 0 },
  { key: "frequencia", label: "Frequência", accent: "yellow",
    test: r => (r.open_alerts || 0) > 0 || (r.days_since_activity ?? 0) >= 7 },
  { key: "treino", label: "Treino vencido", accent: "blue", test: r => !!r.training_overdue },
  { key: "avaliacao", label: "Avaliação vencida", accent: "blue", test: r => !!r.assessment_overdue },
  { key: "ocorrencia", label: "Ocorrências", accent: "red", test: r => (r.open_occurrences || 0) > 0 },
  { key: "experimental", label: "Experimentais", accent: "green", test: r => r.visit_type === "experimental" },
  { key: "sem_responsavel", label: "Sem responsável", accent: "default", test: r => !(r as any).crm_owner_id },
];

const FIN_LABEL: Record<string, string> = {
  ok: "Em dia", expiring: "Vencendo", overdue: "Vencido (tolerância)", blocked: "Bloqueado", na: "—",
};
const FIN_STYLE: Record<string, string> = {
  ok: "bg-green-50 text-green-700", expiring: "bg-amber-50 text-amber-700",
  overdue: "bg-orange-50 text-orange-700", blocked: "bg-red-50 text-red-700", na: "bg-muted text-muted-foreground",
};
const STATUS_OPTIONS = [
  { v: "AT", l: "Ativo" }, { v: "OP", l: "Oportunidade" }, { v: "SU", l: "Suspenso" }, { v: "CA", l: "Cancelado" },
];

export default function CRM() {
  const { filterId } = useUnit();
  const { can } = useAccess();
  const { rows, loading, error, reload } = useClientOverview(filterId);
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<PendKey | "todas">("todas");
  const [selected, setSelected] = useState<number[]>([]);
  const [detail, setDetail] = useState<OverviewRow | null>(null);
  const [bulkOwner, setBulkOwner] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const canEdit = can("crm", "edit");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("collaborators").select("id,full_name").eq("status", "active").order("full_name");
      setCollabs(((data as any[]) || []) as Collab[]);
    })();
  }, []);

  const pendingOf = (r: OverviewRow) => PEND.filter(p => p.test(r));

  const queue = useMemo(() => rows.filter(r => pendingOf(r).length > 0), [rows]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    PEND.forEach(p => { c[p.key] = rows.filter(p.test).length; });
    return c;
  }, [rows]);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    const base = active === "todas" ? queue : rows.filter(PEND.find(p => p.key === active)!.test);
    return base
      .filter(r => !s
        || r.name.toLowerCase().includes(s)
        || (r.phone || "").includes(s)
        || (r.email || "").toLowerCase().includes(s)
        || String(r.id) === s)
      .sort((a, b) => pendingOf(b).length - pendingOf(a).length);
  }, [queue, rows, active, search]);

  const toggle = (id: number) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () =>
    setSelected(prev => prev.length === list.length ? [] : list.map(r => r.id));

  const applyOwner = async () => {
    if (!bulkOwner || !selected.length) return;
    setBusy(true);
    const { error: err } = await supabase.from("clients").update({ crm_owner_id: bulkOwner } as any).in("id", selected);
    setBusy(false);
    if (err) { toast.error(err.message); return; }
    const owner = collabs.find(c => c.id === bulkOwner)?.full_name || "";
    await logUpdate("clients", selected.join(","), `Responsável de CRM definido como ${owner} para ${selected.length} aluno(s)`, { crm_owner_id: bulkOwner }, filterId, "crm");
    toast.success(`Responsável aplicado a ${selected.length} aluno(s).`);
    setSelected([]); setBulkOwner(""); reload();
  };

  const applyStatus = async () => {
    if (!bulkStatus || !selected.length) return;
    setBusy(true);
    const { error: err } = await supabase.from("clients").update({ status: bulkStatus }).in("id", selected);
    setBusy(false);
    if (err) { toast.error(err.message); return; }
    await logSensitive({
      entity: "clients", entity_id: selected.join(","), module: "crm", unit_id: filterId,
      description: `Status alterado em lote para ${bulkStatus} em ${selected.length} aluno(s)`,
      after: { status: bulkStatus },
    });
    toast.success("Status atualizado.");
    setSelected([]); setBulkStatus(""); reload();
  };

  const whats = (r: OverviewRow) => {
    if (!r.phone) { toast.error("Aluno sem telefone cadastrado."); return; }
    const pend = pendingOf(r).map(p => p.label).join(", ");
    openWhatsApp(r.phone, `Olá, ${r.name.split(" ")[0]}! Aqui é da EVO Club.\n\nEstamos passando para falar sobre: ${pend || "seu acompanhamento"}.\nPodemos conversar?`);
  };

  return (
    <PageShell
      title="CRM — DASHBOARD"
      description="Indicadores comerciais da unidade e, abaixo, a fila de ação com as pendências de hoje."
      search={{ value: search, onChange: setSearch, placeholder: "Buscar por nome, telefone, e-mail ou código..." }}
      filters={
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setActive("todas")}
            className={`px-3 py-1.5 rounded-lg text-xs font-dm font-semibold ${active === "todas" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}>
            Todas ({queue.length})
          </button>
          {PEND.map(p => (
            <button key={p.key} onClick={() => setActive(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-dm font-semibold ${active === p.key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}>
              {p.label} ({counts[p.key] || 0})
            </button>
          ))}
        </div>
      }
      summary={
        <>
          <SummaryCard label="Pendências de hoje" value={loading ? "…" : queue.length} accent="yellow" />
          <SummaryCard label="Inadimplência" value={counts.inadimplencia || 0} accent="red" />
          <SummaryCard label="Renovação" value={counts.renovacao || 0} accent="yellow" />
          <SummaryCard label="Frequência" value={counts.frequencia || 0} accent="blue" />
        </>
      }
    >
      <CrmDashboard />

      <div>
        <h2 className="font-barlow font-bold text-lg">Fila de ação</h2>
        <p className="text-sm text-muted-foreground font-dm">
          Cada aluno aparece com o motivo do contato, o responsável e a ação direta.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-dm text-red-700">
          Não foi possível carregar a fila: {error}
        </div>
      )}

      {canEdit && selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <span className="text-sm font-dm font-semibold">{selected.length} selecionado(s)</span>
          <select value={bulkOwner} onChange={e => setBulkOwner(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-2 text-sm font-dm">
            <option value="">Atribuir responsável...</option>
            {collabs.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
          <Button size="sm" className="gap-1" disabled={!bulkOwner || busy} onClick={applyOwner}>
            <UserCog size={14} /> Aplicar
          </Button>
          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-2 text-sm font-dm">
            <option value="">Alterar status...</option>
            {STATUS_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <Button size="sm" variant="outline" disabled={!bulkStatus || busy} onClick={applyStatus}>Aplicar status</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Limpar</Button>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? <LoadingState /> : list.length === 0 ? (
          <EmptyState message="Nenhuma pendência nesta visão. Operação em dia." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-dm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-3">
                    <input type="checkbox" checked={selected.length === list.length} onChange={toggleAll}
                      aria-label="Selecionar todos" />
                  </th>
                  <th className="px-4 py-3">Aluno</th>
                  <th className="px-4 py-3">Motivos do contato</th>
                  <th className="px-4 py-3">Financeiro</th>
                  <th className="px-4 py-3">Último treino</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map(r => {
                  const pend = pendingOf(r);
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-3">
                        <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)}
                          aria-label={`Selecionar ${r.name}`} />
                      </td>
                      <td className="px-4 py-3">
                        <button className="font-medium text-left hover:text-primary" onClick={() => setDetail(r)}>
                          {r.name}
                        </button>
                        <span className="block text-[11px] text-muted-foreground">#{r.id} · {r.plan || "sem plano"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {pend.map(p => (
                            <span key={p.key} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-foreground">
                              {p.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${FIN_STYLE[r.financial_state || "na"]}`}>
                          {FIN_LABEL[r.financial_state || "na"]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.days_since_activity == null ? "nunca" : `${r.days_since_activity} d`}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{(r as any).crm_owner_name || "—"}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 mr-1.5" onClick={() => whats(r)}>
                          <MessageCircle size={12} /> WhatsApp
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setDetail(r)}>
                          Perfil 360º
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detail && (
        <Perfil360 client={detail} onClose={() => setDetail(null)} onSaved={() => { reload(); }} />
      )}
    </PageShell>
  );
}
