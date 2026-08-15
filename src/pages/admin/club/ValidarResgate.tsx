import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageShell, { EmptyState } from "@/components/admin/gerencial/PageShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle, Check, Clock, Search, User } from "lucide-react";
import { fmtBRL } from "@/lib/finance";
import { logAudit, logUpdate } from "@/lib/audit";
import { useUnit } from "@/contexts/UnitContext";
import { benefitSummary, LIMIT_PERIODS } from "./Parceiros";

type Member = { student_id: string; member_code: string; name: string | null; unit: string | null };
type Partner = { id: string; name: string; active: boolean; contract_ends_at: string | null };
type Benefit = {
  id: string; partner_id: string; label: string; benefit_type: string; value: number | null;
  rules: string | null; usage_limit: number | null; limit_period: string;
  valid_from: string | null; valid_until: string | null;
};
type Redemption = {
  id: string; partner_id: string | null; amount_saved: number | null;
  status: string; redeemed_at: string; confirmed_by: string | null;
  benefit_label: string | null; purchase_amount: number | null;
};

/** Extrai o ID do aluno de um QR (EVOCLUB-MEMBER|uuid) ou devolve o texto puro. */
const parseInput = (raw: string) => {
  const t = raw.trim();
  if (t.toUpperCase().startsWith("EVOCLUB-MEMBER|")) return t.split("|")[1]?.trim() ?? "";
  return t;
};

export default function ValidarResgate() {
  const { filterId } = useUnit();
  const [query, setQuery] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [partnerId, setPartnerId] = useState("");
  const [benefitId, setBenefitId] = useState("");
  const [purchase, setPurchase] = useState("");
  const [amount, setAmount] = useState("");
  const [check, setCheck] = useState<{ ok: boolean; reason?: string; used?: number; usage_limit?: number | null } | null>(null);
  const [staffName, setStaffName] = useState("Equipe");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadCatalog = () => {
    setLoadError(null);
    supabase.from("partners").select("id, name, active, contract_ends_at").eq("active", true).order("name")
      .then(({ data, error }) => {
        if (error) { setLoadError(error.message); return; }
        setPartners((data ?? []) as Partner[]);
      });
    supabase.from("partner_benefits").select("*").eq("active", true).order("label")
      .then(({ data, error }) => {
        if (error) { setLoadError(error.message); return; }
        setBenefits(((data ?? []) as any[]).map(b => ({ ...b, value: b.value === null ? null : Number(b.value) })) as Benefit[]);
      });
  };

  useEffect(() => {
    loadCatalog();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      const meta = (u?.user_metadata || {}) as Record<string, string>;
      setStaffName(meta.full_name || meta.name || u?.email || "Equipe");
    });
  }, []);

  const partnerBenefits = useMemo(
    () => benefits.filter(b => b.partner_id === partnerId),
    [benefits, partnerId]
  );
  const benefit = benefits.find(b => b.id === benefitId) || null;

  /* Checa limite de uso assim que aluno + benefício estão definidos. */
  useEffect(() => {
    setCheck(null);
    if (!member || !benefitId) return;
    let alive = true;
    supabase.rpc("club_benefit_check" as any, { _student_id: member.student_id, _benefit_id: benefitId })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) { setCheck({ ok: false, reason: "Não foi possível verificar o limite de uso." }); return; }
        setCheck((data || {}) as any);
      });
    return () => { alive = false; };
  }, [member, benefitId]);

  const loadRedemptions = async (studentId: string) => {
    const { data } = await supabase
      .from("club_redemptions")
      .select("id, partner_id, amount_saved, status, redeemed_at, confirmed_by, benefit_label, purchase_amount")
      .eq("student_id", studentId)
      .order("redeemed_at", { ascending: false })
      .limit(20);
    setRedemptions((data ?? []) as Redemption[]);
  };

  const search = async () => {
    const value = parseInput(query);
    if (!value) return;
    setBusy(true);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    const q = supabase.from("club_members").select("student_id, member_code, name, unit");
    const { data, error } = isUuid
      ? await q.eq("student_id", value).maybeSingle()
      : await q.ilike("member_code", value).maybeSingle();
    setBusy(false);
    if (error || !data) {
      setMember(null);
      setRedemptions([]);
      toast.error("Aluno não encontrado. Confira o ID de membro ou o QR Code.");
      return;
    }
    setMember(data as Member);
    await loadRedemptions((data as Member).student_id);
  };

  const parsedAmount = () => {
    const n = parseFloat(amount.replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? null : n;
  };

  const parsedPurchase = () => {
    const n = parseFloat(purchase.replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? null : n;
  };

  const confirmPending = async (r: Redemption) => {
    const value = parsedAmount();
    if (value === null) return toast.error("Informe o valor economizado.");
    setBusy(true);
    const { error } = await supabase
      .from("club_redemptions")
      .update({
        amount_saved: value,
        status: "confirmed",
        confirmed_by: staffName,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", r.id);
    setBusy(false);
    if (error) return toast.error("Não foi possível confirmar o resgate.");
    toast.success("Resgate confirmado.");
    logUpdate("club_redemption", r.id, `Resgate do Club confirmado (${fmtBRL(value)})`);
    setAmount("");
    if (member) loadRedemptions(member.student_id);
  };

  /** Registra o resgate pelo RPC, que aplica o limite de uso e calcula a economia. */
  const registerRedemption = async () => {
    if (!member) return;
    if (!partnerId) return toast.error("Selecione o parceiro.");
    if (!benefitId) return toast.error("Selecione o benefício utilizado.");
    setBusy(true);
    const { data, error } = await supabase.rpc("club_redeem" as any, {
      _student_id: member.student_id,
      _benefit_id: benefitId,
      _purchase_amount: parsedPurchase(),
      _unit_id: filterId,
      _source: "qr",
      _confirmed_by: staffName,
    });
    setBusy(false);
    if (error) return toast.error("Não foi possível registrar o resgate.");
    const r = (data || {}) as any;
    if (!r.ok) {
      toast.error(r.reason || "Resgate recusado.");
      setCheck({ ok: false, reason: r.reason });
      return;
    }
    toast.success(`Resgate validado · economia de ${fmtBRL(Number(r.amount_saved || 0))}`);
    logAudit({
      action: "create", module: "club", entity: "club_redemptions", entity_id: r.redemption_id,
      unit_id: filterId,
      description: `Resgate do Club validado por QR — ${member.name ?? member.member_code} · ${r.benefit_label} · economia ${fmtBRL(Number(r.amount_saved || 0))}`,
      after: { benefit_id: benefitId, purchase_amount: parsedPurchase(), amount_saved: r.amount_saved, source: "qr" },
    });
    setPurchase(""); setBenefitId(""); setPartnerId(""); setCheck(null);
    loadRedemptions(member.student_id);
  };

  const partnerName = (id: string | null) => partners.find((p) => p.id === id)?.name ?? "Parceiro";
  const pending = redemptions.filter((r) => r.status === "pending");

  return (
    <PageShell
      title="Validar Resgate"
      description="Confirme os resgates do Club apresentados pelos alunos na recepção ou no parceiro."
    >
      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center justify-between gap-3">
          <p className="text-xs font-dm text-red-700">Falha ao carregar parceiros e benefícios. {loadError}</p>
          <Button size="sm" variant="outline" onClick={loadCatalog} className="font-dm">Tentar novamente</Button>
        </div>
      )}
      <div className="rounded-xl border border-border bg-card p-4">
        <Label className="font-dm text-xs uppercase tracking-wide text-muted-foreground">
          ID de membro ou QR Code do aluno
        </Label>
        <div className="flex gap-2 mt-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="EVO-1A2B3C ou EVOCLUB-MEMBER|..."
            className="font-dm"
          />
          <Button onClick={search} disabled={busy} className="font-dm">
            <Search size={15} className="mr-1" /> Buscar
          </Button>
        </div>
        <p className="text-xs font-dm text-muted-foreground mt-2">
          Ao escanear o QR Code com um leitor, o conteúdo é colado automaticamente neste campo.
        </p>
      </div>

      {member && (
        <>
          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <User size={18} />
            </div>
            <div>
              <p className="font-barlow font-bold text-lg text-foreground leading-none">
                {member.name ?? "Aluno"}
              </p>
              <p className="text-xs font-dm text-muted-foreground mt-1">
                {member.member_code} · {member.unit ?? "—"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="space-y-3">
              <p className="font-barlow font-bold text-base text-foreground">Registrar resgate</p>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label className="font-dm text-xs">Parceiro</Label>
                  <select
                    value={partnerId}
                    onChange={(e) => { setPartnerId(e.target.value); setBenefitId(""); }}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-dm"
                  >
                    <option value="">Selecione o parceiro</option>
                    {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="font-dm text-xs">Benefício utilizado</Label>
                  <select
                    value={benefitId}
                    onChange={(e) => setBenefitId(e.target.value)}
                    disabled={!partnerId}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-dm disabled:opacity-50"
                  >
                    <option value="">
                      {!partnerId ? "Selecione o parceiro primeiro"
                        : partnerBenefits.length === 0 ? "Nenhum benefício ativo" : "Selecione o benefício"}
                    </option>
                    {partnerBenefits.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="font-dm text-xs">Valor da compra (opcional)</Label>
                  <Input
                    value={purchase}
                    onChange={(e) => setPurchase(e.target.value)}
                    inputMode="decimal"
                    placeholder="0,00"
                    className="font-dm"
                  />
                </div>
              </div>

              {benefit && (
                <div className="rounded-lg border border-border bg-background p-3 space-y-1">
                  <p className="text-xs font-dm text-foreground">
                    {benefitSummary(benefit)} · limite {benefit.usage_limit ?? "livre"}
                    {benefit.usage_limit ? ` ${LIMIT_PERIODS.find(l => l.key === benefit.limit_period)?.label ?? ""} por aluno` : ""}
                  </p>
                  {benefit.rules && <p className="text-xs font-dm text-muted-foreground">Regras: {benefit.rules}</p>}
                  {check && (check.ok
                    ? <p className="text-xs font-dm text-green-700">
                        Liberado · usos no período: {check.used ?? 0}{check.usage_limit ? `/${check.usage_limit}` : ""}
                      </p>
                    : <p className="text-xs font-dm text-red-600 flex items-center gap-1">
                        <AlertTriangle size={12} /> {check.reason}
                      </p>
                  )}
                </div>
              )}

              <Button onClick={registerRedemption} disabled={busy || (check ? !check.ok : false)} className="font-dm">
                <Check size={15} className="mr-1" /> Validar e registrar resgate
              </Button>
              <p className="text-[11px] font-dm text-muted-foreground">
                A economia é calculada pela regra do benefício e o limite de uso por aluno é aplicado automaticamente.
              </p>
            </div>

            <div className="border-t border-border pt-3">
              <Label className="font-dm text-xs">Valor economizado (para confirmar pedidos pendentes do app)</Label>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className="font-dm md:max-w-xs mt-1"
              />
              <p className="font-dm text-sm font-semibold text-foreground mt-2 mb-2 flex items-center gap-1">
                <Clock size={14} /> Resgates aguardando confirmação
              </p>
              {pending.length === 0 && (
                <p className="text-xs font-dm text-muted-foreground">
                  Nenhum resgate pendente para este aluno.
                </p>
              )}
              <div className="space-y-2">
                {pending.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="font-dm text-sm text-foreground">{partnerName(r.partner_id)}</p>
                      <p className="text-xs font-dm text-muted-foreground">
                        {new Date(r.redeemed_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => confirmPending(r)} disabled={busy} className="font-dm">
                      <Check size={14} className="mr-1" /> Confirmar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="font-barlow font-bold text-base text-foreground mb-3">Histórico do aluno</p>
            {redemptions.length === 0 ? (
              <EmptyState message="Nenhum resgate registrado." />
            ) : (
              <div className="space-y-2">
                {redemptions.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="font-dm text-sm text-foreground">
                        {partnerName(r.partner_id)}{r.benefit_label ? ` · ${r.benefit_label}` : ""}
                      </p>
                      <p className="text-xs font-dm text-muted-foreground">
                        {new Date(r.redeemed_at).toLocaleDateString("pt-BR")}
                        {r.purchase_amount != null ? ` · compra ${fmtBRL(Number(r.purchase_amount))}` : ""}
                        {r.confirmed_by ? ` · validado por ${r.confirmed_by}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-barlow font-bold text-base text-foreground">
                        {r.status === "confirmed" ? fmtBRL(Number(r.amount_saved || 0)) : "—"}
                      </p>
                      <span className={`text-[11px] font-dm ${r.status === "confirmed" ? "text-green-700" : "text-amber-700"}`}>
                        {r.status === "confirmed" ? "Confirmado" : "Pendente"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}
