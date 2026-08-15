import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, MessageCircle } from "lucide-react";
import { fmtTime, formatPhone } from "@/lib/leads";
import type { Lead } from "@/hooks/useLeads";

export default function ExperimentaisHoje({
  leads, realizadas, onWhats,
}: { leads: Lead[]; realizadas: Set<string>; onWhats: (l: Lead) => void }) {
  const navigate = useNavigate();
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock size={16} className="text-primary" />
        <h2 className="font-barlow font-bold text-lg">Experimentais de hoje ({leads.length})</h2>
      </div>
      {leads.length === 0 ? (
        <p className="text-sm text-muted-foreground font-dm">Nenhuma aula experimental agendada para hoje.</p>
      ) : (
        <div className="divide-y divide-border">
          {leads.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <button className="font-dm font-medium text-sm hover:text-primary text-left truncate"
                  onClick={() => navigate(`/admin/leads/${l.id}`)}>{l.nome}</button>
                <p className="text-[11px] text-muted-foreground">
                  {fmtTime(l.hora_aula_experimental)} · {formatPhone(l.telefone)} · {l.origem || "—"}
                  {l.status_taxa_experimental === "pendente" && " · taxa pendente"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${realizadas.has(l.id) ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  {realizadas.has(l.id) ? "Presente" : "A confirmar"}
                </span>
                <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => onWhats(l)}>
                  <MessageCircle size={12} /> WhatsApp
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
