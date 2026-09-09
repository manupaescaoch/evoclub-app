import { ReactNode, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { useAccess } from "@/contexts/AccessContext";
import { useLeads, type Lead } from "@/hooks/useLeads";
import { SummaryCard } from "@/components/admin/gerencial/PageShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Target } from "lucide-react";
import { openWhatsApp } from "@/lib/whatsapp";
import { brNow, EM_NEGOCIACAO, type StatusFunil } from "@/lib/leads";
import ExperimentaisHoje from "./ExperimentaisHoje";
import FollowUpReguas, { RULES, type RuleKey } from "./FollowUpReguas";
import RankingsComerciais, { type RankRow } from "./RankingsComerciais";

type Meta = { meta_matriculas: number; meta_experimentais: number; alunos_ativos: number; meta_alunos_ativos: number };

const pad = (n: number) => String(n).padStart(2, "0");
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const diffDays = (iso: string) => {
  const a = new Date(`${iso.slice(0, 10)}T12:00:00`).getTime();
  const b = new Date(`${isoDay(brNow())}T12:00:00`).getTime();
  return Math.round((b - a) / 86400000);
};

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

/**
 * Bloco comercial do dashboard unificado do CRM.
 * `indicadores` recebe o painel de funil/atividades para manter a ordem da página.
 */
export default function ComercialPanel({ indicadores }: { indicadores?: ReactNode }) {
  const { units, filterId } = useUnit();
  const { can } = useAccess();
  const canEdit = can("crm", "edit");

  const months = useMemo(monthOptions, []);
  const [mes, setMes] = useState(months[0].value);
  const [meta, setMeta] = useState<Meta>({ meta_matriculas: 0, meta_experimentais: 0, alunos_ativos: 0, meta_alunos_ativos: 0 });
  const [savingMeta, setSavingMeta] = useState(false);
  const [rule, setRule] = useState<RuleKey>("sem_contato");

  const unidadeId = filterId || units[0]?.id || null;

  const monthRange = useMemo(() => {
    const d = new Date(`${mes}T12:00:00`);
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { from: isoDay(first), to: isoDay(last), lastDay: last.getDate() };
  }, [mes]);

  const { leads, interacoes, loading, expAgendadas, expRealizadas } = useLeads(unidadeId, monthRange.from, monthRange.to);

  useEffect(() => {
    if (!unidadeId) return;
    (async () => {
      const { data } = await supabase
        .from("metas").select("meta_matriculas,meta_experimentais,alunos_ativos,meta_alunos_ativos")
        .eq("unidade_id", unidadeId).eq("mes_referencia", mes).maybeSingle();
      setMeta({
        meta_matriculas: (data as any)?.meta_matriculas || 0,
        meta_experimentais: (data as any)?.meta_experimentais || 0,
        alunos_ativos: (data as any)?.alunos_ativos || 0,
        meta_alunos_ativos: (data as any)?.meta_alunos_ativos || 0,
      });
    })();
  }, [unidadeId, mes]);

  const salvarMeta = async () => {
    if (!unidadeId) return;
    setSavingMeta(true);
    const { error } = await supabase.from("metas").upsert(
      { unidade_id: unidadeId, mes_referencia: mes, ...meta } as any,
      { onConflict: "unidade_id,mes_referencia" },
    );
    setSavingMeta(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Metas do mês salvas.");
  };

  // KPIs
  const convertidos = useMemo(() => leads.filter((l) => l.status_funil === "convertido"), [leads]);
  const matriculas = useMemo(() => interacoes.filter((i) => i.fechou_matricula), [interacoes]);
  const receita = useMemo(() => matriculas.reduce((s, i) => s + Number(i.valor_plano || 0), 0), [matriculas]);
  const ticket = matriculas.length ? receita / matriculas.length : 0;
  const totalMatriculas = Math.max(matriculas.length, convertidos.length);

  const agendadas = expAgendadas.size;
  const realizadas = expRealizadas.size;
  const noShow = useMemo(() => interacoes.filter((i) => i.compareceu === false).length, [interacoes]);

  const isCurrentMonth = mes === months[0].value;
  const diaAtual = isCurrentMonth ? brNow().getDate() : monthRange.lastDay;
  const projetar = (v: number) => (diaAtual > 0 ? Math.round((v / diaAtual) * monthRange.lastDay) : v);

  // Réguas
  const ultimaInteracao = useMemo(() => {
    const m = new Map<string, string>();
    interacoes.forEach((i) => {
      const prev = m.get(i.lead_id);
      if (!prev || i.created_at > prev) m.set(i.lead_id, i.created_at);
    });
    return m;
  }, [interacoes]);

  const diasSemContato = (l: Lead) => diffDays(ultimaInteracao.get(l.id) || l.created_at);

  // limites configuráveis em Configurações › CRM
  const [crmCfg, setCrmCfg] = useState({ followup_stale_days: 3, no_contact_hours: 24, negotiation_stale_days: 5 });
  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "crm").maybeSingle()
      .then(({ data }) => { if (data?.value) setCrmCfg(c => ({ ...c, ...(data.value as any) })); });
  }, []);
  const semContatoDias = Math.max(1, Math.ceil((crmCfg.no_contact_hours || 24) / 24));

  const test = (key: RuleKey, l: Lead) => {
    if (l.status_funil === "convertido" || l.status_funil === "perdido") return false;
    const exp = l.data_aula_experimental ? l.data_aula_experimental.slice(0, 10) : null;
    const dExp = exp ? diffDays(exp) : null;
    if (key === "sem_contato")
      return ["novo", "contato_inicial"].includes(l.status_funil) && diasSemContato(l) >= semContatoDias;
    if (key === "confirmar_hoje")
      return !!exp && dExp !== null && dExp <= 0 && dExp >= -1 && !expRealizadas.has(l.id);
    if (key === "no_show")
      return !!exp && dExp !== null && dExp >= 1 && !expRealizadas.has(l.id);
    if (key === "pos_experimental")
      return expRealizadas.has(l.id) && diasSemContato(l) >= (crmCfg.followup_stale_days || 3);
    if (key === "negociacao_parada")
      return ["negociacao", "follow_up"].includes(l.status_funil) && diasSemContato(l) >= (crmCfg.negotiation_stale_days || 5);
    return false;
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    RULES.forEach((r) => { c[r.key] = leads.filter((l) => test(r.key, l)).length; });
    return c;
  }, [leads, ultimaInteracao, expRealizadas, crmCfg]);

  const fila = useMemo(
    () => leads.filter((l) => test(rule, l)).sort((a, b) => diasSemContato(b) - diasSemContato(a)),
    [leads, rule, ultimaInteracao, expRealizadas, crmCfg],
  );

  // Controles do dia
  const hoje = isoDay(brNow());
  const expHoje = useMemo(
    () => leads.filter((l) => (l.data_aula_experimental || "").slice(0, 10) === hoje)
      .sort((a, b) => (a.hora_aula_experimental || "").localeCompare(b.hora_aula_experimental || "")),
    [leads, hoje],
  );
  const novosHoje = useMemo(() => leads.filter((l) => l.created_at.slice(0, 10) === hoje).length, [leads, hoje]);
  const matriculasHoje = useMemo(
    () => matriculas.filter((i) => (i.data_fechamento || i.created_at).slice(0, 10) === hoje).length,
    [matriculas, hoje],
  );
  const taxasPendentes = useMemo(
    () => leads.filter((l) => l.status_taxa_experimental === "pendente" && l.data_aula_experimental).length,
    [leads],
  );

  // Rankings
  const rank = (fn: (l: Lead) => string): RankRow[] => {
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
    <div className="space-y-5">
      {/* Mês de referência */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-barlow font-bold text-lg">Metas do mês</h2>
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value} className="capitalize">{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MetaCard label="Matrículas — meta do mês" realizado={totalMatriculas}
          meta={meta.meta_matriculas} projecao={projetar(totalMatriculas)} />
        <MetaCard label="Experimentais — meta do mês" realizado={realizadas}
          meta={meta.meta_experimentais} projecao={projetar(realizadas)} />
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-primary" />
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Metas do mês</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              ["Matrículas", "meta_matriculas"],
              ["Exp.", "meta_experimentais"],
              ["Ativos", "alunos_ativos"],
              ["Meta ativos", "meta_alunos_ativos"],
            ] as [string, keyof Meta][]).map(([label, key]) => (
              <label key={key} className="text-[11px] text-muted-foreground">
                {label}
                <Input type="number" min={0} className="h-9 mt-1" value={meta[key]} disabled={!canEdit}
                  onChange={(e) => setMeta((m) => ({ ...m, [key]: Number(e.target.value) || 0 }))} />
              </label>
            ))}
          </div>
          <Button size="sm" className="w-full gap-1" disabled={!canEdit || savingMeta} onClick={salvarMeta}>
            <Save size={14} /> {savingMeta ? "Salvando..." : "Salvar metas"}
          </Button>
        </Card>
      </div>

      {/* Conversões do mês selecionado */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Lead → matrícula" value={fmtPct(pct(totalMatriculas, leads.length))} />
        <SummaryCard label="Exp. → matrícula" value={fmtPct(pct(totalMatriculas, realizadas))} accent="green" />
        <SummaryCard label="Presença nas exp." value={fmtPct(pct(realizadas, agendadas))} accent="blue" />
        <SummaryCard label="No-show" value={noShow} accent="yellow" />
        <SummaryCard label="Ticket médio" value={brl(ticket)} />
      </div>

      {indicadores}

      {/* Operação do dia */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <ExperimentaisHoje leads={expHoje} realizadas={expRealizadas} onWhats={whats} />
        </div>
        <div className="grid grid-cols-2 gap-3 content-start">
          <SummaryCard label="Leads hoje" value={novosHoje} />
          <SummaryCard label="Matrículas hoje" value={matriculasHoje} accent="green" />
          <SummaryCard label="Taxas pendentes" value={taxasPendentes} accent="yellow" />
          <SummaryCard label="Em negociação"
            value={leads.filter((l) => EM_NEGOCIACAO.includes(l.status_funil as StatusFunil)).length} accent="blue" />
        </div>
      </div>

      <FollowUpReguas rule={rule} setRule={setRule} counts={counts} fila={fila}
        loading={loading} diasSemContato={diasSemContato} onWhats={whats} />

      <RankingsComerciais porOrigem={porOrigem} porCadastrador={porCadastrador} />
    </div>
  );
}
