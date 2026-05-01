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
import { Plus, MessageCircle, Archive } from "lucide-react";
import { toast } from "sonner";
import { openWhatsApp, taskMessage } from "@/lib/whatsapp";

type Task = {
  id: string;
  title: string;
  description: string | null;
  responsible_name: string | null;
  responsible_phone: string | null;
  priority: string;
  status: string;
  category: string | null;
  due_date: string | null;
  due_time: string | null;
  archived: boolean;
};

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

export default function Tarefas() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<Partial<Task>>({ priority: "medium", status: "todo" });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("crm_tasks").select("*").order("created_at", { ascending: false });
    setTasks((data as Task[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

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

  const submit = async () => {
    if (!form.title) return toast.error("Título obrigatório");
    const payload = { ...form };
    if (editing) {
      await supabase.from("crm_tasks").update(payload).eq("id", editing.id);
      toast.success("Tarefa atualizada");
    } else {
      await supabase.from("crm_tasks").insert(payload as any);
      toast.success("Tarefa criada");
    }
    setOpen(false); setEditing(null); setForm({ priority: "medium", status: "todo" });
    load();
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

  const openEdit = (t: Task) => { setEditing(t); setForm(t); setOpen(true); };
  const openNew = () => { setEditing(null); setForm({ priority: "medium", status: "todo" }); setOpen(true); };

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
        {t.category && <span className="inline-block text-[10px] bg-muted px-1.5 py-0.5 rounded font-dm">{t.category}</span>}
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar tarefa" : "Nova tarefa"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título *</Label><Input value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
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
          </div>
          <DialogFooter><Button onClick={submit}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
