import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { fmtBRL, fmtBRLShort, todayISO, STATUS_LABEL } from "@/lib/finance";
import StatCard from "@/components/admin/StatCard";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Tx = {
  id?: string; date: string; description: string; kind: string; amount: number;
  category_name?: string | null; payment_method?: string | null; status: string; unit_id?: string | null; notes?: string | null;
};

const empty: Tx = { date: todayISO(), description: "", kind: "income", amount: 0, status: "paid" };

const Transacoes = () => {
  const { filterId, units } = useUnit();
  const [params] = useSearchParams();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Tx>(empty);
  const [filterKind, setFilterKind] = useState(params.get("kind") || "all");
  const [search, setSearch] = useState("");

  // filtros herdados do dashboard (período e categoria)
  const from = params.get("from");
  const to = params.get("to");
  const category = params.get("category");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("transactions").select("*").order("date", { ascending: false }).limit(500);
    if (filterId) q = q.eq("unit_id", filterId);
    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filterId, from, to]);

  const filtered = rows.filter(r =>
    (filterKind === "all" || r.kind === filterKind) &&
    (!category || (category === "none" ? !r.category_name : r.category_name === category)) &&
    (!search || (r.description || "").toLowerCase().includes(search.toLowerCase()) || (r.category_name || "").toLowerCase().includes(search.toLowerCase()))
  );

  const totalIn = filtered.filter(r => r.kind === "income").reduce((s, r) => s + Number(r.amount), 0);
  const totalOut = filtered.filter(r => r.kind === "expense").reduce((s, r) => s + Number(r.amount), 0);

  const save = async () => {
    if (!form.description || !form.amount) { toast.error("Descrição e valor obrigatórios"); return; }
    const payload: any = { ...form, unit_id: filterId || form.unit_id || null };
    if (form.id) {
      const { error } = await supabase.from("transactions").update(payload).eq("id", form.id);
      if (error) toast.error(error.message); else toast.success("Atualizada");
    } else {
      const { error } = await supabase.from("transactions").insert(payload);
      if (error) toast.error(error.message); else toast.success("Criada");
    }
    setOpen(false); setForm(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir transação?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluída"); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Entradas (filtro)" value={fmtBRLShort(totalIn)} accent />
        <StatCard label="Saídas (filtro)" value={fmtBRLShort(totalOut)} />
        <StatCard label="Saldo (filtro)" value={fmtBRLShort(totalIn - totalOut)} trend={totalIn - totalOut >= 0 ? "up" : "down"} />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <select value={filterKind} onChange={(e) => setFilterKind(e.target.value)} className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-dm">
            <option value="all">Todos</option><option value="income">Entradas</option><option value="expense">Saídas</option>
          </select>
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-56" />
        </div>
        <Button onClick={() => { setForm(empty); setOpen(true); }} className="gap-2"><Plus size={14} /> Nova transação</Button>
      </div>

      <div className="bg-card rounded-xl card-shadow overflow-x-auto">
        <table className="w-full text-xs font-dm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-3 py-3 text-muted-foreground font-medium">Data</th>
              <th className="px-3 py-3 text-muted-foreground font-medium">Descrição</th>
              <th className="px-3 py-3 text-muted-foreground font-medium">Tipo</th>
              <th className="px-3 py-3 text-muted-foreground font-medium">Categoria</th>
              <th className="px-3 py-3 text-muted-foreground font-medium text-right">Valor</th>
              <th className="px-3 py-3 text-muted-foreground font-medium">Status</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Carregando...</td></tr> :
              filtered.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhuma transação</td></tr> :
              filtered.map(r => (
                <tr key={r.id} className="border-b border-border">
                  <td className="px-3 py-2">{new Date(r.date).toLocaleDateString("pt-BR")}</td>
                  <td className="px-3 py-2">{r.description}</td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-[10px] ${r.kind === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{r.kind === "income" ? "Entrada" : "Saída"}</span></td>
                  <td className="px-3 py-2">{r.category_name || "—"}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${r.kind === "income" ? "text-green-600" : "text-red-500"}`}>{fmtBRL(Number(r.amount))}</td>
                  <td className="px-3 py-2">{STATUS_LABEL[r.status] || r.status}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setForm({ ...r }); setOpen(true); }} className="text-muted-foreground hover:text-foreground p-1"><Pencil size={14} /></button>
                      <button onClick={() => remove(r.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Editar transação" : "Nova transação"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Descrição *</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Data</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div><Label>Valor *</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            <div>
              <Label>Tipo</Label>
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="income">Entrada</option><option value="expense">Saída</option>
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="paid">Pago</option><option value="pending">Pendente</option><option value="scheduled">Agendado</option><option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div><Label>Categoria</Label><Input value={form.category_name || ""} onChange={(e) => setForm({ ...form, category_name: e.target.value })} /></div>
            <div><Label>Método</Label><Input value={form.payment_method || ""} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} placeholder="Pix, Cartão, Dinheiro..." /></div>
            <div className="col-span-2">
              <Label>Unidade</Label>
              <select value={form.unit_id || ""} onChange={(e) => setForm({ ...form, unit_id: e.target.value || null })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">—</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transacoes;