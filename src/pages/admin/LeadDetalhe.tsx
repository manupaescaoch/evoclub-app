import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle, Save } from "lucide-react";
import type { Interacao, Lead } from "@/hooks/useLeads";
import {
  NIVEIS, NIVEL_LABEL, ORIGENS, STATUS_BADGE, STATUS_FUNIL, STATUS_LABEL, TAXA_LABEL,
  brTimestamp, fmtDate, fmtTime, formatPhone, normalizeCadastrador, waLink, type StatusFunil,
} from "@/lib/leads";

const LeadDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [lead, setLead] = useState<Lead | null>(null);
  const [inter, setInter] = useState<Interacao[]>([]);
  const [edit, setEdit] = useState(params.get("edit") === "1");
  const [form, setForm] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);
  const [novaInter, setNovaInter] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    const [{ data: l }, { data: i }] = await Promise.all([
      supabase.from("leads").select("*").eq("id", id).maybeSingle(),
      supabase.from("interacoes").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    ]);
    setLead((l as unknown as Lead) || null);
    setForm((l as any) || {});
    setInter((i || []) as unknown as Interacao[]);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const salvar = async () => {
    if (!lead) return;
    setSaving(true);
    const dataExp = form.data_aula_experimental
      ? (String(form.data_aula_experimental).length <= 10
        ? brTimestamp(String(form.data_aula_experimental), form.hora_aula_experimental || "00:00")
        : form.data_aula_experimental)
      : null;
    const { error } = await supabase.from("leads").update({
      nome: form.nome,
      email: form.email || null,
      origem: form.origem,
      status_funil: form.status_funil as any,
      nivel_interesse: (form.nivel_interesse || null) as any,
      status_taxa_experimental: (form.status_taxa_experimental || null) as any,
      data_aula_experimental: dataExp,
      hora_aula_experimental: form.hora_aula_experimental || null,
      atendido_por: form.atendido_por ? normalizeCadastrador(form.atendido_por) : null,
      observacoes: form.observacoes || null,
    }).eq("id", lead.id);
    setSaving(false);
    if (error) return toast.error("Erro ao salvar: " + error.message);
    toast.success("Lead atualizado.");
    setEdit(false);
    load();
  };

  const addInteracao = async () => {
    if (!lead || !novaInter.trim()) return;
    const { error } = await supabase.from("interacoes").insert({
      lead_id: lead.id,
      unidade_id: lead.unidade_id,
      tipo: "contato",
      descricao: novaInter.trim(),
      atendido_por: normalizeCadastrador(lead.atendido_por || lead.cadastrado_por),
    });
    if (error) return toast.error("Erro ao registrar interação: " + error.message);
    setNovaInter("");
    toast.success("Interação registrada.");
    load();
  };

  if (!lead) return <div className="p-8 text-muted-foreground">Carregando lead...</div>;

  const dateValue = form.data_aula_experimental ? String(form.data_aula_experimental).slice(0, 10) : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/leads")}><ArrowLeft size={18} /></Button>
          <div>
            <h1 className="text-2xl font-semibold">{lead.nome.toUpperCase()}</h1>
            <p className="text-sm text-muted-foreground">
              Cadastrado em {fmtDate(lead.created_at)} por {normalizeCadastrador(lead.cadastrado_por)}
            </p>
          </div>
          <Badge className={STATUS_BADGE[lead.status_funil as StatusFunil]} variant="secondary">
            {STATUS_LABEL[lead.status_funil as StatusFunil]}
          </Badge>
        </div>
        <div className="flex gap-2">
          {waLink(lead.telefone) && (
            <Button variant="outline" asChild>
              <a href={waLink(lead.telefone)!} target="_blank" rel="noreferrer">
                <MessageCircle size={16} className="mr-2" />{formatPhone(lead.telefone)}
              </a>
            </Button>
          )}
          {edit
            ? <Button onClick={salvar} disabled={saving}><Save size={16} className="mr-2" />{saving ? "Salvando..." : "Salvar"}</Button>
            : <Button variant="outline" onClick={() => setEdit(true)}>Editar</Button>}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2 space-y-3">
          <h2 className="font-semibold">Dados do lead</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label className="text-xs">Nome</Label>
              <Input disabled={!edit} value={form.nome || ""} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} /></div>
            <div><Label className="text-xs">E-mail</Label>
              <Input disabled={!edit} value={form.email || ""} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></div>
            <div><Label className="text-xs">Origem</Label>
              <Select disabled={!edit} value={form.origem || ""} onValueChange={(v) => setForm((p) => ({ ...p, origem: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Status do funil</Label>
              <Select disabled={!edit} value={form.status_funil || ""} onValueChange={(v) => setForm((p) => ({ ...p, status_funil: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_FUNIL.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Nível de interesse</Label>
              <Select disabled={!edit} value={form.nivel_interesse || ""} onValueChange={(v) => setForm((p) => ({ ...p, nivel_interesse: v }))}>
                <SelectTrigger><SelectValue placeholder="Não informado" /></SelectTrigger>
                <SelectContent>{NIVEIS.map((n) => <SelectItem key={n} value={n}>{NIVEL_LABEL[n]}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Taxa da experimental</Label>
              <Select disabled={!edit} value={form.status_taxa_experimental || ""} onValueChange={(v) => setForm((p) => ({ ...p, status_taxa_experimental: v }))}>
                <SelectTrigger><SelectValue placeholder="Não informado" /></SelectTrigger>
                <SelectContent>{Object.keys(TAXA_LABEL).map((t) => <SelectItem key={t} value={t}>{TAXA_LABEL[t]}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Data da experimental</Label>
              <Input type="date" disabled={!edit} value={dateValue}
                onChange={(e) => setForm((p) => ({ ...p, data_aula_experimental: e.target.value }))} /></div>
            <div><Label className="text-xs">Hora da experimental</Label>
              <Input type="time" disabled={!edit} value={(form.hora_aula_experimental || "").slice(0, 5)}
                onChange={(e) => setForm((p) => ({ ...p, hora_aula_experimental: e.target.value }))} /></div>
            <div className="md:col-span-2"><Label className="text-xs">Observações</Label>
              <Textarea rows={3} disabled={!edit} value={form.observacoes || ""}
                onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))} /></div>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">Interações ({inter.length})</h2>
          <div className="flex gap-2">
            <Input placeholder="Registrar contato..." value={novaInter} onChange={(e) => setNovaInter(e.target.value)} />
            <Button onClick={addInteracao} disabled={!novaInter.trim()}>Salvar</Button>
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {!inter.length && <p className="text-sm text-muted-foreground">Nenhuma interação registrada.</p>}
            {inter.map((i) => (
              <div key={i.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{i.tipo}</span>
                  <span className="text-xs text-muted-foreground">{fmtDate(i.created_at)}</span>
                </div>
                {i.descricao && <p className="mt-1 text-muted-foreground">{i.descricao}</p>}
                {i.agendou_experimental && (
                  <p className="mt-1 text-xs text-sky-600">
                    Experimental {fmtDate(i.data_experimental)} {fmtTime(i.hora_experimental)}
                    {i.compareceu === true && " • compareceu"}
                    {i.compareceu === false && " • não compareceu"}
                  </p>
                )}
                {i.fechou_matricula && (
                  <p className="mt-1 text-xs text-emerald-600">
                    Matrícula fechada {fmtDate(i.data_fechamento)} {i.plano_escolhido ? `• ${i.plano_escolhido}` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LeadDetalhe;
