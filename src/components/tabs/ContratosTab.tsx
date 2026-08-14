import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, FileText, Download, PenLine, CheckCircle2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useProfile } from "@/hooks/useProfile";
import { fmtBRL } from "@/lib/finance";

type ClientContract = {
  id: string;
  title: string;
  body: string | null;
  plan: string | null;
  plan_value: number | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
  signed_at: string | null;
  signature_name: string | null;
  signature_cpf: string | null;
  signature_hash: string | null;
  created_at: string;
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR") : "—";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Abre uma janela de impressão (salvar como PDF) com o contrato. */
const printContract = (c: ClientContract, studentName: string) => {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return toast.error("Libere pop-ups para baixar o PDF");
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
  <p class="muted">${esc(c.title)}</p>
  <table>
    <tr><td><b>Aluno</b></td><td>${esc(studentName)}</td></tr>
    <tr><td><b>Plano</b></td><td>${esc(c.plan || "—")}${c.plan_value ? ` — ${fmtBRL(Number(c.plan_value))}` : ""}</td></tr>
    <tr><td><b>Vigência</b></td><td>${fmtDate(c.starts_at)} a ${fmtDate(c.ends_at)}</td></tr>
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
};

const ContratosTab = ({ onBack }: { onBack: () => void }) => {
  const { profile } = useProfile();
  const [rows, setRows] = useState<ClientContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ClientContract | null>(null);
  const [signing, setSigning] = useState<ClientContract | null>(null);
  const [signName, setSignName] = useState("");
  const [signCpf, setSignCpf] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("client_contracts")
      .select("*")
      .eq("client_id", profile.id)
      .order("created_at", { ascending: false });
    setRows((data || []) as ClientContract[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const openSign = (c: ClientContract) => {
    setSignName(profile?.name || "");
    setSignCpf(profile?.cpf || "");
    setSigning(c);
  };

  const sign = async () => {
    if (!signing) return;
    if (signName.trim().length < 3) return toast.error("Digite seu nome completo");
    setSaving(true);
    const { data, error } = await supabase.rpc("sign_contract", {
      _contract: signing.id,
      _name: signName.trim(),
      _cpf: signCpf.trim() || null,
    });
    setSaving(false);
    const res = (data || {}) as { ok?: boolean; reason?: string };
    if (error || !res.ok) return toast.error("Não foi possível assinar o contrato");
    toast.success("Contrato assinado!");
    setSigning(null);
    setActive(null);
    load();
  };

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center">
          <ChevronLeft size={22} className="text-foreground" />
        </button>
        <p className="font-barlow font-bold text-lg text-foreground">Meus Contratos</p>
      </div>

      {loading ? (
        <p className="text-xs font-dm text-muted">Carregando...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 card-shadow text-center">
          <FileText size={28} className="text-muted mx-auto mb-2" />
          <p className="text-sm font-dm text-muted">
            Nenhum contrato disponível. A recepção libera seu contrato aqui quando emitido.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <div key={c.id} className="rounded-2xl bg-white p-4 card-shadow">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-barlow font-[800] text-base text-foreground">{c.title}</p>
                  <p className="text-[11px] font-dm text-muted">
                    {c.plan || "Plano"} • {fmtDate(c.starts_at)} a {fmtDate(c.ends_at)}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-dm font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                    c.status === "signed" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {c.status === "signed" ? "Assinado" : "Pendente"}
                </span>
              </div>

              {c.signed_at && (
                <p className="text-[10px] font-dm text-muted mt-2 flex items-center gap-1">
                  <ShieldCheck size={12} className="text-green-600" />
                  Assinado em {new Date(c.signed_at).toLocaleString("pt-BR")}
                </p>
              )}

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setActive(c)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground font-dm font-semibold text-xs"
                >
                  Ler contrato
                </button>
                <button
                  onClick={() => printContract(c, profile?.name || "Aluno")}
                  className="px-3 py-2.5 rounded-xl bg-secondary text-foreground"
                  aria-label="Baixar PDF"
                >
                  <Download size={15} />
                </button>
                {c.status !== "signed" && (
                  <button
                    onClick={() => openSign(c)}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-dm font-semibold text-xs flex items-center justify-center gap-1"
                  >
                    <PenLine size={13} /> Assinar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leitura */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-[350px] rounded-2xl p-5 max-h-[80vh] overflow-y-auto">
          <p className="font-barlow font-bold text-base text-foreground">{active?.title}</p>
          <p className="text-[11px] font-dm text-muted -mt-1">
            {active?.plan || "Plano"}
            {active?.plan_value ? ` • ${fmtBRL(Number(active.plan_value))}` : ""}
          </p>
          <p className="text-[12px] font-dm text-foreground whitespace-pre-line leading-relaxed">
            {active?.body || "Contrato sem texto cadastrado."}
          </p>
          {active && active.status !== "signed" ? (
            <button
              onClick={() => openSign(active)}
              className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-dm font-semibold text-sm cta-shadow flex items-center justify-center gap-2"
            >
              <PenLine size={15} /> Assinar contrato
            </button>
          ) : (
            <p className="text-[11px] font-dm text-green-700 flex items-center gap-1">
              <CheckCircle2 size={13} /> Contrato assinado
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Assinatura */}
      <Dialog open={!!signing} onOpenChange={(o) => !o && setSigning(null)}>
        <DialogContent className="max-w-[340px] rounded-2xl p-5">
          <p className="font-barlow font-bold text-lg text-foreground">ASSINATURA DIGITAL</p>
          <p className="text-[11px] font-dm text-muted -mt-1">
            Ao confirmar, você declara ter lido e aceito as condições do contrato. Geramos um código de validação com data e hora.
          </p>
          <label className="text-[11px] font-dm font-semibold text-foreground mt-1">Nome completo</label>
          <input
            value={signName}
            onChange={(e) => setSignName(e.target.value)}
            className="w-full rounded-xl border border-border px-3 py-3 text-sm font-dm outline-none"
          />
          <label className="text-[11px] font-dm font-semibold text-foreground">CPF (opcional)</label>
          <input
            value={signCpf}
            onChange={(e) => setSignCpf(e.target.value)}
            inputMode="numeric"
            className="w-full rounded-xl border border-border px-3 py-3 text-sm font-dm outline-none"
          />
          <button
            disabled={saving}
            onClick={sign}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-dm font-semibold text-sm cta-shadow disabled:opacity-60"
          >
            {saving ? "Assinando..." : "Confirmar assinatura"}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContratosTab;
