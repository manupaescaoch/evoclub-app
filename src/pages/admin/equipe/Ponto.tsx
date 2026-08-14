import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { useAccess } from "@/contexts/AccessContext";
import PageShell, { SummaryCard, EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Camera, MapPin, Clock, AlertTriangle, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { logSensitive } from "@/lib/audit";

type Row = {
  id: string; collaborator_id: string; collaborator_name: string; unit_id: string | null; unit_name: string | null;
  entry_date: string; kind: string; recorded_at: string; expected_start: string | null; expected_end: string | null;
  latitude: number | null; longitude: number | null; distance_m: number | null; radius_m: number | null;
  within_radius: boolean; photo_url: string | null; device: string | null; status: string;
  request_reason: string | null; adjust_reason: string | null; adjusted_at: string | null;
};

const KINDS: { key: string; label: string }[] = [
  { key: "entrada", label: "Entrada" },
  { key: "intervalo", label: "Intervalo" },
  { key: "retorno", label: "Retorno" },
  { key: "saida", label: "Saída" },
];

const STATUS_LABEL: Record<string, string> = {
  valido: "Válido", ajuste_solicitado: "Ajuste solicitado", ajustado: "Ajustado", recusado: "Recusado",
};
const STATUS_CLASS: Record<string, string> = {
  valido: "bg-green-100 text-green-700",
  ajuste_solicitado: "bg-amber-100 text-amber-700",
  ajustado: "bg-blue-100 text-blue-700",
  recusado: "bg-red-100 text-red-700",
};

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dmy = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR");

function deviceLabel() {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  const mobile = /Mobi|Android|iPhone|iPad/i.test(ua);
  return `${mobile ? "Mobile" : "Desktop"} · ${(navigator as any).platform || "web"}`;
}

/* ---------------- Meu ponto ---------------- */
function MeuPonto({ onDone }: { onDone: () => void }) {
  const { collaboratorId } = useAccess();
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState("entrada");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [outInfo, setOutInfo] = useState<{ distance_m: number; radius_m: number } | null>(null);
  const [today, setToday] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const loadToday = useCallback(async () => {
    if (!collaboratorId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("time_entries" as any)
      .select("*").eq("collaborator_id", collaboratorId)
      .order("recorded_at", { ascending: true }).limit(50);
    const iso = new Date().toISOString().slice(0, 10);
    setToday(((data as any[]) || []).filter(r => String(r.entry_date) === iso) as Row[]);
    setLoading(false);
  }, [collaboratorId]);
  useEffect(() => { loadToday(); }, [loadToday]);

  const askLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) { setGeoError("Dispositivo sem geolocalização."); return; }
    navigator.geolocation.getCurrentPosition(
      p => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      e => setGeoError(e.message || "Não foi possível obter a localização."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  useEffect(() => { askLocation(); }, []);

  const pick = (f: File | null) => {
    setPhoto(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const upload = async () => {
    if (!photo || !collaboratorId) return null;
    const path = `${collaboratorId}/${Date.now()}-${kind}.jpg`;
    const { error } = await supabase.storage.from("timeclock").upload(path, photo, { contentType: photo.type || "image/jpeg" });
    if (error) { toast.error(`Falha ao enviar a foto: ${error.message}`); return null; }
    return path;
  };

  const punch = async (withReason?: string) => {
    if (!collaboratorId) { toast.error("Seu login não está vinculado a um colaborador."); return; }
    if (!photo) { toast.error("A foto é obrigatória."); return; }
    if (!coords) { toast.error("A localização é obrigatória."); return; }
    setBusy(true);
    const path = await upload();
    if (!path) { setBusy(false); return; }
    const { data, error } = await supabase.rpc("punch_clock" as any, {
      _kind: kind, _latitude: coords.lat, _longitude: coords.lng,
      _photo_url: path, _device: deviceLabel(), _unit_id: null, _reason: withReason ?? null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const res = data as any;
    if (!res?.ok) {
      if (res?.reason === "fora_do_raio") {
        setOutInfo({ distance_m: res.distance_m, radius_m: res.radius_m });
        setReasonOpen(true);
        return;
      }
      toast.error(res?.reason === "sem_colaborador" ? "Login sem colaborador vinculado." : "Não foi possível registrar o ponto.");
      return;
    }
    if (res.status === "ajuste_solicitado") toast.success("Ajuste solicitado. A gestão vai avaliar.");
    else toast.success(`${KINDS.find(k => k.key === kind)?.label} registrada às ${hhmm(new Date().toISOString())}`);
    setReasonOpen(false); setReason(""); setOutInfo(null); pick(null);
    if (fileRef.current) fileRef.current.value = "";
    loadToday(); onDone();
  };

  if (!collaboratorId) {
    return <EmptyState message="Seu login não está vinculado a um colaborador, então não é possível registrar ponto." />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="font-barlow font-bold text-lg">Registrar ponto</p>

        <div className="grid grid-cols-4 gap-2">
          {KINDS.map(k => (
            <button key={k.key} onClick={() => setKind(k.key)}
              className={`rounded-lg border px-2 py-2 text-xs font-dm transition-colors ${kind === k.key ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border hover:border-primary/50"}`}>
              {k.label}
            </button>
          ))}
        </div>

        <div>
          <Label className="text-xs">Foto obrigatória</Label>
          <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden"
            onChange={e => pick(e.target.files?.[0] ?? null)} />
          <div className="flex items-center gap-3 mt-1.5">
            <Button type="button" variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
              <Camera size={16} /> {photo ? "Trocar foto" : "Tirar foto"}
            </Button>
            {preview && <img src={preview} alt="Foto do ponto" className="h-14 w-14 rounded-lg object-cover border border-border" />}
          </div>
        </div>

        <div className="rounded-lg border border-border p-3 text-sm font-dm">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-primary" />
            {coords ? <span>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span> : <span className="text-muted-foreground">Localização não obtida</span>}
            <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={askLocation}>Atualizar</Button>
          </div>
          {geoError && <p className="text-xs text-red-600 mt-1">{geoError}</p>}
        </div>

        <Button className="w-full" disabled={busy || !photo || !coords} onClick={() => punch()}>
          {busy ? "Registrando..." : "Registrar ponto"}
        </Button>
        <p className="text-xs text-muted-foreground font-dm">
          Fora do raio da unidade o ponto não é validado automaticamente — você poderá solicitar ajuste com motivo.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Clock size={15} className="text-primary" />
          <p className="font-barlow font-bold text-base">Meus registros de hoje</p>
        </div>
        {loading ? <LoadingState /> : today.length === 0 ? <EmptyState message="Nenhum ponto registrado hoje." /> : (
          <ul className="divide-y divide-border">
            {today.map(r => (
              <li key={r.id} className="px-4 py-3 flex items-center gap-3 text-sm font-dm">
                <span className="font-semibold w-20">{KINDS.find(k => k.key === r.kind)?.label || r.kind}</span>
                <span>{hhmm(r.recorded_at)}</span>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-[11px] ${STATUS_CLASS[r.status]}`}>{STATUS_LABEL[r.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={reasonOpen} onOpenChange={setReasonOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fora do raio permitido</DialogTitle></DialogHeader>
          <p className="text-sm font-dm text-muted-foreground">
            {outInfo ? `Você está a ${outInfo.distance_m}m da unidade e o raio permitido é de ${outInfo.radius_m}m.` : ""}
            {" "}O ponto não será validado automaticamente. Descreva o motivo para solicitar ajuste.
          </p>
          <div><Label>Motivo</Label><Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonOpen(false)}>Cancelar</Button>
            <Button disabled={reason.trim().length < 3 || busy} onClick={() => punch(reason.trim())}>Solicitar ajuste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Gestão ---------------- */
function GestaoPonto() {
  const { filterId } = useUnit();
  const { from, to, label } = usePeriod();
  const { can } = useAccess();
  const [rows, setRows] = useState<Row[]>([]);
  const [collabs, setCollabs] = useState<{ id: string; full_name: string }[]>([]);
  const [collab, setCollab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [edit, setEdit] = useState<Row | null>(null);
  const [editAt, setEditAt] = useState("");
  const [editKind, setEditKind] = useState("entrada");
  const [editReason, setEditReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [{ data, error: err }, { data: c }] = await Promise.all([
      supabase.rpc("timeclock_report" as any, {
        _unit_id: filterId, _from: from, _to: to, _collaborator_id: collab === "all" ? null : collab,
      }),
      supabase.from("collaborators").select("id, full_name").order("full_name"),
    ]);
    if (err) setError(err.message);
    setRows(((data as any[]) || []) as Row[]);
    setCollabs((c as any[]) || []);
    setLoading(false);
  }, [filterId, from, to, collab]);
  useEffect(() => { load(); }, [load]);

  const list = useMemo(
    () => statusFilter === "all" ? rows : rows.filter(r => r.status === statusFilter),
    [rows, statusFilter],
  );
  const stats = useMemo(() => ({
    total: rows.length,
    fora: rows.filter(r => !r.within_radius).length,
    pendentes: rows.filter(r => r.status === "ajuste_solicitado").length,
    ajustados: rows.filter(r => r.status === "ajustado").length,
  }), [rows]);

  const openPhoto = async (path: string | null) => {
    if (!path) return;
    const { data, error: err } = await supabase.storage.from("timeclock").createSignedUrl(path, 120);
    if (err || !data) { toast.error("Não foi possível abrir a foto."); return; }
    setPhoto(data.signedUrl);
  };

  const openEdit = (r: Row) => {
    setEdit(r); setEditKind(r.kind); setEditReason("");
    const d = new Date(r.recorded_at);
    const pad = (n: number) => String(n).padStart(2, "0");
    setEditAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  const saveAdjust = async (approve: boolean) => {
    if (!edit) return;
    if (editReason.trim().length < 3) { toast.error("O motivo é obrigatório."); return; }
    const { data, error: err } = await supabase.rpc("time_entry_adjust" as any, {
      _id: edit.id, _recorded_at: new Date(editAt).toISOString(), _kind: editKind,
      _reason: editReason.trim(), _approve: approve,
    });
    if (err) { toast.error(err.message); return; }
    const res = data as any;
    if (!res?.ok) {
      toast.error(res?.reason === "motivo_obrigatorio" ? "O motivo é obrigatório." : "Não foi possível ajustar o registro.");
      return;
    }
    logSensitive({
      entity: "time_entry", entity_id: edit.id, module: "equipe",
      description: `${approve ? "Ajustou" : "Recusou"} o ponto de ${edit.collaborator_name}`,
      unit_id: edit.unit_id, before: res.before, after: res.after,
      metadata: { reason: editReason.trim() },
    });
    toast.success(approve ? "Registro ajustado." : "Ajuste recusado.");
    setEdit(null); load();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label={`Registros (${label})`} value={stats.total} />
        <SummaryCard label="Fora do raio" value={stats.fora} accent="red" />
        <SummaryCard label="Ajustes pendentes" value={stats.pendentes} accent="yellow" />
        <SummaryCard label="Ajustados" value={stats.ajustados} accent="blue" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={collab} onValueChange={setCollab}>
          <SelectTrigger className="h-9 w-[200px]"><SelectValue placeholder="Colaborador" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os colaboradores</SelectItem>
            {collabs.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-dm text-red-700">
          Não foi possível carregar o ponto: {error}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? <LoadingState /> : list.length === 0 ? <EmptyState message="Nenhum registro de ponto no período." /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Colaborador</TableHead><TableHead>Marcação</TableHead>
                <TableHead>Previsto</TableHead><TableHead>Realizado</TableHead><TableHead>Localização</TableHead>
                <TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {list.map(r => (
                  <TableRow key={r.id} className={!r.within_radius ? "bg-red-50/40" : ""}>
                    <TableCell className="whitespace-nowrap">{dmy(r.entry_date)}</TableCell>
                    <TableCell className="font-medium">{r.collaborator_name}
                      <div className="text-xs text-muted-foreground">{r.unit_name || "—"}</div>
                    </TableCell>
                    <TableCell>{KINDS.find(k => k.key === r.kind)?.label || r.kind}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.expected_start ? `${r.expected_start.slice(0, 5)}–${(r.expected_end || "").slice(0, 5)}` : "—"}
                    </TableCell>
                    <TableCell>{hhmm(r.recorded_at)}</TableCell>
                    <TableCell className="text-xs">
                      {r.distance_m != null ? (
                        <span className={r.within_radius ? "text-green-700" : "text-red-700"}>
                          {Math.round(Number(r.distance_m))}m / raio {r.radius_m}m
                        </span>
                      ) : <span className="text-muted-foreground">sem referência</span>}
                      {!r.within_radius && (
                        <div className="flex items-center gap-1 text-red-700 mt-0.5">
                          <AlertTriangle size={11} /> divergência
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${STATUS_CLASS[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                      {r.request_reason && <div className="text-[11px] text-muted-foreground mt-0.5">{r.request_reason}</div>}
                      {r.adjust_reason && <div className="text-[11px] text-muted-foreground mt-0.5">Ajuste: {r.adjust_reason}</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Ver foto"
                          disabled={!r.photo_url} onClick={() => openPhoto(r.photo_url)}>
                          <ImageIcon size={14} />
                        </Button>
                        {can("equipe", "edit") && (
                          <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Ajustar</Button>
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

      <Dialog open={!!photo} onOpenChange={o => !o && setPhoto(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Foto do ponto</DialogTitle></DialogHeader>
          {photo && <img src={photo} alt="Foto do registro de ponto" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!edit} onOpenChange={o => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajuste manual de ponto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Data e hora</Label><Input type="datetime-local" value={editAt} onChange={e => setEditAt(e.target.value)} /></div>
            <div><Label>Marcação</Label>
              <Select value={editKind} onValueChange={setEditKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KINDS.map(k => <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Motivo (obrigatório)</Label><Textarea rows={3} value={editReason} onChange={e => setEditReason(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground font-dm">
              O ajuste registra responsável, data e hora e o antes/depois na auditoria.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => saveAdjust(false)}>Recusar</Button>
            <Button onClick={() => saveAdjust(true)}>Aprovar ajuste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Ponto() {
  const { can } = useAccess();
  const [tab, setTab] = useState("meu");
  const [seed, setSeed] = useState(0);

  return (
    <PageShell
      title="Ponto e Jornada"
      description="Registro com foto e geolocalização, validação pelo raio da unidade e gestão de divergências."
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="meu">Meu ponto</TabsTrigger>
          {can("equipe", "view") && <TabsTrigger value="gestao">Gestão</TabsTrigger>}
        </TabsList>
        <TabsContent value="meu" className="mt-4">
          <MeuPonto onDone={() => setSeed(s => s + 1)} />
        </TabsContent>
        {can("equipe", "view") && (
          <TabsContent value="gestao" className="mt-4">
            <GestaoPonto key={seed} />
          </TabsContent>
        )}
      </Tabs>
    </PageShell>
  );
}