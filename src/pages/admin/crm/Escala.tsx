import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageShell, { LoadingState, EmptyState } from "@/components/admin/gerencial/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Copy } from "lucide-react";
import { toast } from "sonner";

type Schedule = {
  id: string; month: number; year: number; date_label: string | null; schedule_date: string | null;
  trainer_name: string | null; trainer_hours: string | null;
  reception_name: string | null; reception_hours: string | null;
  cleaning_name: string | null; cleaning_hours: string | null;
  security_name: string | null; security_hours: string | null;
  is_holiday: boolean; notes: string | null;
};

const DEFAULTS = {
  trainer_hours: "08h às 14h",
  reception_hours: "08h às 12h",
  cleaning_hours: "10h às 14h",
  security_hours: "10h às 14h",
};

export default function Escala() {
  const now = new Date();
  const [items, setItems] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [holidayFilter, setHolidayFilter] = useState<"all" | "yes" | "no">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [form, setForm] = useState<Partial<Schedule>>({ ...DEFAULTS, is_holiday: false });

  const load = async () => {
    setLoading(true);
    let q = supabase.from("staff_schedules").select("*").eq("month", month).eq("year", year).order("schedule_date", { ascending: true });
    const { data } = await q;
    let list = (data as Schedule[]) || [];
    if (holidayFilter !== "all") list = list.filter(x => x.is_holiday === (holidayFilter === "yes"));
    setItems(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, [month, year, holidayFilter]);

  const submit = async () => {
    const payload = { ...form, month, year };
    if (editing) {
      await supabase.from("staff_schedules").update(payload).eq("id", editing.id);
      toast.success("Atualizada");
    } else {
      await supabase.from("staff_schedules").insert(payload as any);
      toast.success("Criada");
    }
    setOpen(false); setEditing(null); setForm({ ...DEFAULTS, is_holiday: false });
    load();
  };

  const duplicate = async (s: Schedule) => {
    const { id, ...rest } = s;
    await supabase.from("staff_schedules").insert(rest);
    toast.success("Duplicada");
    load();
  };

  const openEdit = (s: Schedule) => { setEditing(s); setForm(s); setOpen(true); };
  const openNew = () => { setEditing(null); setForm({ ...DEFAULTS, is_holiday: false }); setOpen(true); };

  const filters = (
    <>
      <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
        <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
        <SelectContent>{Array.from({length:12}).map((_,i) => <SelectItem key={i+1} value={String(i+1)}>{String(i+1).padStart(2,"0")}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
        <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
        <SelectContent>{[year-1, year, year+1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={holidayFilter} onValueChange={v => setHolidayFilter(v as any)}>
        <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="yes">Feriado</SelectItem>
          <SelectItem value="no">Final de semana</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  return (
    <PageShell
      title="ESCALA"
      description="Escala de fim de semana e feriados por unidade — treinador, recepção, serviços gerais e segurança."
      primaryAction={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2" onClick={openNew}><Plus size={14} /> Nova escala</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? "Editar escala" : "Nova escala"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Data</Label><Input type="date" value={form.schedule_date || ""} onChange={e => setForm({ ...form, schedule_date: e.target.value })} /></div>
                <div><Label>Rótulo (FDS / Feriado)</Label><Input value={form.date_label || ""} onChange={e => setForm({ ...form, date_label: e.target.value })} placeholder="FDS 1, Feriado..." /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Treinador</Label><Input value={form.trainer_name || ""} onChange={e => setForm({ ...form, trainer_name: e.target.value })} /></div>
                <div><Label>Horário</Label><Input value={form.trainer_hours || ""} onChange={e => setForm({ ...form, trainer_hours: e.target.value })} /></div>
                <div><Label>Recepção</Label><Input value={form.reception_name || ""} onChange={e => setForm({ ...form, reception_name: e.target.value })} /></div>
                <div><Label>Horário</Label><Input value={form.reception_hours || ""} onChange={e => setForm({ ...form, reception_hours: e.target.value })} /></div>
                <div><Label>Serviços Gerais</Label><Input value={form.cleaning_name || ""} onChange={e => setForm({ ...form, cleaning_name: e.target.value })} /></div>
                <div><Label>Horário</Label><Input value={form.cleaning_hours || ""} onChange={e => setForm({ ...form, cleaning_hours: e.target.value })} /></div>
                <div><Label>Segurança</Label><Input value={form.security_name || ""} onChange={e => setForm({ ...form, security_name: e.target.value })} /></div>
                <div><Label>Horário</Label><Input value={form.security_hours || ""} onChange={e => setForm({ ...form, security_hours: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={!!form.is_holiday} onCheckedChange={v => setForm({ ...form, is_holiday: !!v })} id="hol" />
                <Label htmlFor="hol">É feriado</Label>
              </div>
              <div><Label>Observações</Label><Textarea value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
      filters={filters}
    >
      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? <LoadingState /> : items.length === 0 ? <EmptyState message="Nenhuma escala neste período." /> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data / FDS</TableHead><TableHead>Treinador</TableHead><TableHead>Recepção</TableHead>
              <TableHead>Serviços Gerais</TableHead><TableHead>Segurança</TableHead><TableHead>Feriado</TableHead><TableHead className="text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.map(s => (
                <TableRow key={s.id} className={s.is_holiday ? "bg-amber-50/50" : ""}>
                  <TableCell className="font-medium">
                    {s.schedule_date ? new Date(s.schedule_date).toLocaleDateString("pt-BR") : "—"}
                    {s.date_label && <div className="text-xs text-muted-foreground font-dm">{s.date_label}</div>}
                  </TableCell>
                  <TableCell>{s.trainer_name || "—"}<div className="text-xs text-muted-foreground">{s.trainer_hours}</div></TableCell>
                  <TableCell>{s.reception_name || "—"}<div className="text-xs text-muted-foreground">{s.reception_hours}</div></TableCell>
                  <TableCell>{s.cleaning_name || "—"}<div className="text-xs text-muted-foreground">{s.cleaning_hours}</div></TableCell>
                  <TableCell>{s.security_name || "—"}<div className="text-xs text-muted-foreground">{s.security_hours}</div></TableCell>
                  <TableCell>{s.is_holiday ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Sim</span> : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>Editar</Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicate(s)}><Copy size={14} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </PageShell>
  );
}
