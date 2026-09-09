import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Lock, AlertTriangle, Download, Pencil } from "lucide-react";
import { printContract, CONTRACT_STATUS_LABEL, contractStatusClass } from "@/lib/contractPdf";
import { EmptyState, LoadingState, SummaryCard } from "@/components/admin/gerencial/PageShell";
import { useAccess } from "@/contexts/AccessContext";
import { logAudit, diffFields } from "@/lib/audit";
import { OverviewRow, useAttendanceStats, useClientTimeline } from "@/hooks/useClient360";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { RANGES, RangeKey } from "@/hooks/useHealth";
import { AdminSeriesKey, useAdminHealthOverview, useAdminHealthSeries } from "@/hooks/useAdminHealth";

export const fmtDate = (d?: string | null) =>
  d ? new Date(d.length <= 10 ? `${d}T12:00:00` : d).toLocaleDateString("pt-BR") : "—";
export const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
export const money = (v?: number | null) =>
  `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const STATUS_LABEL: Record<string, string> = { AT: "Ativo", OP: "Oportunidade", SU: "Suspenso", CA: "Cancelado" };
const FIN_LABEL: Record<string, string> = {
  ok: "Em dia", expiring: "A vencer", overdue: "Em atraso", blocked: "Bloqueado", na: "Sem plano",
};

/* ---------------- genérico ---------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-dm font-medium mb-3">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground font-dm">{label}</p>
      <p className="text-sm font-dm text-foreground">{value || "—"}</p>
    </div>
  );
}

/** Lê uma tabela do aluno e renderiza linhas simples com loading/empty/erro. */
function useClientRows(table: string, clientId: number, column = "client_id", order = "created_at") {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError(null);
      const { data, error } = await supabase.from(table as any).select("*")
        .eq(column, clientId).order(order, { ascending: false }).limit(50);
      if (!alive) return;
      if (error) setError(error.message);
      setRows((data as any[]) || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [table, clientId, column, order]);
  return { rows, loading, error };
}

function ListShell({ loading, error, rows, empty, children }: {
  loading: boolean; error: string | null; rows: any[]; empty: string; children: React.ReactNode;
}) {
  if (loading) return <LoadingState />;
  if (error) return <div className="text-center py-10 text-sm font-dm text-red-600">Erro ao carregar: {error}</div>;
  if (!rows.length) return <EmptyState message={empty} />;
  return <>{children}</>;
}

/* ---------------- Resumo ---------------- */

export function ResumoTab({ c, onGoTab }: { c: OverviewRow; onGoTab: (t: string) => void }) {
  const { stats } = useAttendanceStats(c.id);
  const [readiness, setReadiness] = useState<any | null>(null);
  const [lastWorkout, setLastWorkout] = useState<any | null>(null);
  const [plan, setPlan] = useState<any | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [dc, wl, tp] = await Promise.all([
        supabase.from("daily_checkins").select("*").eq("client_id", c.id).order("checkin_date", { ascending: false }).limit(1),
        supabase.from("workout_logs").select("*").eq("client_id", c.id).order("workout_date", { ascending: false }).limit(1),
        supabase.from("training_plans").select("*").eq("student_id", c.id).eq("is_active", true).limit(1),
      ]);
      if (!alive) return;
      setReadiness(dc.data?.[0] || null);
      setLastWorkout(wl.data?.[0] || null);
      setPlan(tp.data?.[0] || null);
    })();
    return () => { alive = false; };
  }, [c.id]);

  const pend: string[] = [];
  if (c.training_overdue) pend.push("Treino vencido");
  if (c.assessment_overdue) pend.push("Avaliação vencida");
  if ((c.open_occurrences || 0) > 0) pend.push(`${c.open_occurrences} ocorrência(s) aberta(s)`);
  if ((c.pending_renewals || 0) > 0) pend.push("Renovação pendente");
  if (c.financial_state && ["overdue", "blocked"].includes(c.financial_state)) pend.push("Plano irregular");
  if ((c.open_alerts || 0) > 0) pend.push("Alerta de frequência");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Status" value={STATUS_LABEL[c.status || "OP"] || "—"} />
        <SummaryCard label="Financeiro" value={FIN_LABEL[c.financial_state || "na"] || "—"}
          accent={c.financial_state === "ok" ? "green" : c.financial_state === "expiring" ? "yellow" : c.financial_state === "na" ? "default" : "red"} />
        <SummaryCard label="Treinos 30 dias" value={c.workouts_30d ?? 0} accent="blue" />
        <SummaryCard label="Sem treinar" value={c.days_since_activity == null ? "—" : `${c.days_since_activity}d`}
          accent={(c.days_since_activity ?? 0) > 3 ? "red" : "green"} />
      </div>

      <Section title="Prontidão do dia">
        {readiness ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Field label="Data" value={fmtDate(readiness.checkin_date)} />
            <Field label="Sono" value={readiness.sleep_hours ? `${readiness.sleep_hours}h` : "—"} />
            <Field label="Qualidade" value={readiness.sleep_quality} />
            <Field label="Energia" value={readiness.energy} />
            <Field label="Humor" value={readiness.mood} />
          </div>
        ) : <EmptyState message="Sem check-in diário registrado." />}
      </Section>

      <div className="grid md:grid-cols-2 gap-3">
        <Section title="Plano e objetivo">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plano" value={c.plan} />
            <Field label="Valor" value={c.plan_value ? money(c.plan_value) : "—"} />
            <Field label="Vencimento" value={fmtDate(c.contract_end)} />
            <Field label="Objetivo" value={c.objective} />
            <div className="col-span-2"><Field label="Limitações" value={c.limitations} /></div>
          </div>
        </Section>

        <Section title="Treino e frequência">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Treino atual" value={plan?.name} />
            <Field label="Validade do treino" value={fmtDate(c.plan_expires_at)} />
            <Field label="Último treino" value={lastWorkout ? fmtDate(lastWorkout.workout_date) : "—"} />
            <Field label="Última presença" value={fmtDate(c.last_activity)} />
            <Field label="Frequência 7/30 dias" value={stats ? `${stats.d7} / ${stats.d30}` : "—"} />
            <Field label="Meta semanal" value={stats ? `${stats.weekly_goal}x` : "—"} />
            <Field label="Última avaliação" value={fmtDate(c.last_assessment)} />
            <Field label="Renovação" value={(c.pending_renewals || 0) > 0 ? "Pedido pendente" : FIN_LABEL[c.financial_state || "na"]} />
          </div>
        </Section>
      </div>

      <Section title="Pendências abertas">
        {pend.length ? (
          <div className="flex flex-wrap gap-2">
            {pend.map(p => (
              <span key={p} className="text-xs font-dm px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">{p}</span>
            ))}
          </div>
        ) : <p className="text-sm font-dm text-green-700">Nenhuma pendência.</p>}
      </Section>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="font-dm" onClick={() => onGoTab("frequencia")}>Ver frequência</Button>
        <Button variant="outline" size="sm" className="font-dm" onClick={() => onGoTab("historico")}>Ver histórico</Button>
      </div>
    </div>
  );
}

/* ---------------- Dados ---------------- */

const SENSITIVE_FIELDS = ["name", "cpf", "birth_date", "email", "phone", "unit_id", "plan", "status"];

/** Campo estável (fora do render do DadosTab) para não remontar o input a cada tecla. */
function TextField({ k, label, type = "text", value, locked, disabled, onChange }: {
  k: string; label: string; type?: string; value: string;
  locked: boolean; disabled: boolean; onChange: (k: string, v: any) => void;
}) {
  return (
    <div>
      <label className="text-[11px] font-dm text-muted-foreground flex items-center gap-1">
        {label} {locked && <Lock size={11} />}
      </label>
      <Input type={type} value={value} disabled={disabled}
        onChange={e => onChange(k, e.target.value)} className="mt-1 h-9 font-dm" />
    </div>
  );
}

export function DadosTab({ c, onSaved }: { c: OverviewRow; onSaved: () => void }) {
  const { can, isAdmin } = useAccess();
  const canSensitive = isAdmin || can("clientes", "sensitive");
  const canEdit = isAdmin || can("clientes", "edit");
  const [row, setRow] = useState<any | null>(null);
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError(null);
      const [cl, un] = await Promise.all([
        supabase.from("clients").select("*").eq("id", c.id).maybeSingle(),
        supabase.from("units").select("id,name").order("name"),
      ]);
      if (!alive) return;
      if (cl.error) setError(cl.error.message);
      setRow(cl.data);
      setForm(cl.data || {});
      setUnits((un.data as any[]) || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [c.id]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const patch: any = {};
    const keys = ["name", "cpf", "birth_date", "email", "phone", "unit_id", "plan", "plan_value", "status",
      "objective", "limitations", "weekly_goal", "observations", "contract_start", "contract_end"];
    keys.forEach(k => {
      if (SENSITIVE_FIELDS.includes(k) && !canSensitive) return;
      const v = form[k] === "" ? null : form[k];
      if (JSON.stringify(v ?? null) !== JSON.stringify(row[k] ?? null)) patch[k] = v;
    });
    if (!Object.keys(patch).length) { setSaving(false); setEditing(false); toast.info("Nenhuma alteração."); return; }
    const { data, error } = await supabase.from("clients").update(patch).eq("id", c.id).select().maybeSingle();
    setSaving(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    const touchedSensitive = Object.keys(patch).some(k => SENSITIVE_FIELDS.includes(k));
    const { before, after } = diffFields(row, data);
    await logAudit({
      action: "update",
      entity: "client",
      entity_id: c.id,
      module: "clientes",
      unit_id: (data as any)?.unit_id ?? null,
      description: `${touchedSensitive ? "Alterou dados sensíveis" : "Atualizou dados"} de ${(data as any)?.name || c.name}`,
      before, after,
      metadata: { sensitive: touchedSensitive, fields: Object.keys(patch) },
    });
    setRow(data);
    setForm(data || {});
    setEditing(false);
    toast.success("Dados atualizados.");
    onSaved();
  };

  if (loading) return <LoadingState />;
  if (error) return <div className="text-center py-10 text-sm font-dm text-red-600">Erro ao carregar: {error}</div>;
  if (!row) return <EmptyState message="Cadastro não encontrado." />;

  const lockedNote = (k: string) => SENSITIVE_FIELDS.includes(k) && !canSensitive;

  const Text = ({ k, label, type = "text" }: { k: string; label: string; type?: string }) => (
    <TextField k={k} label={label} type={type} value={form[k] ?? ""}
      locked={lockedNote(k)} disabled={!editing || !canEdit || lockedNote(k)} onChange={set} />
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
        <p className="text-xs font-dm text-muted-foreground">
          {editing ? "Modo de edição ativo. Salve para gravar as alterações." : "Dados salvos. Clique em editar para alterar."}
        </p>
        {canEdit && !editing && (
          <Button size="sm" variant="outline" className="font-dm shrink-0"
            onClick={() => { setForm(row); setEditing(true); }}>
            <Pencil size={14} className="mr-1.5" /> EDITAR
          </Button>
        )}
      </div>

      {!canSensitive && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs font-dm text-amber-800 flex items-center gap-2">
          <Lock size={14} /> Dados pessoais (nome, CPF, nascimento, contato, unidade, plano e situação) só podem ser editados por quem tem essa permissão. Dados de saúde, objetivos e limitações seguem liberados.
        </div>
      )}

      <Section title="Identificação">
        <div className="grid md:grid-cols-3 gap-3">
          <Text k="name" label="Nome completo" />
          <Text k="cpf" label="CPF" />
          <Text k="birth_date" label="Data de nascimento" type="date" />
          <Text k="email" label="E-mail" />
          <Text k="phone" label="Telefone" />
          <div>
            <label className="text-[11px] font-dm text-muted-foreground flex items-center gap-1">
              Unidade {lockedNote("unit_id") && <Lock size={11} />}
            </label>
            <select value={form.unit_id ?? ""} disabled={!editing || !canEdit || lockedNote("unit_id")}
              onChange={e => set("unit_id", e.target.value || null)}
              className="mt-1 w-full h-9 px-2 rounded-md border border-input bg-background text-sm font-dm disabled:opacity-60">
              <option value="">—</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>
      </Section>

      <Section title="Plano">
        <div className="grid md:grid-cols-3 gap-3">
          <Text k="plan" label="Plano" />
          <Text k="plan_value" label="Valor do plano" type="number" />
          <div>
            <label className="text-[11px] font-dm text-muted-foreground flex items-center gap-1">
              Status {lockedNote("status") && <Lock size={11} />}
            </label>
            <select value={form.status ?? "OP"} disabled={!editing || !canEdit || lockedNote("status")}
              onChange={e => set("status", e.target.value)}
              className="mt-1 w-full h-9 px-2 rounded-md border border-input bg-background text-sm font-dm disabled:opacity-60">
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <Text k="contract_start" label="Início do contrato" type="date" />
          <Text k="contract_end" label="Vencimento" type="date" />
          <Text k="weekly_goal" label="Meta semanal de treinos" type="number" />
        </div>
      </Section>

      <Section title="Objetivo e limitações">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-dm text-muted-foreground">Objetivo</label>
            <textarea value={form.objective ?? ""} disabled={!editing || !canEdit}
              onChange={e => set("objective", e.target.value)}
              className="mt-1 w-full h-20 px-3 py-2 rounded-md border border-input bg-background text-sm font-dm resize-none disabled:opacity-60" />
          </div>
          <div>
            <label className="text-[11px] font-dm text-muted-foreground">Limitações</label>
            <textarea value={form.limitations ?? ""} disabled={!editing || !canEdit}
              onChange={e => set("limitations", e.target.value)}
              className="mt-1 w-full h-20 px-3 py-2 rounded-md border border-input bg-background text-sm font-dm resize-none disabled:opacity-60" />
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] font-dm text-muted-foreground">Observações</label>
            <textarea value={form.observations ?? ""} disabled={!editing || !canEdit}
              onChange={e => set("observations", e.target.value)}
              className="mt-1 w-full h-20 px-3 py-2 rounded-md border border-input bg-background text-sm font-dm resize-none disabled:opacity-60" />
          </div>
        </div>
      </Section>

      {canEdit && editing && (
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving} className="font-dm">{saving ? "SALVANDO..." : "SALVAR"}</Button>
          <Button variant="ghost" className="font-dm text-muted-foreground"
            onClick={() => { setForm(row); setEditing(false); }}>CANCELAR</Button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Frequência ---------------- */

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function FrequenciaTab({ c }: { c: OverviewRow }) {
  const { stats, loading, error, reload } = useAttendanceStats(c.id);

  if (loading) return <LoadingState />;
  if (error) return <div className="text-center py-10 text-sm font-dm text-red-600">Erro ao carregar: {error}</div>;
  if (!stats || stats.allowed === false) return <EmptyState message="Sem permissão para ver a frequência." />;

  const maxDow = Math.max(1, ...(stats.by_dow || []).map(d => d.total));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Última presença" value={fmtDate(stats.last_activity)} />
        <SummaryCard label="7 dias" value={stats.d7} accent="blue" />
        <SummaryCard label="30 dias" value={stats.d30} accent="blue" />
        <SummaryCard label="90 dias" value={stats.d90} accent="blue" />
        <SummaryCard label="Média por semana" value={stats.avg_per_week} />
        <SummaryCard label="Meta semanal" value={`${stats.weekly_goal}x`} />
        <SummaryCard label="Semanas cumpridas" value={`${stats.weeks_pct}%`}
          accent={stats.weeks_pct >= 70 ? "green" : stats.weeks_pct >= 40 ? "yellow" : "red"} />
        <SummaryCard label="Streak atual" value={`${stats.streak}d`} accent="green" />
        <SummaryCard label="Maior streak" value={`${stats.best_streak}d`} />
        <SummaryCard label="Faltas" value={stats.absences} accent={stats.absences ? "red" : "default"} />
        <SummaryCard label="Cancelamentos" value={stats.cancellations} accent={stats.cancellations ? "yellow" : "default"} />
        <SummaryCard label="Sem treinar" value={stats.days_since_activity == null ? "—" : `${stats.days_since_activity}d`}
          accent={(stats.days_since_activity ?? 0) > 3 ? "red" : "green"} />
      </div>

      <Section title="Dias da semana com maior frequência">
        {stats.by_dow?.length ? (
          <div className="flex items-end gap-2 h-32">
            {DOW.map((label, i) => {
              const total = stats.by_dow.find(d => d.dow === i)?.total || 0;
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[11px] font-dm text-muted-foreground">{total}</span>
                  <div className="w-full bg-primary/15 rounded-t-md flex items-end" style={{ height: "100%" }}>
                    <div className="w-full bg-primary rounded-t-md" style={{ height: `${(total / maxDow) * 100}%` }} />
                  </div>
                  <span className="text-[11px] font-dm text-muted-foreground">{label}</span>
                </div>
              );
            })}
          </div>
        ) : <EmptyState message="Sem presenças registradas." />}
      </Section>

      <Section title="Meta x realizado (últimas 12 semanas)">
        {stats.weeks?.length ? (
          <div className="space-y-2">
            {stats.weeks.slice().reverse().map(w => {
              const pct = Math.min(100, (w.total / Math.max(1, stats.weekly_goal)) * 100);
              const ok = w.total >= stats.weekly_goal;
              return (
                <div key={w.week} className="flex items-center gap-3">
                  <span className="text-[11px] font-dm text-muted-foreground w-20 shrink-0">{fmtDate(w.week)}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-muted/40 overflow-hidden">
                    <div className={`h-full rounded-full ${ok ? "bg-green-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] font-dm text-foreground w-14 text-right">{w.total}/{stats.weekly_goal}</span>
                </div>
              );
            })}
          </div>
        ) : <EmptyState message="Sem histórico suficiente." />}
      </Section>

      <Button variant="outline" size="sm" className="font-dm" onClick={reload}>ATUALIZAR</Button>
    </div>
  );
}

/* ---------------- Histórico (timeline) ---------------- */

const KINDS: { key: string; label: string }[] = [
  { key: "cadastro", label: "Cadastro" },
  { key: "contatos", label: "Contatos" },
  { key: "matricula", label: "Matrícula" },
  { key: "acessos", label: "Acessos" },
  { key: "faltas", label: "Faltas" },
  { key: "treino", label: "Treino" },
  { key: "avaliacoes", label: "Avaliações" },
  { key: "pagamentos", label: "Pagamentos" },
  { key: "contratos", label: "Contratos" },
  { key: "renovacoes", label: "Renovações" },
  { key: "ocorrencias", label: "Ocorrências" },
  { key: "indicacoes", label: "Indicações" },
  { key: "alteracoes", label: "Mudanças de dados/plano" },
];

export function HistoricoTab({ c }: { c: OverviewRow }) {
  const [kinds, setKinds] = useState<string[]>([]);
  const { events, loading, error, done, loadMore } = useClientTimeline(c.id, kinds);

  const toggle = (k: string) => setKinds(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setKinds([])}
          className={`text-xs font-dm px-2.5 py-1 rounded-full border ${!kinds.length ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
          Todos
        </button>
        {KINDS.map(k => (
          <button key={k.key} onClick={() => toggle(k.key)}
            className={`text-xs font-dm px-2.5 py-1 rounded-full border ${kinds.includes(k.key) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
            {k.label}
          </button>
        ))}
      </div>

      {error && <div className="text-sm font-dm text-red-600">Erro ao carregar: {error}</div>}
      {loading && !events.length ? <LoadingState /> : !events.length ? (
        <EmptyState message="Nenhum evento no histórico." />
      ) : (
        <div className="relative pl-4 space-y-3 border-l border-border">
          {events.map((e, i) => (
            <div key={`${e.kind}-${e.occurred_at}-${i}`} className="relative">
              <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
              <div className="bg-card rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-dm font-medium text-foreground">{e.title}</p>
                  <span className="text-[11px] font-dm text-muted-foreground shrink-0">{fmtDateTime(e.occurred_at)}</span>
                </div>
                {e.detail && <p className="text-xs font-dm text-muted-foreground mt-0.5">{e.detail}</p>}
                <span className="inline-block mt-1.5 text-[10px] uppercase tracking-wide font-dm text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                  {KINDS.find(k => k.key === e.kind)?.label || e.kind}
                </span>
                {e.meta?.before && (
                  <div className="mt-2 grid md:grid-cols-2 gap-2 text-[11px] font-dm">
                    <div className="bg-red-50 border border-red-100 rounded p-2 text-red-700 break-words">
                      Antes: {JSON.stringify(e.meta.before)}
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded p-2 text-green-700 break-words">
                      Depois: {JSON.stringify(e.meta.after)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!done && !!events.length && (
        <Button variant="outline" size="sm" className="font-dm" onClick={loadMore} disabled={loading}>
          {loading ? "CARREGANDO..." : "CARREGAR MAIS"}
        </Button>
      )}
    </div>
  );
}

/* ---------------- Abas de leitura ---------------- */

export function TreinosTab({ c }: { c: OverviewRow }) {
  const plans = useClientRows("training_plans", c.id, "student_id");
  const logs = useClientRows("workout_logs", c.id, "client_id", "workout_date");
  return (
    <div className="space-y-4">
      <Section title="Fichas prescritas">
        <ListShell {...plans} empty="Nenhuma ficha prescrita.">
          <div className="space-y-2">
            {plans.rows.map(p => (
              <div key={p.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <div>
                  <p className="text-sm font-dm text-foreground">{p.name}</p>
                  <p className="text-[11px] font-dm text-muted-foreground">
                    {p.goal || "—"} · {p.frequency || "—"} · validade {fmtDate(p.expires_at)}
                  </p>
                </div>
                <span className={`text-[10px] font-dm px-2 py-0.5 rounded-full ${p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {p.is_active ? "Ativa" : p.status || "Arquivada"}
                </span>
              </div>
            ))}
          </div>
        </ListShell>
      </Section>

      <Section title="Execuções recentes">
        <ListShell {...logs} empty="Nenhum treino registrado.">
          <div className="space-y-2">
            {logs.rows.slice(0, 15).map(l => (
              <div key={l.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <div>
                  <p className="text-sm font-dm text-foreground">{l.session_name || "Treino"}</p>
                  <p className="text-[11px] font-dm text-muted-foreground">
                    {fmtDate(l.workout_date)} · {l.status} {l.rpe ? `· RPE ${l.rpe}` : ""}
                  </p>
                </div>
                {l.pain && <span className="text-[10px] font-dm px-2 py-0.5 rounded-full bg-red-100 text-red-700">Dor</span>}
              </div>
            ))}
          </div>
        </ListShell>
      </Section>
    </div>
  );
}

export function SaudeTab({ c }: { c: OverviewRow }) {
  const { can } = useAccess();
  const canEdit = can("clientes", "edit");
  const overview = useAdminHealthOverview(c.id);
  const [metric, setMetric] = useState<AdminSeriesKey>("weight");
  const [range, setRange] = useState<RangeKey>("3m");
  const series = useAdminHealthSeries(c.id, metric, range);
  const photos = useClientRows("evolution_photos", c.id);
  const [form, setForm] = useState<null | "weight" | "bp">(null);

  const o = overview.data;
  const alerts = o?.alerts;
  const alertList = [
    { on: (alerts?.new_limitation || 0) > 0, label: "Nova limitação registrada" },
    { on: (alerts?.low_readiness || 0) > 0, label: "Prontidão baixa no último check-in" },
    { on: (alerts?.pain_open || 0) > 0, label: "Dor em acompanhamento" },
    { on: (alerts?.assessment_overdue || 0) > 0, label: "Avaliação vencida" },
    { on: (alerts?.training_overdue || 0) > 0, label: "Treino vencido" },
  ].filter(a => a.on);

  const chartData = series.points.map(p => ({
    label: new Date(p.date.length <= 10 ? `${p.date}T12:00:00` : p.date)
      .toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    value: p.value,
    extra: p.extra,
  }));

  const reload = () => { overview.reload(); series.reload(); };

  return (
    <div className="space-y-4">
      {overview.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-dm text-red-700">
          Não foi possível carregar os dados de saúde: {overview.error}
        </div>
      )}

      {overview.loading ? <LoadingState /> : !o?.allowed ? (
        <EmptyState message="Sem acesso aos dados de saúde deste aluno." />
      ) : (
        <>
          {!!alertList.length && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
              {alertList.map(a => (
                <p key={a.label} className="text-xs font-dm text-amber-800 flex items-center gap-1">
                  <AlertTriangle size={12} /> {a.label}
                </p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Peso atual" value={o.weight ? `${o.weight.value} kg` : "—"} />
            <SummaryCard label="Meta de peso" value={o.goal ? `${o.goal.target} kg` : "—"} accent="blue" />
            <SummaryCard label="FC repouso" value={o.resting_hr ? `${o.resting_hr.value} bpm` : "—"} />
            <SummaryCard label="Pressão arterial"
              value={o.bp ? `${o.bp.systolic}/${o.bp.diastolic}` : "—"} />
            <SummaryCard label="Sono (último)" value={o.checkin?.sleep_hours != null ? `${o.checkin.sleep_hours} h` : "—"} />
            <SummaryCard label="Qualidade do sono" value={o.checkin?.sleep_quality != null ? `${o.checkin.sleep_quality}/5` : "—"} />
            <SummaryCard label="Prontidão do dia"
              value={o.checkin?.readiness != null ? `${o.checkin.readiness}/5` : "—"}
              accent={o.checkin?.readiness != null && Number(o.checkin.readiness) <= 2.5 ? "red" : "green"} />
            <SummaryCard label="Última sincronização"
              value={o.device?.last_sync_at ? fmtDateTime(o.device.last_sync_at) : "—"} />
          </div>

          <Section title="Evolução">
            <div className="flex flex-wrap gap-2 mb-3">
              {([
                ["weight", "Peso"], ["resting_hr", "FC repouso"], ["blood_pressure", "Pressão"],
                ["sleep_hours", "Sono"], ["sleep_quality", "Qualidade do sono"],
              ] as [AdminSeriesKey, string][]).map(([k, l]) => (
                <button key={k} onClick={() => setMetric(k)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-dm border ${
                    metric === k ? "bg-primary text-white border-primary" : "border-border text-muted-foreground"}`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {RANGES.map(r => (
                <button key={r.key} onClick={() => setRange(r.key)}
                  className={`px-3 py-1 rounded-full text-[11px] font-dm border ${
                    range === r.key ? "bg-foreground text-white border-foreground" : "border-border text-muted-foreground"}`}>
                  {r.label}
                </button>
              ))}
            </div>
            {series.loading ? <LoadingState /> : series.error ? (
              <p className="text-sm font-dm text-red-700">{series.error}</p>
            ) : chartData.length === 0 ? (
              <EmptyState message="Sem registros neste recorte." />
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ left: -20, right: 6, top: 6 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    {metric === "blood_pressure" && (
                      <Line type="monotone" dataKey="extra" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>

          <Section title="Registros da equipe">
            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="font-dm" onClick={() => setForm("weight")}>Registrar / corrigir peso</Button>
                <Button size="sm" variant="outline" className="font-dm" onClick={() => setForm("bp")}>Registrar / corrigir pressão</Button>
              </div>
            ) : (
              <p className="text-xs font-dm text-muted-foreground flex items-center gap-1">
                <Lock size={12} /> Somente leitura para o seu perfil.
              </p>
            )}
            <p className="text-[11px] font-dm text-muted-foreground mt-2 flex items-center gap-1">
              <Lock size={12} /> Sono e dados de smartwatch são somente leitura. Fotos de evolução são privadas do aluno.
            </p>
            {form && (
              <HealthEntryForm kind={form} client={c} overview={o} onClose={() => setForm(null)} onSaved={reload} />
            )}
          </Section>

          <Section title="Check-ins de bem-estar (somente leitura)">
            <p className="text-sm font-dm text-foreground">
              {o.checkin
                ? `${fmtDate(o.checkin.date)} · Sono ${o.checkin.sleep_hours ?? "—"}h · Qualidade ${o.checkin.sleep_quality ?? "—"} · Energia ${o.checkin.energy ?? "—"} · Humor ${o.checkin.mood ?? "—"}`
                : "Nenhum check-in diário registrado."}
            </p>
          </Section>

          <Section title="Fotos de evolução">
            <ListShell {...photos} empty="Nenhuma foto enviada.">
              <p className="text-sm font-dm text-muted-foreground flex items-center gap-1">
                <Lock size={12} /> {photos.rows.length} foto(s) do aluno — conteúdo privado, não exibido para a equipe.
              </p>
            </ListShell>
          </Section>
        </>
      )}
    </div>
  );
}

/** Registro e correção de peso e pressão pela equipe, com auditoria antes/depois. */
function HealthEntryForm({
  kind, client, overview, onClose, onSaved,
}: {
  kind: "weight" | "bp"; client: OverviewRow; overview: any;
  onClose: () => void; onSaved: () => void;
}) {
  const [mode, setMode] = useState<"new" | "fix">("new");
  const [v1, setV1] = useState("");
  const [v2, setV2] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const current = kind === "weight" ? overview?.weight : overview?.bp;

  const submit = async () => {
    const num = (v: string) => Number(v.replace(",", "."));
    if (!v1 || (kind === "bp" && !v2)) { toast.error("Preencha os valores."); return; }
    if (mode === "fix" && !current?.id) { toast.error("Nenhum registro para corrigir."); return; }
    if (mode === "fix" && !reason.trim()) { toast.error("Correção exige motivo."); return; }
    setSaving(true);
    let res: any = null; let err: any = null;
    if (kind === "weight") {
      const r = mode === "new"
        ? await supabase.rpc("health_record_weight" as any, { _client_id: client.id, _value: num(v1) })
        : await supabase.rpc("health_correct_weight" as any, { _id: current.id, _value: num(v1), _reason: reason.trim() });
      res = r.data; err = r.error;
    } else {
      const r = mode === "new"
        ? await supabase.rpc("health_record_bp" as any, { _client_id: client.id, _systolic: num(v1), _diastolic: num(v2) })
        : await supabase.rpc("health_correct_bp" as any, { _id: current.id, _systolic: num(v1), _diastolic: num(v2), _reason: reason.trim() });
      res = r.data; err = r.error;
    }
    setSaving(false);
    if (err || !res?.ok) {
      const map: Record<string, string> = {
        forbidden: "Sem permissão para registrar dados de saúde.",
        reason_required: "Correção exige motivo.",
        not_found: "Registro não encontrado.",
      };
      toast.error(map[res?.reason] || err?.message || "Não foi possível salvar.");
      return;
    }
    const before = mode === "fix"
      ? (kind === "weight" ? { value: current.value } : { systolic: current.systolic, diastolic: current.diastolic })
      : null;
    const after = kind === "weight" ? { value: num(v1) } : { systolic: num(v1), diastolic: num(v2) };
    await logAudit({
      action: mode === "fix" ? "update" : "create",
      entity: kind === "weight" ? "health_weights" : "health_blood_pressure",
      entity_id: mode === "fix" ? current.id : (res.id ?? null),
      module: "clientes", unit_id: client.unit_id,
      description: `${mode === "fix" ? "Correção" : "Registro"} de ${kind === "weight" ? "peso" : "pressão arterial"} de ${client.name}`,
      metadata: { sensitive: mode === "fix", reason: reason.trim() || null },
      before, after,
    });
    toast.success(mode === "fix" ? "Correção registrada com auditoria." : "Registro salvo.");
    onSaved(); onClose();
  };

  return (
    <div className="mt-3 rounded-xl border border-border p-3 space-y-2">
      <div className="flex gap-2">
        {([["new", "Novo registro"], ["fix", "Corrigir último"]] as [typeof mode, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-dm border ${
              mode === k ? "bg-primary text-white border-primary" : "border-border text-muted-foreground"}`}>
            {l}
          </button>
        ))}
      </div>
      {mode === "fix" && (
        <p className="text-[11px] font-dm text-muted-foreground">
          Valor atual: {kind === "weight"
            ? (current ? `${current.value} kg` : "—")
            : (current ? `${current.systolic}/${current.diastolic}` : "—")}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Input inputMode="decimal" value={v1} onChange={e => setV1(e.target.value)}
          placeholder={kind === "weight" ? "Peso (kg)" : "Sistólica"} className="h-9 font-dm" />
        {kind === "bp" && (
          <Input inputMode="numeric" value={v2} onChange={e => setV2(e.target.value)}
            placeholder="Diastólica" className="h-9 font-dm" />
        )}
      </div>
      {mode === "fix" && (
        <Input value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Motivo da correção (obrigatório)" className="h-9 font-dm" />
      )}
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" className="font-dm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" className="font-dm" onClick={submit} disabled={saving}>
          {saving ? "SALVANDO..." : "SALVAR"}
        </Button>
      </div>
    </div>
  );
}

export function AvaliacoesTab({ c }: { c: OverviewRow }) {
  const a = useClientRows("physical_assessments", c.id, "client_id", "created_at");
  return (
    <Section title="Avaliações físicas">
      <ListShell {...a} empty="Nenhuma avaliação registrada. O módulo completo chega em bloco posterior.">
        <div className="space-y-2">
          {a.rows.map(r => (
            <div key={r.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
              <div>
                <p className="text-sm font-dm text-foreground">{r.professional_name || "Avaliação"}</p>
                <p className="text-[11px] font-dm text-muted-foreground">
                  Agendada {fmtDate(r.scheduled_at)} · Realizada {fmtDate(r.performed_at)}
                </p>
              </div>
              <span className="text-[10px] font-dm px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">{r.status || "—"}</span>
            </div>
          ))}
        </div>
      </ListShell>
    </Section>
  );
}

export function FinanceiroTab({ c }: { c: OverviewRow }) {
  const s = useClientRows("sales", c.id, "client_id", "created_at");
  const total = s.rows.reduce((acc, r) => acc + Number(r.value || 0), 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Situação" value={FIN_LABEL[c.financial_state || "na"]}
          accent={c.financial_state === "ok" ? "green" : c.financial_state === "expiring" ? "yellow" : c.financial_state === "na" ? "default" : "red"} />
        <SummaryCard label="Plano" value={c.plan || "—"} />
        <SummaryCard label="Mensalidade" value={money(c.plan_value)} />
        <SummaryCard label="Total pago" value={money(total)} accent="blue" />
      </div>
      <Section title="Pagamentos">
        <ListShell {...s} empty="Nenhum pagamento registrado.">
          <div className="space-y-2">
            {s.rows.map(r => (
              <div key={r.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 text-sm font-dm">
                <span className="text-foreground">{r.type || "Venda"} · {r.payment_method || "—"}</span>
                <span className="text-muted-foreground text-[11px]">{fmtDate(r.created_at)} · {money(r.value)}</span>
              </div>
            ))}
          </div>
        </ListShell>
      </Section>
    </div>
  );
}

export function ContratosTab({ c }: { c: OverviewRow }) {
  const ct = useClientRows("client_contracts", c.id, "client_id", "created_at");
  return (
    <Section title="Contratos">
      <ListShell {...ct} empty="Nenhum contrato emitido.">
        <div className="space-y-2">
          {ct.rows.map(r => (
            <div key={r.id} className="flex items-start justify-between gap-2 border-b border-border pb-2 last:border-0">
              <div>
                <p className="text-sm font-dm text-foreground">
                  {r.title} <span className="text-muted-foreground">v{r.version ?? 1}</span>
                  {r.renewal_id ? <span className="text-muted-foreground"> · renovação</span> : null}
                </p>
                <p className="text-[11px] font-dm text-muted-foreground">
                  {fmtDate(r.starts_at)} → {fmtDate(r.ends_at)}
                  {r.sent_at ? ` · enviado ${fmtDate(r.sent_at)}${r.channel ? ` (${r.channel})` : ""}${r.sent_by_name ? ` por ${r.sent_by_name}` : ""}` : ""}
                  {r.viewed_at ? ` · visualizado ${fmtDate(r.viewed_at)}` : ""}
                </p>
                {r.signed_at && (
                  <p className="text-[11px] font-dm text-muted-foreground">
                    Assinado {new Date(r.signed_at).toLocaleString("pt-BR")} por {r.signature_name}
                    {r.signature_cpf ? ` · CPF ${r.signature_cpf}` : ""}
                    {r.signature_hash ? ` · cód. ${String(r.signature_hash).slice(0, 16)}` : ""}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-dm px-2 py-0.5 rounded-full ${contractStatusClass(r.status)}`}>
                  {CONTRACT_STATUS_LABEL[r.status] || r.status}
                </span>
                <Button size="icon" variant="ghost" title="Baixar PDF"
                  onClick={() => { if (!printContract(r, c.name)) toast.error("Libere pop-ups para baixar o PDF"); }}>
                  <Download size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ListShell>
    </Section>
  );
}

export function RenovacaoTab({ c }: { c: OverviewRow }) {
  const r = useClientRows("renewal_requests", c.id, "client_id", "created_at");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <SummaryCard label="Vencimento do plano" value={fmtDate(c.contract_end)} />
        <SummaryCard label="Situação" value={FIN_LABEL[c.financial_state || "na"]} />
        <SummaryCard label="Pedidos pendentes" value={c.pending_renewals ?? 0}
          accent={(c.pending_renewals || 0) > 0 ? "yellow" : "default"} />
      </div>
      <Section title="Pedidos de renovação">
        <ListShell {...r} empty="Nenhum pedido de renovação. A régua completa chega em bloco posterior.">
          <div className="space-y-2">
            {r.rows.map(row => (
              <div key={row.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <div>
                  <p className="text-sm font-dm text-foreground">{row.desired_plan || "Renovação"}</p>
                  <p className="text-[11px] font-dm text-muted-foreground">{fmtDate(row.created_at)} · {row.payment_method || "—"}</p>
                </div>
                <span className="text-[10px] font-dm px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">{row.status || "pendente"}</span>
              </div>
            ))}
          </div>
        </ListShell>
      </Section>
    </div>
  );
}

export function IndicacoesTab({ c }: { c: OverviewRow }) {
  const i = useClientRows("crm_indications", c.id, "indicator_student_id", "created_at");
  return (
    <Section title="Indicações feitas pelo aluno">
      <ListShell {...i} empty="Nenhuma indicação registrada.">
        <div className="space-y-2">
          {i.rows.map(r => (
            <div key={r.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
              <div>
                <p className="text-sm font-dm text-foreground">{r.indicated_name}</p>
                <p className="text-[11px] font-dm text-muted-foreground">{r.indicated_phone || "—"} · {fmtDate(r.created_at)}</p>
              </div>
              <span className="text-[10px] font-dm px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">{r.status || "—"}</span>
            </div>
          ))}
        </div>
      </ListShell>
    </Section>
  );
}

export function OcorrenciasTab({ c }: { c: OverviewRow }) {
  const p = useClientRows("pain_reports", c.id, "client_id", "created_at");
  const alerts = useClientRows("crm_attendance_alerts", c.id, "client_id", "created_at");
  return (
    <div className="space-y-4">
      <Section title="Relatos de dor e lesão">
        <ListShell {...p} empty="Nenhuma ocorrência registrada. O módulo completo chega em bloco posterior.">
          <div className="space-y-2">
            {p.rows.map(r => (
              <div key={r.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <div>
                  <p className="text-sm font-dm text-foreground">{r.note || "Relato"}</p>
                  <p className="text-[11px] font-dm text-muted-foreground">{fmtDateTime(r.created_at)}</p>
                </div>
                <span className={`text-[10px] font-dm px-2 py-0.5 rounded-full ${(r.status || "open") === "open" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                  {(r.status || "open") === "open" ? "Aberta" : "Tratada"}
                </span>
              </div>
            ))}
          </div>
        </ListShell>
      </Section>
      <Section title="Alertas de frequência (fila do CRM)">
        <ListShell {...alerts} empty="Nenhum alerta de frequência.">
          <div className="space-y-2">
            {alerts.rows.map(r => (
              <div key={r.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 text-sm font-dm">
                <span className="text-foreground">{r.days_without} dias sem treinar · última atividade {fmtDate(r.last_activity)}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.status === "open" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                  {r.status === "open" ? "Aberto" : "Resolvido"}
                </span>
              </div>
            ))}
          </div>
        </ListShell>
      </Section>
    </div>
  );
}

/* ---------------- anamnese ---------------- */

export function AnamneseTab({ c }: { c: OverviewRow }) {
  const a = useClientRows("anamnesis", c.id, "client_id", "created_at");
  const [sending, setSending] = useState(false);

  const sendLink = async () => {
    setSending(true);
    const { data, error } = await supabase.from("form_links").insert({
      kind: "anamnese", client_id: c.id, lead_name: c.name,
      phone: (c as any).phone || null, unit_id: c.unit_id || null,
    }).select().single();
    setSending(false);
    if (error) return toast.error(error.message);
    const row = data as any;
    await logAudit({
      action: "create", entity: "form_links", entity_id: row.id, module: "clientes",
      description: `Link de anamnese enviado para ${c.name}`,
    });
    const url = `${window.location.origin}/f/${row.token}`;
    if (row.phone) {
      window.open(`https://wa.me/${String(row.phone).replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá ${c.name}! Preencha sua anamnese da EVO CLUB: ${url}`
      )}`, "_blank");
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Sem telefone cadastrado — link copiado.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={sendLink} disabled={sending}>
          {sending ? "Gerando..." : "Enviar anamnese por WhatsApp"}
        </Button>
      </div>
      <Section title="Anamneses recebidas">
        <ListShell {...a} empty="Nenhuma anamnese registrada para este aluno.">
          <div className="space-y-3">
            {a.rows.map(r => (
              <div key={r.id} className="border-b border-border pb-3 last:border-0">
                <p className="text-[11px] font-dm text-muted-foreground">{fmtDateTime(r.created_at)}</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Field label="Objetivo" value={r.objective || "—"} />
                  <Field label="Histórico de treino" value={r.training_history || "—"} />
                  <Field label="Lesões" value={r.injuries || "—"} />
                  <Field label="Dores" value={r.pain || "—"} />
                  <Field label="Limitações" value={r.limitations || "—"} />
                  <Field label="Restrições" value={r.restrictions || "—"} />
                  <Field label="Sono" value={r.sleep || "—"} />
                  <Field label="Estresse" value={r.stress || "—"} />
                  <div className="col-span-2"><Field label="Rotina" value={r.routine || "—"} /></div>
                  {r.content && <div className="col-span-2"><Field label="Observações" value={r.content} /></div>}
                </div>
              </div>
            ))}
          </div>
        </ListShell>
      </Section>
    </div>
  );
}
