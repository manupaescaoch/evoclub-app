import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { fmtBRL, fmtBRLShort, STATUS_LABEL } from "@/lib/finance";
import StatCard from "@/components/admin/StatCard";
import { Plus, Pencil, Trash2, Download, FileUp, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const Folha = () => {
  const { filterId, units } = useUnit();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [run, setRun] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(null);

  const loadRun = async () => {
    setLoading(true);
    let q = supabase.from("payroll_runs").select("*").eq("month", month).eq("year", year);
    if (filterId) q = q.eq("unit_id", filterId); else q = q.is("unit_id", null);
    const { data } = await q.maybeSingle();
    setRun(data);
    if (data) {
      const { data: its } = await supabase.from("payroll_items").select("*").eq("run_id", data.id).order("name");
      setItems(its || []);
    } else setItems([]);
    setLoading(false);
  };
  useEffect(() => { loadRun(); }, [filterId, month, year]);

  const createRun = async () => {
    const payload = { month, year, unit_id: filterId || null, status: "draft" };
    const { data, error } = await supabase.from("payroll_runs").insert(payload).select().single();
    if (error) return toast.error(error.message);
    setRun(data); toast.success("Folha criada");
  };

  const generateFromCollaborators = async () => {
    if (!run) return toast.error("Crie a folha primeiro");
    let cq = supabase.from("collaborators").select("*").eq("status", "active");
    if (filterId) cq = cq.eq("unit_id", filterId);
    const { data: collabs } = await cq;
    if (!collabs?.length) return toast.error("Nenhum colaborador ativo");
    const rows = collabs.map((c: any) => ({
      run_id: run.id, collaborator_id: c.id, name: c.full_name, cpf: c.cpf,
      contract_type: c.role_title, salary: 0, commission: 0, bonus: 0, discounts: 0, advances: 0, net_value: 0, status: "pending",
    }));
    const { error } = await supabase.from("payroll_items").insert(rows);
    if (error) toast.error(error.message); else { toast.success(`${rows.length} colaboradores adicionados`); loadRun(); }
  };

  const saveItem = async () => {
    const net = (Number(form.salary) || 0) + (Number(form.commission) || 0) + (Number(form.bonus) || 0) - (Number(form.discounts) || 0) - (Number(form.advances) || 0);
    const payload = { ...form, net_value: net };
    if (form.id) {
      const { error } = await supabase.from("payroll_items").update(payload).eq("id", form.id);
      if (error) toast.error(error.message); else toast.success("Atualizado");
    } else {
      const { error } = await supabase.from("payroll_items").insert({ ...payload, run_id: run.id });
      if (error) toast.error(error.message); else toast.success("Adicionado");
    }
    setOpen(false); loadRun();
  };

  const removeItem = async (id: string) => {
    if (!confirm("Excluir linha?")) return;
    await supabase.from("payroll_items").delete().eq("id", id);
    loadRun();
  };

  const setStatus = async (status: string) => {
    if (!run) return;
    const totalGross = items.reduce((s, i) => s + Number(i.salary || 0) + Number(i.commission || 0) + Number(i.bonus || 0), 0);
    const totalNet = items.reduce((s, i) => s + Number(i.net_value || 0), 0);
    const { error } = await supabase.from("payroll_runs").update({ status, total_gross: totalGross, total_net: totalNet }).eq("id", run.id);
    if (error) toast.error(error.message); else { toast.success(`Folha ${STATUS_LABEL[status]}`); loadRun(); }
  };

  const exportCSV = () => {
    const header = "Nome;CPF;Contrato;Salário;Comissão;Bônus;Descontos;Adiantamentos;Líquido;Forma;Pix";
    const lines = items.map(i => [i.name, i.cpf || "", i.contract_type || "", i.salary, i.commission, i.bonus, i.discounts, i.advances, i.net_value, i.payment_method || "", i.pix_key || ""].join(";"));
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `folha-${year}-${month}.csv`; a.click();
  };

  const totalNet = items.reduce((s, i) => s + Number(i.net_value || 0), 0);
  const totalGross = items.reduce((s, i) => s + Number(i.salary || 0) + Number(i.commission || 0) + Number(i.bonus || 0), 0);
  const totalDed = items.reduce((s, i) => s + Number(i.discounts || 0) + Number(i.advances || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs font-dm text-muted-foreground">Mês:</label>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-dm">
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
        </select>
        <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-9 w-24" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Bruto" value={fmtBRLShort(totalGross)} />
        <StatCard label="Líquido" value={fmtBRLShort(totalNet)} accent />
        <StatCard label="Deduções" value={fmtBRLShort(totalDed)} />
        <StatCard label="Colaboradores" value={String(items.length)} />
      </div>

      {!run ? (
        <div className="bg-card rounded-xl p-8 card-shadow text-center">
          <p className="text-sm text-muted-foreground mb-3">Nenhuma folha criada para {month}/{year}.</p>
          <Button onClick={createRun} className="gap-2"><Plus size={14} /> Criar folha</Button>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl p-3 card-shadow flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-dm text-muted-foreground">Status:</span>
              <span className="px-2 py-0.5 rounded text-[11px] bg-primary/10 text-primary font-semibold">{STATUS_LABEL[run.status] || run.status}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={generateFromCollaborators} className="gap-1.5"><FileUp size={14} /> Gerar de Colaboradores</Button>
              <Button size="sm" variant="outline" onClick={() => { setForm({ name: "", salary: 0, commission: 0, bonus: 0, discounts: 0, advances: 0, status: "pending" }); setOpen(true); }} className="gap-1.5"><Plus size={14} /> Adicionar</Button>
              <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5"><Download size={14} /> CSV</Button>
              <Button size="sm" variant="outline" onClick={() => setStatus("validated")} disabled={run.status !== "draft"}>Validar</Button>
              <Button size="sm" variant="outline" onClick={() => setStatus("approved")} disabled={run.status !== "validated"}>Aprovar</Button>
              <Button size="sm" onClick={() => setStatus("paid")} disabled={run.status !== "approved"} className="gap-1.5"><CheckCircle2 size={14} /> Marcar pago</Button>
            </div>
          </div>

          <div className="bg-card rounded-xl card-shadow overflow-x-auto">
            <table className="w-full text-xs font-dm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-3 py-3 text-muted-foreground font-medium">Nome</th>
                  <th className="px-3 py-3 text-muted-foreground font-medium">Contrato</th>
                  <th className="px-3 py-3 text-right text-muted-foreground font-medium">Salário</th>
                  <th className="px-3 py-3 text-right text-muted-foreground font-medium">Comissão</th>
                  <th className="px-3 py-3 text-right text-muted-foreground font-medium">Bônus</th>
                  <th className="px-3 py-3 text-right text-muted-foreground font-medium">Desc.</th>
                  <th className="px-3 py-3 text-right text-muted-foreground font-medium">Adiant.</th>
                  <th className="px-3 py-3 text-right text-muted-foreground font-medium">Líquido</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">Carregando...</td></tr> :
                  items.length === 0 ? <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">Sem colaboradores</td></tr> :
                  items.map(i => (
                    <tr key={i.id} className="border-b border-border">
                      <td className="px-3 py-2">{i.name}</td>
                      <td className="px-3 py-2">{i.contract_type || "—"}</td>
                      <td className="px-3 py-2 text-right">{fmtBRL(Number(i.salary))}</td>
                      <td className="px-3 py-2 text-right">{fmtBRL(Number(i.commission))}</td>
                      <td className="px-3 py-2 text-right">{fmtBRL(Number(i.bonus))}</td>
                      <td className="px-3 py-2 text-right text-red-500">{fmtBRL(Number(i.discounts))}</td>
                      <td className="px-3 py-2 text-right text-red-500">{fmtBRL(Number(i.advances))}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmtBRL(Number(i.net_value))}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setForm({ ...i }); setOpen(true); }} className="text-muted-foreground hover:text-foreground p-1"><Pencil size={14} /></button>
                          <button onClick={() => removeItem(i.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {form && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Editar colaborador" : "Novo colaborador"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>CPF</Label><Input value={form.cpf || ""} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
              <div><Label>Tipo contratação</Label><Input value={form.contract_type || ""} onChange={(e) => setForm({ ...form, contract_type: e.target.value })} /></div>
              <div><Label>Salário</Label><Input type="number" step="0.01" value={form.salary} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} /></div>
              <div><Label>Comissão</Label><Input type="number" step="0.01" value={form.commission} onChange={(e) => setForm({ ...form, commission: Number(e.target.value) })} /></div>
              <div><Label>Bônus</Label><Input type="number" step="0.01" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: Number(e.target.value) })} /></div>
              <div><Label>Descontos</Label><Input type="number" step="0.01" value={form.discounts} onChange={(e) => setForm({ ...form, discounts: Number(e.target.value) })} /></div>
              <div><Label>Adiantamentos</Label><Input type="number" step="0.01" value={form.advances} onChange={(e) => setForm({ ...form, advances: Number(e.target.value) })} /></div>
              <div><Label>Forma pagamento</Label><Input value={form.payment_method || ""} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} /></div>
              <div className="col-span-2"><Label>Chave Pix / Banco</Label><Input value={form.pix_key || ""} onChange={(e) => setForm({ ...form, pix_key: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={saveItem}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Folha;