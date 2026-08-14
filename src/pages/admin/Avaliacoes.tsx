import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { usePeriod, brToday } from "@/contexts/PeriodContext";
import { useAccess } from "@/contexts/AccessContext";
import PageShell, { SummaryCard, EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarPlus, ClipboardCheck, Star } from "lucide-react";
import {
  AssessmentRow, ASSESSMENT_STATUS, ASSESSMENT_STATUS_STYLE,
  useAssessmentDashboard, useAssessmentList, fetchAssessmentDetail,
} from "@/hooks/useAdminAssessments";
import RealizarAvaliacaoDialog from "@/components/admin/avaliacoes/RealizarAvaliacaoDialog";
import { MEASURE_KEYS } from "@/components/tabs/AvaliacoesTab";
import { logAudit } from "@/lib/audit";

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "agenda", label: "Agenda" },
  { key: "realizar", label: "Realizar Avaliação" },
  { key: "historico", label: "Histórico" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");
const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

type Collab = { id: string; full_name: string };
type ClientLite = { id: number; name: string; unit_id: string | null };

export default function Avaliacoes() {
  const { filterId } = useUnit();
  const { from, to, label } = usePeriod();
  const { can } = useAccess();
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [search, setSearch] = useState("");
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [scheduling, setScheduling] = useState(false);
  const [performing, setPerforming] = useState<AssessmentRow | null>(null);
  const [rescheduling, setRescheduling] = useState<AssessmentRow | null>(null);
  const [cancelling, setCancelling] = useState<AssessmentRow | null>(null);

  const canEdit = can("avaliacao", "edit");
  const dash = useAssessmentDashboard(filterId, from, to);
  const list = useAssessmentList(filterId, from, to);

  useEffect(() => {
    let alive = true;
    (async () => {
      const cq = supabase.from("clients").select("id,name,unit_id").order("name");
      const [cRes, colRes] = await Promise.all([
        filterId ? cq.eq("unit_id", filterId) : cq,
        supabase.from("collaborators").select("id, full_name").eq("status", "ativo").order("full_name"),
      ]);
      if (!alive) return;
      setClients(((cRes.data as any[]) || []) as ClientLite[]);
      setCollabs(((colRes.data as any[]) || []) as Collab[]);
    })();
    return () => { alive = false; };
  }, [filterId]);

  const reloadAll = () => { dash.reload(); list.reload(); };

  const inPeriod = useMemo(() => list.rows.filter(r => {
    const d = (r.performed_at || r.scheduled_at || r.created_at || "").slice(0, 10);
    return d >= from && d <= to;
  }), [list.rows, from, to]);

  const filtered = (base: AssessmentRow[]) => {
    const s = search.trim().toLowerCase();
    return s ? base.filter(r => (r.client_name || "").toLowerCase().includes(s)) : base;
  };

  const setStatus = async (r: AssessmentRow, status: string) => {
    const { data, error } = await supabase.rpc("assessment_set_status" as any, { _id: r.id, _status: status });
    if (error || !(data as any)?.ok) { toast.error(error?.message || "Não foi possível atualizar."); return; }
    await logAudit({
      action: "update", entity: "physical_assessments", entity_id: r.id, module: "avaliacao",
      unit_id: r.unit_id, description: `Avaliação de ${r.client_name}: ${ASSESSMENT_STATUS[status]}`,
      before: { status: r.status }, after: { status },
    });
    toast.success(`Marcado como ${ASSESSMENT_STATUS[status]}.`);
    reloadAll();
  };

  return (
    <PageShell
      title="Avaliações"
      description={`Avaliação física: painel, agenda, execução e histórico — período: ${label}.`}
      search={{ value: search, onChange: setSearch, placeholder: "Buscar aluno..." }}
      primaryAction={canEdit ? (
        <Button className="font-dm" onClick={() => setScheduling(true)}>
          <CalendarPlus size={16} className="mr-2" /> Agendar avaliação
        </Button>
      ) : undefined}
      summary={tab === "dashboard" ? undefined : (
        <>
          <SummaryCard label="Agendadas hoje" value={dash.data?.today_scheduled ?? 0} accent="blue" />
          <SummaryCard label="Realizadas no período" value={dash.data?.done ?? 0} accent="green" />
          <SummaryCard label="Vencidas" value={dash.data?.overdue ?? 0} accent="red" />
          <SummaryCard label="Nunca avaliados" value={dash.data?.never ?? 0} accent="yellow" />
        </>
      )}
    >
      <div className="bg-card rounded-xl p-1.5 card-shadow flex gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-dm whitespace-nowrap transition-colors ${
              tab === t.key ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {(list.error || dash.error) && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-dm text-red-700">
          Não foi possível carregar as avaliações: {list.error || dash.error}
        </div>
      )}

      {tab === "dashboard" && <DashboardTab d={dash} />}

      {tab === "agenda" && (
        <AgendaTable
          rows={filtered(inPeriod.filter(r => !r.published_at))}
          loading={list.loading} canEdit={canEdit}
          onStatus={setStatus} onReschedule={setRescheduling} onCancel={setCancelling}
          onPerform={r => setPerforming(r)}
        />
      )}

      {tab === "realizar" && (
        <AgendaTable
          rows={filtered(list.rows.filter(r => !r.published_at && r.status !== "cancelou"))}
          loading={list.loading} canEdit={canEdit} realizar
          onStatus={setStatus} onReschedule={setRescheduling} onCancel={setCancelling}
          onPerform={r => setPerforming(r)}
        />
      )}

      {tab === "historico" && (
        <HistoricoTab rows={filtered(list.rows.filter(r => !!r.published_at))}
          loading={list.loading} canEdit={canEdit} onCorrect={r => setPerforming(r)} />
      )}

      {scheduling && (
        <AgendarDialog clients={clients} collabs={collabs}
          onClose={() => setScheduling(false)} onSaved={reloadAll} />
      )}
      {rescheduling && (
        <RemarcarDialog row={rescheduling} collabs={collabs}
          onClose={() => setRescheduling(null)} onSaved={reloadAll} />
      )}
      {cancelling && (
        <CancelarDialog row={cancelling} onClose={() => setCancelling(null)} onSaved={reloadAll} />
      )}
      {performing && (
        <RealizarAvaliacaoDialog row={performing} onClose={() => setPerforming(null)} onSaved={reloadAll} />
      )}
    </PageShell>
  );
}

/* ---------------- Dashboard ---------------- */

function DashboardTab({ d }: { d: ReturnType<typeof useAssessmentDashboard> }) {
  if (d.loading) return <div className="bg-card border border-border rounded-xl"><LoadingState /></div>;
  const x = d.data;
  if (!x?.allowed) return <div className="bg-card border border-border rounded-xl"><EmptyState message="Sem acesso ao painel de avaliações." /></div>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Agendadas hoje" value={x.today_scheduled} accent="blue" />
        <SummaryCard label="Realizadas no período" value={x.done} accent="green" />
        <SummaryCard label="Vencendo em 7 dias" value={x.due_7d} accent="yellow" />
        <SummaryCard label="Vencidas" value={x.overdue} accent="red" />
        <SummaryCard label="Nunca avaliados" value={x.never} accent="yellow" />
        <SummaryCard label="Taxa de comparecimento" value={`${x.attendance_pct ?? 0}%`} accent="green" />
        <SummaryCard label="Faltas no período" value={x.missed} accent="red" />
        <SummaryCard label="Canceladas" value={x.cancelled} />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <p className="px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-dm border-b border-border">
          Avaliações por profissional
        </p>
        {!x.by_professional?.length ? <EmptyState message="Nenhuma avaliação no período." /> : (
          <table className="w-full text-sm font-dm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3">Profissional</th>
                <th className="px-4 py-3">Realizadas</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Nota média</th>
              </tr>
            </thead>
            <tbody>
              {x.by_professional.map(p => (
                <tr key={p.name} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">{p.done}</td>
                  <td className="px-4 py-3">{p.total}</td>
                  <td className="px-4 py-3">{p.rating != null ? `${p.rating} / 5` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ---------------- Agenda / Realizar ---------------- */

function AgendaTable({
  rows, loading, canEdit, realizar, onStatus, onReschedule, onCancel, onPerform,
}: {
  rows: AssessmentRow[]; loading: boolean; canEdit: boolean; realizar?: boolean;
  onStatus: (r: AssessmentRow, s: string) => void;
  onReschedule: (r: AssessmentRow) => void;
  onCancel: (r: AssessmentRow) => void;
  onPerform: (r: AssessmentRow) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {loading ? <LoadingState /> : rows.length === 0 ? (
        <EmptyState message={realizar
          ? "Nenhuma avaliação pendente de execução."
          : "Nenhuma avaliação agendada neste período."} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-dm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3">Aluno</th>
                <th className="px-4 py-3">Agendada</th>
                <th className="px-4 py-3">Profissional</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{r.client_name}</td>
                  <td className="px-4 py-3">{fmtDateTime(r.scheduled_at)}</td>
                  <td className="px-4 py-3">{r.professional_name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${ASSESSMENT_STATUS_STYLE[r.status] || "bg-muted/50 text-muted-foreground"}`}>
                      {ASSESSMENT_STATUS[r.status] || r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end flex-wrap">
                      {canEdit && r.status !== "presente" && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px] font-dm" onClick={() => onStatus(r, "presente")}>Presente</Button>
                      )}
                      {canEdit && r.status !== "faltou" && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px] font-dm" onClick={() => onStatus(r, "faltou")}>Faltou</Button>
                      )}
                      {canEdit && (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] font-dm" onClick={() => onReschedule(r)}>Remarcar</Button>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] font-dm" onClick={() => onCancel(r)}>Cancelar</Button>
                          <Button size="sm" className="h-7 text-[11px] font-dm" onClick={() => onPerform(r)}>
                            <ClipboardCheck size={12} className="mr-1" /> Realizar
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------- Histórico ---------------- */

function HistoricoTab({
  rows, loading, canEdit, onCorrect,
}: { rows: AssessmentRow[]; loading: boolean; canEdit: boolean; onCorrect: (r: AssessmentRow) => void }) {
  const [clientId, setClientId] = useState<number | null>(null);
  const byClient = useMemo(() => {
    const map = new Map<number, AssessmentRow[]>();
    rows.forEach(r => { map.set(r.client_id, [...(map.get(r.client_id) || []), r]); });
    return map;
  }, [rows]);

  const selected = clientId ? (byClient.get(clientId) || []) : [];

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? <LoadingState /> : rows.length === 0 ? (
          <EmptyState message="Nenhuma avaliação publicada ainda." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-dm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Aluno</th>
                  <th className="px-4 py-3">Realizada</th>
                  <th className="px-4 py-3">Profissional</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Nota</th>
                  <th className="px-4 py-3">Correções</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.client_name}</td>
                    <td className="px-4 py-3">{fmtDate(r.performed_at)}</td>
                    <td className="px-4 py-3">{r.professional_name || "—"}</td>
                    <td className="px-4 py-3">{r.origin === "integrado" ? "Integrado" : r.origin === "manual" ? "Manual" : "—"}</td>
                    <td className="px-4 py-3">
                      {r.student_rating != null ? (
                        <span className={`inline-flex items-center gap-1 ${r.student_rating <= 2 ? "text-red-600" : "text-foreground"}`}>
                          <Star size={12} /> {r.student_rating}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">{Number(r.revisions) || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" className="h-7 text-[11px] font-dm" onClick={() => setClientId(r.client_id)}>Comparar</Button>
                        {canEdit && (
                          <Button size="sm" variant="outline" className="h-7 text-[11px] font-dm" onClick={() => onCorrect(r)}>Corrigir</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {clientId && <ComparacaoPanel rows={selected} onClose={() => setClientId(null)} />}
    </div>
  );
}

function ComparacaoPanel({ rows, onClose }: { rows: AssessmentRow[]; onClose: () => void }) {
  const [a, setA] = useState<string>(rows[1]?.id || rows[0]?.id || "");
  const [b, setB] = useState<string>(rows[0]?.id || "");
  const [dataA, setDataA] = useState<any>(null);
  const [dataB, setDataB] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError(null);
      try {
        const [x, y] = await Promise.all([
          a ? fetchAssessmentDetail(a) : Promise.resolve(null),
          b ? fetchAssessmentDetail(b) : Promise.resolve(null),
        ]);
        if (!alive) return;
        setDataA(x); setDataB(y);
      } catch (e: any) { if (alive) setError(e.message || "Falha ao comparar."); }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [a, b]);

  const dateOf = (id: string) => fmtDate(rows.find(r => r.id === id)?.performed_at);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="font-barlow font-bold text-lg">
          COMPARAÇÃO — {rows[0]?.client_name}
        </p>
        <Button size="sm" variant="outline" className="font-dm" onClick={onClose}>Fechar</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[["Base", a, setA], ["Comparar com", b, setB]].map(([lbl, val, set]: any) => (
          <div key={lbl}>
            <p className="text-[11px] font-dm text-muted-foreground">{lbl}</p>
            <select value={val} onChange={e => set(e.target.value)}
              className="h-9 rounded-lg border border-border bg-card px-2 text-sm font-dm">
              {rows.map(r => <option key={r.id} value={r.id}>{fmtDate(r.performed_at)}</option>)}
            </select>
          </div>
        ))}
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-dm text-red-700">{error}</div>}

      {loading ? <LoadingState /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-dm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-2">Medida</th>
                <th className="px-3 py-2">{dateOf(a)}</th>
                <th className="px-3 py-2">{dateOf(b)}</th>
                <th className="px-3 py-2">Variação</th>
              </tr>
            </thead>
            <tbody>
              {MEASURE_KEYS.map(k => {
                const va = dataA?.measures?.[k.key] ?? null;
                const vb = dataB?.measures?.[k.key] ?? null;
                const diff = va != null && vb != null ? Number(vb) - Number(va) : null;
                return (
                  <tr key={k.key} className="border-t border-border">
                    <td className="px-3 py-2">{k.label}</td>
                    <td className="px-3 py-2">{va ?? "—"}</td>
                    <td className="px-3 py-2">{vb ?? "—"}</td>
                    <td className={`px-3 py-2 ${diff == null ? "" : diff > 0 ? "text-amber-600" : diff < 0 ? "text-green-600" : ""}`}>
                      {diff == null ? "—" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)} cm`}
                    </td>
                  </tr>
                );
              })}
              {["weight", "body_fat_pct", "muscle_mass", "lean_mass"].map(k => {
                const va = dataA?.bio?.[k] ?? null;
                const vb = dataB?.bio?.[k] ?? null;
                const diff = va != null && vb != null ? Number(vb) - Number(va) : null;
                const labels: Record<string, string> = {
                  weight: "Peso (kg)", body_fat_pct: "Gordura (%)",
                  muscle_mass: "Massa muscular (kg)", lean_mass: "Massa magra (kg)",
                };
                return (
                  <tr key={k} className="border-t border-border bg-muted/20">
                    <td className="px-3 py-2 font-medium">{labels[k]}</td>
                    <td className="px-3 py-2">{va ?? "—"}</td>
                    <td className="px-3 py-2">{vb ?? "—"}</td>
                    <td className="px-3 py-2">{diff == null ? "—" : `${diff > 0 ? "+" : ""}${Number(diff).toFixed(1)}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------- Dialogs de agenda ---------------- */

function AgendarDialog({
  clients, collabs, onClose, onSaved,
}: { clients: ClientLite[]; collabs: Collab[]; onClose: () => void; onSaved: () => void }) {
  const [q, setQ] = useState("");
  const [client, setClient] = useState<ClientLite | null>(null);
  const [date, setDate] = useState(iso(brToday()));
  const [time, setTime] = useState("09:00");
  const [prof, setProf] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? clients.filter(c => c.name.toLowerCase().includes(s)).slice(0, 8) : [];
  }, [q, clients]);

  const save = async () => {
    if (!client) { toast.error("Selecione o aluno."); return; }
    setSaving(true);
    const at = new Date(`${date}T${time}:00`).toISOString();
    const { data, error } = await supabase.rpc("assessment_schedule" as any, {
      _client_id: client.id, _at: at, _professional_id: prof || null, _notes: notes.trim() || null,
    });
    setSaving(false);
    if (error || !(data as any)?.ok) { toast.error(error?.message || "Não foi possível agendar."); return; }
    await logAudit({
      action: "create", entity: "physical_assessments", entity_id: (data as any).id, module: "avaliacao",
      unit_id: client.unit_id, description: `Avaliação agendada para ${client.name}`,
      after: { scheduled_at: at, professional_id: prof || null },
    });
    toast.success("Avaliação agendada e aluno notificado.");
    onSaved(); onClose();
  };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-barlow">AGENDAR AVALIAÇÃO</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-dm text-muted-foreground">Aluno</p>
            <Input value={client ? client.name : q} onChange={e => { setClient(null); setQ(e.target.value); }}
              placeholder="Buscar aluno..." className="h-9 font-dm" />
            {!client && !!results.length && (
              <div className="mt-1 rounded-lg border border-border bg-card max-h-40 overflow-y-auto">
                {results.map(c => (
                  <button key={c.id} type="button" onClick={() => { setClient(c); setQ(""); }}
                    className="block w-full text-left px-3 py-1.5 text-xs font-dm hover:bg-muted">
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[11px] font-dm text-muted-foreground">Data</p>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 font-dm" />
            </div>
            <div>
              <p className="text-[11px] font-dm text-muted-foreground">Hora</p>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="h-9 font-dm" />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-dm text-muted-foreground">Responsável</p>
            <select value={prof} onChange={e => setProf(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-card px-2 text-sm font-dm">
              <option value="">Sem responsável</option>
              {collabs.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[11px] font-dm text-muted-foreground">Observações</p>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="font-dm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="font-dm" onClick={onClose}>Cancelar</Button>
          <Button className="font-dm" onClick={save} disabled={saving}>{saving ? "SALVANDO..." : "AGENDAR"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemarcarDialog({
  row, collabs, onClose, onSaved,
}: { row: AssessmentRow; collabs: Collab[]; onClose: () => void; onSaved: () => void }) {
  const base = row.scheduled_at ? new Date(row.scheduled_at) : brToday();
  const [date, setDate] = useState(iso(base));
  const [time, setTime] = useState(row.scheduled_at ? new Date(row.scheduled_at).toTimeString().slice(0, 5) : "09:00");
  const [prof, setProf] = useState(row.professional_id || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const at = new Date(`${date}T${time}:00`).toISOString();
    const { data, error } = await supabase.rpc("assessment_reschedule" as any, {
      _id: row.id, _at: at, _professional_id: prof || null,
    });
    setSaving(false);
    if (error || !(data as any)?.ok) { toast.error(error?.message || "Não foi possível remarcar."); return; }
    await logAudit({
      action: "update", entity: "physical_assessments", entity_id: row.id, module: "avaliacao",
      unit_id: row.unit_id, description: `Avaliação de ${row.client_name} remarcada`,
      before: { scheduled_at: row.scheduled_at, professional_id: row.professional_id },
      after: { scheduled_at: at, professional_id: prof || null },
    });
    toast.success("Avaliação remarcada.");
    onSaved(); onClose();
  };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-barlow">REMARCAR AVALIAÇÃO</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm font-dm text-muted-foreground">{row.client_name}</p>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 font-dm" />
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="h-9 font-dm" />
          </div>
          <select value={prof} onChange={e => setProf(e.target.value)}
            className="w-full h-9 rounded-lg border border-border bg-card px-2 text-sm font-dm">
            <option value="">Sem responsável</option>
            {collabs.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </div>
        <DialogFooter>
          <Button variant="outline" className="font-dm" onClick={onClose}>Voltar</Button>
          <Button className="font-dm" onClick={save} disabled={saving}>{saving ? "SALVANDO..." : "REMARCAR"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelarDialog({ row, onClose, onSaved }: { row: AssessmentRow; onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.rpc("assessment_cancel" as any, { _id: row.id, _reason: reason.trim() || null });
    setSaving(false);
    if (error || !(data as any)?.ok) { toast.error(error?.message || "Não foi possível cancelar."); return; }
    await logAudit({
      action: "update", entity: "physical_assessments", entity_id: row.id, module: "avaliacao",
      unit_id: row.unit_id, description: `Avaliação de ${row.client_name} cancelada`,
      before: { status: row.status }, after: { status: "cancelou", cancel_reason: reason.trim() || null },
    });
    toast.success("Avaliação cancelada.");
    onSaved(); onClose();
  };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-barlow">CANCELAR AVALIAÇÃO</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <p className="text-sm font-dm text-muted-foreground">{row.client_name}</p>
          <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder="Motivo do cancelamento" className="font-dm" />
        </div>
        <DialogFooter>
          <Button variant="outline" className="font-dm" onClick={onClose}>Voltar</Button>
          <Button className="font-dm" onClick={save} disabled={saving}>{saving ? "SALVANDO..." : "CANCELAR AVALIAÇÃO"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
