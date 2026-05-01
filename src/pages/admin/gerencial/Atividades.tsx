import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Copy, Power } from "lucide-react";
import { toast } from "sonner";
import PageShell, { EmptyState, LoadingState, StatusBadge } from "@/components/admin/gerencial/PageShell";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Activity = {
  id: string; name: string; activity_group: string | null; color: string;
  duration_min: number; max_capacity: number; description: string | null;
  allow_booking: boolean; visible_to_student: boolean; internal_notes: string | null;
  status: string;
};

const empty: Partial<Activity> = {
  name: "", activity_group: "", color: "#1400FF", duration_min: 60, max_capacity: 14,
  description: "", allow_booking: true, visible_to_student: true, internal_notes: "", status: "active",
};

export default function Atividades() {
  const [rows, setRows] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Activity>>(empty);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("grade_activities").select("*").order("name");
    if (error) toast.error("Erro ao carregar"); setRows(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const groups = Array.from(new Set(rows.map(r => r.activity_group).filter(Boolean) as string[]));
  const filtered = rows.filter(r =>
    (statusFilter === "all" || r.status === statusFilter) &&
    (groupFilter === "all" || r.activity_group === groupFilter) &&
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const save = async () => {
    if (!form.name) { toast.error("Nome é obrigatório"); return; }
    const payload: any = { ...form }; delete payload.id;
    const res = form.id
      ? await supabase.from("grade_activities").update(payload).eq("id", form.id)
      : await supabase.from("grade_activities").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Salvo!"); setOpen(false); setForm(empty); load();
  };
  const duplicate = async (r: Activity) => {
    const { id, ...rest } = r as any;
    const { error } = await supabase.from("grade_activities").insert({ ...rest, name: `${r.name} (cópia)` });
    if (error) toast.error(error.message); else { toast.success("Duplicado"); load(); }
  };
  const toggleStatus = async (r: Activity) => {
    if (!confirm(`${r.status === "active" ? "Inativar" : "Ativar"} "${r.name}"?`)) return;
    await supabase.from("grade_activities").update({ status: r.status === "active" ? "inactive" : "active" }).eq("id", r.id);
    load();
  };

  return (
    <PageShell
      title="Atividades na Grade"
      description="Atividades disponíveis na grade da academia."
      primaryAction={<Button onClick={() => { setForm(empty); setOpen(true); }} className="gap-2"><Plus size={16} />Nova atividade</Button>}
      search={{ value: search, onChange: setSearch }}
      filters={
        <>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Grupo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              {groups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </>
      }
    >
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-dm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                <tr><th className="px-4 py-3">Atividade</th><th className="px-4 py-3">Cor</th><th className="px-4 py-3">Grupo</th><th className="px-4 py-3">Duração</th><th className="px-4 py-3">Capacidade</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3"><span className="inline-block w-5 h-5 rounded" style={{ background: r.color }} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{r.activity_group || "—"}</td>
                    <td className="px-4 py-3">{r.duration_min} min</td>
                    <td className="px-4 py-3">{r.max_capacity}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3"><div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => { setForm(r); setOpen(true); }}><Pencil size={14} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => duplicate(r)}><Copy size={14} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => toggleStatus(r)}><Power size={14} /></Button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar atividade" : "Nova atividade"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2"><Label>Nome</Label><Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Grupo</Label><Input value={form.activity_group || ""} onChange={e => setForm({ ...form, activity_group: e.target.value })} placeholder="Ex: Avaliações" /></div>
            <div><Label>Cor</Label><Input type="color" value={form.color || "#1400FF"} onChange={e => setForm({ ...form, color: e.target.value })} /></div>
            <div><Label>Duração (min)</Label><Input type="number" value={form.duration_min ?? ""} onChange={e => setForm({ ...form, duration_min: Number(e.target.value) })} /></div>
            <div><Label>Capacidade máxima</Label><Input type="number" value={form.max_capacity ?? ""} onChange={e => setForm({ ...form, max_capacity: Number(e.target.value) })} /></div>
            <div className="md:col-span-2"><Label>Descrição</Label><Textarea rows={2} value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={!!form.allow_booking} onCheckedChange={v => setForm({ ...form, allow_booking: v })} /><Label>Permite agendamento</Label></div>
            <div className="flex items-center gap-2"><Switch checked={!!form.visible_to_student} onCheckedChange={v => setForm({ ...form, visible_to_student: v })} /><Label>Aparece para aluno</Label></div>
            <div className="md:col-span-2"><Label>Observações internas</Label><Textarea rows={2} value={form.internal_notes || ""} onChange={e => setForm({ ...form, internal_notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}