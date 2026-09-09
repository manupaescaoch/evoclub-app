import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Save, Trash2, Copy, DoorOpen, RefreshCw } from "lucide-react";
import { useUnit } from "@/contexts/UnitContext";

type Device = {
  id: string;
  unit_id: string | null;
  name: string;
  vendor: string;
  model: string | null;
  endpoint: string | null;
  agent_key: string;
  active: boolean;
  last_seen_at: string | null;
};

type AccessEvent = {
  id: string;
  identifier: string | null;
  direction: string;
  allowed: boolean;
  reason: string | null;
  event_at: string;
  client_id: number | null;
};

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/catraca-agent`;

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";

export default function CatracaTab() {
  const { units } = useUnit();
  const [devices, setDevices] = useState<Device[]>([]);
  const [events, setEvents] = useState<AccessEvent[]>([]);
  const [names, setNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [d, e] = await Promise.all([
      supabase.from("turnstile_devices").select("*").order("created_at"),
      supabase.from("turnstile_access_events").select("id,identifier,direction,allowed,reason,event_at,client_id").order("event_at", { ascending: false }).limit(30),
    ]);
    setLoading(false);
    if (d.error) return toast.error(d.error.message);
    setDevices((d.data as Device[]) || []);
    const evs = (e.data as AccessEvent[]) || [];
    setEvents(evs);
    const ids = [...new Set(evs.map(x => x.client_id).filter(Boolean))] as number[];
    if (ids.length) {
      const { data } = await supabase.from("clients").select("id,name").in("id", ids);
      setNames(Object.fromEntries((data || []).map(c => [c.id as number, c.name as string])));
    }
  };

  useEffect(() => { load(); }, []);

  const addDevice = async () => {
    setSaving(true);
    const { error } = await supabase.from("turnstile_devices").insert({
      name: "Catraca da entrada",
      vendor: "Relsystem",
      unit_id: units[0]?.id ?? null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Catraca cadastrada");
    load();
  };

  const saveDevice = async (d: Device) => {
    setSaving(true);
    const { error } = await supabase.from("turnstile_devices").update({
      name: d.name, vendor: d.vendor, model: d.model, endpoint: d.endpoint,
      unit_id: d.unit_id, active: d.active,
    }).eq("id", d.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
  };

  const removeDevice = async (id: string) => {
    const { error } = await supabase.from("turnstile_devices").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setDevices(v => v.filter(d => d.id !== id));
    toast.success("Catraca removida");
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  const patch = (id: string, p: Partial<Device>) =>
    setDevices(v => v.map(d => (d.id === id ? { ...d, ...p } : d)));

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl card-shadow p-5 space-y-2">
        <div className="flex items-center gap-2">
          <DoorOpen size={16} className="text-primary" />
          <p className="font-barlow font-bold text-base">Catraca / controle de acesso</p>
        </div>
        <p className="text-xs text-muted-foreground font-dm">
          A catraca fica na rede local da academia. Um computador ligado 24h na unidade roda o agente local, que busca aqui a lista de alunos liberados
          e envia de volta cada entrada registrada. Cadastre a catraca abaixo e informe ao instalador o endereço de conexão e a chave do agente.
        </p>
        <div className="rounded-lg bg-muted/50 p-3 space-y-1">
          <p className="text-[11px] font-dm text-muted-foreground">Endereço de conexão do agente</p>
          <div className="flex items-center gap-2">
            <code className="text-[11px] break-all font-mono">{FN_URL}</code>
            <Button size="sm" variant="outline" onClick={() => copy(FN_URL, "Endereço")}><Copy size={12} /></Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="font-barlow font-bold text-base">Catracas cadastradas</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} className="gap-1.5"><RefreshCw size={14} /> Atualizar</Button>
          <Button size="sm" onClick={addDevice} disabled={saving} className="gap-1.5"><Plus size={14} /> Nova catraca</Button>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground font-dm">Carregando…</p>}
      {!loading && !devices.length && (
        <div className="bg-card rounded-xl card-shadow p-6 text-center">
          <p className="text-sm font-dm text-muted-foreground">Nenhuma catraca cadastrada ainda.</p>
        </div>
      )}

      {devices.map(d => (
        <div key={d.id} className="bg-card rounded-xl card-shadow p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-dm text-muted-foreground">Nome</Label>
              <Input value={d.name} onChange={e => patch(d.id, { name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-dm text-muted-foreground">Unidade</Label>
              <select value={d.unit_id ?? ""} onChange={e => patch(d.id, { unit_id: e.target.value || null })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Todas</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-dm text-muted-foreground">Fabricante</Label>
              <Input value={d.vendor} onChange={e => patch(d.id, { vendor: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-dm text-muted-foreground">Modelo</Label>
              <Input value={d.model ?? ""} onChange={e => patch(d.id, { model: e.target.value })} placeholder="Facial meia altura" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-dm text-muted-foreground">Endereço na rede local (IP:porta)</Label>
              <Input value={d.endpoint ?? ""} onChange={e => patch(d.id, { endpoint: e.target.value })} placeholder="192.168.0.10:8080" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-dm text-muted-foreground">Chave do agente</Label>
              <div className="flex gap-2">
                <Input value={d.agent_key} readOnly className="font-mono text-xs" />
                <Button variant="outline" onClick={() => copy(d.agent_key, "Chave")}><Copy size={14} /></Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex items-center gap-3">
              <Switch checked={d.active} onCheckedChange={v => patch(d.id, { active: v })} />
              <span className="text-sm font-dm">{d.active ? "Ativa" : "Desativada"}</span>
              <span className="text-xs text-muted-foreground font-dm">Último contato: {fmt(d.last_seen_at)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => removeDevice(d.id)} className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50">
                <Trash2 size={14} /> Remover
              </Button>
              <Button disabled={saving} onClick={() => saveDevice(d)} className="gap-1.5"><Save size={14} /> Salvar</Button>
            </div>
          </div>
        </div>
      ))}

      <div className="bg-card rounded-xl card-shadow p-5 space-y-3">
        <p className="font-barlow font-bold text-base">Últimos acessos</p>
        {!events.length && <p className="text-sm text-muted-foreground font-dm">Nenhum acesso registrado ainda.</p>}
        {events.map(e => (
          <div key={e.id} className="flex items-center justify-between gap-3 border-b border-border last:border-0 pb-2 last:pb-0">
            <div>
              <p className="text-sm font-dm font-semibold">
                {e.client_id ? names[e.client_id] || `Aluno #${e.client_id}` : e.identifier || "Não identificado"}
              </p>
              <p className="text-[11px] text-muted-foreground font-dm">
                {fmt(e.event_at)} · {e.direction === "out" ? "Saída" : "Entrada"}{e.reason ? ` · ${e.reason}` : ""}
              </p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-dm font-medium ${e.allowed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {e.allowed ? "Liberado" : "Negado"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
