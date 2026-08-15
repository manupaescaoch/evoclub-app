import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { useLeads, type Lead } from "@/hooks/useLeads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Download, Upload, Plus, Search, Eye, Pencil, Trash2, ChevronDown, MessageCircle,
} from "lucide-react";
import NovoLeadDialog from "@/components/admin/leads/NovoLeadDialog";
import ImportLeadsDialog from "@/components/admin/leads/ImportLeadsDialog";
import {
  EM_NEGOCIACAO, NIVEL_BADGE, NIVEL_LABEL, PERIOD_OPTIONS, STATUS_BADGE, STATUS_FUNIL, STATUS_LABEL,
  TAXA_BADGE, TAXA_LABEL, fmtDate, fmtTime, formatPhone, interesseScore, normalizeCadastrador,
  onlyDigits, periodLabel, periodRange, waLink, type PeriodKey, type StatusFunil,
} from "@/lib/leads";

const SKEY = "leads:filters:v1";

type Filters = {
  period: PeriodKey;
  customFrom: string;
  customTo: string;
  busca: string;
  origens: string[];
  cadastrador: string;
  status: string[];
  chips: string[];
  niveis: string[];
};

const DEFAULTS: Filters = {
  period: "30", customFrom: "", customTo: "", busca: "",
  origens: [], cadastrador: "all", status: [], chips: [], niveis: [],
};

const loadFilters = (): Filters => {
  try {
    const raw = sessionStorage.getItem(SKEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch { return DEFAULTS; }
};

const Kpi = ({ label, value, tone = "" }: { label: string; value: string | number; tone?: string }) => (
  <Card className="p-4">
    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
    <p className={`text-3xl font-semibold leading-tight mt-1 ${tone}`}>{value}</p>
  </Card>
);

const MultiPopover = ({
  label, options, selected, onToggle,
}: { label: string; options: string[]; selected: string[]; onToggle: (v: string) => void }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className="w-full justify-between font-normal">
        <span className="truncate">{selected.length ? `${label} (${selected.length})` : label}</span>
        <ChevronDown size={16} className="opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-64 max-h-72 overflow-y-auto p-2">
      {options.length === 0 && <p className="p-2 text-sm text-muted-foreground">Nenhuma opção</p>}
      {options.map((o) => (
        <label key={o} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted cursor-pointer">
          <Checkbox checked={selected.includes(o)} onCheckedChange={() => onToggle(o)} />
          <span className="truncate">{o}</span>
        </label>
      ))}
    </PopoverContent>
  </Popover>
);

const Leads = () => {
  const navigate = useNavigate();
  const { units, selected, setSelected, filterId } = useUnit();
  const [f, setF] = useState<Filters>(loadFilters);
  const [novo, setNovo] = useState(false);
  const [importar, setImportar] = useState(false);
  const [toDelete, setToDelete] = useState<Lead | null>(null);
  const [me, setMe] = useState("");

  useEffect(() => { sessionStorage.setItem(SKEY, JSON.stringify(f)); }, [f]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email || "";
      if (!email) return;
      const { data } = await supabase.from("collaborators").select("name").eq("email", email).maybeSingle();
      setMe((data as any)?.name || email.split("@")[0]);
    })();
  }, []);

  // unidade obrigatória: se estiver em consolidado, escolhe a primeira
  const unidadeId = filterId || units[0]?.id || null;
  const unidadeNome = units.find((u) => u.id === unidadeId)?.name || "—";

  const { from, to } = useMemo(
    () => periodRange(f.period, { from: f.customFrom, to: f.customTo }),
    [f.period, f.customFrom, f.customTo]
  );
  const { leads, loading, reload, expAgendadas, expRealizadas } = useLeads(unidadeId, from, to);

  const origens = useMemo(
    () => Array.from(new Set(leads.map((l) => l.origem || "Não informado"))).sort(),
    [leads]
  );
  const cadastradores = useMemo(
    () => Array.from(new Set(leads.map((l) => normalizeCadastrador(l.cadastrado_por)))).sort(),
    [leads]
  );

  const matchChips = (l: Lead) => {
    if (!f.chips.length) return true;
    return f.chips.some((c) => {
      if (c === "convertidos") return l.status_funil === "convertido";
      if (c === "negociacao") return EM_NEGOCIACAO.includes(l.status_funil as StatusFunil);
      if (c === "perdidos") return l.status_funil === "perdido";
      if (c === "exp_agendado") return expAgendadas.has(l.id);
      if (c === "exp_realizado") return expRealizadas.has(l.id);
      return true;
    });
  };

  const filtered = useMemo(() => {
    const q = f.busca.trim().toLowerCase();
    const qDigits = onlyDigits(f.busca);
    return leads.filter((l) => {
      if (q) {
        const byName = l.nome.toLowerCase().includes(q);
        const byPhone = qDigits.length >= 3 && (l.telefone_normalizado || "").includes(qDigits);
        if (!byName && !byPhone) return false;
      }
      if (f.origens.length && !f.origens.includes(l.origem || "Não informado")) return false;
      if (f.cadastrador !== "all" && normalizeCadastrador(l.cadastrado_por) !== f.cadastrador) return false;
      if (f.status.length && !f.status.includes(l.status_funil)) return false;
      if (f.niveis.length) {
        const has = f.niveis.some((n) => (n === "sem" ? !l.nivel_interesse : l.nivel_interesse === n));
        if (!has) return false;
      }
      return matchChips(l);
    });
  }, [leads, f, expAgendadas, expRealizadas]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const convertidos = filtered.filter((l) => l.status_funil === "convertido").length;
    const negociacao = filtered.filter((l) => EM_NEGOCIACAO.includes(l.status_funil as StatusFunil)).length;
    const perdidos = filtered.filter((l) => l.status_funil === "perdido").length;
    const agendadas = filtered.filter((l) => expAgendadas.has(l.id)).length;
    const realizadas = filtered.filter((l) => expRealizadas.has(l.id)).length;
    const taxa = total ? ((convertidos / total) * 100).toFixed(1) : "0,0";
    return { total, convertidos, negociacao, perdidos, agendadas, realizadas, taxa };
  }, [filtered, expAgendadas, expRealizadas]);

  const counts = useMemo(() => ({
    todos: leads.length,
    convertidos: leads.filter((l) => l.status_funil === "convertido").length,
    negociacao: leads.filter((l) => EM_NEGOCIACAO.includes(l.status_funil as StatusFunil)).length,
    perdidos: leads.filter((l) => l.status_funil === "perdido").length,
    exp_agendado: leads.filter((l) => expAgendadas.has(l.id)).length,
    exp_realizado: leads.filter((l) => expRealizadas.has(l.id)).length,
  }), [leads, expAgendadas, expRealizadas]);

  const nivelCounts = useMemo(() => ({
    todos: leads.length,
    alto: leads.filter((l) => l.nivel_interesse === "alto").length,
    medio: leads.filter((l) => l.nivel_interesse === "medio").length,
    baixo: leads.filter((l) => l.nivel_interesse === "baixo").length,
    sem: leads.filter((l) => !l.nivel_interesse).length,
  }), [leads]);

  const toggle = (key: "origens" | "status" | "chips" | "niveis", v: string) =>
    setF((p) => ({ ...p, [key]: p[key].includes(v) ? p[key].filter((x) => x !== v) : [...p[key], v] }));

  const exportar = () => {
    if (!filtered.length) return toast.error("Nenhum lead para exportar.");
    const ws = XLSX.utils.json_to_sheet(filtered.map((l) => ({
      Nome: l.nome.toUpperCase(),
      "Número": formatPhone(l.telefone),
      Status: STATUS_LABEL[l.status_funil as StatusFunil] || l.status_funil,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `leads-${periodLabel(f.period, { from: f.customFrom, to: f.customTo })}.xlsx`.replace(/[\/\s]+/g, "-"));
    toast.success("Planilha exportada.");
  };

  const excluir = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("leads").update({ ativo: false }).eq("id", toDelete.id);
    setToDelete(null);
    if (error) return toast.error("Erro ao excluir: " + error.message);
    toast.success("Lead excluído.");
    reload();
  };

  const chipCls = (active: boolean, tone: string) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? tone : "bg-background text-muted-foreground hover:bg-muted"}`;

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Leads</h1>
          <Badge variant="secondary">{unidadeNome}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={f.period} onValueChange={(v) => setF((p) => ({ ...p, period: v as PeriodKey }))}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {f.period === "custom" && (
            <>
              <Input type="date" className="w-[150px]" value={f.customFrom}
                onChange={(e) => setF((p) => ({ ...p, customFrom: e.target.value }))} />
              <Input type="date" className="w-[150px]" value={f.customTo}
                onChange={(e) => setF((p) => ({ ...p, customTo: e.target.value }))} />
            </>
          )}
          <Button variant="outline" onClick={exportar}><Download size={16} className="mr-2" />Exportar</Button>
          <Button variant="outline" onClick={() => setImportar(true)}><Upload size={16} className="mr-2" />Importar Planilha</Button>
          <Button onClick={() => setNovo(true)}><Plus size={16} className="mr-2" />Novo Lead</Button>
        </div>
      </div>

      {!filterId && (
        <Card className="p-3 text-sm text-muted-foreground">
          Exibindo a unidade <strong>{unidadeNome}</strong>. Selecione uma unidade específica no topo para alternar.
          {units.length > 1 && (
            <Button variant="link" className="h-auto p-0 pl-2" onClick={() => unidadeId && setSelected(unidadeId)}>
              Fixar unidade
            </Button>
          )}
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Kpi label="Total de Leads" value={kpis.total} />
        <Kpi label="Convertidos" value={kpis.convertidos} tone="text-emerald-600" />
        <Kpi label="Em Negociação" value={kpis.negociacao} tone="text-amber-600" />
        <Kpi label="Perdidos" value={kpis.perdidos} tone="text-destructive" />
        <Kpi label="Exp. Agendadas" value={kpis.agendadas} tone="text-sky-600" />
        <Kpi label="Exp. Realizadas" value={kpis.realizadas} tone="text-violet-600" />
        <Kpi label="Taxa de Conversão" value={`${kpis.taxa}%`} tone="text-primary" />
      </div>

      {/* Chips de status */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button className={chipCls(!f.chips.length, "bg-primary text-primary-foreground border-primary")}
          onClick={() => setF((p) => ({ ...p, chips: [] }))}>Todos ({counts.todos})</button>
        <button className={chipCls(f.chips.includes("convertidos"), "bg-emerald-600 text-white border-emerald-600")}
          onClick={() => toggle("chips", "convertidos")}>Convertidos ({counts.convertidos})</button>
        <button className={chipCls(f.chips.includes("negociacao"), "bg-amber-500 text-white border-amber-500")}
          onClick={() => toggle("chips", "negociacao")}>Em Negociação ({counts.negociacao})</button>
        <button className={chipCls(f.chips.includes("perdidos"), "bg-destructive text-destructive-foreground border-destructive")}
          onClick={() => toggle("chips", "perdidos")}>Perdidos ({counts.perdidos})</button>
        <button className={chipCls(f.chips.includes("exp_agendado"), "bg-sky-500 text-white border-sky-500")}
          onClick={() => toggle("chips", "exp_agendado")}>Exp. Agendado ({counts.exp_agendado})</button>
        <button className={chipCls(f.chips.includes("exp_realizado"), "bg-violet-500 text-white border-violet-500")}
          onClick={() => toggle("chips", "exp_realizado")}>Exp. Realizado ({counts.exp_realizado})</button>
      </div>

      {/* Chips de nível */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button className={chipCls(!f.niveis.length, "bg-primary text-primary-foreground border-primary")}
          onClick={() => setF((p) => ({ ...p, niveis: [] }))}>Todos ({nivelCounts.todos})</button>
        <button className={chipCls(f.niveis.includes("alto"), "bg-emerald-600 text-white border-emerald-600")}
          onClick={() => toggle("niveis", "alto")}>Alto ({nivelCounts.alto})</button>
        <button className={chipCls(f.niveis.includes("medio"), "bg-amber-500 text-white border-amber-500")}
          onClick={() => toggle("niveis", "medio")}>Médio ({nivelCounts.medio})</button>
        <button className={chipCls(f.niveis.includes("baixo"), "bg-muted-foreground text-background border-muted-foreground")}
          onClick={() => toggle("niveis", "baixo")}>Baixo ({nivelCounts.baixo})</button>
        <button className={chipCls(f.niveis.includes("sem"), "bg-foreground text-background border-foreground")}
          onClick={() => toggle("niveis", "sem")}>Sem nível ({nivelCounts.sem})</button>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label className="text-xs">Buscar</Label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Nome ou telefone" value={f.busca}
                onChange={(e) => setF((p) => ({ ...p, busca: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Origem</Label>
            <MultiPopover label="Todas as origens" options={origens} selected={f.origens}
              onToggle={(v) => toggle("origens", v)} />
          </div>
          <div>
            <Label className="text-xs">Cadastrado por</Label>
            <Select value={f.cadastrador} onValueChange={(v) => setF((p) => ({ ...p, cadastrador: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {cadastradores.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status do funil</Label>
            <MultiPopover label="Todos os status" options={[...STATUS_FUNIL]} selected={f.status}
              onToggle={(v) => toggle("status", v)} />
          </div>
        </div>
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Nome Completo</th>
                <th className="p-3 text-left">Telefone</th>
                <th className="p-3 text-left">Origem</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Interesse</th>
                <th className="p-3 text-left">Data Exp.</th>
                <th className="p-3 text-left">Hora Exp.</th>
                <th className="p-3 text-left">Cadastrado Por</th>
                <th className="p-3 text-left">Data Cadastro</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Carregando leads...</td></tr>}
              {!loading && !filtered.length && (
                <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Nenhum lead encontrado com os filtros atuais.</td></tr>
              )}
              {filtered.map((l) => {
                const nivel = interesseScore(l as any);
                return (
                  <tr key={l.id} className="border-t cursor-pointer hover:bg-muted/40"
                    onClick={() => navigate(`/admin/leads/${l.id}`)}>
                    <td className="p-3 font-medium">{l.nome.toUpperCase()}</td>
                    <td className="p-3">
                      {waLink(l.telefone) ? (
                        <a href={waLink(l.telefone)!} target="_blank" rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-primary hover:underline">
                          <MessageCircle size={14} />{formatPhone(l.telefone)}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="p-3">{l.origem}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[l.status_funil as StatusFunil] || "bg-muted"}`}>
                        {STATUS_LABEL[l.status_funil as StatusFunil] || l.status_funil}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${NIVEL_BADGE[nivel]}`}>{NIVEL_LABEL[nivel]}</span>
                    </td>
                    <td className="p-3">{fmtDate(l.data_aula_experimental)}</td>
                    <td className="p-3">
                      <div>{fmtTime(l.hora_aula_experimental)}</div>
                      {l.status_taxa_experimental && (
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${TAXA_BADGE[l.status_taxa_experimental]}`}>
                          {TAXA_LABEL[l.status_taxa_experimental]}
                        </span>
                      )}
                    </td>
                    <td className="p-3">{normalizeCadastrador(l.cadastrado_por)}</td>
                    <td className="p-3">{fmtDate(l.created_at)}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" onClick={() => navigate(`/admin/leads/${l.id}`)}><Eye size={16} /></Button>
                        <Button size="icon" variant="ghost" onClick={() => navigate(`/admin/leads/${l.id}?edit=1`)}><Pencil size={16} /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setToDelete(l)}><Trash2 size={16} /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {unidadeId && (
        <>
          <NovoLeadDialog open={novo} onOpenChange={setNovo} unidadeId={unidadeId}
            cadastradoPor={me} onSaved={reload} />
          <ImportLeadsDialog open={importar} onOpenChange={setImportar} unidadeId={unidadeId} onDone={reload} />
        </>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.nome?.toUpperCase()} será removido da listagem. O histórico é preservado e pode ser recuperado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluir}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Leads;
