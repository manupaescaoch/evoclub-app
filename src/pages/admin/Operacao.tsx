import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UnitSelect } from "@/components/admin/ScopeSelectors";
import { useUnit } from "@/contexts/UnitContext";
import { toast } from "sonner";
import {
  AlertTriangle, CalendarClock, CheckCircle2, ChevronRight, ClipboardList, MessageCircle,
  Play, RefreshCw, Users, XCircle, PhoneCall,
} from "lucide-react";
import { openWhatsApp } from "@/lib/whatsapp";
import { useOperacao } from "@/components/admin/operacao/useOperacao";
import { brNow, isoDay, fmtDate, fmtDateTime } from "@/components/admin/operacao/dates";
import { cancelarExperimental, confirmarExperimental, iniciarTarefa, reagendarExperimental } from "@/components/admin/operacao/actions";
import DetailSheet from "@/components/admin/operacao/DetailSheet";
import ConcluirTarefaDialog from "@/components/admin/operacao/ConcluirTarefaDialog";
import type { Agendamento, ListKey, OpRecord, Tarefa } from "@/components/admin/operacao/types";

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

function MetricCard({
  label, value, hint, onClick, accent,
}: { label: string; value: string | number; hint?: string; onClick?: () => void; accent?: "red" | "orange" | "blue" | "green" }) {
  const ring = accent === "red" ? "text-red-600" : accent === "orange" ? "text-orange-600"
    : accent === "green" ? "text-emerald-600" : "text-primary";
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-2xl border border-border bg-card p-4 min-w-[150px] hover:border-primary/40 transition-colors"
    >
      <p className="text-[11px] font-dm text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`font-barlow text-3xl font-bold leading-none mt-1 ${ring}`}>{value}</p>
      {hint && <p className="text-[11px] font-dm text-muted-foreground mt-1">{hint}</p>}
    </button>
  );
}

function Donut({ value }: { value: number }) {
  return (
    <div
      className="h-14 w-14 rounded-full grid place-items-center shrink-0"
      style={{ background: `conic-gradient(hsl(var(--primary)) ${value * 3.6}deg, hsl(var(--muted)) 0deg)` }}
    >
      <div className="h-10 w-10 rounded-full bg-card grid place-items-center">
        <span className="font-barlow text-sm font-bold">{value}%</span>
      </div>
    </div>
  );
}

const ATENCAO: { key: ListKey; label: string; nivel: "critico" | "hoje" | "programado" }[] = [
  { key: "expAmanhaSemConfirmacao", label: "Experimentais de amanhã sem confirmação", nivel: "hoje" },
  { key: "followups", label: "Follow-ups vencidos ou aguardando contato", nivel: "critico" },
  { key: "ausentes", label: "Alunos ausentes que precisam de contato", nivel: "critico" },
  { key: "anamnesesPendentes", label: "Anamneses pendentes", nivel: "hoje" },
  { key: "tarefasAtrasadas", label: "Tarefas atrasadas", nivel: "critico" },
  { key: "renovacoesSemContato", label: "Renovações próximas sem contato", nivel: "hoje" },
  { key: "noShowSemReagendamento", label: "No-shows de experimental sem reagendamento", nivel: "critico" },
];

const NIVEL_CLS = {
  critico: "bg-red-50 text-red-700 border-red-200",
  hoje: "bg-orange-50 text-orange-700 border-orange-200",
  programado: "bg-blue-50 text-blue-700 border-blue-200",
  concluido: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function Operacao() {
  const { filterId, units } = useUnit();
  const [date, setDate] = useState(isoDay(brNow()));
  const op = useOperacao(date);

  const [detail, setDetail] = useState<{ title: string; records: OpRecord[] } | null>(null);
  const [concluir, setConcluir] = useState<Tarefa | null>(null);
  const [reagendar, setReagendar] = useState<{ leadId: string; unidadeId: string | null; data: string; nome: string } | null>(null);
  const [novaData, setNovaData] = useState("");
  const [novaHora, setNovaHora] = useState("");
  const [cancelar, setCancelar] = useState<Agendamento | null>(null);
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);

  const unidadeNome = filterId ? units.find((u) => u.id === filterId)?.name || "Unidade" : "Todas as unidades";
  const subtitulo = filterId
    ? "O que precisa acontecer hoje nesta unidade."
    : "Resultados consolidados de todas as unidades.";

  const l = op.lists;
  const compareceram = l.expRealizadas.length;
  const agendadasSemana = l.expSemana.length;
  const taxa = pct(compareceram, agendadasSemana);

  const abrir = (title: string, records: OpRecord[]) => setDetail({ title, records });

  const atencao = useMemo(
    () => ATENCAO.map((a) => ({ ...a, records: l[a.key] })).filter((a) => a.records.length > 0),
    [l],
  );

  const doConfirmar = async (a: Agendamento) => {
    setBusy(true);
    try {
      await confirmarExperimental({ leadId: a.leadId, unidadeId: a.unidadeId, data: a.data, hora: a.hora });
      toast.success("Presença confirmada.");
      op.reload();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível confirmar.");
    } finally { setBusy(false); }
  };

  const doReagendar = async () => {
    if (!reagendar || !novaData) { toast.error("Informe a nova data."); return; }
    setBusy(true);
    try {
      await reagendarExperimental({
        leadId: reagendar.leadId, unidadeId: reagendar.unidadeId,
        dataAnterior: reagendar.data, novaData, novaHora: novaHora || null,
      });
      toast.success("Agendamento reagendado.");
      setReagendar(null); setNovaData(""); setNovaHora("");
      op.reload();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível reagendar.");
    } finally { setBusy(false); }
  };

  const doCancelar = async () => {
    if (!cancelar || !motivo.trim()) { toast.error("O motivo do cancelamento é obrigatório."); return; }
    setBusy(true);
    try {
      await cancelarExperimental({ leadId: cancelar.leadId, unidadeId: cancelar.unidadeId, data: cancelar.data, motivo: motivo.trim() });
      toast.success("Agendamento cancelado.");
      setCancelar(null); setMotivo("");
      op.reload();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível cancelar.");
    } finally { setBusy(false); }
  };

  const doIniciar = async (t: Tarefa) => {
    try { await iniciarTarefa(t.id); op.reload(); }
    catch (e: any) { toast.error(e?.message || "Não foi possível iniciar."); }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-barlow text-2xl sm:text-3xl font-bold uppercase tracking-tight">Operação</h1>
          <p className="font-dm text-sm text-muted-foreground">{unidadeNome}</p>
          <p className="font-dm text-xs text-muted-foreground mt-0.5">{subtitulo}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-dm text-muted-foreground">
            {op.syncedAt ? `Sincronizado ${op.syncedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Sincronizando..."}
          </span>
          <Button variant="outline" size="sm" className="h-9 gap-1" onClick={op.reload} disabled={op.loading}>
            <RefreshCw size={14} className={op.loading ? "animate-spin" : ""} /> Sincronizar
          </Button>
          <UnitSelect />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-[150px]" />
        </div>
      </div>

      {op.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-dm text-red-700">
          Não foi possível carregar todos os dados: {op.error}
        </div>
      )}

      {/* indicadores */}
      {op.loading && !op.syncedAt ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-6 lg:overflow-visible">
          <MetricCard
            label="Follow-ups pendentes" value={l.followups.length} accent={op.followupsVencidos ? "red" : "blue"}
            hint={`${op.followupsVencidos} vencidos · ${op.followupsHoje} hoje`}
            onClick={() => abrir("Follow-ups pendentes", l.followups)}
          />
          <MetricCard
            label="Follow-up matriculados" value={l.followupsMatriculados.length}
            hint="Réguas de relacionamento" onClick={() => abrir("Follow-up de matriculados", l.followupsMatriculados)}
          />
          <MetricCard
            label="Follow-up do gerente" value={l.followupGerente.length}
            hint="Atribuídos à gerência" onClick={() => abrir("Follow-up do gerente", l.followupGerente)}
          />
          <MetricCard
            label="Não compareceram" value={l.ausentes.length} accent="orange"
            hint="Alunos ausentes há dias" onClick={() => abrir("Alunos ausentes", l.ausentes)}
          />
          <MetricCard
            label="Experimentais da semana" value={agendadasSemana}
            hint="Agendadas nesta semana" onClick={() => abrir("Experimentais da semana", l.expSemana)}
          />
          <button
            type="button"
            onClick={() => abrir("Experimentais realizadas", l.expRealizadas)}
            className="text-left rounded-2xl border border-border bg-card p-4 min-w-[190px] flex items-center gap-3 hover:border-primary/40 transition-colors"
          >
            <Donut value={taxa} />
            <div>
              <p className="text-[11px] font-dm text-muted-foreground uppercase tracking-wide">Comparecimento</p>
              <p className="font-barlow text-xl font-bold leading-none mt-1">{compareceram} de {agendadasSemana}</p>
              <p className="text-[11px] font-dm text-muted-foreground mt-0.5">realizadas ÷ agendadas</p>
            </div>
          </button>
        </div>
      )}

      {/* atenção */}
      <Card className="p-4 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-orange-600" />
          <h2 className="font-barlow text-lg font-bold uppercase tracking-tight">Atenção</h2>
        </div>
        {op.loading && !op.syncedAt ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
        ) : !atencao.length ? (
          <p className="font-dm text-sm text-muted-foreground py-6 text-center">Nenhuma pendência crítica nesta unidade. Tudo em dia.</p>
        ) : (
          <div className="divide-y divide-border">
            {atencao
              .sort((a, b) => (a.nivel === b.nivel ? b.records[0].atrasoDias - a.records[0].atrasoDias : a.nivel === "critico" ? -1 : 1))
              .map((a) => (
                <button
                  key={a.key}
                  onClick={() => abrir(a.label, a.records)}
                  className="w-full flex items-center gap-3 py-3 text-left hover:bg-muted/40 rounded-lg px-1 transition-colors"
                >
                  <span className={`font-barlow text-xl font-bold w-10 text-center rounded-lg border ${NIVEL_CLS[a.nivel]}`}>
                    {a.records.length}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-dm text-sm truncate">{a.label}</span>
                    <span className="block text-[11px] font-dm text-muted-foreground">
                      {a.nivel === "critico" ? "Atrasado ou crítico" : "Exige atenção hoje"}
                      {a.records[0].atrasoDias > 0 ? ` · maior atraso ${a.records[0].atrasoDias} dia(s)` : ""}
                    </span>
                  </span>
                  <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                </button>
              ))}
          </div>
        )}
      </Card>

      {/* controle do dia */}
      <div>
        <h2 className="font-barlow text-lg font-bold uppercase tracking-tight mb-3">Controle do dia</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* eventos */}
          <Card className="p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList size={15} className="text-primary" />
              <h3 className="font-dm text-sm font-semibold">Eventos de {fmtDate(date)}</h3>
            </div>
            {!op.eventos.length ? (
              <p className="font-dm text-sm text-muted-foreground py-6 text-center">Nenhum evento agendado para hoje.</p>
            ) : (
              <div className="space-y-2">
                {op.eventos.map((e) => (
                  <div key={e.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-dm text-sm font-semibold truncate">{e.titulo}</p>
                      <span className="text-[11px] font-barlow font-bold">{e.hora || "—"}</span>
                    </div>
                    <p className="text-[11px] font-dm text-muted-foreground">
                      {e.responsavel} · {e.categoria} · {e.status}{!filterId ? ` · ${e.unidade}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* agendamentos de amanhã */}
          <Card className="p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock size={15} className="text-primary" />
              <h3 className="font-dm text-sm font-semibold">Agendamentos para amanhã</h3>
            </div>
            {!op.agendamentos.length ? (
              <p className="font-dm text-sm text-muted-foreground py-6 text-center">Nenhum agendamento para amanhã.</p>
            ) : (
              <div className="space-y-2">
                {op.agendamentos.map((a) => (
                  <div key={`${a.leadId}-${a.data}`} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-dm text-sm font-semibold truncate">{a.nome}</p>
                        <p className="text-[11px] font-dm text-muted-foreground">
                          {a.hora || "sem horário"} · {a.tipo} · {a.responsavel}{!filterId ? ` · ${a.unidade}` : ""}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-dm font-bold px-2 py-0.5 rounded-full border ${
                        a.cancelado ? NIVEL_CLS.critico : a.confirmado ? NIVEL_CLS.concluido : NIVEL_CLS.hoje}`}>
                        {a.cancelado ? "Cancelado" : a.confirmado ? "Confirmado" : "Aguardando"}
                      </span>
                    </div>
                    <p className="text-[11px] font-dm text-muted-foreground mt-1">
                      Anamnese: {a.anamnese === "respondida" ? "respondida" : a.anamnese === "pendente" ? "pendente" : "não enviada"}
                      {" · "}Lembrete: {a.lembrete ? "enviado" : "não enviado"}
                      {a.confirmadoEm ? ` · confirmado em ${fmtDateTime(a.confirmadoEm)}` : ""}
                    </p>
                    {a.observacoes && <p className="text-[11px] font-dm text-muted-foreground mt-1 line-clamp-2">{a.observacoes}</p>}
                    {a.motivoCancelamento && <p className="text-[11px] font-dm text-red-600 mt-1">Motivo: {a.motivoCancelamento}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {!a.confirmado && !a.cancelado && (
                        <Button size="sm" className="h-8 text-[11px] gap-1" disabled={busy} onClick={() => doConfirmar(a)}>
                          <CheckCircle2 size={12} /> Confirmar
                        </Button>
                      )}
                      {a.telefone && (
                        <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1"
                          onClick={() => openWhatsApp(a.telefone!, `Olá, ${a.nome.split(" ")[0]}! Confirmando sua aula experimental${a.hora ? ` às ${a.hora}` : ""}.`)}>
                          <MessageCircle size={12} /> WhatsApp
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1"
                        onClick={() => { setReagendar({ leadId: a.leadId, unidadeId: a.unidadeId, data: a.data, nome: a.nome }); setNovaData(a.data); setNovaHora(a.hora || ""); }}>
                        <CalendarClock size={12} /> Reagendar
                      </Button>
                      {!a.cancelado && (
                        <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1" onClick={() => setCancelar(a)}>
                          <XCircle size={12} /> Cancelar
                        </Button>
                      )}
                      <a href={`/admin/leads/${a.leadId}`}>
                        <Button size="sm" variant="ghost" className="h-8 text-[11px] gap-1"><Users size={12} /> Cadastro</Button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* tarefas do dia */}
          <Card className="p-4 rounded-2xl">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <PhoneCall size={15} className="text-primary" />
                <h3 className="font-dm text-sm font-semibold">Tarefas do dia</h3>
              </div>
              <span className="text-[11px] font-dm text-muted-foreground">
                {op.atividades.concluidas}/{op.atividades.previstas} · {op.atividades.pct}%
              </span>
            </div>
            {!op.tarefas.length ? (
              <p className="font-dm text-sm text-muted-foreground py-6 text-center">Nenhuma tarefa para este dia.</p>
            ) : (
              <div className="space-y-2">
                {op.tarefas.map((t) => (
                  <div key={t.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-dm text-sm font-semibold truncate">{t.titulo}</p>
                        <p className="text-[11px] font-dm text-muted-foreground">
                          {t.hora || "sem horário"} · {t.responsavel} · {t.setor}{!filterId ? ` · ${t.unidade}` : ""}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-dm font-bold px-2 py-0.5 rounded-full border ${
                        t.status === "concluida" ? NIVEL_CLS.concluido
                          : t.status === "atrasada" ? NIVEL_CLS.critico
                          : t.status === "em_andamento" ? NIVEL_CLS.programado : NIVEL_CLS.hoje}`}>
                        {t.status === "em_andamento" ? "Em andamento" : t.status === "nao_realizada" ? "Não realizada" : t.status}
                      </span>
                    </div>
                    {t.status !== "concluida" && t.status !== "nao_realizada" && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {t.status !== "em_andamento" && (
                          <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1" onClick={() => doIniciar(t)}>
                            <Play size={12} /> Iniciar
                          </Button>
                        )}
                        <Button size="sm" className="h-8 text-[11px] gap-1" onClick={() => setConcluir(t)}>
                          <CheckCircle2 size={12} /> Concluir
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <DetailSheet
        open={!!detail}
        title={detail?.title || ""}
        records={detail?.records || []}
        colaboradores={op.colaboradores}
        onClose={() => setDetail(null)}
        onChanged={op.reload}
        onReagendar={(r) => {
          if (!r.leadId || !r.expData) return;
          setReagendar({ leadId: r.leadId, unidadeId: r.unidadeId, data: r.expData, nome: r.nome });
          setNovaData(r.expData); setNovaHora(r.expHora || "");
        }}
      />

      <ConcluirTarefaDialog tarefa={concluir} onClose={() => setConcluir(null)} onDone={op.reload} />

      <Dialog open={!!reagendar} onOpenChange={(o) => !o && setReagendar(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-barlow">Reagendar — {reagendar?.nome}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-muted-foreground">Nova data</Label>
              <Input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Novo horário</Label>
              <Input type="time" value={novaHora} onChange={(e) => setNovaHora(e.target.value)} className="h-9 mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReagendar(null)}>Voltar</Button>
            <Button onClick={doReagendar} disabled={busy}>Reagendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelar} onOpenChange={(o) => !o && setCancelar(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-barlow">Cancelar — {cancelar?.nome}</DialogTitle></DialogHeader>
          <div>
            <Label className="text-[11px] text-muted-foreground">Motivo do cancelamento (obrigatório)</Label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} className="mt-1 font-dm" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelar(null)}>Voltar</Button>
            <Button variant="destructive" onClick={doCancelar} disabled={busy}>Cancelar agendamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
