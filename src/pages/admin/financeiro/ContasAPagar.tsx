import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { fmtBRL, fmtBRLShort, todayISO, monthRange, STATUS_LABEL, PRIORITY_LABEL } from "@/lib/finance";
import StatCard from "@/components/admin/StatCard";
import { Plus, Pencil, Trash2, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Bill = {
  id?: string; unit_id?: string | null; supplier_name?: string | null; description?: string | null;
  category_name?: string | null; amount: number; due_date: string; priority?: string;
  status?: string; payment_method?: string | null; notes?: string | null;
};

const empty: Bill = { amount: 0, due_date: todayISO(), priority: "medium", status: "pending" };

const ContasAPagar = () => {
  const { filterId, units } = useUnit();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Bill>(empty);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("accounts_payable").select("*").order("due_date", { ascending: true });
    if (filterId) q = q.eq("unit_id", filterId);
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterId]);

  const filtered = rows.filter(r => filterStatus === "all" || r.status === filterStatus);

  const today = todayISO();
  const mr = monthRange(new Date().getFullYear(), new Date().getMonth());
  const monthBills = rows.filter(r => r.due_date >= mr.start && r.due_date <= mr.end);
  const totalMonth = monthBills.reduce((s, r) => s + Number(r.amount), 0);
  const dueToday = rows.filter(r => r.due_date === today && r.status === "pending").reduce((s, r) => s + Number(r.amount), 0);
  const overdue = rows.filter(r => r.due_date < today && r.status === "pending").reduce((s, r) => s + Number(r.amount), 0);
  const paidMonth = monthBills.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0);

  const save = async () => {
    if (!form.amount || !form.due_date) { toast.error("Valor e vencimento são obrigatórios"); return; }
    const payload: any = { ...form, unit_id: filterId || form.unit_id || null };
    if (form.id) {
      const { error } = await supabase.from("accounts_payable").update(payload).eq("id", form.id);
      if (error) toast.error(error.message); else toast.success("Atualizado");
    } else {
      const { error } = await supabase.from("accounts_payable").insert(payload);
      if (error) toast.error(error.message); else toast.success("Conta criada");
    }
    setOpen(false); setForm(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta conta?")) return;
    const { error } = await supabase.from("accounts_payable").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluída"); load(); }
  };

  const markPaid = async (id: string) => {
    const { error } = await supabase.from("accounts_payable").update({ status: "paid", paid_at: todayISO() }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Marcada como paga"); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total do mês" value={fmtBRLShort(totalMonth)} accent />
        <StatCard label="Vencendo hoje" value={fmtBRLShort(dueToday)} />
        <StatCard label="Atrasadas" value={fmtBRLShort(overdue)} trend="down" trendValue="Pendente" />
        <StatCard label="Pago no mês" value={fmtBRLShort(paidMonth)} trend="up" />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-dm">
            <option value="all">Todos status</option>
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
            <option value="overdue">Atrasado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
        <Button onClick={() => { setForm(empty); setOpen(true); }} className="gap-2"><Plus size={14} /> Nova conta</Button>
      </div>

      <div className="bg-card rounded-xl card-shadow overflow-x-auto">
        <table className="w-full text-xs font-dm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-3 py-3 text-muted-foreground font-medium">Vencimento</th>
              <th className="px-3 py-3 text-muted-foreground font-medium">Fornecedor</th>
              <th className="px-3 py-3 text-muted-foreground font-medium">Categoria</th>
              <th className="px-3 py-3 text-muted-foreground font-medium">Prioridade</th>
              <th className="px-3 py-3 text-muted-foreground font-medium text-right">Valor</th>
              <th className="px-3 py-3 text-muted-foreground font-medium">Status</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Carregando...</td></tr> :
              filtered.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhuma conta</td></tr> :
              filtered.map(r => {
                const isOverdue = r.status === "pending" && r.due_date < today;
                return (
                  <tr key={r.id} className="border-b border-border">
                    <td className={`px-3 py-2 ${isOverdue ? "text-red-500 font-semibold" : ""}`}>{new Date(r.due_date).toLocaleDateString("pt-BR")}</td>
                    <td className="px-3 py-2">{r.supplier_name || "—"}</td>
                    <td className="px-3 py-2">{r.category_name || "—"}</td>
                    <td className="px-3 py-2">{PRIORITY_LABEL[r.priority] || r.priority}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmtBRL(Number(r.amount))}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-[10px] ${r.status === "paid" ? "bg-green-100 text-green-700" : isOverdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{STATUS_LABEL[r.status] || r.status}</span></td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.status !== "paid" && <button onClick={() => markPaid(r.id)} className="text-green-600 hover:bg-green-50 p-1 rounded" title="Marcar paga">✓</button>}
                        <a href={`https://wa.me/?text=${encodeURIComponent(`Conta: ${r.supplier_name || ""} - ${fmtBRL(Number(r.amount))} venc. ${new Date(r.due_date).toLocaleDateString("pt-BR")}`)}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground p-1"><MessageCircle size={14} /></a>
                        <button onClick={() => { setForm({ ...r, due_date: r.due_date }); setOpen(true); }} className="text-muted-foreground hover:text-foreground p-1"><Pencil size={14} /></button>
                        <button onClick={() => remove(r.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Editar conta" : "Nova conta"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Fornecedor</Label><Input value={form.supplier_name || ""} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} /></div>
            <div className="col-span-2"><Label>Descrição</Label><Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Categoria</Label><Input value={form.category_name || ""} onChange={(e) => setForm({ ...form, category_name: e.target.value })} /></div>
            <div><Label>Valor *</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            <div><Label>Vencimento *</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <div>
              <Label>Prioridade</Label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option>
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="pending">Pendente</option><option value="paid">Pago</option><option value="overdue">Atrasado</option><option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div>
              <Label>Unidade</Label>
              <select value={form.unit_id || ""} onChange={(e) => setForm({ ...form, unit_id: e.target.value || null })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">—</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="col-span-2"><Label>Observações</Label><Input value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContasAPagar;