import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gift, Plus } from "lucide-react";

type Benefit = {
  id: string;
  client_id: number;
  title: string;
  description: string | null;
  status: string;
  delivered_at: string | null;
  clients?: { name: string } | null;
};

type ClientOpt = { id: number; name: string };

/** Benefícios de renovação: equipe cria e marca como entregue. */
export default function RenewalBenefitsPanel() {
  const [items, setItems] = useState<Benefit[]>([]);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const load = async () => {
    const [b, c] = await Promise.all([
      supabase
        .from("renewal_benefits")
        .select("id, client_id, title, description, status, delivered_at, clients(name)")
        .order("created_at", { ascending: false }),
      supabase.from("clients").select("id, name").order("name").limit(500),
    ]);
    setItems((b.data as unknown as Benefit[]) || []);
    setClients((c.data as ClientOpt[]) || []);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!clientId || !title.trim()) return toast.error("Selecione o aluno e informe o benefício.");
    const { error } = await supabase.from("renewal_benefits").insert({
      client_id: Number(clientId),
      title: title.trim(),
      description: description.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Benefício liberado no app do aluno");
    setTitle(""); setDescription("");
    load();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("renewal_benefits")
      .update({ status, delivered_at: status === "delivered" ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="mt-6 rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b">
        <p className="text-sm font-semibold flex items-center gap-2"><Gift size={14} /> Benefícios de renovação</p>
        <p className="text-xs text-muted-foreground">Aparecem em Meu Plano, no app do aluno, com status Disponível ou Entregue.</p>
      </div>

      <div className="p-4 grid gap-2 md:grid-cols-[220px_1fr_1fr_auto] border-b">
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Aluno" /></SelectTrigger>
          <SelectContent>
            {clients.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="h-9 text-xs" placeholder="Benefício (ex.: 1 avaliação física extra)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input className="h-9 text-xs" placeholder="Detalhe (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Button size="sm" className="gap-1" onClick={create}><Plus size={12} /> Liberar</Button>
      </div>

      {items.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">Nenhum benefício cadastrado.</p>
      ) : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Aluno</TableHead><TableHead>Benefício</TableHead><TableHead>Detalhe</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.clients?.name || `#${b.client_id}`}</TableCell>
                <TableCell>{b.title}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{b.description || "—"}</TableCell>
                <TableCell>
                  <Select value={b.status} onValueChange={(v) => setStatus(b.id, v)}>
                    <SelectTrigger className="h-7 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Disponível</SelectItem>
                      <SelectItem value="delivered">Entregue</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
