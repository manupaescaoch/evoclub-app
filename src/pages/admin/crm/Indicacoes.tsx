import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageShell, { SummaryCard, EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Gift } from "lucide-react";
import { toast } from "sonner";

type Indication = {
  id: string;
  indicator_name: string;
  indicated_name: string;
  indicated_phone: string | null;
  status: string;
  discount_percent: number;
  discount_applied: boolean;
  enrollment_date: string | null;
  notes: string | null;
  created_at: string;
};

const STATUSES = [
  { value: "registered", label: "Registrada" },
  { value: "in_contact", label: "Em contato" },
  { value: "experimental_scheduled", label: "Experimental agendada" },
  { value: "attended", label: "Compareceu" },
  { value: "enrolled", label: "Matriculado" },
  { value: "discount_applied", label: "Desconto aplicado" },
  { value: "lost", label: "Perdida" },
  { value: "cancelled", label: "Cancelada" },
];

export default function Indicacoes() {
  const [items, setItems] = useState<Indication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ indicator_name: "", indicated_name: "", indicated_phone: "", origin: "", notes: "" });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("crm_indications").select("*").order("created_at", { ascending: false });
    setItems((data as Indication[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    (statusFilter === "all" || i.status === statusFilter) &&
    (i.indicator_name.toLowerCase().includes(search.toLowerCase()) ||
     i.indicated_name.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    total: items.length,
    confirmed: items.filter(i => ["enrolled","discount_applied"].includes(i.status)).length,
    enrolled: items.filter(i => i.status === "enrolled").length,
    discountsApplied: items.filter(i => i.discount_applied).length,
    discountsPending: items.filter(i => i.status === "enrolled" && !i.discount_applied).length,
  };

  const submit = async () => {
    if (!form.indicator_name || !form.indicated_name) return toast.error("Preencha indicador e indicado.");
    const { error } = await supabase.from("crm_indications").insert({
      indicator_name: form.indicator_name,
      indicated_name: form.indicated_name,
      indicated_phone: form.indicated_phone || null,
      origin: form.origin || null,
      notes: form.notes || null,
      discount_percent: 5,
    });
    if (error) return toast.error("Erro: " + error.message);
    toast.success("Indicação registrada");
    setOpen(false);
    setForm({ indicator_name: "", indicated_name: "", indicated_phone: "", origin: "", notes: "" });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "enrolled") patch.enrollment_date = new Date().toISOString().split("T")[0];
    if (status === "discount_applied") patch.discount_applied = true;
    const { error } = await supabase.from("crm_indications").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    load();
  };

  const applyDiscount = async (i: Indication) => {
    if (i.status !== "enrolled" && i.status !== "discount_applied") {
      return toast.error("Só é possível aplicar desconto após matrícula confirmada.");
    }
    await supabase.from("crm_indications").update({ discount_applied: true, status: "discount_applied" }).eq("id", i.id);
    toast.success("Desconto de 5% aplicado");
    load();
  };

  return (
    <PageShell
      title="INDICAÇÕES"
      description="Aluno indica aluno: 5% de desconto na mensalidade quando o indicado se matricula."
      primaryAction={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus size={14} /> Nova Indicação</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Indicação</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Indicador *</Label><Input value={form.indicator_name} onChange={e => setForm({ ...form, indicator_name: e.target.value })} /></div>
              <div><Label>Nome do indicado *</Label><Input value={form.indicated_name} onChange={e => setForm({ ...form, indicated_name: e.target.value })} /></div>
              <div><Label>Telefone do indicado</Label><Input value={form.indicated_phone} onChange={e => setForm({ ...form, indicated_phone: e.target.value })} /></div>
              <div><Label>Origem</Label><Input value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} /></div>
              <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
      search={{ value: search, onChange: setSearch, placeholder: "Buscar indicador ou indicado..." }}
      filters={
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      }
      summary={
        <>
          <SummaryCard label="Total" value={stats.total} />
          <SummaryCard label="Confirmadas" value={stats.confirmed} accent="green" />
          <SummaryCard label="Matrículas" value={stats.enrolled} accent="blue" />
          <SummaryCard label="Descontos aplicados" value={stats.discountsApplied} accent="green" />
        </>
      }
    >
      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState message="Nenhuma indicação registrada." /> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Indicador</TableHead><TableHead>Indicado</TableHead><TableHead>Telefone</TableHead>
              <TableHead>Data</TableHead><TableHead>Status</TableHead><TableHead>Desconto</TableHead><TableHead className="text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.indicator_name}</TableCell>
                  <TableCell>{i.indicated_name}</TableCell>
                  <TableCell>{i.indicated_phone || "—"}</TableCell>
                  <TableCell>{new Date(i.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <Select value={i.status} onValueChange={v => updateStatus(i.id, v)}>
                      <SelectTrigger className="h-7 w-[170px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {i.discount_applied
                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">5% aplicado</span>
                      : <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Pendente</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => applyDiscount(i)}>
                      <Gift size={12} /> Aplicar 5%
                    </Button>
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
