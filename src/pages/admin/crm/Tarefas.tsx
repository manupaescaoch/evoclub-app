import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageShell, { SummaryCard, LoadingState } from "@/components/admin/gerencial/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, MessageCircle, Archive, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { openWhatsApp, taskMessage } from "@/lib/whatsapp";
import { useUnit } from "@/contexts/UnitContext";
import { logAudit } from "@/lib/audit";

type Task = {
  id: string;
  title: string;
  description: string | null;
  responsible_name: string | null;
  responsible_phone: string | null;
  responsible_id: string | null;
  sector: string | null;
  unit_id: string | null;
  recurrence: string | null;
  attachment_url: string | null;
  notes: string | null;
  deadline_at: string | null;
  priority: string;
  status: string;
  category: string | null;
  due_date: string | null;
  due_time: string | null;
  archived: boolean;
};
type Collab = { id: string; full_name: string; phone: string | null; unit_id: string | null; role_title: string | null };
type ChecklistItem = { id: string; task_id: string; title: string; completed: boolean };

const STATUSES = [
  { value: "todo", label: "A fazer" },
  { value: "in_progress", label: "Em andamento" },
  { value: "waiting", label: "Aguardando" },
  { value: "done", label: "Concluída" },
];
const PRIORITIES = [
  { value: "low", label: "Baixa", color: "bg-gray-100 text-gray-700" },
  { value: "medium", label: "Média", color: "bg-blue-100 text-blue-700" },
  { value: "high", label: "Alta", color: "bg-amber-100 text-amber-700" },
  { value: "urgent", label: "Urgente", color: "bg-red-100 text-red-700" },
];
const CATEGORIES = ["Comercial","Financeiro","Operacional","Marketing","Manutenção","Cobrança","Atendimento","Treinos","Outros"];
const SECTORS = ["Recepção","Técnico","Comercial","Gerência","Manutenção","Limpeza"];
const RECURRENCES = [
  { value: "none", label: "Única" },
  { value: "daily", label: "Diária" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
];

export default function Tarefas() {
  const { filterId, units } = useUnit();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<Partial<Task>>({ priority: "medium", status: "todo" });

  const load = async () => {
    setLoading(true);
    let q = supabase.from("crm_tasks").select("*").order("created_at", { ascending: false });
    if (filterId) q = q.eq("unit_id", filterId);
    const [t, c] = await Promise.all([
      q,
      supabase.from("collaborators").select("id,full_name,phone,unit_id,role_title").eq("status", "active").order("full_name"),
    ]);
    if (t.error) toast.error("Erro ao carregar tarefas: " + t.error.message);
    setTasks((t.data as Task[]) || []);
    setCollabs((c.data as Collab[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filterId]);

  const loadChecklist = async (taskId: string) => {
    const { data } = await supabase.from("crm_task_checklist_items").select("*").eq("task_id", taskId).order("created_at");
    setChecklist((data as ChecklistItem[]) || []);
  };

  const filtered = tasks.filter(t =>
    t.archived === showArchived &&
    (t.title.toLowerCase().includes(search.toLowerCase()) ||
     (t.responsible_name || "").toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    total: tasks.filter(t => !t.archived).length,
    overdue: tasks.filter(t => !t.archived && t.status !== "done" && t.due_date && new Date(t.due_date) < new Date()).length,
    inProgress: tasks.filter(t => t.status === "in_progress" && !t.archived).length,
    doneMonth: tasks.filter(t => t.status === "done").length,
  };

  /** data de hoje no fuso de Brasília — a tarefa sempre nasce com a data de criação */
  const hojeBR = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

  /** dispara a notificação push no celular do responsável */
  const notificar = async (collaboratorId: string, titulo: string, prioridade: string, quando: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("push-staff", {
        body: {
          collaborator_id: collaboratorId,
          title: `Nova tarefa: ${titulo}`,
          body: [PRIORITIES.find(p => p.value === prioridade)?.label, quando].filter(Boolean).join(" · "),
          url: "/pro",
          kind: "tarefa",
        },
      });
      if (error) throw error;
      if ((data as any)?.message) toast.info((data as any).message);
      else if ((data as any)?.sent) toast.success("Responsável notificado no celular");
    } catch {
      toast.info("Tarefa salva, mas não foi possível notificar o celular do responsável.");
    }
  };

  const submit = async () => {
    if (!form.title) return toast.error("Título obrigatório");
    const payload: any = {
      ...form,
      unit_id: form.unit_id ?? filterId ?? null,
      due_date: form.due_date || hojeBR(),
      responsible_name: collabs.find(c => c.id === form.responsible_id)?.full_name ?? form.responsible_name ?? null,
      responsible_phone: collabs.find(c => c.id === form.responsible_id)?.phone ?? form.responsible_phone ?? null,
    };
    if (editing) {
      const { error } = await supabase.from("crm_tasks").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      await logAudit({ action: "update", entity: "crm_tasks", entity_id: editing.id, module: "operacional",
        description: `Tarefa atualizada: ${form.title}`, before: editing as any, after: payload });
      toast.success("Tarefa atualizada");
      if (payload.responsible_id && payload.responsible_id !== editing.responsible_id) {
        await notificar(payload.responsible_id, payload.title, payload.priority || "medium", payload.due_date);
      }
    } else {
      const { data, error } = await supabase.from("crm_tasks").insert(payload).select().single();
      if (error) return toast.error(error.message);
      await logAudit({ action: "create", entity: "crm_tasks", entity_id: (data as Task).id, module: "operacional",
        description: `Tarefa criada: ${form.title}`, after: payload });
      toast.success("Tarefa criada");
      if (payload.responsible_id) {
        await notificar(payload.responsible_id, payload.title, payload.priority || "medium", payload.due_date);
      }
    }
    setOpen(false); setEditing(null); setForm({ priority: "medium", status: "todo" });
    load();
  };

  const addChecklistItem = async () => {
    if (!editing || !newItem.trim()) return;
    const { error } = await supabase.from("crm_task_checklist_items").insert({ task_id: editing.id, title: newItem.trim() });
    if (error) return toast.error(error.message);
    setNewItem("");
    loadChecklist(editing.id);
  };
  const toggleChecklistItem = async (item: ChecklistItem) => {
    await supabase.from("crm_task_checklist_items").update({ completed: !item.completed }).eq("id", item.id);
    loadChecklist(item.task_id);
  };
  const removeChecklistItem = async (item: ChecklistItem) => {
    await supabase.from("crm_task_checklist_items").delete().eq("id", item.id);
    loadChecklist(item.task_id);
  };

  const moveTo = async (id: string, status: string) => {
    await supabase.from("crm_tasks").update({ status }).eq("id", id);
    load();
  };
  const archive = async (id: string) => {
    await supabase.from("crm_tasks").update({ archived: true }).eq("id", id);
    toast.success("Arquivada");
    load();
  };

  const sendWhats = (t: Task) => {
    if (!t.responsible_phone) return toast.error("Responsável sem telefone cadastrado");
    const prio = PRIORITIES.find(p => p.value === t.priority)?.label || "";
    openWhatsApp(t.responsible_phone, taskMessage({
      name: t.responsible_name || "",
      title: t.title,
      due: [t.due_date, t.due_time].filter(Boolean).join(" "),
      priority: prio,
      description: t.description || "",
    }));
  };

  const openEdit = (t: Task) => { setEditing(t); setForm(t); setChecklist([]); loadChecklist(t.id); setOpen(true); };
  const openNew = () => {
    setEditing(null); setChecklist([]);
    setForm({ priority: "medium", status: "todo", unit_id: filterId, recurrence: "none" });
    setOpen(true);
  };

  const pickCollab = (id: string) => {
    const c = collabs.find(x => x.id === id);
    setForm({ ...form, responsible_id: id, responsible_name: c?.full_name || form.responsible_name, responsible_phone: c?.phone || form.responsible_phone });
  };

  const renderCard = (t: Task) => {
    const prio = PRIORITIES.find(p => p.value === t.priority);
    return (
      <div key={t.id} className="rounded-lg border bg-card p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <button onClick={() => openEdit(t)} className="text-sm font-medium font-dm text-left hover:text-primary">{t.title}</button>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-dm ${prio?.color}`}>{prio?.label}</span>
        </div>
        {t.responsible_name && <p className="text-xs text-muted-foreground font-dm">👤 {t.responsible_name}</p>}
        {t.due_date && <p className="text-xs text-muted-foreground font-dm">📅 {new Date(t.due_date).toLocaleDateString("pt-BR")} {t.due_time || ""}</p>}
        <div className="flex flex-wrap gap-1">
          {t.sector && <span className="inline-block text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-dm">{t.sector}</span>}
          {t.category && <span className="inline-block text-[10px] bg-muted px-1.5 py-0.5 rounded font-dm">{t.category}</span>}
          {t.recurrence && t.recurrence !== "none" && (
            <span className="inline-block text-[10px] bg-muted px-1.5 py-0.5 rounded font-dm">
              {RECURRENCES.find(r => r.value === t.recurrence)?.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 pt-1 border-t">
          <Select value={t.status} onValueChange={v => moveTo(t.id, v)}>
            <SelectTrigger className="h-6 text-[10px] flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => sendWhats(t)} title="WhatsApp"><MessageCircle size={12} /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => archive(t.id)} title="Arquivar"><Archive size={12} /></Button>
        </div>
      </div>
    );
  };

  return (
    <PageShell
      title="TAREFAS"
      description="Gestão de tarefas internas com Kanban, lista e envio para WhatsApp do responsável."
      primaryAction={<Button className="gap-2" onClick={openNew}><Plus size={14} /> Nova Tarefa</Button>}
      search={{ value: search, onChange: setSearch, placeholder: "Buscar tarefa ou responsável..." }}
      filters={
        <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
          {showArchived ? "Ver ativas" : "Ver arquivadas"}
        </Button>
      }
      summary={
        <>
          <SummaryCard label="Total" value={stats.total} />
          <SummaryCard label="Atrasadas" value={stats.overdue} accent="red" />
          <SummaryCard label="Em andamento" value={stats.inProgress} accent="blue" />
          <SummaryCard label="Concluídas" value={stats.doneMonth} accent="green" />
        </>
      }
    >
      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="list">Lista</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          {loading ? <LoadingState /> : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {STATUSES.map(s => (
                <div key={s.value} className="rounded-xl bg-muted/30 p-3 space-y-2 min-h-[300px]">
                  <div className="flex items-center justify-between">
                    <h4 className="font-barlow font-bold text-sm uppercase">{s.label}</h4>
                    <span className="text-xs text-muted-foreground">{filtered.filter(t => t.status === s.value).length}</span>
                  </div>
                  {filtered.filter(t => t.status === s.value).map(renderCard)}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list">
          <div className="space-y-2">
            {filtered.map(renderCard)}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar tarefa" : "Nova tarefa"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título *</Label><Input value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Unidade</Label>
                <Select value={form.unit_id || ""} onValueChange={v => setForm({ ...form, unit_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Setor</Label>
                <Select value={form.sector || ""} onValueChange={v => setForm({ ...form, sector: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Colaborador responsável</Label>
              <Select value={form.responsible_id || ""} onValueChange={pickCollab}>
                <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                <SelectContent>{collabs.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Responsável</Label><Input value={form.responsible_name || ""} onChange={e => setForm({ ...form, responsible_name: e.target.value })} /></div>
              <div><Label>WhatsApp (com DDD)</Label><Input value={form.responsible_phone || ""} onChange={e => setForm({ ...form, responsible_phone: e.target.value })} placeholder="55119..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Categoria</Label>
                <Select value={form.category || ""} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Data</Label><Input type="date" value={form.due_date || ""} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
              <div><Label>Hora</Label><Input type="time" value={form.due_time || ""} onChange={e => setForm({ ...form, due_time: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Prazo final</Label>
                <Input type="datetime-local" value={form.deadline_at ? form.deadline_at.slice(0, 16) : ""}
                  onChange={e => setForm({ ...form, deadline_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
              <div><Label>Recorrência</Label>
                <Select value={form.recurrence || "none"} onValueChange={v => setForm({ ...form, recurrence: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RECURRENCES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Anexo (URL)</Label>
              <Input value={form.attachment_url || ""} onChange={e => setForm({ ...form, attachment_url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Observação</Label>
              <Textarea rows={2} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>

            {editing && (
              <div className="space-y-2 pt-2 border-t">
                <Label>Checklist</Label>
                {checklist.length === 0 && <p className="text-xs text-muted-foreground font-dm">Nenhum item no checklist.</p>}
                {checklist.map(i => (
                  <div key={i.id} className="flex items-center gap-2">
                    <Button size="icon" variant={i.completed ? "default" : "outline"} className="h-6 w-6"
                      onClick={() => toggleChecklistItem(i)}><Check size={12} /></Button>
                    <span className={`text-sm font-dm flex-1 ${i.completed ? "line-through text-muted-foreground" : ""}`}>{i.title}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeChecklistItem(i)}><Trash2 size={12} /></Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Novo item do checklist" />
                  <Button variant="outline" onClick={addChecklistItem}>Adicionar</Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter><Button onClick={submit}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
