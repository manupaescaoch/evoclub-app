import { useEffect, useState } from "react";
import { ChevronLeft, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStudent } from "@/contexts/StudentContext";

type PrefKey = "ranking_opt_out" | "community_hide_name" | "share_photos_optin";

const ITEMS: { key: PrefKey; title: string; desc: string }[] = [
  { key: "ranking_opt_out", title: "Não aparecer no ranking", desc: "Você continua ganhando XP, mas seu nome não é exibido na lista da unidade." },
  { key: "community_hide_name", title: "Ocultar meu nome nas curtidas", desc: "Suas curtidas passam a contar sem exibir seu nome para os outros alunos." },
  { key: "share_photos_optin", title: "Permitir uso das minhas fotos", desc: "Autoriza a equipe a usar suas fotos de evolução em materiais internos. Desativado por padrão." },
];

const PrivacidadeTab = ({ onBack }: { onBack: () => void }) => {
  const { client } = useStudent();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client?.id) return;
    supabase
      .from("student_preferences")
      .select("key, value")
      .eq("client_id", client.id)
      .then(({ data }) => {
        const map: Record<string, boolean> = {};
        ((data || []) as { key: string; value: unknown }[]).forEach((r) => {
          map[r.key] = !!(r.value as { value?: boolean } | null)?.value;
        });
        setPrefs(map);
        setLoading(false);
      });
  }, [client?.id]);

  const toggle = async (key: PrefKey) => {
    if (!client?.id) return;
    const next = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: next }));
    const { error } = await supabase.from("student_preferences").upsert(
      { client_id: client.id, key, value: { value: next } as never },
      { onConflict: "client_id,key" }
    );
    if (error) {
      setPrefs((p) => ({ ...p, [key]: !next }));
      toast.error("Não foi possível salvar");
    }
  };

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center" aria-label="Voltar">
          <ChevronLeft size={22} className="text-foreground" />
        </button>
        <p className="font-barlow font-bold text-lg text-foreground">Privacidade</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-primary" size={22} />
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {ITEMS.map((item) => (
            <div key={item.key} className="rounded-2xl bg-white p-4 card-shadow flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-dm font-semibold text-foreground">{item.title}</p>
                <p className="text-[11px] font-dm text-muted mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
              <button
                onClick={() => toggle(item.key)}
                role="switch"
                aria-checked={!!prefs[item.key]}
                aria-label={item.title}
                className={`w-11 h-6 rounded-full shrink-0 transition-colors relative ${prefs[item.key] ? "bg-primary" : "bg-secondary"}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${prefs[item.key] ? "left-[22px]" : "left-0.5"}`}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 card-shadow">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={14} className="text-primary" />
          <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold">SEUS DADOS</p>
        </div>
        <p className="text-[11px] font-dm text-muted leading-relaxed">
          Seus dados de saúde, avaliações e fotos são privados e visíveis apenas para você e para a equipe técnica da sua
          unidade. Registros de treino e saúde não são apagados, para preservar seu histórico. A exclusão da conta é
          feita apenas pela recepção.
        </p>
      </div>
    </div>
  );
};

export default PrivacidadeTab;
