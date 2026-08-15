import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, MessageSquare, Bell, Mail, ToggleLeft } from "lucide-react";
import { EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";
import { logSensitive } from "@/lib/audit";
import { useUnit } from "@/contexts/UnitContext";

type Tpl = any;
type Rule = { unit_id: string; event_key: string; channel: string; enabled: boolean };

const CH_ICON: Record<string, any> = { whatsapp: MessageSquare, push: Bell, email: Mail };
const CH_LABEL: Record<string, string> = { whatsapp: "WhatsApp", push: "Push", email: "E-mail" };

export default function NotificacoesTab() {
  const { units } = useUnit();
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    const [t, r] = await Promise.all([
      supabase.from("notification_templates").select("*").order("event_key").order("channel"),
      supabase.from("notification_rules").select("unit_id,event_key,channel,enabled"),
    ]);
    if (t.error || r.error) setError(t.error?.message || r.error?.message || "erro");
    else { setTpls(t.data || []); setRules((r.data as any) || []); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const patch = (id: string, p: Partial<Tpl>) => setTpls(list => list.map(t => (t.id === id ? { ...t, ...p } : t)));

  const saveTpl = async (t: Tpl) => {
    setSavingId(t.id);
    const before = tpls.find(x => x.id === t.id);
    const { error } = await supabase.from("notification_templates")
      .update({ name: t.name, title: t.title, body: t.body, active: t.active }).eq("id", t.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    logSensitive({
      entity: "notification_template", entity_id: t.id, module: "configuracoes",
      description: `Alterou o modelo de mensagem ${t.name} (${CH_LABEL[t.channel] || t.channel})`,
      before: before as any, after: t,
    });
    toast.success("Modelo salvo");
  };

  const isEnabled = (unit_id: string, event_key: string, channel: string) => {
    const r = rules.find(x => x.unit_id === unit_id && x.event_key === event_key && x.channel === channel);
    return r ? r.enabled : true;
  };

  const toggleRule = async (unit_id: string, unit_name: string, t: Tpl, enabled: boolean) => {
    setRules(list => {
      const i = list.findIndex(x => x.unit_id === unit_id && x.event_key === t.event_key && x.channel === t.channel);
      if (i === -1) return [...list, { unit_id, event_key: t.event_key, channel: t.channel, enabled }];
      const copy = [...list]; copy[i] = { ...copy[i], enabled }; return copy;
    });
    const { error } = await supabase.from("notification_rules")
      .upsert({ unit_id, event_key: t.event_key, channel: t.channel, enabled }, { onConflict: "unit_id,event_key,channel" });
    if (error) { toast.error(error.message); load(); return; }
    logSensitive({
      entity: "notification_rule", entity_id: `${unit_id}:${t.event_key}:${t.channel}`, module: "configuracoes", unit_id,
      description: `${enabled ? "Habilitou" : "Desabilitou"} ${t.name} (${CH_LABEL[t.channel] || t.channel}) na unidade ${unit_name}`,
      before: { enabled: !enabled }, after: { enabled },
    });
  };

  if (loading) return <LoadingState />;
  if (error) return <div className="bg-card rounded-xl card-shadow p-5 text-sm font-dm text-red-600">Erro ao carregar notificações: {error}</div>;
  if (!tpls.length) return <EmptyState message="Nenhum modelo de mensagem cadastrado." />;

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl card-shadow p-5">
        <p className="font-barlow font-bold text-base">Modelos de mensagem</p>
        <p className="text-xs text-muted-foreground font-dm">
          Use as variáveis entre chaves duplas. Elas são substituídas no envio: nome do aluno, unidade, data e valor.
        </p>
      </div>

      {tpls.map(t => {
        const Icon = CH_ICON[t.channel] || MessageSquare;
        return (
          <div key={t.id} className="bg-card rounded-xl card-shadow p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-primary" />
                <div>
                  <p className="font-barlow font-bold text-base">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground font-dm">{CH_LABEL[t.channel] || t.channel} · evento <code>{t.event_key}</code></p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-dm text-muted-foreground">{t.active ? "Ativo" : "Inativo"}</span>
                <Switch checked={!!t.active} onCheckedChange={b => patch(t.id, { active: b })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-dm text-muted-foreground">Nome do modelo</Label>
                <Input value={t.name || ""} onChange={e => patch(t.id, { name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-dm text-muted-foreground">Título / assunto</Label>
                <Input value={t.title || ""} onChange={e => patch(t.id, { title: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-dm text-muted-foreground">Mensagem</Label>
              <textarea rows={3} value={t.body || ""} onChange={e => patch(t.id, { body: e.target.value })}
                className="w-full rounded-md border border-input bg-background p-3 text-sm font-dm" />
              <div className="flex flex-wrap gap-1.5">
                {(t.variables || []).map((v: string) => (
                  <span key={v} className="px-2 py-0.5 rounded-full bg-muted text-[11px] font-dm">{`{{${v}}}`}</span>
                ))}
              </div>
            </div>

            {!!units.length && (
              <div className="border-t border-border pt-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <ToggleLeft size={14} className="text-primary" />
                  <p className="text-xs font-dm font-semibold">Envio automático por unidade</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {units.map(u => (
                    <div key={u.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                      <span className="text-xs font-dm">{u.name}</span>
                      <Switch checked={isEnabled(u.id, t.event_key, t.channel)}
                        onCheckedChange={b => toggleRule(u.id, u.name, t, b)} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button size="sm" disabled={savingId === t.id} onClick={() => saveTpl(t)} className="gap-1.5">
                <Save size={14} /> Salvar modelo
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
