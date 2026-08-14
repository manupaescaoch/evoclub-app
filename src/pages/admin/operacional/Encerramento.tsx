import { useEffect, useState } from "react";
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
import { Plus, CheckCircle2, BookOpenCheck } from "lucide-react";
import { toast } from "sonner";
import { useUnit } from "@/contexts/UnitContext";
import { usePeriod, brToday } from "@/contexts/PeriodContext";
import { logAudit } from "@/lib/audit";

type Closure = {
  id: string; unit_id: string | null; collaborator_id: string | null; collaborator_name: string | null;
  sector: string; shift: string; date: string; started_at: string; submitted_at: string | null;
  status: string; system_data: any; answers: any; summary: string | null;
};
type Read = { id: string; closure_id: string; collaborator_name: string | null; read_at: string };

const SECTORS = [
  { value: "recepcao", label: "Recepção" },
  { value: "tecnico", label: "Técnico" },
  { value: "comercial", label: "Comercial" },
  { value: "gerencia", label: "Gerência" },
];
const SHIFTS = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
];

/** campos por setor: key do sistema (número real) + campo de texto complementar */
const SECTOR_FIELDS: Record<string, { key: string; label: string; systemKey?: string }[]> = {
  recepcao: [
    { key: "pagamentos", label: "Pagamentos", systemKey: "pagamentos" },
    { key: "experimentais", label: "Experimentais", systemKey: "experimentais" },
    { key: "contratos", label: "Contratos", systemKey: "contratos" },
    { key: "acessos", label: "Acessos", systemKey: "acessos" },
    { key: "ocorrencias", label: "Ocorrências", systemKey: "ocorrencias" },
    { key: "pendencias", label: "Pendências" },
  ],
  tecnico: [
    { key: "treinos_vencidos", label: "Treinos vencidos", systemKey: "treinos_vencidos" },
    { key: "limitacoes", label: "Limitações", systemKey: "limitacoes" },
    { key: "dor_desconforto", label: "Dor e desconforto", systemKey: "dor_desconforto" },
    { key: "equipamentos", label: "Equipamentos" },
    { key: "pendencias", label: "Pendências" },
  ],
  comercial: [
    { key: "leads", label: "Leads", systemKey: "leads" },
    { key: "experimentais", label: "Experimentais", systemKey: "experimentais" },
    { key: "vendas", label: "Vendas", systemKey: "vendas" },
    { key: "follow_ups", label: "Follow ups", systemKey: "follow_ups" },
  ],
  gerencia: [
    { key: "operacao", label: "Operação" },
    { key: "manutencao", label: "Manutenção" },
    { key: "equipe", label: "Equipe" },
    { key: "financeiro_operacional", label: "Financeiro operacional", systemKey: "pagamentos" },
    { key: "decisoes", label: "Decisões" },
  ],
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function OperacionalEncerramento() {
  const { filterId, units } = useUnit();
  const { from, to } = usePeriod();
  const [rows, setRows] = useState<Closure[]>([]);
  const [reads, setReads] = useState<Read[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [sector, setSector] = useState("recepcao");
  const [shift, setShift] = useState("manha");
  const [date, setDate] = useState(() => iso(brToday()));
  const [collaboratorName, setCollaboratorName] = useState("");
  const [systemData, setSystemData] = useState<Record<string, number>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("shift_closures").select("*")
      .gte("date", from).lte("date", to)
      .order("date", { ascending: false }).order("submitted_at", { ascending: false, nullsFirst: false });
    if (filterId) q = q.eq("unit_id", filterId);
    const { data, error } = await q;
    if (error) toast.error("Erro ao carregar encerramentos: " + error.message);
    const list = (data as Closure[]) || [];
    setRows(list);
    if (list.length) {
      const { data: rd } = await supabase.from("shift_handover_reads").select("*")
        .in("closure_id", list.map(r => r.id)).order("read_at", { ascending: false });
      setReads((rd as Read[]) || []);
    } else setReads([]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filterId, from, to]);

  const prefill = async (s: string, d: string) => {
    const { data, error } = await supabase.rpc("shift_closure_prefill", {
      _unit_id: filterId, _sector: s, _date: d,
    });
    if (error) return toast.error("Não foi possível puxar os números do sistema: " + error.message);
    setSystemData((data as any) || {});
  };

  const openNew = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const meta: any = user?.user_metadata || {};
    setCollaboratorName(meta.full_name || meta.name || user?.email || "");
    setAnswers({}); setSummary("");
    setOpen(true);
    prefill(sector, date);
  };

  const submit = async () => {
    if (!collaboratorName.trim()) return toast.error("Informe o colaborador");
    setSaving(true);
    const { data: collab } = await supabase.rpc("current_collaborator_id");
    const { data: created, error } = await supabase.from("shift_closures").insert({
      unit_id: filterId, collaborator_id: (collab as string) || null, collaborator_name: collaboratorName.trim(),
      sector, shift, date, system_data: systemData, answers,
    }).select().single();
    if (error) { setSaving(false); return toast.error(error.message); }

    const auto = SECTOR_FIELDS[sector].map(f => {
      const num = f.systemKey ? systemData[f.systemKey] : undefined;
      const txt = answers[f.key];
      return `${f.label}: ${num != null ? num : "—"}${txt ? ` — ${txt}` : ""}`;
    }).join("\n");
    const finalSummary = `${SECTORS.find(s => s.value === sector)?.label} · ${SHIFTS.find(s => s.value === shift)?.label} · ${new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR")}\n${auto}${summary ? `\nObservações: ${summary}` : ""}`;

    const { error: e2 } = await supabase.rpc("shift_closure_submit", {
      _id: (created as Closure).id, _summary: finalSummary,
    });
    setSaving(false);
    if (e2) return toast.error(e2.message);
    await logAudit({
      action: "create", entity: "shift_closures", entity_id: (created as Closure).id, module: "operacional",
      description: `Encerramento de turno enviado (${sector}/${shift})`, unit_id: filterId, after: { sector, shift, date },
    });
    toast.success("Encerramento enviado e passagem de turno gerada");
    setOpen(false);
    load();
  };

  const ack = async (id: string) => {
    const { error } = await supabase.rpc("handover_ack", { _closure_id: id });
    if (error) return toast.error(error.message);
    await logAudit({
      action: "custom", entity: "shift_handover_reads", entity_id: id, module: "operacional",
      description: "Confirmou leitura da passagem de turno",
    });
    toast.success("Leitura da passagem de turno registrada");
    load();
  };

  const unitName = (id: string | null) => units.find(u => u.id === id)?.name || "—";
  const submitted = rows.filter(r => r.status === "submitted");
  const pending = rows.filter(r => r.status !== "submitted");

  return (
    <PageShell
      title="ENCERRAMENTO DE TURNO"
      description="Formulário por setor com números reais do sistema e passagem de turno confirmada por quem assume."
      primaryAction={<Button className="gap-2" onClick={openNew}><Plus size={14} /> Novo encerramento</Button>}
      summary={
        <>
          <SummaryCard label="Enviados" value={submitted.length} accent="green" />
          <SummaryCard label="Pendentes" value={pending.length} accent="red" />
          <SummaryCard label="Leituras registradas" value={reads.length} accent="blue" />
          <SummaryCard label="Total no período" value={rows.length} />
        </>
      }
    >
      <Tabs defaultValue="encerramentos">
        <TabsList>
          <TabsTrigger value="encerramentos">Encerramentos</TabsTrigger>
          <TabsTrigger value="passagem">Passagem de turno</TabsTrigger>
        </TabsList>

        <TabsContent value="encerramentos">
          <div className="rounded-xl border bg-card overflow-hidden">
            {loading ? <LoadingState /> : rows.length === 0 ? <EmptyState message="Nenhum encerramento no período." /> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Data</TableHead><TableHead>Setor</TableHead><TableHead>Turno</TableHead>
                  <TableHead>Colaborador</TableHead><TableHead>Unidade</TableHead>
                  <TableHead>Início</TableHead><TableHead>Envio</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(`${r.date}T12:00:00`).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>{SECTORS.find(s => s.value === r.sector)?.label}</TableCell>
                      <TableCell>{SHIFTS.find(s => s.value === r.shift)?.label}</TableCell>
                      <TableCell className="font-medium">{r.collaborator_name || "—"}</TableCell>
                      <TableCell>{unitName(r.unit_id)}</TableCell>
                      <TableCell>{new Date(r.started_at).toLocaleTimeString("pt-BR").slice(0, 5)}</TableCell>
                      <TableCell>{r.submitted_at ? new Date(r.submitted_at).toLocaleString("pt-BR") : "—"}</TableCell>
                      <TableCell>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-dm ${
                          r.status === "submitted" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {r.status === "submitted" ? "Enviado" : "Pendência"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="passagem" className="space-y-3">
          {loading ? <LoadingState /> : submitted.length === 0 ? <EmptyState message="Nenhuma passagem de turno disponível." /> : (
            submitted.map(r => {
              const rs = reads.filter(x => x.closure_id === r.id);
              return (
                <div key={r.id} className="rounded-xl border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-barlow font-bold text-sm uppercase">
                        {SECTORS.find(s => s.value === r.sector)?.label} · {SHIFTS.find(s => s.value === r.shift)?.label}
                      </p>
                      <p className="text-xs text-muted-foreground font-dm">
                        {new Date(`${r.date}T12:00:00`).toLocaleDateString("pt-BR")} · {r.collaborator_name || "—"} · {unitName(r.unit_id)}
                      </p>
                    </div>
                    <Button size="sm" className="gap-2" onClick={() => ack(r.id)}>
                      <BookOpenCheck size={14} /> Li a passagem de turno
                    </Button>
                  </div>
                  <pre className="text-xs font-dm whitespace-pre-wrap bg-muted/40 rounded-lg p-3">{r.summary || "—"}</pre>
                  <div className="text-xs text-muted-foreground font-dm">
                    {rs.length === 0 ? "Nenhuma leitura confirmada ainda." : (
                      <ul className="space-y-0.5">
                        {rs.map(x => (
                          <li key={x.id} className="flex items-center gap-1">
                            <CheckCircle2 size={12} className="text-green-600" />
                            {x.collaborator_name || "Equipe"} — {new Date(x.read_at).toLocaleString("pt-BR")}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Encerramento de turno</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Setor</Label>
                <Select value={sector} onValueChange={v => { setSector(v); prefill(v, date); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SECTORS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Turno</Label>
                <Select value={shift} onValueChange={setShift}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SHIFTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Data</Label>
                <Input type="date" value={date} onChange={e => { setDate(e.target.value); prefill(sector, e.target.value); }} /></div>
              <div><Label>Colaborador *</Label>
                <Input value={collaboratorName} onChange={e => setCollaboratorName(e.target.value)} /></div>
            </div>

            <div className="space-y-2 pt-1">
              {SECTOR_FIELDS[sector].map(f => (
                <div key={f.key}>
                  <Label className="flex items-center gap-2">
                    {f.label}
                    {f.systemKey && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-dm">
                        sistema: {systemData[f.systemKey] ?? 0}
                      </span>
                    )}
                  </Label>
                  <Textarea rows={2} value={answers[f.key] || ""}
                    onChange={e => setAnswers({ ...answers, [f.key]: e.target.value })}
                    placeholder="Complemento ou justificativa" />
                </div>
              ))}
            </div>

            <div><Label>Observações gerais</Label>
              <Textarea rows={2} value={summary} onChange={e => setSummary(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={saving}>{saving ? "Enviando..." : "Enviar encerramento"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}