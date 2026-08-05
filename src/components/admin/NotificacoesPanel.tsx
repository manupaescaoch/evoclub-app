import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Bell, Send } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/admin/gerencial/PageShell";

type Unit = { id: string; name: string };
type Client = { id: number; name: string };
type Sent = {
  id: string; title: string; body: string | null; target: string; kind: string;
  sent_count: number; failed_count: number; created_at: string; created_by: string | null;
};

export default function NotificacoesPanel() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [history, setHistory] = useState<Sent[]>([]);
  const [activeSubs, setActiveSubs] = useState(0);
  const [sending, setSending] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [target, setTarget] = useState<"student" | "unit" | "all">("all");
  const [clientId, setClientId] = useState<string>("");
  const [unitId, setUnitId] = useState<string>("");

  const load = async () => {
    const [u, c, h, s] = await Promise.all([
      supabase.from("units").select("id, name").order("name"),
      supabase.from("clients").select("id, name").order("name").limit(1000),
      supabase.from("push_notifications").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("active", true),
    ]);
    setUnits((u.data as Unit[]) || []);
    setClients((c.data as Client[]) || []);
    setHistory((h.data as Sent[]) || []);
    setActiveSubs(s.count || 0);
  };
  useEffect(() => { load(); }, []);

  const send = async () => {
    if (!title.trim()) { toast.error("Informe o título"); return; }
    if (target === "student" && !clientId) { toast.error("Selecione o aluno"); return; }
    if (target === "unit" && !unitId) { toast.error("Selecione a unidade"); return; }

    setSending(true);
    const { data, error } = await supabase.functions.invoke("push-send", {
      body: {
        title: title.trim(),
        body: body.trim() || undefined,
        url: url.trim() || undefined,
        target,
        client_id: target === "student" ? Number(clientId) : undefined,
        unit_id: target === "unit" ? unitId : undefined,
      },
    });
    setSending(false);

    if (error) {
      const details = (error as any).context?.text ? await (error as any).context.text() : error.message;
      console.error("push-send falhou:", details);
      toast.error("Falha ao enviar notificação");
      return;
    }
    const res = data as { sent?: number; failed?: number; message?: string; error?: string };
    if (res?.error) { toast.error(res.error); return; }
    toast.success(res?.message || `Enviado para ${res?.sent ?? 0} aparelho(s)${res?.failed ? ` · ${res.failed} falha(s)` : ""}`);
    setTitle(""); setBody(""); setUrl("");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} className="text-primary" />
          <p className="font-barlow font-bold text-lg">Mensagem direta por push</p>
          <span className="ml-auto text-[11px] font-dm text-muted-foreground">
            {activeSubs} aparelho(s) com notificações ativas
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label className="font-dm">Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Ex: Aula extra no sábado" />
          </div>
          <div className="md:col-span-2">
            <Label className="font-dm">Mensagem</Label>
            <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} />
          </div>
          <div>
            <Label className="font-dm">Destino</Label>
            <Select value={target} onValueChange={(v) => setTarget(v as typeof target)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os alunos</SelectItem>
                <SelectItem value="unit">Por unidade</SelectItem>
                <SelectItem value="student">Aluno específico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {target === "unit" && (
            <div>
              <Label className="font-dm">Unidade</Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {target === "student" && (
            <div>
              <Label className="font-dm">Aluno</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {clients.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="font-dm">Link ao abrir (opcional)</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/" />
          </div>
        </div>

        <Button onClick={send} disabled={sending} className="font-dm mt-4">
          <Send size={15} className="mr-1" /> {sending ? "Enviando..." : "Enviar notificação"}
        </Button>
      </div>

      <div>
        <p className="font-barlow font-bold text-lg mb-2">Últimos envios</p>
        {history.length === 0 ? <EmptyState message="Nenhuma notificação enviada ainda." /> : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="font-dm font-semibold text-sm">{h.title}</p>
                    {h.body && <p className="text-xs text-muted-foreground font-dm mt-1">{h.body}</p>}
                    <p className="text-[11px] text-muted-foreground font-dm mt-1">
                      {h.kind === "class_reminder" ? "Lembrete automático de aula" : "Mensagem da equipe"} ·{" "}
                      {h.target === "all" ? "todos" : h.target === "unit" ? "unidade" : "aluno"} ·{" "}
                      {new Date(h.created_at).toLocaleString("pt-BR")}
                      {h.created_by ? ` · ${h.created_by}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-barlow font-bold text-base">{h.sent_count}</p>
                    <p className="text-[10px] font-dm text-muted-foreground">entregues</p>
                    {h.failed_count > 0 && (
                      <p className="text-[10px] font-dm text-red-500">{h.failed_count} falha(s)</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
