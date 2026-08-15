import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAccess } from "@/contexts/AccessContext";
import { AlertTriangle, ArrowLeftRight, Check, RefreshCw, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Shift = {
  id: string; unit_id: string | null; schedule_date: string; day_type: string; collaborator_id: string;
  start_time: string | null; end_time: string | null; status: string; notes: string | null;
};
type Swap = {
  id: string; schedule_id: string; requester_id: string; target_id: string; reason: string | null;
  status: string; created_at: string; decision_note: string | null;
};
type Collab = { id: string; full_name: string; role_title: string | null };

const SWAP_LABEL: Record<string, string> = {
  solicitada: "Aguardando colega", aceita: "Aguardando gestão", recusada: "Recusada pelo colega",
  aprovada: "Aprovada", rejeitada: "Rejeitada pela gestão", cancelada: "Cancelada",
};
const SWAP_STYLE: Record<string, string> = {
  solicitada: "bg-amber-50 text-amber-700", aceita: "bg-blue-50 text-blue-700",
  recusada: "bg-red-50 text-red-700", aprovada: "bg-green-50 text-green-700",
  rejeitada: "bg-red-50 text-red-700", cancelada: "bg-muted text-muted-foreground",
};
const DAY_LABEL: Record<string, string> = { sabado: "Sábado", domingo: "Domingo", feriado: "Feriado" };
const dmy = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", weekday: "short" });
const todayISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

export default function ProEscala() {
  const { collaboratorId } = useAccess();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState<Shift | null>(null);
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [s, sw, c] = await Promise.all([
      supabase.from("shift_schedules" as any).select("*")
        .gte("schedule_date", todayISO()).neq("status", "removida").order("schedule_date").limit(200),
      supabase.from("shift_swap_requests" as any).select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("collaborators").select("id, full_name, role_title").eq("status", "active").order("full_name"),
    ]);
    if (s.error || sw.error) setError((s.error || sw.error)!.message);
    setShifts(((s.data as any[]) || []) as Shift[]);
    setSwaps(((sw.data as any[]) || []) as Swap[]);
    setCollabs(((c.data as any[]) || []) as Collab[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const name = (id: string | null) => collabs.find(c => c.id === id)?.full_name || "—";
  const myShifts = useMemo(() => shifts.filter(s => s.collaborator_id === collaboratorId), [shifts, collaboratorId]);
  const mySwaps = useMemo(
    () => swaps.filter(s => s.requester_id === collaboratorId || s.target_id === collaboratorId),
    [swaps, collaboratorId],
  );
  const inbox = mySwaps.filter(s => s.target_id === collaboratorId && s.status === "solicitada");
  const shiftById = (id: string) => shifts.find(s => s.id === id);

  const request = async () => {
    if (!asking || !target) { toast.error("Escolha o colega que vai assumir."); return; }
    setSaving(true);
    const { data, error: err } = await supabase.rpc("swap_request" as any, {
      _schedule_id: asking.id, _target_id: target, _reason: reason || null,
    });
    setSaving(false);
    if (err) { toast.error(err.message); return; }
    const res = (data || {}) as { ok?: boolean; reason?: string };
    if (!res.ok) { toast.error(res.reason || "Não foi possível solicitar a troca."); return; }
    toast.success("Troca solicitada. Aguardando o colega aceitar.");
    setAsking(null); setTarget(""); setReason("");
    load();
  };

  const respond = async (s: Swap, accept: boolean) => {
    const { data, error: err } = await supabase.rpc("swap_respond" as any, { _id: s.id, _accept: accept });
    if (err) { toast.error(err.message); return; }
    const res = (data || {}) as { ok?: boolean; reason?: string };
    if (!res.ok) { toast.error(res.reason || "Não foi possível responder."); return; }
    toast.success(accept ? "Você aceitou. Agora depende da aprovação da gestão." : "Troca recusada.");
    load();
  };

  return (
    <div className="space-y-4">
      <h1 className="font-barlow font-bold text-xl">MINHA ESCALA</h1>

      {loading && <p className="py-10 text-center font-dm text-sm text-muted-foreground">Carregando escala...</p>}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-dm text-sm text-red-700">
          <p className="flex items-center gap-2"><AlertTriangle size={16} /> {error}</p>
          <button onClick={load} className="mt-3 h-10 w-full rounded-lg bg-white border border-red-200 font-semibold flex items-center justify-center gap-2">
            <RefreshCw size={14} /> Tentar de novo
          </button>
        </div>
      )}

      {!loading && !error && inbox.length > 0 && (
        <section className="space-y-2">
          <p className="font-barlow font-bold text-sm">PEDIDOS PRA VOCÊ</p>
          {inbox.map(s => {
            const sh = shiftById(s.schedule_id);
            return (
              <div key={s.id} className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <p className="font-dm text-sm font-semibold">
                  {name(s.requester_id)} pediu troca {sh ? `de ${dmy(sh.schedule_date)}` : ""}
                </p>
                {s.reason && <p className="font-dm text-xs text-muted-foreground mt-1">Motivo: {s.reason}</p>}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => respond(s, true)} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-dm font-bold flex items-center justify-center gap-1.5">
                    <Check size={16} /> Aceitar
                  </button>
                  <button onClick={() => respond(s, false)} className="flex-1 h-11 rounded-xl bg-card border border-border font-dm font-bold flex items-center justify-center gap-1.5">
                    <X size={16} /> Recusar
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {!loading && !error && (
        <section className="space-y-2">
          <p className="font-barlow font-bold text-sm">PRÓXIMOS PLANTÕES</p>
          {myShifts.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center font-dm text-sm text-muted-foreground">
              Nenhum plantão de fim de semana ou feriado na sua escala.
            </div>
          ) : myShifts.map(s => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <p className="font-barlow font-bold text-base">{dmy(s.schedule_date)}</p>
                <span className="font-dm text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {DAY_LABEL[s.day_type] || s.day_type}
                </span>
                <span className={`ml-auto font-dm text-[10px] px-2 py-0.5 rounded-full ${s.status === "publicada" ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"}`}>
                  {s.status === "publicada" ? "Publicada" : "Rascunho"}
                </span>
              </div>
              <p className="font-dm text-xs text-muted-foreground mt-1">
                {s.start_time?.slice(0, 5) || "—"} às {s.end_time?.slice(0, 5) || "—"}
                {s.notes ? ` · ${s.notes}` : ""}
              </p>
              <button onClick={() => { setAsking(s); setTarget(""); setReason(""); }}
                className="mt-3 w-full h-11 rounded-xl bg-card border border-primary text-primary font-dm font-bold flex items-center justify-center gap-1.5">
                <ArrowLeftRight size={16} /> Solicitar troca
              </button>
            </div>
          ))}
        </section>
      )}

      {!loading && !error && mySwaps.length > 0 && (
        <section className="space-y-2">
          <p className="font-barlow font-bold text-sm">MINHAS SOLICITAÇÕES</p>
          {mySwaps.map(s => {
            const sh = shiftById(s.schedule_id);
            return (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <p className="font-dm text-xs font-semibold flex-1">
                    {sh ? dmy(sh.schedule_date) : "Escala"} · {s.requester_id === collaboratorId ? `para ${name(s.target_id)}` : `de ${name(s.requester_id)}`}
                  </p>
                  <span className={`font-dm text-[10px] px-2 py-0.5 rounded-full ${SWAP_STYLE[s.status] || "bg-muted"}`}>
                    {SWAP_LABEL[s.status] || s.status}
                  </span>
                </div>
                {s.decision_note && <p className="font-dm text-[11px] text-muted-foreground mt-1">{s.decision_note}</p>}
              </div>
            );
          })}
        </section>
      )}

      <Dialog open={!!asking} onOpenChange={v => !v && setAsking(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-barlow">Solicitar troca de escala</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Quem assume o plantão" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {collabs.filter(c => c.id !== collaboratorId).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea rows={3} placeholder="Motivo (opcional)" value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <button onClick={request} disabled={saving}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-dm font-bold disabled:opacity-60">
              {saving ? "Enviando..." : "Enviar solicitação"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
