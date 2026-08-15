import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";
import { Clock, Flame, MessageCircle } from "lucide-react";
import { fmtDate, fmtTime, formatPhone } from "@/lib/leads";
import type { Lead } from "@/hooks/useLeads";

export type RuleKey = "sem_contato" | "confirmar_hoje" | "no_show" | "pos_experimental" | "negociacao_parada";

export const RULES: { key: RuleKey; label: string; hint: string; msg: (nome: string) => string }[] = [
  { key: "sem_contato", label: "Sem contato", hint: "Lead novo ou em contato inicial sem interação dentro do prazo configurado.",
    msg: (n) => `Olá, ${n}! Aqui é da EVO Club. Vi que você demonstrou interesse em treinar com a gente. Quer agendar sua aula experimental?` },
  { key: "confirmar_hoje", label: "Confirmar experimental (hoje/amanhã)", hint: "Aulas agendadas para hoje ou amanhã que ainda precisam de confirmação.",
    msg: (n) => `Olá, ${n}! Passando para confirmar sua aula experimental na EVO Club. Podemos contar com você?` },
  { key: "no_show", label: "Faltou na experimental", hint: "Aula agendada em data já passada sem presença registrada.",
    msg: (n) => `Olá, ${n}! Sentimos sua falta na aula experimental. Quer reagendar para outro dia?` },
  { key: "pos_experimental", label: "Pós-experimental sem fechamento", hint: "Fez a aula e ainda não fechou matrícula.",
    msg: (n) => `Olá, ${n}! O que achou da sua experiência na EVO Club? Posso te mostrar as condições de matrícula?` },
  { key: "negociacao_parada", label: "Negociação parada", hint: "Em negociação ou follow up sem movimentação no prazo configurado.",
    msg: (n) => `Olá, ${n}! Consegui uma condição especial para sua matrícula na EVO Club. Posso te enviar?` },
];

export default function FollowUpReguas({
  rule, setRule, counts, fila, loading, diasSemContato, onWhats,
}: {
  rule: RuleKey;
  setRule: (r: RuleKey) => void;
  counts: Record<string, number>;
  fila: Lead[];
  loading: boolean;
  diasSemContato: (l: Lead) => number;
  onWhats: (l: Lead) => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Flame size={16} className="text-primary" />
        <h2 className="font-barlow font-bold text-lg">Réguas de follow up</h2>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {RULES.map((r) => (
          <button key={r.key} onClick={() => setRule(r.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-dm font-semibold ${rule === r.key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}>
            {r.label} ({counts[r.key] || 0})
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground font-dm">{RULES.find((r) => r.key === rule)?.hint}</p>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? <LoadingState /> : fila.length === 0 ? (
          <EmptyState message="Nenhum lead nesta régua. Follow up em dia." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-dm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Experimental</th>
                  <th className="px-4 py-3">Sem contato</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {fila.map((l) => (
                  <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <button className="font-medium text-left hover:text-primary" onClick={() => navigate(`/admin/leads/${l.id}`)}>
                        {l.nome}
                      </button>
                      <span className="block text-[11px] text-muted-foreground">{l.cadastrado_por || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatPhone(l.telefone)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.origem || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {l.data_aula_experimental ? `${fmtDate(l.data_aula_experimental)} ${fmtTime(l.hora_aula_experimental)}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Clock size={12} /> {diasSemContato(l)} d
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 mr-1.5" onClick={() => onWhats(l)}>
                        <MessageCircle size={12} /> WhatsApp
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => navigate(`/admin/leads/${l.id}`)}>
                        Abrir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
