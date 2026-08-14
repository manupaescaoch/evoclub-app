import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { useAccess } from "@/contexts/AccessContext";
import PageShell, { SummaryCard, EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Copy, Send, Repeat, Trash2, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { logCreate, logDelete, logSensitive } from "@/lib/audit";

type Collab = { id: string; full_name: string; role_title: string | null; shift_start: string | null; shift_end: string | null };
type Shift = {
  id: string; unit_id: string | null; schedule_date: string; day_type: string; collaborator_id: string;
  role_title: string | null; start_time: string | null; end_time: string | null; break_minutes: number | null;
  supervisor_id: string | null; notes: string | null; status: string; published_at: string | null;
};
type Swap = {
  id: string; schedule_id: string; requester_id: string; target_id: string; reason: string | null;
  status: string; created_at: string; decision_note: string | null;
};

const DAY_TYPES = [
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
  { key: "feriado", label: "Feriado" },
];
const STATUS_CLASS: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-700",
  publicada: "bg-green-100 text-green-700",
  substituida: "bg-blue-100 text-blue-700",
  removida: "bg-red-100 text-red-700",
};
const SWAP_LABEL: Record<string, string> = {
  solicitada: "Aguardando colega", aceita: "Aguardando gestão", recusada: "Recusada pelo colega",
  aprovada: "Aprovada", rejeitada: "Rejeitada pela gestão", cancelada: "Cancelada",
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const dmy = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", weekday: "short" });
const dayTypeFor = (d: string) => {
  const w = new Date(`${d}T12:00:00`).getDay();
  return w === 6 ? "sabado" : w === 0 ? "domingo" : "feriado";
};

export default function Escala() {
  const { filterId, units } = useUnit();
  const { can, collaboratorId } = useAccess();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [rows, setRows] = useState<Shift[]>([]);
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState<Partial<Shift>>({});
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyFrom, setCopyFrom] = useState("");
  const [copyTo, setCopyTo] = useState("");
  const [swapOpen, setSwapOpen] = useState<Shift | null>(null);
  const [swapTarget, setSwapTarget] = useState("");
  const [swapReason, setSwapReason] = useState("");

  const canEdit = can("equipe", "edit");

  const range = useMemo(() => {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { from: iso(start), to: iso(end) };
  }, [month, year]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    let q = supabase.from("shift_schedules" as any).select("*")
      .gte("schedule_date", range.from).lte("schedule_date", range.to)
      .neq("status", "removida")
      .order("schedule_date");
    if (filterId) q = q.eq("unit_id", filterId);
    const [{ data, error: err }, { data: c }, { data: s }] = await Promise.all([
      q,
      supabase.from("collaborators").select("id, full_name, role_title, shift_start, shift_end").order("full_name"),
      supabase.from("shift_swap_requests" as any).select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (err) setError(err.message);
    setRows(((data as any[]) || []) as Shift[]);
    setCollabs(((c as any[]) || []) as Collab[]);
    setSwaps(((s as any[]) || []) as Swap[]);
    setLoading(false);
  }, [range, filterId]);
  useEffect(() => { load(); }, [load]);

  const name = (id: string | null) => collabs.find(c => c.id === id)?.full_name || "—";
  const stats = useMemo(() => ({
    total: rows.length,
    rascunhos: rows.filter(r => r.status === "rascunho").length,
    publicadas: rows.filter(r => r.status === "publicada").length,
    trocas: swaps.filter(s => ["solicitada", "aceita"].includes(s.status)).length,
  }), [rows, swaps]);

  const openNew = () => {
    const d = iso(today);
    setEditing(null);
    setForm({ unit_id: filterId || units[0]?.id || null, schedule_date: d, day_type: dayTypeFor(d), break_minutes: 0 });
    setOpen(true);
  };
  const openEdit = (s: Shift) => { setEditing(s); setForm(s); setOpen(true); };

  const save = async () => {
    if (!form.schedule_date || !form.collaborator_id) { toast.error("Data e colaborador são obrigatórios."); return; }
    const payload: any = {
      unit_id: form.unit_id || null, schedule_date: form.schedule_date,
      day_type: form.day_type || dayTypeFor(form.schedule_date),
      collaborator_id: form.collaborator_id, role_title: form.role_title || null,
      start_time: form.start_time || null, end_time: form.end_time || null,
      break_minutes: form.break_minutes ?? 0, supervisor_id: form.supervisor_id || null,
      notes: form.notes || null,
    };
    const res: any = editing
      ? await supabase.from("shift_schedules" as any).update(payload).eq("id", editing.id)
      : await supabase.from("shift_schedules" as any).insert(payload).select("id").maybeSingle();
    if (res.error) { toast.error(res.error.message); return; }
    if (editing) {
      logSensitive({
        entity: "shift_schedule", entity_id: editing.id, module: "equipe", unit_id: payload.unit_id,
        description: `Alterou a escala de ${dmy(payload.schedule_date)}`,
        before: editing as any, after: payload,
      });
    } else {
      logCreate("shift_schedule", res.data?.id, `Criou escala de ${dmy(payload.schedule_date)} para ${name(payload.collaborator_id)}`, payload, payload.unit_id, "equipe");
    }
    toast.success("Escala salva."); setOpen(false); setEditing(null); load();
  };

  const remove = async (s: Shift) => {
    if (!confirm("Remover esta escala?")) return;
    const { error: err } = await supabase.from("shift_schedules" as any).update({ status: "removida" }).eq("id", s.id);
    if (err) { toast.error(err.message); return; }
    logDelete("shift_schedule", s.id, `Removeu a escala de ${dmy(s.schedule_date)} de ${name(s.collaborator_id)}`, s as any, s.unit_id, "equipe");
    toast.success("Escala removida."); load();
  };

  const publish = async (ids: string[]) => {
    if (!ids.length) { toast.info("Nenhum rascunho para publicar."); return; }
    const { data, error: err } = await supabase.rpc("schedule_publish" as any, { _ids: ids });
    if (err) { toast.error(err.message); return; }
    const res = data as any;
    if (!res?.ok) { toast.error("Sem permissão para publicar."); return; }
    logSensitive({
      entity: "shift_schedule", entity_id: ids.join(","), module: "equipe",
      description: `Publicou ${res.published} escala(s) e notificou os colaboradores`,
      before: { status: "rascunho" }, after: { status: "publicada" },
    });
    toast.success(`${res.published} escala(s) publicada(s).`); load();
  };

  const copyPrevious = async () => {
    if (!copyFrom || !copyTo) { toast.error("Informe as duas datas."); return; }
    const { data, error: err } = await supabase.rpc("schedule_copy_previous" as any, {
      _unit_id: filterId, _from_date: copyFrom, _to_date: copyTo,
    });
    if (err) { toast.error(err.message); return; }
    const res = data as any;
    if (!res?.ok) { toast.error("Sem permissão para copiar escala."); return; }
    logCreate("shift_schedule", null, `Copiou a escala de ${dmy(copyFrom)} para ${dmy(copyTo)}`, res, filterId, "equipe");
    toast.success(`${res.created} escala(s) criada(s) como rascunho.`);
    setCopyOpen(false); load();
  };

  const repeatPattern = async (s: Shift) => {
    const next = new Date(`${s.schedule_date}T12:00:00`);
    next.setDate(next.getDate() + 7);
    const target = iso(next);
    const { error: err } = await supabase.from("shift_schedules" as any).insert({
      unit_id: s.unit_id, schedule_date: target, day_type: s.day_type, collaborator_id: s.collaborator_id,
      role_title: s.role_title, start_time: s.start_time, end_time: s.end_time,
      break_minutes: s.break_minutes, supervisor_id: s.supervisor_id, notes: s.notes,
    });
    if (err) { toast.error(err.message); return; }
    logCreate("shift_schedule", null, `Repetiu o padrão de escala para ${dmy(target)}`, { origem: s.schedule_date }, s.unit_id, "equipe");
    toast.success(`Padrão repetido em ${dmy(target)}.`); load();
  };

  const requestSwap = async () => {
    if (!swapOpen || !swapTarget) { toast.error("Escolha o colega."); return; }
    const { data, error: err } = await supabase.rpc("swap_request" as any, {
      _schedule_id: swapOpen.id, _target_id: swapTarget, _reason: swapReason || null,
    });
    if (err) { toast.error(err.message); return; }
    const res = data as any;
    if (!res?.ok) { toast.error("Não foi possível solicitar a troca."); return; }
    logCreate("shift_swap", res.id, `Solicitou troca de escala de ${dmy(swapOpen.schedule_date)} com ${name(swapTarget)}`, { reason: swapReason }, swapOpen.unit_id, "equipe");
    toast.success("Troca solicitada. O colaborador original segue escalado até a aprovação.");
    setSwapOpen(null); setSwapTarget(""); setSwapReason(""); load();
  };

  const respondSwap = async (s: Swap, accept: boolean) => {
    const { data, error: err } = await supabase.rpc("swap_respond" as any, { _id: s.id, _accept: accept });
    if (err) { toast.error(err.message); return; }
    if (!(data as any)?.ok) { toast.error("Sem permissão para responder."); return; }
    logSensitive({
      entity: "shift_swap", entity_id: s.id, module: "equipe",
      description: `${accept ? "Aceitou" : "Recusou"} a troca de escala`,
      before: { status: s.status }, after: { status: accept ? "aceita" : "recusada" },
    });
    toast.success(accept ? "Troca aceita, aguardando a gestão." : "Troca recusada."); load();
  };

  const decideSwap = async (s: Swap, approve: boolean) => {
    const { data, error: err } = await supabase.rpc("swap_decide" as any, { _id: s.id, _approve: approve, _note: null });
    if (err) { toast.error(err.message); return; }
    const res = data as any;
    if (!res?.ok) {
      toast.error(res?.reason === "aguardando_aceite" ? "O colega ainda não aceitou a troca." : "Sem permissão.");
      return;
    }
    logSensitive({
      entity: "shift_swap", entity_id: s.id, module: "equipe",
      description: `${approve ? "Aprovou" : "Rejeitou"} a troca de escala`,
      before: { status: "aceita" }, after: { status: approve ? "aprovada" : "rejeitada" },
    });
    toast.success(approve ? "Troca aprovada e escala atualizada." : "Troca rejeitada."); load();
  };

  const filters = (
    <>
      <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
        <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
        <SelectContent>{Array.from({ length: 12 }).map((_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{String(i + 1).padStart(2, "0")}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
        <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
        <SelectContent>{[year - 1, year, year + 1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
      </Select>
      {canEdit && (
        <>
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => setCopyOpen(true)}>
            <Copy size={14} /> Copiar escala
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-9"
            onClick={() => publish(rows.filter(r => r.status === "rascunho").map(r => r.id))}>
            <Send size={14} /> Publicar rascunhos
          </Button>
        </>
      )}
    </>
  );

  return (
    <PageShell
      title="Escala"
      description="Sábados, domingos e feriados. De segunda a sexta vale o turno fixo do perfil do colaborador."
      primaryAction={canEdit ? <Button className="gap-2" onClick={openNew}><Plus size={16} /> Nova escala</Button> : undefined}
      filters={filters}
      summary={
        <>
          <SummaryCard label="Escalas no mês" value={stats.total} />
          <SummaryCard label="Rascunhos" value={stats.rascunhos} accent="yellow" />
          <SummaryCard label="Publicadas" value={stats.publicadas} accent="green" />
          <SummaryCard label="Trocas pendentes" value={stats.trocas} accent="blue" />
        </>
      }
    >
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-dm text-red-700">
          Não foi possível carregar a escala: {error}
        </div>
      )}

      <Tabs defaultValue="escala">
        <TabsList>
          <TabsTrigger value="escala">Escala</TabsTrigger>
          <TabsTrigger value="trocas">Trocas</TabsTrigger>
        </TabsList>

        <TabsContent value="escala" className="mt-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loading ? <LoadingState /> : rows.length === 0 ? (
              <EmptyState message="Nenhuma escala neste mês. Use Nova escala ou copie uma escala anterior." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Colaborador</TableHead>
                    <TableHead>Função</TableHead><TableHead>Horário</TableHead><TableHead>Intervalo</TableHead>
                    <TableHead>Responsável do turno</TableHead><TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {rows.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="whitespace-nowrap font-medium">{dmy(s.schedule_date)}</TableCell>
                        <TableCell>{DAY_TYPES.find(d => d.key === s.day_type)?.label || s.day_type}</TableCell>
                        <TableCell>{name(s.collaborator_id)}</TableCell>
                        <TableCell className="text-muted-foreground">{s.role_title || "—"}</TableCell>
                        <TableCell>{s.start_time ? `${s.start_time.slice(0, 5)} – ${(s.end_time || "").slice(0, 5)}` : "—"}</TableCell>
                        <TableCell>{s.break_minutes ? `${s.break_minutes} min` : "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{s.supervisor_id ? name(s.supervisor_id) : "—"}</TableCell>
                        <TableCell><span className={`px-2 py-0.5 rounded-full text-[11px] ${STATUS_CLASS[s.status]}`}>{s.status}</span></TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {(canEdit || s.collaborator_id === collaboratorId) && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Solicitar troca"
                                onClick={() => setSwapOpen(s)}><ArrowLeftRight size={14} /></Button>
                            )}
                            {canEdit && (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>Editar</Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" title="Repetir padrão na semana seguinte"
                                  onClick={() => repeatPattern(s)}><Repeat size={14} /></Button>
                                {s.status === "rascunho" && (
                                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Publicar"
                                    onClick={() => publish([s.id])}><Send size={14} /></Button>
                                )}
                                <Button size="icon" variant="ghost" className="h-7 w-7" title="Remover"
                                  onClick={() => remove(s)}><Trash2 size={14} /></Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="trocas" className="mt-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loading ? <LoadingState /> : swaps.length === 0 ? (
              <EmptyState message="Nenhuma solicitação de troca." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Solicitada em</TableHead><TableHead>De</TableHead><TableHead>Para</TableHead>
                    <TableHead>Motivo</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Ações</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {swaps.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs whitespace-nowrap">{new Date(s.created_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>{name(s.requester_id)}</TableCell>
                        <TableCell>{name(s.target_id)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.reason || "—"}</TableCell>
                        <TableCell className="text-sm">{SWAP_LABEL[s.status] || s.status}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {s.status === "solicitada" && (s.target_id === collaboratorId || canEdit) && (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => respondSwap(s, true)}>Aceitar</Button>
                                <Button size="sm" variant="ghost" onClick={() => respondSwap(s, false)}>Recusar</Button>
                              </>
                            )}
                            {s.status === "aceita" && canEdit && (
                              <>
                                <Button size="sm" onClick={() => decideSwap(s, true)}>Aprovar</Button>
                                <Button size="sm" variant="ghost" onClick={() => decideSwap(s, false)}>Rejeitar</Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-dm mt-2">
            Fluxo: solicitação → aceite do colega → aprovação da gestão. Até a aprovação final, o responsável original continua oficialmente escalado.
          </p>
        </TabsContent>
      </Tabs>

      {/* Nova / editar escala */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar escala" : "Nova escala"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Unidade</Label>
              <Select value={form.unit_id || ""} onValueChange={v => setForm({ ...form, unit_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Data</Label>
              <Input type="date" value={form.schedule_date || ""}
                onChange={e => setForm({ ...form, schedule_date: e.target.value, day_type: dayTypeFor(e.target.value) })} />
            </div>
            <div><Label>Tipo de dia</Label>
              <Select value={form.day_type || "sabado"} onValueChange={v => setForm({ ...form, day_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DAY_TYPES.map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Colaborador</Label>
              <Select value={form.collaborator_id || ""} onValueChange={v => {
                const c = collabs.find(x => x.id === v);
                setForm({ ...form, collaborator_id: v, role_title: form.role_title || c?.role_title || null });
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{collabs.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Função</Label><Input value={form.role_title || ""} onChange={e => setForm({ ...form, role_title: e.target.value })} /></div>
            <div><Label>Responsável do turno</Label>
              <Select value={form.supervisor_id || ""} onValueChange={v => setForm({ ...form, supervisor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{collabs.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Entrada</Label><Input type="time" value={(form.start_time || "").slice(0, 5)} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
            <div><Label>Saída</Label><Input type="time" value={(form.end_time || "").slice(0, 5)} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
            <div><Label>Intervalo (minutos)</Label><Input type="number" min={0} value={form.break_minutes ?? 0} onChange={e => setForm({ ...form, break_minutes: Number(e.target.value) })} /></div>
            <div className="md:col-span-2"><Label>Observações</Label><Textarea rows={2} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar como rascunho</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copiar escala */}
      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Copiar escala anterior</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data de origem</Label><Input type="date" value={copyFrom} onChange={e => setCopyFrom(e.target.value)} /></div>
            <div><Label>Data de destino</Label><Input type="date" value={copyTo} onChange={e => setCopyTo(e.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground font-dm">As escalas são criadas como rascunho e só notificam ao publicar.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyOpen(false)}>Cancelar</Button>
            <Button onClick={copyPrevious}>Copiar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Troca */}
      <Dialog open={!!swapOpen} onOpenChange={o => !o && setSwapOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Solicitar troca de escala</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-dm text-muted-foreground">
              {swapOpen ? `${dmy(swapOpen.schedule_date)} · ${name(swapOpen.collaborator_id)}` : ""}
            </p>
            <div><Label>Trocar com</Label>
              <Select value={swapTarget} onValueChange={setSwapTarget}>
                <SelectTrigger><SelectValue placeholder="Selecione o colega" /></SelectTrigger>
                <SelectContent>
                  {collabs.filter(c => c.id !== swapOpen?.collaborator_id).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Motivo</Label><Textarea rows={3} value={swapReason} onChange={e => setSwapReason(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSwapOpen(null)}>Cancelar</Button>
            <Button onClick={requestSwap}>Solicitar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}