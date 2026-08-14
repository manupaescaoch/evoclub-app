import { fmtBRL } from "@/lib/finance";

export type PrintableContract = {
  title: string;
  body: string | null;
  plan: string | null;
  plan_value: number | null;
  starts_at: string | null;
  ends_at: string | null;
  version?: number | null;
  status?: string | null;
  channel?: string | null;
  sent_at?: string | null;
  sent_by_name?: string | null;
  viewed_at?: string | null;
  signed_at?: string | null;
  signature_name?: string | null;
  signature_cpf?: string | null;
  signature_hash?: string | null;
};

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR") : "—";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Abre a janela de impressão (salvar como PDF) do contrato emitido. */
export function printContract(c: PrintableContract, studentName: string): boolean {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return false;
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
  <title>${esc(c.title)}</title>
  <style>
    body{font-family:Helvetica,Arial,sans-serif;color:#111;margin:40px;line-height:1.6}
    h1{font-size:20px;letter-spacing:1px;text-transform:uppercase;margin:0 0 4px}
    .muted{color:#666;font-size:12px}
    table{border-collapse:collapse;margin:20px 0;width:100%;font-size:13px}
    td{border:1px solid #ddd;padding:8px}
    pre{white-space:pre-wrap;font-family:inherit;font-size:13px}
    .sign{margin-top:40px;border-top:1px solid #ddd;padding-top:16px;font-size:12px}
  </style></head><body>
  <h1>EVO Training Club</h1>
  <p class="muted">${esc(c.title)} — versão ${c.version ?? 1}</p>
  <table>
    <tr><td><b>Aluno</b></td><td>${esc(studentName)}</td></tr>
    <tr><td><b>Plano</b></td><td>${esc(c.plan || "—")}${c.plan_value ? ` — ${fmtBRL(Number(c.plan_value))}` : ""}</td></tr>
    <tr><td><b>Vigência</b></td><td>${fmtDate(c.starts_at)} a ${fmtDate(c.ends_at)}</td></tr>
    <tr><td><b>Envio</b></td><td>${c.sent_at ? new Date(c.sent_at).toLocaleString("pt-BR") : "—"}${c.channel ? ` · ${esc(c.channel)}` : ""}${c.sent_by_name ? ` · por ${esc(c.sent_by_name)}` : ""}</td></tr>
    <tr><td><b>Visualização</b></td><td>${c.viewed_at ? new Date(c.viewed_at).toLocaleString("pt-BR") : "—"}</td></tr>
  </table>
  <pre>${esc(c.body || "Contrato sem texto cadastrado.")}</pre>
  <div class="sign">
    ${c.signed_at
      ? `Assinado digitalmente por <b>${esc(c.signature_name || studentName)}</b>${c.signature_cpf ? ` (CPF ${esc(c.signature_cpf)})` : ""}
         em ${new Date(c.signed_at).toLocaleString("pt-BR")}.<br>Código de validação: ${esc(c.signature_hash || "")}`
      : "Documento ainda não assinado."}
  </div>
  </body></html>`);
  w.document.close();
  w.focus();
  w.print();
  return true;
}

export const CONTRACT_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  sent: "Enviado",
  viewed: "Visualizado",
  signed: "Assinado",
  expired: "Expirado",
};

export const contractStatusClass = (s: string) =>
  s === "signed" ? "bg-green-100 text-green-700"
  : s === "viewed" ? "bg-blue-100 text-blue-700"
  : s === "expired" ? "bg-red-100 text-red-700"
  : "bg-amber-100 text-amber-700";
