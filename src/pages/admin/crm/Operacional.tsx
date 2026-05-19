import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageShell, { SummaryCard, EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MessageCircle, CheckCircle2, ChevronDown, Trash2, Pencil, FileText, Users, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { openWhatsApp, routineMessage } from "@/lib/whatsapp";

type Routine = {
  id: string; title: string; kind: string; routine_type: string | null;
  responsible_name: string | null; responsible_phone: string | null;
  date: string | null; time: string | null; day_of_week: number | null;
  recurrence: string | null; status: string; description: string | null;
  message_template: string | null; whatsapp_group_link: string | null;
  checklist_form_id: string | null;
};
type Form = { id: string; name: string; type: string | null; description: string | null; active: boolean };
type Collab = { id: string; full_name: string; phone: string | null; role_title: string | null; status: string };

const STATUSES = [
  { value: "pending", label: "Pendente" },
  { value: "in_progress", label: "Em andamento" },
  { value: "done", label: "Concluído" },
  { value: "late", label: "Atrasado" },
  { value: "cancelled", label: "Cancelado" },
];
const ROUTINE_TYPES = [
  "Abertura","Fechamento","Limpeza","Manutenção","Recepção","Treinadores",
  "Envio de grade","Comunicação","Vistoria","Ocorrência","Outro",
];
const DAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 a 21h

export default function Operacional() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [form, setForm] = useState<Partial<Routine>>({ status: "pending", kind: "activity" });

  const [formDlg, setFormDlg] = useState(false);
  const [formEditing, setFormEditing] = useState<Form | null>(null);
  const [formData, setFormData] = useState<Partial<Form>>({ active: true });

  const load = async () => {
    setLoading(true);
    const [r, f, c] = await Promise.all([
      supabase.from("operational_routines").select("*").order("day_of_week", { nullsFirst: false }).order("time", { nullsFirst: false }),
      supabase.from("operational_forms").select("*").order("name"),
      supabase.from("collaborators").select("id,full_name,phone,role_title,status").eq("status","active").order("full_name"),
    ]);
    setRoutines((r.data as Routine[]) || []);
    setForms((f.data as Form[]) || []);
    setCollabs((c.data as Collab[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = (kind: "activity" | "routine") => {
    setEditing(null);
    setForm({ status: "pending", kind });
    setOpen(true);
  };
  const openEdit = (r: Routine) => {
    setEditing(r); setForm(r); setOpen(true);
  };

  const submit = async () => {
    if (!form.title) return toast.error("Título obrigatório");
    const payload = { ...form };
    if (editing) {
      const { error } = await supabase.from("operational_routines").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Atualizada");
    } else {
      const { error } = await supabase.from("operational_routines").insert(payload as any);
      if (error) return toast.error(error.message);
      toast.success("Criada");
    }
    setOpen(false); setEditing(null); setForm({ status: "pending", kind: "activity" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta atividade/rotina?")) return;
    await supabase.from("operational_routines").delete().eq("id", id);
    load();
  };

  const markDone = async (id: string) => {
    await supabase.from("operational_routines").update({ status: "done" }).eq("id", id);
    load();
  };

  const sendWhats = (r: Routine) => {
    const phone = r.responsible_phone;
    if (!phone) return toast.error("Sem telefone do responsável");
    const msg = r.message_template?.trim() || routineMessage({
      name: r.responsible_name || "",
      title: r.title,
      date: r.date || "",
      time: r.time || "",
      description: r.description || "",
    });
    openWhatsApp(phone, msg);
  };

  // ===== Forms CRUD =====
  const saveForm = async () => {
    if (!formData.name) return toast.error("Nome obrigatório");
    if (formEditing) {
      await supabase.from("operational_forms").update(formData).eq("id", formEditing.id);
    } else {
      await supabase.from("operational_forms").insert(formData as any);
    }
    setFormDlg(false); setFormEditing(null); setFormData({ active: true });
    load();
  };
  const removeForm = async (id: string) => {
    if (!confirm("Excluir formulário?")) return;
    await supabase.from("operational_forms").delete().eq("id", id);
    load();
  };

  // ===== Stats =====
  const today = new Date().toISOString().split("T")[0];
  const stats = useMemo(() => ({
    today: routines.filter(r => r.date === today).length,
    done: routines.filter(r => r.status === "done").length,
    late: routines.filter(r => r.status === "late" || (r.date && r.date < today && r.status !== "done")).length,
    pending: routines.filter(r => r.status === "pending").length,
    week: routines.length,
    fulfillment: (() => {
      const done = routines.filter(r => r.status === "done").length;
      return routines.length ? Math.round((done / routines.length) * 100) + "%" : "—";
    })(),
  }), [routines]);

  // ===== Calendar grid =====
  const grid = useMemo(() => {
    const g: Record<string, Routine[]> = {};
    routines.forEach(r => {
      if (r.day_of_week == null || !r.time) return;
      const h = parseInt(r.time.split(":")[0]);
      const k = `${r.day_of_week}-${h}`;
      g[k] = g[k] || []; g[k].push(r);
    });
    return g;
  }, [routines]);

  const newButton = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2"><Plus size={14} /> Novo <ChevronDown size={12} /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => openNew("activity")}>Nova Atividade</DropdownMenuItem>
        <DropdownMenuItem onClick={() => openNew("routine")}>Nova Rotina</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <PageShell
      title="OPERACIONAL"
      description="Central da rotina diária: cronograma, equipe, formulários e mensagens vinculadas ao WhatsApp."
      primaryAction={newButton}
    >
      <Tabs defaultValue="cronograma">
        <TabsList>
          <TabsTrigger value="cronograma"><CalendarDays size={14} className="mr-1" /> Cronograma</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="equipe"><Users size={14} className="mr-1" /> Equipe</TabsTrigger>
          <TabsTrigger value="formularios"><FileText size={14} className="mr-1" /> Formulários</TabsTrigger>
        </TabsList>

        {/* CRONOGRAMA */}
        <TabsContent value="cronograma" className="space-y-3">
          {loading ? <LoadingState /> : (
            <div className="rounded-xl border bg-card overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="p-2 text-left font-barlow w-16">Hora</th>
                    {DAYS.map(d => <th key={d} className="p-2 text-left font-barlow">{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {HOURS.map(h => (
                    <tr key={h} className="border-t">
                      <td className="p-2 align-top text-muted-foreground font-dm">{String(h).padStart(2,"0")}:00</td>
                      {DAYS.map((_, di) => {
                        const items = grid[`${di}-${h}`] || [];
                        return (
                          <td key={di} className="p-1 align-top border-l min-w-[120px]">
                            <div className="space-y-1">
                              {items.map(r => (
                                <button key={r.id} onClick={() => openEdit(r)}
                                  className={`w-full text-left rounded-md px-2 py-1 border text-[11px] font-dm hover:opacity-80 ${r.kind === "routine" ? "bg-primary/10 border-primary/30 text-primary" : "bg-accent/40 border-accent"}`}>
                                  <div className="font-barlow font-bold text-foreground truncate">{r.title}</div>
                                  <div className="text-muted-foreground truncate">{r.time?.slice(0,5)} · {r.responsible_name || "—"}</div>
                                </button>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Lista pontual (com data) */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-3 border-b font-barlow font-bold text-sm">Atividades pontuais (com data)</div>
            {routines.filter(r => r.date).length === 0 ? <EmptyState message="Nenhuma atividade pontual." /> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Data</TableHead><TableHead>Hora</TableHead><TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead><TableHead>Responsável</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {routines.filter(r => r.date).map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.date!).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>{r.time || "—"}</TableCell>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell>{r.routine_type || "—"}</TableCell>
                      <TableCell>{r.responsible_name || "—"}</TableCell>
                      <TableCell>{STATUSES.find(s => s.value === r.status)?.label}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => markDone(r.id)}><CheckCircle2 size={14} /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => sendWhats(r)}><MessageCircle size={14} /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil size={14} /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(r.id)}><Trash2 size={14} /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <SummaryCard label="Hoje" value={stats.today} accent="blue" />
            <SummaryCard label="Concluídas" value={stats.done} accent="green" />
            <SummaryCard label="Atrasadas" value={stats.late} accent="red" />
            <SummaryCard label="Pendentes" value={stats.pending} accent="yellow" />
            <SummaryCard label="Semana" value={stats.week} />
            <SummaryCard label="Cumprimento" value={stats.fulfillment} accent="green" />
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="font-barlow font-bold text-sm mb-3">Responsáveis com pendências</div>
            <Table>
              <TableHeader><TableRow><TableHead>Responsável</TableHead><TableHead>Total</TableHead><TableHead>Pendentes</TableHead><TableHead>Atrasadas</TableHead></TableRow></TableHeader>
              <TableBody>
                {Array.from(new Set(routines.map(r => r.responsible_name).filter(Boolean))).map(name => {
                  const list = routines.filter(r => r.responsible_name === name);
                  const pend = list.filter(r => r.status !== "done").length;
                  const late = list.filter(r => r.date && r.date < today && r.status !== "done").length;
                  return (
                    <TableRow key={name as string}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>{list.length}</TableCell>
                      <TableCell>{pend}</TableCell>
                      <TableCell>{late}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {routines.length === 0 && <EmptyState message="Sem dados ainda." />}
          </div>
        </TabsContent>

        {/* EQUIPE */}
        <TabsContent value="equipe">
          <div className="rounded-xl border bg-card overflow-hidden">
            {collabs.length === 0 ? <EmptyState message="Cadastre colaboradores em Gerencial > Colaboradores." /> : (
              <Table>
                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Função</TableHead><TableHead>WhatsApp</TableHead><TableHead>Rotinas atribuídas</TableHead><TableHead>Pendentes</TableHead></TableRow></TableHeader>
                <TableBody>
                  {collabs.map(c => {
                    const list = routines.filter(r => r.responsible_name === c.full_name);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.full_name}</TableCell>
                        <TableCell>{c.role_title || "—"}</TableCell>
                        <TableCell>{c.phone || "—"}</TableCell>
                        <TableCell>{list.length}</TableCell>
                        <TableCell>{list.filter(r => r.status !== "done").length}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* FORMULÁRIOS */}
        <TabsContent value="formularios" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={() => { setFormEditing(null); setFormData({ active: true }); setFormDlg(true); }}>
              <Plus size={14} /> Novo formulário
            </Button>
          </div>
          <div className="rounded-xl border bg-card overflow-hidden">
            {forms.length === 0 ? <EmptyState message="Nenhum formulário cadastrado." /> : (
              <Table>
                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {forms.map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell>{f.type || "—"}</TableCell>
                      <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${f.active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{f.active ? "Ativo" : "Inativo"}</span></TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setFormEditing(f); setFormData(f); setFormDlg(true); }}><Pencil size={14} /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeForm(f.id)}><Trash2 size={14} /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOG: ATIVIDADE / ROTINA */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar" : "Nova"} {form.kind === "routine" ? "rotina" : "atividade"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Título *</Label><Input value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Tipo</Label>
                <Select value={form.routine_type || ""} onValueChange={v => setForm({ ...form, routine_type: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{ROUTINE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div><Label>Responsável</Label>
                <Select value={form.responsible_name || ""} onValueChange={v => {
                  const c = collabs.find(x => x.full_name === v);
                  setForm({ ...form, responsible_name: v, responsible_phone: c?.phone || form.responsible_phone });
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar colaborador" /></SelectTrigger>
                  <SelectContent>{collabs.map(c => <SelectItem key={c.id} value={c.full_name}>{c.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>WhatsApp</Label><Input value={form.responsible_phone || ""} onChange={e => setForm({ ...form, responsible_phone: e.target.value })} placeholder="(11) 99999-9999" /></div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-2"><Label>Dia da semana (recorrente)</Label>
                <Select value={form.day_of_week != null ? String(form.day_of_week) : ""} onValueChange={v => setForm({ ...form, day_of_week: v === "" ? null : parseInt(v) })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Data (pontual)</Label><Input type="date" value={form.date || ""} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Hora</Label><Input type="time" value={form.time || ""} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div><Label>Recorrência</Label><Input value={form.recurrence || ""} onChange={e => setForm({ ...form, recurrence: e.target.value })} placeholder="Diária, semanal..." /></div>
              <div><Label>Status</Label>
                <Select value={form.status || "pending"} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div><Label>Descrição</Label><Textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>

            <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
              <div className="font-barlow font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1"><MessageCircle size={12} /> Ação WhatsApp</div>
              <div><Label>Mensagem pronta</Label><Textarea rows={3} value={form.message_template || ""} onChange={e => setForm({ ...form, message_template: e.target.value })} placeholder="Ex: Bom dia, equipe! Segue a grade de horário de hoje..." /></div>
              <div><Label>Formulário vinculado</Label>
                <Select value={form.checklist_form_id || ""} onValueChange={v => setForm({ ...form, checklist_form_id: v || null })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>{forms.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            {editing && <Button variant="destructive" onClick={() => { remove(editing.id); setOpen(false); }}>Excluir</Button>}
            <Button onClick={submit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: FORMULÁRIO */}
      <Dialog open={formDlg} onOpenChange={setFormDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>{formEditing ? "Editar" : "Novo"} formulário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
            <div><Label>Tipo</Label><Input value={formData.type || ""} onChange={e => setFormData({ ...formData, type: e.target.value })} placeholder="Checklist, Relatório, Ocorrência..." /></div>
            <div><Label>Descrição</Label><Textarea value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={formData.active ?? true} onChange={e => setFormData({ ...formData, active: e.target.checked })} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter><Button onClick={saveForm}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
