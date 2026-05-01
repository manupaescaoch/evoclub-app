import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageShell, { SummaryCard, EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, MessageCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { openWhatsApp, routineMessage } from "@/lib/whatsapp";

type Routine = {
  id: string; title: string; routine_type: string | null; responsible_name: string | null; responsible_phone: string | null;
  date: string | null; time: string | null; recurrence: string | null; status: string; description: string | null;
};
type Form = { id: string; name: string; type: string | null; active: boolean };

const STATUSES = [
  { value: "pending", label: "Pendente" },
  { value: "in_progress", label: "Em andamento" },
  { value: "done", label: "Concluído" },
  { value: "late", label: "Atrasado" },
  { value: "cancelled", label: "Cancelado" },
];
const ROUTINE_TYPES = [
  "Rotina diária","Checklist de abertura","Checklist de fechamento","Vistoria de insumos",
  "Limpeza","Manutenção","Formulário recepção","Formulário treinadores","Encerramento turno","Ocorrência interna",
];

export default function Operacional() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [form, setForm] = useState<Partial<Routine>>({ status: "pending" });

  const load = async () => {
    setLoading(true);
    const [r, f] = await Promise.all([
      supabase.from("operational_routines").select("*").order("date", { ascending: true }),
      supabase.from("operational_forms").select("*").order("name"),
    ]);
    setRoutines((r.data as Routine[]) || []);
    setForms((f.data as Form[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().split("T")[0];
  const stats = {
    today: routines.filter(r => r.date === today).length,
    done: routines.filter(r => r.status === "done").length,
    late: routines.filter(r => r.status === "late" || (r.date && r.date < today && r.status !== "done")).length,
    pending: routines.filter(r => r.status === "pending").length,
  };

  const submit = async () => {
    if (!form.title) return toast.error("Título obrigatório");
    if (editing) {
      await supabase.from("operational_routines").update(form).eq("id", editing.id);
      toast.success("Atualizada");
    } else {
      await supabase.from("operational_routines").insert(form as any);
      toast.success("Criada");
    }
    setOpen(false); setEditing(null); setForm({ status: "pending" });
    load();
  };

  const markDone = async (id: string) => {
    await supabase.from("operational_routines").update({ status: "done" }).eq("id", id);
    load();
  };

  const sendWhats = (r: Routine) => {
    if (!r.responsible_phone) return toast.error("Sem telefone");
    openWhatsApp(r.responsible_phone, routineMessage({
      name: r.responsible_name || "",
      title: r.title,
      date: r.date || "",
      time: r.time || "",
      description: r.description || "",
    }));
  };

  return (
    <PageShell
      title="OPERACIONAL"
      description="Cronograma, equipe e formulários da rotina operacional. Envie instruções no WhatsApp do responsável."
      primaryAction={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus size={14} /> Nova rotina</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar rotina" : "Nova rotina"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Título *</Label><Input value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Tipo</Label>
                <Select value={form.routine_type || ""} onValueChange={v => setForm({ ...form, routine_type: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{ROUTINE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Responsável</Label><Input value={form.responsible_name || ""} onChange={e => setForm({ ...form, responsible_name: e.target.value })} /></div>
                <div><Label>WhatsApp</Label><Input value={form.responsible_phone || ""} onChange={e => setForm({ ...form, responsible_phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Data</Label><Input type="date" value={form.date || ""} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                <div><Label>Hora</Label><Input type="time" value={form.time || ""} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
                <div><Label>Recorrência</Label><Input value={form.recurrence || ""} onChange={e => setForm({ ...form, recurrence: e.target.value })} placeholder="Diária, semanal..." /></div>
              </div>
              <div><Label>Descrição</Label><Textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <Tabs defaultValue="cronograma">
        <TabsList>
          <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="formularios">Formulários</TabsTrigger>
        </TabsList>

        <TabsContent value="cronograma">
          <div className="rounded-xl border bg-card overflow-hidden">
            {loading ? <LoadingState /> : routines.length === 0 ? <EmptyState message="Nenhuma rotina cadastrada." /> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Data</TableHead><TableHead>Hora</TableHead><TableHead>Rotina</TableHead>
                  <TableHead>Tipo</TableHead><TableHead>Responsável</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {routines.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{r.date ? new Date(r.date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell>{r.time || "—"}</TableCell>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell>{r.routine_type || "—"}</TableCell>
                      <TableCell>{r.responsible_name || "—"}</TableCell>
                      <TableCell>{STATUSES.find(s => s.value === r.status)?.label}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => markDone(r.id)}><CheckCircle2 size={14} /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => sendWhats(r)}><MessageCircle size={14} /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Rotinas do dia" value={stats.today} accent="blue" />
            <SummaryCard label="Concluídas" value={stats.done} accent="green" />
            <SummaryCard label="Atrasadas" value={stats.late} accent="red" />
            <SummaryCard label="Pendentes" value={stats.pending} accent="yellow" />
          </div>
        </TabsContent>

        <TabsContent value="equipe">
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Responsável</TableHead><TableHead>WhatsApp</TableHead><TableHead>Rotinas</TableHead><TableHead>Pendentes</TableHead></TableRow></TableHeader>
              <TableBody>
                {Array.from(new Set(routines.map(r => r.responsible_name).filter(Boolean))).map(name => {
                  const list = routines.filter(r => r.responsible_name === name);
                  return (
                    <TableRow key={name as string}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>{list[0]?.responsible_phone || "—"}</TableCell>
                      <TableCell>{list.length}</TableCell>
                      <TableCell>{list.filter(r => r.status !== "done").length}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {routines.length === 0 && <EmptyState message="Nenhum responsável vinculado ainda." />}
          </div>
        </TabsContent>

        <TabsContent value="formularios">
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Formulário</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {forms.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell>{f.type || "—"}</TableCell>
                    <TableCell><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{f.active ? "Ativo" : "Inativo"}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
