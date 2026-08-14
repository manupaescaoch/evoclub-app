import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import logoAsset from "@/assets/logo-evo.png.asset.json";

type Info = {
  kind: string; status: string; lead_name: string | null; answered: boolean;
  form_name: string | null; form_fields: any; error?: string;
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

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("form_link_open", { p_token: token });
      if (error) toast.error("Não foi possível abrir o formulário.");
      const d = data as unknown as Info;
      setInfo(d || null);
      setDone(!!d?.answered);
      setLoading(false);
    })();
  }, [token]);

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