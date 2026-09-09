import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, MessageCircle } from "lucide-react";
import { toast } from "sonner";

type Collab = { id: string; full_name: string; phone: string | null; role_title: string | null; unit_id: string | null };
type Form = { id: string; name: string };

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const SECTORS = ["Recepção", "Técnico", "Comercial", "Gerência", "Manutenção", "Limpeza"];
const PRIORITIES = [
  { value: "low", label: "Baixa", dot: "bg-muted-foreground" },
  { value: "medium", label: "Normal", dot: "bg-primary" },
  { value: "high", label: "Alta", dot: "bg-amber-500" },
  { value: "urgent", label: "Urgente", dot: "bg-red-500" },
];
const RECURRENCES = [
  { value: "once", label: "Sem recorrência (uma vez)" },
  { value: "daily", label: "Diária (todos os dias)" },
  { value: "weekly", label: "Semanal (dias escolhidos)" },
  { value: "monthly", label: "Mensal (sempre no mesmo dia)" },
];
// Sem data de fim: geramos 12 meses à frente e a agenda segue sendo renovada.
const HORIZON_DAYS = 365;
const HORIZON_MONTHS = 12;

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

export default function NovaAtividadeDialog({
  open, onOpenChange, unitId, defaultDate, onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  unitId: string | null;
  defaultDate: string;
  onCreated: () => void;
}) {
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [responsibleId, setResponsibleId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [sector, setSector] = useState("");
  const [recurrence, setRecurrence] = useState("once");
  const [formId, setFormId] = useState("");
  const [message, setMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(""); setDate(defaultDate); setTime(""); setDays([]); setResponsibleId("");
    setPriority("medium"); setSector(""); setRecurrence("once");
    setFormId(""); setMessage(""); setShowMessage(false); setShowForm(false);
    (async () => {
      const [c, f] = await Promise.all([
        supabase.from("collaborators").select("id,full_name,phone,role_title,unit_id").eq("status", "active").order("full_name"),
        supabase.from("operational_forms").select("id,name").eq("active", true).order("name"),
      ]);
      setCollabs((c.data as Collab[]) || []);
      setForms((f.data as Form[]) || []);
    })();
  }, [open, defaultDate]);

  const collabsDoSetor = useMemo(() => {
    const base = unitId ? collabs.filter(c => !c.unit_id || c.unit_id === unitId) : collabs;
    if (!sector) return base;
    const alvo = sector.toLowerCase().slice(0, 5);
    const doSetor = base.filter(c => (c.role_title || "").toLowerCase().includes(alvo));
    return doSetor.length ? doSetor : base;
  }, [collabs, sector, unitId]);

  const responsible = collabs.find(c => c.id === responsibleId) || null;
  const toggleDay = (i: number) => setDays(d => d.includes(i) ? d.filter(x => x !== i) : [...d, i]);

  const occurrences = (): string[] => {
    const start = new Date(`${date}T12:00:00`);
    if (recurrence === "once") return [iso(start)];
    if (recurrence === "monthly") {
      const dayOfMonth = start.getDate();
      return Array.from({ length: HORIZON_MONTHS }, (_, i) => {
        const lastDay = new Date(start.getFullYear(), start.getMonth() + i + 1, 0).getDate();
        return iso(new Date(start.getFullYear(), start.getMonth() + i, Math.min(dayOfMonth, lastDay), 12));
      });
    }
    const out: string[] = [];
    for (let i = 0; i < HORIZON_DAYS; i++) {
      const d = addDays(start, i);
      if (recurrence === "weekly") {
        const alvo = days.length ? days : [start.getDay()];
        if (!alvo.includes(d.getDay())) continue;
      }
      out.push(iso(d));
    }
    return out;
  };

  const submit = async () => {
    if (!title.trim()) return toast.error("Informe o título da atividade");
    if (!date) return toast.error("Informe a data inicial");
    setSaving(true);
    const dates = occurrences();
    const desc = [message.trim(), formId ? `Formulário: ${forms.find(f => f.id === formId)?.name}` : ""]
      .filter(Boolean).join("\n");
    const rows = dates.map(d => ({
      unit_id: unitId ?? null,
      title: title.trim(),
      description: desc || null,
      due_date: d,
      due_time: time || null,
      priority,
      sector: sector || null,
      status: "todo",
      recurrence: recurrence === "once" ? null : RECURRENCES.find(r => r.value === recurrence)?.label ?? recurrence,
      responsible_id: responsible?.id ?? null,
      responsible_name: responsible?.full_name ?? null,
      responsible_phone: responsible?.phone ?? null,
      source: "operacional",
    }));
    const { error } = await supabase.from("crm_tasks").insert(rows as any);
    setSaving(false);
    if (error) return toast.error("Não foi possível criar: " + error.message);
    toast.success(rows.length > 1 ? `${rows.length} atividades criadas` : "Atividade criada");

    if (responsible?.id) {
      supabase.functions.invoke("push-staff", {
        body: {
          collaborator_id: responsible.id,
          title: `Nova atividade: ${title.trim()}`,
          body: [PRIORITIES.find(p => p.value === priority)?.label, time ? `às ${time}` : "", sector].filter(Boolean).join(" · "),
          url: "/pro",
          kind: "tarefa",
        },
      }).catch(() => undefined);
    }
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-barlow uppercase">Nova Atividade</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="EX: ABERTURA DA UNIDADE" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data inicial</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div><Label>Horário</Label><Input type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
          </div>

          <div>
            <Label>Recorrência</Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RECURRENCES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {recurrence === "weekly" && (
            <div>
              <Label>Dia da semana</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {DOW.map((d, i) => (
                  <button key={d} type="button" onClick={() => toggleDay(i)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-dm ${
                      days.includes(i) ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground"}`}>
                    {d}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs font-dm text-muted-foreground">
                Sem data de fim. Nenhum dia marcado: repete no mesmo dia da semana da data inicial.
              </p>
            </div>
          )}

          {recurrence === "daily" && (
            <p className="text-xs font-dm text-muted-foreground">Repete todos os dias, sem data de fim.</p>
          )}
          {recurrence === "monthly" && (
            <p className="text-xs font-dm text-muted-foreground">
              Repete todo mês no dia {new Date(`${date}T12:00:00`).getDate()}, sem data de fim.
            </p>
          )}

          <div>
            <Label>Responsável</Label>
            <Select value={responsibleId} onValueChange={setResponsibleId}>
              <SelectTrigger><SelectValue placeholder={sector ? `Equipe · ${sector}` : "Selecionar"} /></SelectTrigger>
              <SelectContent>
                {collabsDoSetor.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}{c.role_title ? ` · ${c.role_title}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {responsible?.phone && (
              <p className="mt-1 text-xs font-dm text-muted-foreground">WhatsApp do cadastro: {responsible.phone}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${p.dot}`} />{p.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Setor</Label>
              <Select value={sector || "none"} onValueChange={v => { setSector(v === "none" ? "" : v); setResponsibleId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Toda a unidade (sem setor)</SelectItem>
                  {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ação WhatsApp</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant={showForm ? "default" : "outline"} className="gap-2"
                onClick={() => setShowForm(v => !v)}>
                <FileText size={14} /> Vincular Formulário
              </Button>
              <Button type="button" variant={showMessage ? "default" : "outline"} className="gap-2"
                onClick={() => setShowMessage(v => !v)}>
                <MessageCircle size={14} /> Escrever Mensagem
              </Button>
            </div>
            {showForm && (
              <Select value={formId} onValueChange={setFormId}>
                <SelectTrigger><SelectValue placeholder={forms.length ? "Selecionar formulário" : "Nenhum formulário cadastrado"} /></SelectTrigger>
                <SelectContent>{forms.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {showMessage && (
              <Textarea rows={3} value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Ex: Bom dia! Confirmar abertura da unidade e checklist." />
            )}
          </div>

          <Button className="w-full" disabled={saving} onClick={submit}>
            {saving ? "Criando..." : "Criar Atividade"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
