import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  ORIGENS, STATUS_FUNIL, STATUS_LABEL, TAXA_LABEL, brTimestamp, fmtDate, formatPhone,
  normalizeCadastrador, onlyDigits,
} from "@/lib/leads";
import type { Lead } from "@/hooks/useLeads";
import { AlertTriangle } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  unidadeId: string;
  cadastradoPor: string;
  onSaved: () => void;
};

const NovoLeadDialog = ({ open, onOpenChange, unidadeId, cadastradoPor, onSaved }: Props) => {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [origem, setOrigem] = useState<string>(ORIGENS[0]);
  const [status, setStatus] = useState<string>("novo");
  const [taxa, setTaxa] = useState<string>("pendente");
  const [dataExp, setDataExp] = useState("");
  const [horaExp, setHoraExp] = useState("");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);
  const [dup, setDup] = useState<Lead | null>(null);

  useEffect(() => {
    if (!open) {
      setNome(""); setEmail(""); setTelefone(""); setOrigem(ORIGENS[0]);
      setStatus("novo"); setTaxa("pendente"); setDataExp(""); setHoraExp(""); setObs(""); setDup(null);
    }
  }, [open]);

  const agendando = status === "aula_agendada";

  const save = async () => {
    const digits = onlyDigits(telefone);
    if (!nome.trim()) return toast.error("Informe o nome do lead.");
    if (digits.length !== 10 && digits.length !== 11) return toast.error("Telefone deve ter 10 ou 11 dígitos.");
    if (agendando && !dataExp) return toast.error("Informe a data da aula experimental.");

    setSaving(true);
    // checagem de duplicidade (inclui inativos)
    const { data: existing } = await supabase
      .from("leads").select("*")
      .eq("unidade_id", unidadeId)
      .eq("telefone_normalizado", digits)
      .maybeSingle();
    if (existing) {
      setSaving(false);
      setDup(existing as unknown as Lead);
      return;
    }

    const { data, error } = await supabase.from("leads").insert({
      unidade_id: unidadeId,
      nome: nome.trim(),
      email: email.trim() || null,
      telefone: digits,
      origem,
      status_funil: status as any,
      status_taxa_experimental: taxa as any,
      data_aula_experimental: agendando ? brTimestamp(dataExp, horaExp || "00:00") : null,
      hora_aula_experimental: agendando && horaExp ? horaExp : null,
      cadastrado_por: normalizeCadastrador(cadastradoPor),
      observacoes: obs.trim() || null,
    }).select("id").maybeSingle();

    if (error) { setSaving(false); return toast.error("Erro ao salvar lead: " + error.message); }

    if (agendando && data?.id) {
      const { error: e2 } = await supabase.from("interacoes").insert({
        lead_id: data.id,
        unidade_id: unidadeId,
        tipo: "agendamento",
        descricao: "Aula experimental agendada no cadastro do lead",
        agendou_experimental: true,
        data_experimental: dataExp,
        hora_experimental: horaExp || null,
        cadastrado_por: normalizeCadastrador(cadastradoPor),
        quem_agendou: normalizeCadastrador(cadastradoPor),
      });
      if (e2) toast.error("Lead salvo, mas a experimental não foi registrada: " + e2.message);
    }

    setSaving(false);
    toast.success("Lead cadastrado com sucesso.");
    onOpenChange(false);
    onSaved();
  };

  const reativar = async () => {
    if (!dup) return;
    const { error } = await supabase.from("leads").update({ ativo: true }).eq("id", dup.id);
    if (error) return toast.error("Erro ao reativar: " + error.message);
    toast.success("Lead reativado.");
    onOpenChange(false);
    onSaved();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome completo *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div>
              <Label>Telefone * (só números)</Label>
              <Input inputMode="numeric" value={telefone} maxLength={11}
                onChange={(e) => setTelefone(onlyDigits(e.target.value))} placeholder="81999999999" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Origem</Label>
                <Select value={origem} onValueChange={setOrigem}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cadastrado por</Label>
                <Input value={normalizeCadastrador(cadastradoPor)} disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status do funil</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_FUNIL.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Taxa da experimental</Label>
                <Select value={taxa} onValueChange={setTaxa}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(TAXA_LABEL).map((t) => <SelectItem key={t} value={t}>{TAXA_LABEL[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {agendando && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data da experimental *</Label><Input type="date" value={dataExp} onChange={(e) => setDataExp(e.target.value)} /></div>
                <div><Label>Hora</Label><Input type="time" value={horaExp} onChange={(e) => setHoraExp(e.target.value)} /></div>
              </div>
            )}
            <div><Label>Observações</Label><Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar lead"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!dup} onOpenChange={(v) => !v && setDup(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={18} /> Lead duplicado
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm space-y-1">
            <p>Já existe um lead com este telefone nesta unidade:</p>
            <p><strong>{dup?.nome?.toUpperCase()}</strong></p>
            <p>{formatPhone(dup?.telefone)}</p>
            <p className="text-muted-foreground">
              Cadastrado em {fmtDate(dup?.created_at)} por {normalizeCadastrador(dup?.cadastrado_por)}
              {dup && !dup.ativo && " — atualmente inativo"}
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDup(null)}>Cancelar</Button>
            <Button variant="outline" onClick={() => dup && navigate(`/admin/leads/${dup.id}`)}>Abrir lead existente</Button>
            {dup && !dup.ativo && <Button onClick={reativar}>Reativar lead</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NovoLeadDialog;
