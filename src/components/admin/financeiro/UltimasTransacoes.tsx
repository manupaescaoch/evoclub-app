import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Receipt } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtBRL, STATUS_LABEL } from "@/lib/finance";
import { competence, type FinTx } from "@/hooks/useFinanceDashboard";
import { useUnit } from "@/contexts/UnitContext";

type Props = {
  rows: FinTx[];
  loading: boolean;
  conciliation: Record<string, { status: string; account: string | null }>;
  seeAllHref: string;
};

const CONC_LABEL: Record<string, string> = {
  reconciled: "Conciliada",
  matched: "Sugerida",
  pending: "Não conciliada",
  ignored: "Ignorada",
};

const UltimasTransacoes = ({ rows, loading, conciliation, seeAllHref }: Props) => {
  const { units } = useUnit();
  const [detail, setDetail] = useState<FinTx | null>(null);
  const unitName = (id: string | null) => units.find((u) => u.id === id)?.name || "—";

  return (
    <div className="bg-card rounded-xl card-shadow p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-sm font-dm font-semibold text-foreground">Últimas transações</p>
        <Link to={seeAllHref} className="text-xs font-dm font-medium text-primary hover:underline inline-flex items-center gap-1">
          Ver todas <ArrowUpRight size={12} />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-background animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center">
          <Receipt size={22} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-xs font-dm text-muted-foreground">Nenhum lançamento encontrado neste período</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => {
            const income = r.kind === "income";
            const conc = conciliation[r.id];
            return (
              <li key={r.id}>
                <button
                  onClick={() => setDetail(r)}
                  className="w-full text-left py-2.5 flex items-start justify-between gap-3 min-h-11 hover:bg-background/60 rounded-lg px-1 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-dm font-semibold text-foreground truncate">{r.description || "Sem descrição"}</p>
                    <p className="text-[11px] font-dm text-muted-foreground truncate">
                      {new Date(competence(r) + "T00:00:00").toLocaleDateString("pt-BR")}
                      {" · "}{r.category_name || "Sem categoria"}
                      {r.payment_method ? ` · ${r.payment_method}` : ""}
                    </p>
                    <p className="text-[10px] font-dm text-muted-foreground truncate">
                      {conc?.account || "Conta não informada"}
                      {" · "}{CONC_LABEL[conc?.status || "pending"] || "Não conciliada"}
                      {" · "}{unitName(r.unit_id)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-dm font-bold ${income ? "text-green-600" : "text-red-500"}`}>
                      {income ? "+" : "−"} {fmtBRL(Math.abs(Number(r.amount)))}
                    </p>
                    <span className={`text-[10px] font-dm px-1.5 py-0.5 rounded ${income ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {income ? "Receita" : "Despesa"}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-barlow">DETALHES DO LANÇAMENTO</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-2 text-xs font-dm">
              {[
                ["Descrição", detail.description || "—"],
                ["Valor", fmtBRL(Math.abs(Number(detail.amount)))],
                ["Tipo", detail.kind === "income" ? "Receita" : "Despesa"],
                ["Data (competência)", new Date(competence(detail) + "T00:00:00").toLocaleDateString("pt-BR")],
                ["Data do lançamento", new Date(detail.date + "T00:00:00").toLocaleDateString("pt-BR")],
                ["Categoria", detail.category_name || "Sem categoria"],
                ["Conta", conciliation[detail.id]?.account || "—"],
                ["Forma de pagamento", detail.payment_method || "—"],
                ["Centro de custo", detail.cost_center || "—"],
                ["Unidade", unitName(detail.unit_id)],
                ["Status", STATUS_LABEL[detail.status] || detail.status],
                ["Conciliação", CONC_LABEL[conciliation[detail.id]?.status || "pending"]],
                ["Observações", detail.notes || "—"],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-3 border-b border-border pb-1.5">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-foreground text-right">{v}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UltimasTransacoes;
