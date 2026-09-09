import * as XLSX from "xlsx";
import { fmtBRL, todayISO } from "@/lib/finance";

export type Tx = {
  id: string;
  unit_id: string | null;
  date: string;
  due_date: string | null;
  paid_at: string | null;
  description: string | null;
  kind: string;
  amount: number;
  fees: number | null;
  discount: number | null;
  net_amount: number | null;
  group_id: string | null;
  category_id: string | null;
  category_name: string | null;
  payment_method: string | null;
  status: string;
  reference: string | null;
  notes: string | null;
  client_id: number | null;
  supplier_id: string | null;
  bank_account_id: string | null;
  cost_center: string | null;
  source: string | null;
  external_id: string | null;
  stone_code: string | null;
  receipt_url: string | null;
  reconciled: boolean | null;
  deleted_at: string | null;
  recurrence: string | null;
  recurrence_group: string | null;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
};

export const TX_STATUS: { value: string; label: string }[] = [
  { value: "paid", label: "Pago" },
  { value: "pending", label: "Pendente" },
  { value: "overdue", label: "Vencido" },
  { value: "cancelled", label: "Cancelado" },
  { value: "refunded", label: "Estornado" },
];

export const STATUS_FILTERS = [
  ...TX_STATUS,
  { value: "reconciled", label: "Conciliado" },
  { value: "unreconciled", label: "Não conciliado" },
];

export const PAYMENT_METHODS = [
  "Pix",
  "Cartão",
  "Dinheiro",
  "Boleto",
  "Transferência",
  "Débito automático",
];

export const RECURRENCES = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "yearly", label: "Anual" },
  { value: "custom", label: "Personalizado" },
];

const TRANSFER_RE = /transfer[eê]ncia entre contas|entre contas|transfer[eê]ncia interna/i;

/** transferências internas não são receita nem despesa operacional */
export const isTransfer = (r: Tx) =>
  TRANSFER_RE.test(`${r.category_name || ""} ${r.description || ""}`);

/** competência: vencimento quando informado, senão a data do lançamento */
export const competence = (r: Tx) => r.due_date || r.date;

/** status efetivo — pendente com vencimento passado aparece como vencido */
export const effStatus = (r: Tx) => {
  if (r.status === "paid" || r.status === "cancelled" || r.status === "refunded") return r.status;
  const d = r.due_date || r.date;
  if (d && d < todayISO()) return "overdue";
  return "pending";
};

export const statusLabel = (s: string) =>
  TX_STATUS.find((x) => x.value === s)?.label || s;

export const statusClass = (s: string) =>
  s === "paid"
    ? "bg-green-100 text-green-700"
    : s === "overdue"
      ? "bg-red-100 text-red-700"
      : s === "cancelled"
        ? "bg-muted text-muted-foreground"
        : s === "refunded"
          ? "bg-purple-100 text-purple-700"
          : "bg-amber-100 text-amber-700";

/** valor com sinal contábil: estorno reduz o lado de origem */
export const signed = (r: Tx) =>
  (r.status === "refunded" ? -1 : 1) * (Number(r.amount) || 0);

export const netOf = (r: Tx) =>
  r.net_amount != null
    ? Number(r.net_amount)
    : (Number(r.amount) || 0) - (Number(r.fees) || 0) - (Number(r.discount) || 0);

export const isPaid = (r: Tx) => r.status === "paid";
export const isOpen = (r: Tx) => ["pending", "scheduled"].includes(r.status);
export const countsForResult = (r: Tx) =>
  r.status !== "cancelled" && !isTransfer(r);

export type ExportRow = Record<string, string | number>;

export const buildExportRows = (
  list: Tx[],
  unitName: (id: string | null) => string,
  groupName: (id: string | null) => string,
  accountName: (id: string | null) => string,
): ExportRow[] =>
  list.map((r) => ({
    Data: new Date(`${r.date}T00:00:00`).toLocaleDateString("pt-BR"),
    Competência: new Date(`${competence(r)}T00:00:00`).toLocaleDateString("pt-BR"),
    Descrição: r.description || "",
    Tipo: r.kind === "income" ? "Entrada" : "Saída",
    Grupo: groupName(r.group_id),
    Categoria: r.category_name || "Sem categoria",
    Unidade: unitName(r.unit_id),
    Conta: accountName(r.bank_account_id),
    "Forma de pagamento": r.payment_method || "",
    Valor: Number(r.amount) || 0,
    Status: statusLabel(effStatus(r)),
    Origem: r.source === "import" ? "Importação" : r.source === "bank" ? "Banco" : "Manual",
    Identificador: r.external_id || r.reference || r.id.slice(0, 8),
    Observação: r.notes || "",
  }));

export const downloadCsv = (rows: ExportRow[], filename: string) => {
  const head = Object.keys(rows[0] || { Data: "" });
  const body = rows.map((r) =>
    head.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(";"),
  );
  const blob = new Blob(["\uFEFF" + [head.join(";"), ...body].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(blob, `${filename}.csv`);
};

export const downloadXlsx = (rows: ExportRow[], filename: string) => {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transações");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const printPdf = (rows: ExportRow[], title: string, subtitle: string) => {
  const head = Object.keys(rows[0] || { Data: "" });
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>body{font-family:Montserrat,Arial,sans-serif;padding:24px;color:#101828}
  h1{font-size:18px;margin:0}p{color:#667085;font-size:12px;margin:4px 0 16px}
  table{width:100%;border-collapse:collapse;font-size:10px}
  th{text-align:left;background:#F4F5FA;padding:6px;border-bottom:1px solid #E4E7EC}
  td{padding:5px 6px;border-bottom:1px solid #F0F1F5}</style></head><body>
  <h1>${title}</h1><p>${subtitle}</p>
  <table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${rows
    .map(
      (r) =>
        `<tr>${head
          .map((h) => `<td>${h === "Valor" ? fmtBRL(Number(r[h])) : String(r[h] ?? "")}</td>`)
          .join("")}</tr>`,
    )
    .join("")}</tbody></table></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
};

const triggerDownload = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

/** lê CSV/XLS/XLSX/OFX e devolve linhas normalizadas em objetos */
export const parseFinancialFile = async (
  file: File,
): Promise<{ headers: string[]; rows: Record<string, any>[] }> => {
  const name = file.name.toLowerCase();
  if (name.endsWith(".ofx")) {
    const text = await file.text();
    const blocks = text.split(/<STMTTRN>/i).slice(1);
    const rows = blocks.map((b) => {
      const get = (tag: string) =>
        (b.match(new RegExp(`<${tag}>([^<\r\n]*)`, "i")) || [])[1]?.trim() || "";
      const raw = get("DTPOSTED").slice(0, 8);
      return {
        Data: raw ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : "",
        Descrição: get("MEMO") || get("NAME"),
        Valor: Number(get("TRNAMT") || 0),
        Identificador: get("FITID"),
      };
    });
    return { headers: ["Data", "Descrição", "Valor", "Identificador"], rows };
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: false, raw: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
  return { headers: Object.keys(rows[0] || {}), rows };
};

/** normaliza datas em vários formatos para ISO */
export const toISODate = (v: any): string => {
  if (!v) return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const br = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (br) {
    const y = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${y}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  }
  const n = Number(s);
  if (Number.isFinite(n) && n > 20000 && n < 60000) {
    const d = new Date(Date.UTC(1899, 11, 30) as any);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

/** normaliza valores em formato brasileiro ou americano */
export const toNumber = (v: any): number => {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/[R$\s]/g, "");
  if (!s) return 0;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

/** próxima data de uma recorrência */
export const nextDate = (iso: string, freq: string, i: number, customDays = 30) => {
  const d = new Date(`${iso}T00:00:00`);
  if (freq === "weekly") d.setDate(d.getDate() + 7 * i);
  else if (freq === "monthly") d.setMonth(d.getMonth() + i);
  else if (freq === "quarterly") d.setMonth(d.getMonth() + 3 * i);
  else if (freq === "semiannual") d.setMonth(d.getMonth() + 6 * i);
  else if (freq === "yearly") d.setFullYear(d.getFullYear() + i);
  else d.setDate(d.getDate() + customDays * i);
  return d.toISOString().slice(0, 10);
};
