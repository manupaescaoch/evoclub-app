import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { useAccess } from "@/contexts/AccessContext";
import { useLeads, type Lead } from "@/hooks/useLeads";
import PageShell, { SummaryCard, EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageCircle, Target, Save, CalendarClock, Flame, Clock } from "lucide-react";
import { openWhatsApp } from "@/lib/whatsapp";
import { brNow, fmtDate, fmtTime, formatPhone, EM_NEGOCIACAO, type StatusFunil } from "@/lib/leads";

type Meta = {
  meta_matriculas: number;
  meta_experimentais: number;
  alunos_ativos: number;
};

const pad = (n: number) => String(n).padStart(2, "0");
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const diffDays = (iso: string) => {
  const a = new Date(`${iso.slice(0, 10)}T12:00:00`).getTime();
  const b = new Date(`${isoDay(brNow())}T12:00:00`).getTime();
  return Math.round((b - a) / 86400000);
};

/** Lista de meses disponíveis: 12 meses retroativos a partir do mês atual. */
function monthOptions() {
  const today = brNow();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    return {
      value: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`,
      label: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    };
  });
}

const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
const fmtPct = (v: number) => `${v.toFixed(1).replace(".", ",")}%`;
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MetaCard = ({
  label, realizado, meta, projecao,
}: { label: string; realizado: number; meta: number; projecao: number }) => {
  const p = Math.min(pct(realizado, meta), 100);
  const atingiu = meta > 0 && realizado >= meta;
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <span className={`text-xs font-semibold ${atingiu ? "text-green-700" : "text-muted-foreground"}`}>
          {meta > 0 ? fmtPct(pct(realizado, meta)) : "sem meta"}
        </span>
      </div>
      <p className="text-3xl font-semibold leading-tight mt-1">
        {realizado}
        <span className="text-base text-muted-foreground font-normal"> / {meta || "—"}</span>
      </p>
      <div className="h-2 rounded-full bg-muted mt-3 overflow-hidden">
        <div className={`h-full rounded-full ${atingiu ? "bg-green-600" : "bg-primary"}`} style={{ width: `${p}%` }} />
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        {meta > 0 ? `Faltam ${Math.max(meta - realizado, 0)} · projeção do mês: ${projecao}` : "Defina a meta do mês"}
      </p>
    </Card>
  );
};

type RuleKey = "sem_contato" | "confirmar_hoje" | "no_show" | "pos_experimental" | "negociacao_parada";

const RULES: { key: RuleKey; label: string; hint: string; accent: "red" | "yellow" | "blue" | "green"; msg: (nome: string) => string }[] = [
  { key: "sem_contato", label: "Sem contato há 2+ dias", accent: "red", hint: "Lead novo ou em contato inicial sem interação recente.",
    msg: (n) => `Olá, ${n}! Aqui é da EVO Club. Vi que você demonstrou interesse em treinar com a gente. Quer agendar sua aula experimental?` },
  { key: "confirmar_hoje", label: "Confirmar experimental (hoje/amanhã)", accent: "blue", hint: "Aulas agendadas para hoje ou amanhã que ainda precisam de confirmação.",
    msg: (n) => `Olá, ${n}! Passando para confirmar sua aula experimental na EVO Club. Podemos contar com você?` },
  { key: "no_show", label: "Faltou na experimental", accent: "yellow", hint: "Aula agendada em data já passada sem presença registrada.",
    msg: (n) => `Olá, ${n}! Sentimos sua falta na aula experimental. Quer reagendar para outro dia?` },
  { key: "pos_experimental", label: "Pós-experimental sem fechamento", accent: "yellow", hint: "Fez a aula e ainda não fechou matrícula.",
    msg: (n) => `Olá, ${n}! O que achou da sua experiência na EVO Club? Posso te mostrar as condições de matrícula?` },
  { key: "negociacao_parada", label: "Negociação parada há 3+ dias", accent: "green", hint: "Em negociação ou follow up sem movimentação.",
    msg: (n) => `Olá, ${n}! Consegui uma condição especial para sua matrícula na EVO Club. Posso te enviar?` },
];

export default function LeadsDashboard() {
  const navigate = useNavigate();
  const { units, filterId } = useUnit();
  const { can } = useAccess();
  const canEdit = can("crm", "edit");

  const months = useMemo(monthOptions, []);
  const [mes, setMes] = useState(months[0].value);
  const [meta, setMeta] = useState<Meta>({ meta_matriculas: 0, meta_experimentais: 0, alunos_ativos: 0 });
  const [savingMeta, setSavingMeta] = useState(false);
  const [rule, setRule] = useState<RuleKey>("sem_contato");

  const unidadeId = filterId || units[0]?.id || null;
  const unidadeNome = units.find((u) => u.id === unidadeId)?.name || "—";

  const monthRange = useMemo(() => {
    const d = new Date(`${mes}T12:00:00`);
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { from: isoDay(first), to: isoDay(last), lastDay: last.getDate() };
  }, [mes]);

  const { leads, interacoes, loading, expAgendadas, expRealizadas } = useLeads(unidadeId, monthRange.from, monthRange.to);

  // metas do mês
  useEffect(() => {
    if (!unidadeId) return;
    (async () => {
      const { data } = await supabase
        .from("metas").select("meta_matriculas,meta_experimentais,alunos_ativos")
        .eq("unidade_id", unidadeId).eq("mes_referencia", mes).maybeSingle();
      setMeta({
        meta_matriculas: (data as any)?.meta_matriculas || 0,
        meta_experimentais: (data as any)?.meta_experimentais || 0,
        alunos_ativos: (data as any)?.alunos_ativos || 0,
      });
    })();
  }, [unidadeId, mes]);

  const salvarMeta = async () => {
    if (!unidadeId) return;
    setSavingMeta(true);
    const { error } = await supabase.from("metas").upsert(
      { unidade_id: unidadeId, mes_referencia: mes, ...meta } as any,
      { onConflict: "unidade_id,mes_referencia" }
    );
    setSavingMeta(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Metas do mês salvas.");
  };

  // ---------- KPIs ----------
  const convertidos = useMemo(() => leads.filter((l) => l.status_funil === "convertido"), [leads]);
  const matriculas = useMemo(() => interacoes.filter((i) => i.fechou_matricula), [interacoes]);
  const receita = useMemo(() => matriculas.reduce((s, i) => s + Number(i.valor_plano || 0), 0), [matriculas]);
  const ticket = matriculas.length ? receita / matriculas.length : 0;

  const agendadas = expAgendadas.size;
  const realizadas = expRealizadas.size;
  const noShow = useMemo(
    () => interacoes.filter((i) => i.compareceu === false).length,
    [interacoes]
  );

  const isCurrentMonth = mes === months[0].value;
  const diaAtual = isCurrentMonth ? brNow().getDate() : monthRange.lastDay;
  const projetar = (v: number) => (diaAtual > 0 ? Math.round((v / diaAtual) * monthRange.lastDay) : v);

  // ---------- Réguas de follow up ----------
  const ultimaInteracao = useMemo(() => {
    const m = new Map<string, string>();
    interacoes.forEach((i) => {
      const prev = m.get(i.lead_id);
      if (!prev || i.created_at > prev) m.set(i.lead_id, i.created_at);
    });
    return m;
  }, [interacoes]);

  const diasSemContato = (l: Lead) => diffDays(ultimaInteracao.get(l.id) || l.created_at);

  const test = (key: RuleKey, l: Lead) => {
    if (l.status_funil === "convertido" || l.status_funil === "perdido") return false;
    const exp = l.data_aula_experimental ? l.data_aula_experimental.slice(0, 10) : null;
    const dExp = exp ? diffDays(exp) : null;
    if (key === "sem_contato")
      return ["novo", "contato_inicial"].includes(l.status_funil) && diasSemContato(l) >= 2;
    if (key === "confirmar_hoje")
      return !!exp && dExp !== null && dExp <= 0 && dExp >= -1 && !expRealizadas.has(l.id);
    if (key === "no_show")
      return !!exp && dExp !== null && dExp >= 1 && !expRealizadas.has(l.id);
    if (key === "pos_experimental")
      return expRealizadas.has(l.id) && diasSemContato(l) >= 2;
    if (key === "negociacao_parada")
      return ["negociacao", "follow_up"].includes(l.status_funil) && diasSemContato(l) >= 3;
    return false;
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    RULES.forEach((r) => { c[r.key] = leads.filter((l) => test(r.key, l)).length; });
    return c;
  }, [leads, ultimaInteracao, expRealizadas]);

  const fila = useMemo(
    () => leads.filter((l) => test(rule, l)).sort((a, b) => diasSemContato(b) - diasSemContato(a)),
    [leads, rule, ultimaInteracao, expRealizadas]
  );

  // ---------- Controles do dia ----------
  const hoje = isoDay(brNow());
  const expHoje = useMemo(
    () => leads.filter((l) => (l.data_aula_experimental || "").slice(0, 10) === hoje)
      .sort((a, b) => (a.hora_aula_experimental || "").localeCompare(b.hora_aula_experimental || "")),
    [leads, hoje]
  );
  const novosHoje = useMemo(() => leads.filter((l) => l.created_at.slice(0, 10) === hoje).length, [leads, hoje]);
  const matriculasHoje = useMemo(
    () => matriculas.filter((i) => (i.data_fechamento || i.created_at).slice(0, 10) === hoje).length,
    [matriculas, hoje]
  );
  const taxasPendentes = useMemo(
    () => leads.filter((l) => l.status_taxa_experimental === "pendente" && l.data_aula_experimental).length,
    [leads]
  );

  // ---------- Rankings ----------
  const rank = (fn: (l: Lead) => string) => {
    const m = new Map<string, { total: number; conv: number }>();
    leads.forEach((l) => {
      const k = fn(l) || "Não informado";
      const cur = m.get(k) || { total: 0, conv: 0 };
      cur.total += 1;
      if (l.status_funil === "convertido") cur.conv += 1;
      m.set(k, cur);
    });
    return Array.from(m.entries()).map(([k, v]) => ({ k, ...v })).sort((a, b) => b.total - a.total).slice(0, 6);
  };
  const porOrigem = useMemo(() => rank((l) => l.origem || ""), [leads]);
  const porCadastrador = useMemo(() => rank((l) => l.cadastrado_por || ""), [leads]);

  const whats = (l: Lead) => {
    if (!l.telefone) { toast.error("Lead sem telefone cadastrado."); return; }
    const r = RULES.find((x) => x.key === rule)!;
    openWhatsApp(l.telefone, r.msg(l.nome.split(" ")[0]));
  };

  return (
    <PageShell
      title="DASHBOARD COMERCIAL"
      description={`Meta versus realizado, réguas de follow up e controles do dia — ${unidadeNome}.`}
      primaryAction={
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value} className="capitalize">{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      summary={
        <>
          <SummaryCard label="Leads no mês" value={loading ? "…" : leads.length} />
          <SummaryCard label="Exp. agendadas" value={loading ? "…" : agendadas} accent="blue" />
          <SummaryCard label="Exp. realizadas" value={loading ? "…" : realizadas} accent="green" />
          <SummaryCard label="Matrículas" value={loading ? "…" : Math.max(matriculas.length, convertidos.length)} accent="green" />
        </>
      }
    >
      {/* Meta vs realizado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MetaCard
          label="Matrículas — meta do mês"
          realizado={Math.max(matriculas.length, convertidos.length)}
          meta={meta.meta_matriculas}
          projecao={projetar(Math.max(matriculas.length, convertidos.length))}
        />
        <MetaCard
          label="Experimentais — meta do mês"
          realizado={realizadas}
          meta={meta.meta_experimentais}
          projecao={projetar(realizadas)}
        />
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-primary" />
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Metas do mês</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["Matrículas", "meta_matriculas"],
              ["Exp.", "meta_experimentais"],
              ["Ativos", "alunos_ativos"],
            ] as [string, keyof Meta][]).map(([label, key]) => (
              <label key={key} className="text-[11px] text-muted-foreground">
                {label}
                <Input
                  type="number" min={0} className="h-9 mt-1"
                  value={meta[key]} disabled={!canEdit}
                  onChange={(e) => setMeta((m) => ({ ...m, [key]: Number(e.target.value) || 0 }))}
                />
              </label>
            ))}
          </div>
          <Button size="sm" className="w-full gap-1" disabled={!canEdit || savingMeta} onClick={salvarMeta}>
            <Save size={14} /> {savingMeta ? "Salvando..." : "Salvar metas"}
          </Button>
        </Card>
      </div>

      {/* Conversões */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Lead → matrícula" value={fmtPct(pct(Math.max(matriculas.length, convertidos.length), leads.length))} />
        <SummaryCard label="Exp. → matrícula" value={fmtPct(pct(Math.max(matriculas.length, convertidos.length), realizadas))} accent="green" />
        <SummaryCard label="Presença nas exp." value={fmtPct(pct(realizadas, agendadas))} accent="blue" />
        <SummaryCard label="No-show" value={noShow} accent="yellow" />
        <SummaryCard label="Ticket médio" value={brl(ticket)} />
      </div>

      {/* Controles do dia */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock size={16} className="text-primary" />
            <h2 className="font-barlow font-bold text-lg">Experimentais de hoje ({expHoje.length})</h2>
          </div>
          {expHoje.length === 0 ? (
            <p className="text-sm text-muted-foreground font-dm">Nenhuma aula experimental agendada para hoje.</p>
          ) : (
            <div className="divide-y divide-border">
              {expHoje.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <button className="font-dm font-medium text-sm hover:text-primary text-left truncate"
                      onClick={() => navigate(`/admin/leads/${l.id}`)}>{l.nome}</button>
                    <p className="text-[11px] text-muted-foreground">
                      {fmtTime(l.hora_aula_experimental)} · {formatPhone(l.telefone)} · {l.origem || "—"}
                      {l.status_taxa_experimental === "pendente" && " · taxa pendente"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${expRealizadas.has(l.id) ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {expRealizadas.has(l.id) ? "Presente" : "A confirmar"}
                    </span>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => whats(l)}>
                      <MessageCircle size={12} /> WhatsApp
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <div className="grid grid-cols-2 gap-3 content-start">
          <SummaryCard label="Leads hoje" value={novosHoje} />
          <SummaryCard label="Matrículas hoje" value={matriculasHoje} accent="green" />
          <SummaryCard label="Taxas pendentes" value={taxasPendentes} accent="yellow" />
          <SummaryCard label="Em negociação" value={leads.filter((l) => EM_NEGOCIACAO.includes(l.status_funil as StatusFunil)).length} accent="blue" />
        </div>
      </div>

      {/* Réguas de follow up */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-primary" />
          <h2 className="font-barlow font-bold text-lg">Réguas de follow up</h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RULES.map((r) => (
            <button key={r.key} onClick={() => setRule(r.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-dm font-semibold ${rule === r.key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}>
              {r.label} ({counts[r.key] || 0})
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground font-dm">{RULES.find((r) => r.key === rule)?.hint}</p>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? <LoadingState /> : fila.length === 0 ? (
            <EmptyState message="Nenhum lead nesta régua. Follow up em dia." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-dm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3">Lead</th>
                    <th className="px-4 py-3">Telefone</th>
                    <th className="px-4 py-3">Origem</th>
                    <th className="px-4 py-3">Experimental</th>
                    <th className="px-4 py-3">Sem contato</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {fila.map((l) => (
                    <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <button className="font-medium text-left hover:text-primary" onClick={() => navigate(`/admin/leads/${l.id}`)}>
                          {l.nome}
                        </button>
                        <span className="block text-[11px] text-muted-foreground">{l.cadastrado_por || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatPhone(l.telefone)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.origem || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {l.data_aula_experimental ? `${fmtDate(l.data_aula_experimental)} ${fmtTime(l.hora_aula_experimental)}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Clock size={12} /> {diasSemContato(l)} d
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 mr-1.5" onClick={() => whats(l)}>
                          <MessageCircle size={12} /> WhatsApp
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => navigate(`/admin/leads/${l.id}`)}>
                          Abrir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { title: "Leads por origem", rows: porOrigem },
          { title: "Leads por cadastrador", rows: porCadastrador },
        ].map((block) => (
          <Card key={block.title} className="p-4">
            <h2 className="font-barlow font-bold text-lg mb-3">{block.title}</h2>
            {block.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground font-dm">Sem dados no período.</p>
            ) : (
              <div className="space-y-2">
                {block.rows.map((r) => (
                  <div key={r.k}>
                    <div className="flex justify-between text-sm font-dm">
                      <span className="truncate">{r.k}</span>
                      <span className="text-muted-foreground">
                        {r.total} · {r.conv} matr. ({fmtPct(pct(r.conv, r.total))})
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                      <div className="h-full bg-primary rounded-full"
                        style={{ width: `${pct(r.total, block.rows[0].total)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
