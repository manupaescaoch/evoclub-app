import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import logoAsset from "@/assets/logo-evo.png.asset.json";
import { printContract } from "@/lib/contractPdf";
import { fmtBRL } from "@/lib/finance";

type Info = {
  kind: string; status: string; lead_name: string | null; answered: boolean;
  form_name: string | null; form_fields: any; doc?: any; error?: string;
};

const ANAMNESE_FIELDS: { key: string; label: string }[] = [
  { key: "objective", label: "Qual seu objetivo?" },
  { key: "training_history", label: "Histórico de treino" },
  { key: "injuries", label: "Lesões" },
  { key: "pain", label: "Dores" },
  { key: "limitations", label: "Limitações" },
  { key: "restrictions", label: "Restrições médicas" },
  { key: "sleep", label: "Como está seu sono?" },
  { key: "stress", label: "Nível de estresse" },
  { key: "routine", label: "Rotina do dia a dia" },
];

export default function FormLink() {
  const { token = "" } = useParams();
  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [signName, setSignName] = useState("");
  const [signCpf, setSignCpf] = useState("");
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("form_link_open", { p_token: token });
      if (error) toast.error("Não foi possível abrir o formulário.");
      const d = data as unknown as Info;
      setInfo(d || null);
      setDone(!!d?.answered && d?.kind !== "contrato");
      setSignName(d?.lead_name || "");
      setSigned(d?.kind === "contrato" && !!d?.doc?.signed_at);
      setLoading(false);
    })();
  }, [token]);

  const fmtD = (iso: string | null) => (iso ? new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR") : "—");

  const sign = async () => {
    if (signName.trim().length < 3) return toast.error("Digite seu nome completo");
    setSending(true);
    const { data, error } = await supabase.rpc("contract_sign_public", {
      p_token: token, p_name: signName.trim(), p_cpf: signCpf.trim() || null, p_agent: navigator.userAgent,
    });
    setSending(false);
    if (error) return toast.error("Erro ao assinar: " + error.message);
    const res = data as any;
    if (!res?.ok) {
      if (res?.reason === "already_signed") { setSigned(true); return toast.info("Contrato já assinado."); }
      if (res?.reason === "expired") return toast.error("Este contrato expirou. Fale com a recepção.");
      return toast.error("Não foi possível assinar o contrato.");
    }
    setSigned(true);
    setInfo(i => (i ? { ...i, doc: { ...i.doc, signed_at: new Date().toISOString(), signature_name: signName.trim(), signature_hash: res.hash, status: "signed" } } : i));
    toast.success("Contrato assinado!");
  };

  const submit = async () => {
    if (info?.kind === "nps" && score == null) return toast.error("Escolha uma nota de 0 a 10");
    setSending(true);
    const payload: Record<string, any> = { ...values };
    if (info?.kind === "nps") payload.score = score;
    const { data, error } = await supabase.rpc("form_link_submit", { p_token: token, p_payload: payload });
    setSending(false);
    if (error) return toast.error("Erro ao enviar: " + error.message);
    const res = data as any;
    if (res?.error === "already_answered") { setDone(true); return toast.info("Este formulário já foi respondido."); }
    if (res?.error) return toast.error("Link inválido.");
    setDone(true);
    toast.success("Respostas enviadas. Obrigado!");
  };

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen bg-background flex justify-center px-4 py-8">
      <div className="w-full max-w-[390px] space-y-5">
        <div className="flex items-center gap-3">
          <img src={logoAsset.url} alt="EVO Training Club" className="w-10 h-10 rounded-lg" />
          <h1 className="font-barlow font-bold text-xl uppercase">EVO Training Club</h1>
        </div>
        {children}
      </div>
    </main>
  );

  if (loading) return shell(<p className="text-sm font-dm text-muted-foreground">Carregando...</p>);
  if (!info || info.error === "not_found") return shell(
    <div className="rounded-xl border bg-card p-5">
      <p className="font-barlow font-bold text-base">Link inválido</p>
      <p className="text-sm font-dm text-muted-foreground mt-1">Confira o link recebido ou fale com a equipe da unidade.</p>
    </div>
  );
  if (done) return shell(
    <div className="rounded-xl border bg-card p-5">
      <p className="font-barlow font-bold text-base">Respostas registradas</p>
      <p className="text-sm font-dm text-muted-foreground mt-1">Obrigado! A equipe já recebeu suas informações.</p>
    </div>
  );

  const doc = info.doc || null;

  if (info.kind === "retrospectiva") return shell(
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <h2 className="font-barlow font-bold text-lg uppercase">Sua retrospectiva EVO</h2>
      {info.lead_name && <p className="text-sm font-dm text-muted-foreground">Olá, {info.lead_name}! Veja o que você construiu neste ciclo.</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-secondary p-3">
          <p className="text-[11px] font-dm text-muted-foreground">Treinos no ciclo</p>
          <p className="font-barlow font-bold text-2xl">{doc?.stats?.total ?? doc?.stats?.checkins ?? "—"}</p>
        </div>
        <div className="rounded-xl bg-secondary p-3">
          <p className="text-[11px] font-dm text-muted-foreground">Frequência semanal</p>
          <p className="font-barlow font-bold text-2xl">{doc?.stats?.weekly_avg ?? doc?.stats?.avg_week ?? "—"}</p>
        </div>
      </div>
      <div className="rounded-xl border p-3 text-sm font-dm space-y-1">
        <p>Plano atual: <b>{doc?.current_plan || "—"}</b></p>
        <p>Vencimento: <b>{fmtD(doc?.cycle_end)}</b></p>
      </div>
      <p className="text-xs font-dm text-muted-foreground">
        Fale com a recepção para garantir o próximo ciclo e continuar sua evolução.
      </p>
    </div>
  );

  if (info.kind === "proposta") return shell(
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <h2 className="font-barlow font-bold text-lg uppercase">Proposta de renovação</h2>
      {info.lead_name && <p className="text-sm font-dm text-muted-foreground">Olá, {info.lead_name}!</p>}
      <div className="rounded-xl border p-3 text-sm font-dm space-y-1">
        <p>Plano atual: <b>{doc?.current_plan || "—"}</b>{doc?.current_value ? ` · ${fmtBRL(Number(doc.current_value))}` : ""}</p>
        <p>Vencimento: <b>{fmtD(doc?.cycle_end)}</b></p>
      </div>
      <div className="rounded-xl bg-secondary p-3 text-sm font-dm space-y-1">
        <p className="font-barlow font-bold uppercase text-base">Nova proposta</p>
        <p>Plano: <b>{doc?.proposal_plan || "—"}</b></p>
        <p>Valor: <b>{doc?.proposal_value ? fmtBRL(Number(doc.proposal_value)) : "—"}</b></p>
        <p>Próximo ciclo: <b>{fmtD(doc?.next_cycle_start)} → {fmtD(doc?.next_cycle_end)}</b></p>
        {doc?.notes && <p className="text-muted-foreground whitespace-pre-line">{doc.notes}</p>}
      </div>
      <p className="text-xs font-dm text-muted-foreground">
        Para aceitar, responda a recepção no WhatsApp. Em seguida enviamos seu contrato para assinatura.
      </p>
    </div>
  );

  if (info.kind === "contrato") return shell(
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <h2 className="font-barlow font-bold text-lg uppercase">{doc?.title || "Contrato"}</h2>
      <p className="text-xs font-dm text-muted-foreground">
        Versão {doc?.version ?? 1} · {doc?.plan || "—"}{doc?.plan_value ? ` · ${fmtBRL(Number(doc.plan_value))}` : ""} · vigência {fmtD(doc?.starts_at)} → {fmtD(doc?.ends_at)}
      </p>
      <div className="rounded-xl border p-3 max-h-[45vh] overflow-y-auto text-[13px] font-dm whitespace-pre-line">
        {doc?.body || "Contrato sem texto cadastrado."}
      </div>
      <Button variant="outline" className="w-full" onClick={() => {
        if (!printContract({ ...(doc || {}), signature_cpf: doc?.signature_cpf ?? null }, info.lead_name || "Aluno")) {
          toast.error("Libere pop-ups para baixar o PDF");
        }
      }}>Baixar PDF</Button>

      {signed || doc?.status === "signed" ? (
        <div className="rounded-xl bg-secondary p-3 text-sm font-dm">
          <p className="font-semibold">Contrato assinado</p>
          <p className="text-xs text-muted-foreground">
            {doc?.signed_at ? new Date(doc.signed_at).toLocaleString("pt-BR") : ""} · {doc?.signature_name || info.lead_name}
          </p>
          {doc?.signature_hash && <p className="text-[11px] text-muted-foreground break-all">Código: {doc.signature_hash}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <Label>Nome completo</Label>
            <Input value={signName} onChange={e => setSignName(e.target.value)} />
          </div>
          <div>
            <Label>CPF (opcional)</Label>
            <Input inputMode="numeric" value={signCpf} onChange={e => setSignCpf(e.target.value)} />
          </div>
          <p className="text-[11px] font-dm text-muted-foreground">
            Ao assinar, você declara ter lido e aceito as condições. Registramos data, hora e um código de validação.
          </p>
          <Button className="w-full" onClick={sign} disabled={sending}>
            {sending ? "Assinando..." : "Assinar contrato"}
          </Button>
        </div>
      )}
    </div>
  );

  const customFields: { key: string; label: string }[] =
    Array.isArray(info.form_fields)
      ? info.form_fields.map((f: any, i: number) => ({ key: f?.key || `campo_${i + 1}`, label: f?.label || f?.name || `Campo ${i + 1}` }))
      : [];

  const title = info.kind === "anamnese" ? "Anamnese" : info.kind === "nps" ? "Sua avaliação" : (info.form_name || "Formulário");
  const fields = info.kind === "anamnese" ? ANAMNESE_FIELDS : customFields;

  return shell(
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div>
        <h2 className="font-barlow font-bold text-lg uppercase">{title}</h2>
        {info.lead_name && <p className="text-sm font-dm text-muted-foreground">Olá, {info.lead_name}!</p>}
      </div>

      {info.kind === "nps" && (
        <div className="space-y-2">
          <Label>De 0 a 10, quanto você recomendaria a EVO?</Label>
          <div className="grid grid-cols-6 gap-1">
            {Array.from({ length: 11 }, (_, i) => (
              <Button key={i} type="button" size="sm" variant={score === i ? "default" : "outline"}
                onClick={() => setScore(i)}>{i}</Button>
            ))}
          </div>
          <div>
            <Label>Comentário</Label>
            <Textarea rows={3} value={values.comment || ""} onChange={e => setValues({ ...values, comment: e.target.value })} />
          </div>
        </div>
      )}

      {fields.map(f => (
        <div key={f.key}>
          <Label>{f.label}</Label>
          {info.kind === "anamnese"
            ? <Textarea rows={2} value={values[f.key] || ""} onChange={e => setValues({ ...values, [f.key]: e.target.value })} />
            : <Input value={values[f.key] || ""} onChange={e => setValues({ ...values, [f.key]: e.target.value })} />}
        </div>
      ))}

      {info.kind !== "nps" && (
        <div>
          <Label>Observações</Label>
          <Textarea rows={2} value={values.notes || ""} onChange={e => setValues({ ...values, notes: e.target.value })} />
        </div>
      )}

      <Button className="w-full" onClick={submit} disabled={sending}>
        {sending ? "Enviando..." : "Enviar respostas"}
      </Button>
    </div>
  );
}