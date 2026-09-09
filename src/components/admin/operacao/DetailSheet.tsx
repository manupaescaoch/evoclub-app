import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ExternalLink, MessageCircle, PhoneCall, CalendarClock, CheckCircle2, UserCog, Search } from "lucide-react";
import { openWhatsApp } from "@/lib/whatsapp";
import { atribuirResponsavel, concluirPendencia } from "./actions";
import { fmtDate, fmtDateTime } from "./dates";
import type { OpRecord, Prioridade } from "./types";
import RegistrarContatoDialog from "./RegistrarContatoDialog";

type Colab = { id: string; full_name: string };

const PRIO: Record<Prioridade, { label: string; cls: string }> = {
  critico: { label: "Crítico", cls: "bg-red-50 text-red-700 border-red-200" },
  hoje: { label: "Hoje", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  programado: { label: "Programado", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  concluido: { label: "Concluído", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export default function DetailSheet({
  open, title, records, colaboradores, onClose, onChanged, onReagendar,
}: {
  open: boolean;
  title: string;
  records: OpRecord[];
  colaboradores: Colab[];
  onClose: () => void;
  onChanged: () => void;
  onReagendar?: (r: OpRecord) => void;
}) {
  const [busca, setBusca] = useState("");
  const [resp, setResp] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [unidade, setUnidade] = useState("todas");
  const [ordem, setOrdem] = useState<"prioridade" | "atraso">("prioridade");
  const [contato, setContato] = useState<OpRecord | null>(null);

  const responsaveis = useMemo(() => [...new Set(records.map((r) => r.responsavel))].sort(), [records]);
  const statuses = useMemo(() => [...new Set(records.map((r) => r.status))].sort(), [records]);
  const unidades = useMemo(() => [...new Set(records.map((r) => r.unidade))].sort(), [records]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const peso: Record<Prioridade, number> = { critico: 0, hoje: 1, programado: 2, concluido: 3 };
    return records
      .filter((r) => !q || r.nome.toLowerCase().includes(q) || (r.telefone || "").replace(/\D/g, "").includes(q.replace(/\D/g, "")))
      .filter((r) => resp === "todos" || r.responsavel === resp)
      .filter((r) => status === "todos" || r.status === status)
      .filter((r) => unidade === "todas" || r.unidade === unidade)
      .sort((a, b) =>
        ordem === "atraso"
          ? b.atrasoDias - a.atrasoDias
          : peso[a.prioridade] - peso[b.prioridade] || b.atrasoDias - a.atrasoDias,
      );
  }, [records, busca, resp, status, unidade, ordem]);

  const concluir = async (r: OpRecord) => {
    try {
      await concluirPendencia(r);
      toast.success("Pendência concluída.");
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível concluir.");
    }
  };

  const atribuir = async (r: OpRecord, id: string) => {
    try {
      await atribuirResponsavel({ record: r, collaboratorId: id, nome: colaboradores.find((c) => c.id === id)?.full_name || "" });
      toast.success("Responsável atribuído.");
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível atribuir.");
    }
  };

  const cadastroLink = (r: OpRecord) =>
    r.leadId ? `/admin/leads/${r.leadId}` : r.clientId ? `/admin/clientes?cliente=${r.clientId}` : null;

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-barlow text-left">{title} — {filtrados.length}</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou telefone"
                className="pl-9 h-9 font-dm"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Select value={resp} onValueChange={setResp}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os responsáveis</SelectItem>
                  {responsaveis.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {statuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={unidade} onValueChange={setUnidade}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Unidade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as unidades</SelectItem>
                  {unidades.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={ordem} onValueChange={(v) => setOrdem(v as any)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prioridade">Ordenar por prioridade</SelectItem>
                  <SelectItem value="atraso">Ordenar por atraso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 space-y-2 pb-8">
            {!filtrados.length ? (
              <p className="text-sm font-dm text-muted-foreground text-center py-10">
                Nenhum registro encontrado com os filtros atuais.
              </p>
            ) : filtrados.map((r) => (
              <div key={r.key} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-dm font-semibold text-sm truncate">{r.nome}</p>
                    <p className="text-[11px] font-dm text-muted-foreground">
                      {r.telefone || "sem telefone"} · {r.responsavel} · {r.unidade}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-dm font-bold px-2 py-0.5 rounded-full border ${PRIO[r.prioridade].cls}`}>
                    {PRIO[r.prioridade].label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[11px] font-dm text-muted-foreground">
                  <p>Motivo: <span className="text-foreground">{r.motivo}</span></p>
                  <p>Prevista: <span className="text-foreground">{fmtDate(r.dataPrevista)}</span></p>
                  <p>Atraso: <span className="text-foreground">{r.atrasoDias > 0 ? `${r.atrasoDias} dia(s)` : "em dia"}</span></p>
                  <p>Último contato: <span className="text-foreground">{r.ultimoContato ? fmtDateTime(r.ultimoContato) : "—"}</span></p>
                  <p className="col-span-2">Próxima ação: <span className="text-foreground">{r.proximaAcao}</span></p>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {cadastroLink(r) && (
                    <Link to={cadastroLink(r)!}>
                      <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1">
                        <ExternalLink size={12} /> Cadastro
                      </Button>
                    </Link>
                  )}
                  {r.telefone && (
                    <Button
                      size="sm" variant="outline" className="h-8 text-[11px] gap-1"
                      onClick={() => openWhatsApp(r.telefone!, `Olá, ${r.nome.split(" ")[0]}!`)}
                    >
                      <MessageCircle size={12} /> WhatsApp
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1" onClick={() => setContato(r)}>
                    <PhoneCall size={12} /> Registrar contato
                  </Button>
                  {r.leadId && r.expData && onReagendar && (
                    <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1" onClick={() => onReagendar(r)}>
                      <CalendarClock size={12} /> Reagendar
                    </Button>
                  )}
                  {(r.taskId || r.alertId || r.renewalId) && (
                    <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1" onClick={() => concluir(r)}>
                      <CheckCircle2 size={12} /> Concluir
                    </Button>
                  )}
                  {(r.taskId || r.renewalId || r.clientId) && (
                    <Select value="" onValueChange={(v) => atribuir(r, v)}>
                      <SelectTrigger className="h-8 w-[150px] text-[11px]">
                        <span className="inline-flex items-center gap-1"><UserCog size={12} /> Atribuir</span>
                      </SelectTrigger>
                      <SelectContent>
                        {colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <RegistrarContatoDialog
        record={contato}
        colaboradores={colaboradores}
        onClose={() => setContato(null)}
        onDone={onChanged}
      />
    </>
  );
}
