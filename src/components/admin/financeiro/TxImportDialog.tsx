import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { fmtBRL } from "@/lib/finance";
import { logCreate } from "@/lib/audit";
import { parseFinancialFile, toISODate, toNumber } from "@/lib/txUtils";
import type { Ref } from "@/hooks/useTransacoesLedger";

export type ImportKind = "extrato" | "vendas" | "recebimentos" | "planilha";

const KIND_LABEL: Record<ImportKind, string> = {
  extrato: "Importar extrato bancário",
  vendas: "Importar relatório de vendas",
  recebimentos: "Importar relatório de recebimentos",
  planilha: "Importar planilha financeira",
};

type Field = "date" | "description" | "amount" | "kind" | "category" | "external_id" | "due_date" | "payment_method";

const FIELDS: { key: Field; label: string; required?: boolean }[] = [
  { key: "date", label: "Data", required: true },
  { key: "description", label: "Descrição", required: true },
  { key: "amount", label: "Valor", required: true },
  { key: "kind", label: "Tipo (entrada/saída)" },
  { key: "due_date", label: "Competência" },
  { key: "category", label: "Categoria" },
  { key: "payment_method", label: "Forma de pagamento" },
  { key: "external_id", label: "Identificador" },
];

const guess = (headers: string[], field: Field) => {
  const pats: Record<Field, RegExp> = {
    date: /data|date|posted/i,
    description: /descri|hist[oó]rico|memo|name|produto/i,
    amount: /valor|amount|total|liquido|l[ií]quido/i,
    kind: /tipo|kind|natureza|d[eé]bito|cr[eé]dito/i,
    category: /categoria|category/i,
    external_id: /identificador|fitid|id|documento|autoriza/i,
    due_date: /compet|vencimento|due/i,
    payment_method: /forma|pagamento|method|bandeira/i,
  };
  return headers.find((h) => pats[field].test(h)) || "";
};

type Props = {
  open: boolean;
  kind: ImportKind;
  onOpenChange: (v: boolean) => void;
  unitId: string | null;
  accounts: Ref[];
  existingKeys: Set<string>;
  onDone: () => void;
};

const select = "w-full h-9 rounded-md border border-input bg-background px-2 text-xs font-dm";

const TxImportDialog = ({ open, kind, onOpenChange, unitId, accounts, existingKeys, onDone }: Props) => {
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [map, setMap] = useState<Record<string, string>>({});
  const [account, setAccount] = useState<string>("");
  const [defaultKind, setDefaultKind] = useState(kind === "extrato" ? "auto" : "income");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | { ok: number; dup: number; err: number; skipped: number; nocat: number }>(null);

  const reset = () => { setStep(1); setRows([]); setHeaders([]); setMap({}); setResult(null); };

  const pick = async (file: File) => {
    try {
      const parsed = await parseFinancialFile(file);
      if (!parsed.rows.length) { toast.error("Arquivo sem linhas de dados"); return; }
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      const m: Record<string, string> = {};
      FIELDS.forEach((f) => { m[f.key] = guess(parsed.headers, f.key); });
      setMap(m);
      setStep(2);
    } catch {
      toast.error("Não foi possível ler o arquivo");
    }
  };

  const normalize = () =>
    rows.map((r) => {
      const amountRaw = toNumber(r[map.amount]);
      const kindVal =
        defaultKind === "auto"
          ? amountRaw < 0 ? "expense" : "income"
          : map.kind && r[map.kind]
            ? /sa[íi]da|despesa|d[eé]bito|debit|expense|-/i.test(String(r[map.kind])) ? "expense" : "income"
            : defaultKind;
      const date = toISODate(r[map.date]);
      return {
        date,
        due_date: map.due_date ? toISODate(r[map.due_date]) || date : date,
        description: String(r[map.description] ?? "").trim(),
        amount: Math.abs(amountRaw),
        kind: kindVal,
        category_name: map.category ? String(r[map.category] ?? "").trim() || null : null,
        payment_method: map.payment_method ? String(r[map.payment_method] ?? "").trim() || null : null,
        external_id: map.external_id ? String(r[map.external_id] ?? "").trim() || null : null,
      };
    });

  const preview = () => {
    const list = normalize();
    const seen = new Set<string>();
    return list.map((r) => {
      const key = `${r.date}|${r.amount.toFixed(2)}|${(r.description || "").toLowerCase().slice(0, 40)}|${account}`;
      const invalid = !r.date || !r.description || !r.amount;
      const dup = !invalid && (existingKeys.has(key) || seen.has(key) || (r.external_id ? existingKeys.has(`ext:${r.external_id}`) : false));
      if (!invalid) seen.add(key);
      return { ...r, _invalid: invalid, _dup: dup };
    });
  };

  const confirm = async () => {
    if (!unitId) { toast.error("Selecione uma unidade específica no cabeçalho para importar"); return; }
    setBusy(true);
    const list = preview();
    const insertable = list.filter((r) => !r._invalid && !r._dup);
    const payload = insertable.map((r) => ({
      unit_id: unitId,
      date: r.date,
      due_date: r.due_date,
      paid_at: kind === "extrato" ? r.date : null,
      description: r.description,
      kind: r.kind,
      amount: r.amount,
      category_name: r.category_name,
      payment_method: r.payment_method,
      external_id: r.external_id,
      status: kind === "extrato" ? "paid" : "pending",
      bank_account_id: account || null,
      source: "import",
    }));
    let ok = 0;
    let err = 0;
    for (let i = 0; i < payload.length; i += 200) {
      const chunk = payload.slice(i, i + 200);
      const { error, data } = await supabase.from("transactions").insert(chunk).select("id");
      if (error) err += chunk.length;
      else ok += (data || []).length;
    }
    setResult({
      ok,
      dup: list.filter((r) => r._dup).length,
      err,
      skipped: list.filter((r) => r._invalid).length,
      nocat: insertable.filter((r) => !r.category_name).length,
    });
    if (ok) logCreate("transaction", null, `${ok} lançamentos importados (${KIND_LABEL[kind]})`, { kind, ok }, unitId, "financeiro");
    setBusy(false);
    setStep(4);
    onDone();
  };

  const prev = step === 3 ? preview() : [];

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{KIND_LABEL[kind]}</DialogTitle></DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <Label>Conta de destino</Label>
              <select className={select} value={account} onChange={(e) => setAccount(e.target.value)}>
                <option value="">Sem conta definida</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Arquivo (CSV, XLS, XLSX ou OFX)</Label>
              <Input type="file" accept=".csv,.xls,.xlsx,.ofx" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
            </div>
            <p className="text-[11px] text-muted-foreground font-dm">
              Nada é gravado antes da tela de confirmação.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-dm">{rows.length} linhas lidas. Confirme as colunas:</p>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <Label className="text-xs">{f.label}{f.required ? " *" : ""}</Label>
                  <select className={select} value={map[f.key] || ""} onChange={(e) => setMap({ ...map, [f.key]: e.target.value })}>
                    <option value="">—</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <Label className="text-xs">Tipo padrão</Label>
                <select className={select} value={defaultKind} onChange={(e) => setDefaultKind(e.target.value)}>
                  <option value="auto">Pelo sinal do valor</option>
                  <option value="income">Entrada</option>
                  <option value="expense">Saída</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-3 text-[11px] font-dm">
              <span>{prev.filter((r) => !r._invalid && !r._dup).length} prontos</span>
              <span className="text-amber-600">{prev.filter((r) => r._dup).length} duplicidades</span>
              <span className="text-red-500">{prev.filter((r) => r._invalid).length} com erro</span>
            </div>
            <div className="max-h-72 overflow-auto rounded-lg border border-border">
              <table className="w-full text-[11px] font-dm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1.5">Data</th>
                    <th className="text-left px-2 py-1.5">Descrição</th>
                    <th className="text-left px-2 py-1.5">Tipo</th>
                    <th className="text-right px-2 py-1.5">Valor</th>
                    <th className="text-left px-2 py-1.5">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {prev.slice(0, 200).map((r, i) => (
                    <tr key={i} className={`border-t border-border ${r._invalid ? "bg-red-50" : r._dup ? "bg-amber-50" : ""}`}>
                      <td className="px-2 py-1">{r.date || "—"}</td>
                      <td className="px-2 py-1 truncate max-w-[220px]">{r.description || "—"}</td>
                      <td className="px-2 py-1">{r.kind === "income" ? "Entrada" : "Saída"}</td>
                      <td className="px-2 py-1 text-right">{fmtBRL(r.amount)}</td>
                      <td className="px-2 py-1">{r._invalid ? "Erro" : r._dup ? "Duplicada" : "Importar"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 4 && result && (
          <div className="space-y-1 text-sm font-dm">
            <p><strong>{result.ok}</strong> registros importados</p>
            <p><strong>{result.dup}</strong> duplicidades encontradas (ignoradas)</p>
            <p><strong>{result.skipped}</strong> registros ignorados por dados incompletos</p>
            <p><strong>{result.err}</strong> registros com erro</p>
            <p><strong>{result.nocat}</strong> transações sem categoria</p>
          </div>
        )}

        <DialogFooter>
          {step > 1 && step < 4 && <Button variant="outline" onClick={() => setStep(step - 1)}>Voltar</Button>}
          {step === 2 && (
            <Button
              onClick={() => {
                if (!map.date || !map.description || !map.amount) { toast.error("Mapeie data, descrição e valor"); return; }
                setStep(3);
              }}
            >
              Ver prévia
            </Button>
          )}
          {step === 3 && <Button onClick={confirm} disabled={busy}>{busy ? "Importando..." : "Confirmar importação"}</Button>}
          {step === 4 && <Button onClick={() => { onOpenChange(false); reset(); }}>Fechar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TxImportDialog;
