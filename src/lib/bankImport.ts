/** Parsers de extrato bancário: OFX e CSV. Estrutura pronta para o feed de Open Finance. */
export type ParsedMovement = {
  posted_at: string;
  amount: number;
  direction: "in" | "out";
  description: string;
  memo?: string | null;
  bank_ref?: string | null;
  raw?: Record<string, any>;
};

const toISO = (s: string): string | null => {
  const t = s.trim();
  const ofx = t.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofx) return `${ofx[1]}-${ofx[2]}-${ofx[3]}`;
  const br = t.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return null;
};

const toNumber = (s: string): number => {
  const t = s.replace(/[R$\s]/g, "").trim();
  const normalized = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
};

export function parseOFX(text: string): ParsedMovement[] {
  const out: ParsedMovement[] = [];
  const blocks = text.split(/<STMTTRN>/i).slice(1);
  for (const b of blocks) {
    const get = (tag: string) => {
      const m = b.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, "i"));
      return m ? m[1].trim() : "";
    };
    const date = toISO(get("DTPOSTED"));
    const amount = toNumber(get("TRNAMT"));
    if (!date || !Number.isFinite(amount) || amount === 0) continue;
    out.push({
      posted_at: date,
      amount,
      direction: amount < 0 ? "out" : "in",
      description: get("NAME") || get("MEMO") || "Movimentação",
      memo: get("MEMO") || null,
      bank_ref: get("FITID") || null,
      raw: { trntype: get("TRNTYPE"), checknum: get("CHECKNUM") },
    });
  }
  return out;
}

const splitCsvLine = (line: string, sep: string) =>
  line.split(sep).map(c => c.replace(/^"|"$/g, "").trim());

export function parseCSV(text: string): ParsedMovement[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const sep = (lines[0].match(/;/g)?.length || 0) >= (lines[0].match(/,/g)?.length || 0) ? ";" : ",";
  const header = splitCsvLine(lines[0], sep).map(h => h.toLowerCase());
  const idx = (...names: string[]) => header.findIndex(h => names.some(n => h.includes(n)));
  const iDate = idx("data", "date");
  const iAmount = idx("valor", "amount", "montante");
  const iDesc = idx("descri", "histor", "memo", "lanç", "lanc");
  const iRef = idx("id", "identificador", "documento", "fitid");
  const hasHeader = iDate >= 0 && iAmount >= 0;
  const rows = hasHeader ? lines.slice(1) : lines;

  const out: ParsedMovement[] = [];
  rows.forEach(line => {
    const c = splitCsvLine(line, sep);
    const date = toISO(c[hasHeader ? iDate : 0] || "");
    const amount = toNumber(c[hasHeader ? iAmount : 2] || "");
    if (!date || !Number.isFinite(amount) || amount === 0) return;
    out.push({
      posted_at: date,
      amount,
      direction: amount < 0 ? "out" : "in",
      description: (hasHeader && iDesc >= 0 ? c[iDesc] : c[1]) || "Movimentação",
      memo: null,
      bank_ref: hasHeader && iRef >= 0 ? c[iRef] || null : null,
      raw: { line },
    });
  });
  return out;
}

export function parseStatement(fileName: string, text: string) {
  const isOfx = /\.ofx$/i.test(fileName) || /<STMTTRN>/i.test(text);
  return { source: isOfx ? "ofx" : "csv", movements: isOfx ? parseOFX(text) : parseCSV(text) };
}