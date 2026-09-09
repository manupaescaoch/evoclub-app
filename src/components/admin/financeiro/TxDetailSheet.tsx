import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { fmtBRL } from "@/lib/finance";
import { Tx, effStatus, statusLabel, statusClass, netOf } from "@/lib/txUtils";
import { Paperclip, ExternalLink } from "lucide-react";

type Props = {
  tx: Tx | null;
  onOpenChange: (v: boolean) => void;
  unitName: (id: string | null) => string;
  groupName: (id: string | null) => string;
  accountName: (id: string | null) => string;
  supplierName: (id: string | null) => string;
  clientName: (id: number | null) => string;
};

const dt = (v?: string | null) => (v ? new Date(`${v.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR") : "—");
const dtHour = (v?: string | null) => (v ? new Date(v).toLocaleString("pt-BR") : "—");

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/60 last:border-0">
    <span className="text-[11px] text-muted-foreground font-dm">{label}</span>
    <span className="text-xs font-dm font-medium text-right break-words max-w-[60%]">{value ?? "—"}</span>
  </div>
);

const TxDetailSheet = ({ tx, onOpenChange, unitName, groupName, accountName, supplierName, clientName }: Props) => {
  const [history, setHistory] = useState<any[]>([]);
  const [receipt, setReceipt] = useState<string | null>(null);

  useEffect(() => {
    if (!tx) { setHistory([]); setReceipt(null); return; }
    supabase
      .from("audit_logs")
      .select("action,description,user_name,created_at")
      .eq("entity", "transaction")
      .eq("entity_id", tx.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setHistory(data || []));
    if (tx.receipt_url) {
      supabase.storage.from("financeiro").createSignedUrl(tx.receipt_url, 3600)
        .then(({ data }) => setReceipt(data?.signedUrl || null));
    } else setReceipt(null);
  }, [tx]);

  const s = tx ? effStatus(tx) : "";

  return (
    <Sheet open={!!tx} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto momentum-scroll">
        <SheetHeader>
          <SheetTitle className="text-base">{tx?.description || "Transação"}</SheetTitle>
        </SheetHeader>
        {tx && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className={`text-lg font-barlow font-bold ${tx.kind === "income" ? "text-green-600" : "text-red-500"}`}>
                {tx.kind === "income" ? "+" : "-"} {fmtBRL(Number(tx.amount))}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-dm ${statusClass(s)}`}>{statusLabel(s)}</span>
            </div>

            <div className="bg-card rounded-xl card-shadow p-3">
              <Row label="Data do lançamento" value={dt(tx.date)} />
              <Row label="Competência" value={dt(tx.due_date || tx.date)} />
              <Row label="Data de pagamento" value={dt(tx.paid_at)} />
              <Row label="Tipo" value={tx.kind === "income" ? "Entrada" : "Saída"} />
              <Row label="Grupo" value={groupName(tx.group_id)} />
              <Row label="Categoria" value={tx.category_name || "Sem categoria"} />
              <Row label="Unidade" value={unitName(tx.unit_id)} />
              <Row label="Conta" value={accountName(tx.bank_account_id)} />
              <Row label="Forma de pagamento" value={tx.payment_method || "—"} />
              <Row label="Valor bruto" value={fmtBRL(Number(tx.amount))} />
              <Row label="Taxas" value={fmtBRL(Number(tx.fees) || 0)} />
              <Row label="Descontos" value={fmtBRL(Number(tx.discount) || 0)} />
              <Row label="Valor líquido" value={fmtBRL(netOf(tx))} />
              <Row label="Origem" value={tx.source === "import" ? "Importação" : tx.source === "bank" ? "Banco" : "Manual"} />
              <Row label="Identificador externo" value={tx.external_id || tx.reference || "—"} />
              {tx.stone_code && <Row label="Stone Code" value={tx.stone_code} />}
              <Row label="Fornecedor" value={supplierName(tx.supplier_id)} />
              <Row label="Cliente" value={clientName(tx.client_id)} />
              <Row label="Centro de custo" value={tx.cost_center || "—"} />
              <Row label="Conciliada" value={tx.reconciled ? "Sim" : "Não"} />
              <Row label="Observação" value={tx.notes || "—"} />
            </div>

            <div className="bg-card rounded-xl card-shadow p-3">
              <p className="text-xs font-barlow font-bold mb-2">Comprovantes</p>
              {receipt ? (
                <a href={receipt} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-primary font-dm">
                  <Paperclip size={13} /> Abrir comprovante <ExternalLink size={12} />
                </a>
              ) : (
                <p className="text-xs text-muted-foreground font-dm">Nenhum comprovante anexado.</p>
              )}
            </div>

            <div className="bg-card rounded-xl card-shadow p-3">
              <p className="text-xs font-barlow font-bold mb-2">Histórico de alterações</p>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground font-dm">Sem registros de alteração.</p>
              ) : (
                <div className="space-y-2">
                  {history.map((h, i) => (
                    <div key={i} className="text-[11px] font-dm">
                      <p className="font-medium">{h.description}</p>
                      <p className="text-muted-foreground">{h.user_name} · {dtHour(h.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default TxDetailSheet;
