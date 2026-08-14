import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, UserPlus, Gift, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStudentName } from "@/hooks/useStudentName";

type Indication = {
  id: string;
  indicated_name: string;
  status: string;
  discount_percent: number;
  discount_applied: boolean;
  created_at: string;
};

const STATUS: Record<string, string> = {
  registered: "Registrada",
  in_contact: "Em contato",
  experimental_scheduled: "Experimental agendada",
  attended: "Compareceu",
  enrolled: "Matriculado",
  discount_applied: "Desconto aplicado",
  lost: "Não seguiu",
  cancelled: "Cancelada",
};

const IndicacoesTab = ({ onBack }: { onBack: () => void }) => {
  const { name } = useStudentName();
  const [items, setItems] = useState<Indication[]>([]);
  const [nome, setNome] = useState("");
  const [fone, setFone] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("crm_indications")
      .select("id, indicated_name, status, discount_percent, discount_applied, created_at")
      .order("created_at", { ascending: false });
    setItems((data || []) as Indication[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const enrolled = items.filter((i) => i.status === "enrolled" || i.discount_applied).length;
  const discount = items.filter((i) => i.discount_applied).reduce((a, i) => a + (i.discount_percent || 0), 0);

  const submit = async () => {
    if (!nome.trim()) return toast.error("Informe o nome do indicado");
    setSaving(true);
    const { data, error } = await supabase.rpc("create_indication", { _name: nome, _phone: fone });
    setSaving(false);
    const res = data as { ok?: boolean; error?: string } | null;
    if (error || !res?.ok) return toast.error(res?.error || "Não foi possível enviar a indicação");
    toast.success("Indicação enviada! A equipe entra em contato.");
    setNome("");
    setFone("");
    load();
  };

  const share = () => {
    const text = `Treina comigo na EVO Training Club! Fala com a recepção que ${name} te indicou e garanta sua condição especial.`;
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else {
      navigator.clipboard.writeText(text);
      toast.success("Convite copiado!");
    }
  };

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center">
          <ChevronLeft size={22} className="text-foreground" />
        </button>
        <p className="font-barlow font-bold text-lg text-foreground">Indique e Ganhe</p>
      </div>

      <div className="rounded-2xl bg-white p-4 card-shadow mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Gift size={16} className="text-primary" />
          <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold">COMO FUNCIONA</p>
        </div>
        <p className="text-[11px] font-dm text-muted">
          Indique um amigo. Quando ele fechar o plano, você recebe <span className="font-semibold text-primary">5% de desconto</span> na
          próxima mensalidade. Pode indicar quantos amigos quiser.
        </p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: "Indicações", value: items.length },
            { label: "Matriculados", value: enrolled },
            { label: "Desconto", value: `${discount}%` },
          ].map((s) => (
            <div key={s.label} className="text-center p-2 rounded-xl bg-primary/5">
              <p className="font-barlow font-[800] text-base text-foreground">{s.value}</p>
              <p className="text-[9px] text-muted font-dm">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 card-shadow mb-4">
        <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold mb-3">NOVA INDICAÇÃO</p>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do amigo"
          className="w-full rounded-xl border border-border px-3 py-3 text-sm font-dm outline-none mb-2"
        />
        <input
          value={fone}
          onChange={(e) => setFone(e.target.value)}
          placeholder="WhatsApp (opcional)"
          inputMode="tel"
          className="w-full rounded-xl border border-border px-3 py-3 text-sm font-dm outline-none mb-3"
        />
        <button
          disabled={saving}
          onClick={submit}
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-dm font-semibold text-sm cta-shadow flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <UserPlus size={16} /> {saving ? "Enviando..." : "Enviar indicação"}
        </button>
        <button
          onClick={share}
          className="mt-2 w-full py-3 rounded-2xl bg-secondary text-foreground font-dm font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Share2 size={16} /> Compartilhar convite
        </button>
      </div>

      <div className="rounded-2xl bg-white p-4 card-shadow">
        <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold mb-3">MINHAS INDICAÇÕES</p>
        {items.length === 0 ? (
          <p className="text-[11px] font-dm text-muted">Você ainda não indicou ninguém.</p>
        ) : (
          <div className="space-y-2">
            {items.map((i) => (
              <div key={i.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary">
                <div>
                  <p className="text-xs font-dm font-semibold text-foreground">{i.indicated_name}</p>
                  <p className="text-[10px] font-dm text-muted">
                    {new Date(i.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-dm font-semibold px-2 py-1 rounded-full ${
                    i.discount_applied ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"
                  }`}
                >
                  {STATUS[i.status] || i.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IndicacoesTab;
