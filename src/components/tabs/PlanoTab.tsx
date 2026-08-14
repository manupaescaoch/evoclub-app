import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, CreditCard, FileText, CalendarClock, CheckCircle2, Clock, Gift, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useProfile, daysLeft } from "@/hooks/useProfile";
import { usePlanState, planMessage } from "@/hooks/usePlanState";
import { fmtBRL } from "@/lib/finance";

type Contract = {
  id: string;
  name: string;
  linked_plan: string | null;
  validity_months: number | null;
  renewal_rules: string | null;
  cancellation_rules: string | null;
};

type Renewal = {
  id: string;
  desired_plan: string | null;
  payment_method: string | null;
  status: string;
  created_at: string;
};

type Benefit = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  delivered_at: string | null;
};

const STATUS: Record<string, string> = {
  pending: "Em análise",
  contacted: "Equipe entrou em contato",
  done: "Renovado",
  cancelled: "Cancelado",
};

const PAYMENTS = ["Pix", "Cartão de crédito", "Dinheiro", "Débito automático"];

const fmtDate = (iso: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR") : "—";

const PlanoTab = ({ onBack, onNavigate }: { onBack: () => void; onNavigate?: (s: string) => void }) => {
  const { profile } = useProfile();
  const { plan: planState } = usePlanState();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [requests, setRequests] = useState<Renewal[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState("");
  const [payment, setPayment] = useState(PAYMENTS[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const [c, r, b] = await Promise.all([
      supabase.from("contracts").select("id, name, linked_plan, validity_months, renewal_rules, cancellation_rules").eq("status", "active"),
      supabase
        .from("renewal_requests")
        .select("id, desired_plan, payment_method, status, created_at")
        .eq("client_id", profile.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("renewal_benefits")
        .select("id, title, description, status, delivered_at")
        .eq("client_id", profile.id)
        .order("created_at", { ascending: false }),
    ]);
    setContracts((c.data || []) as Contract[]);
    setRequests((r.data || []) as Renewal[]);
    setBenefits((b.data || []) as Benefit[]);
    setPlan(profile.plan || "");
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const left = daysLeft(profile?.contract_end ?? null);
  const expiring = left !== null && left <= 30;
  const myContract =
    contracts.find((c) => c.linked_plan && profile?.plan && c.linked_plan === profile.plan) || contracts[0] || null;

  const submit = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("renewal_requests").insert({
      client_id: profile.id,
      unit_id: profile.unit_id,
      desired_plan: plan.trim() || profile.plan,
      payment_method: payment,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error("Não foi possível enviar o pedido");
    toast.success("Pedido de renovação enviado! A equipe vai te chamar.");
    setOpen(false);
    setNotes("");
    load();
  };

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center">
          <ChevronLeft size={22} className="text-foreground" />
        </button>
        <p className="font-barlow font-bold text-lg text-foreground">Meu Plano</p>
      </div>

      {(planState.state === "blocked" || planState.state === "overdue") && (
        <div
          className={`rounded-2xl px-4 py-3 mb-4 text-[11px] font-dm font-semibold ${
            planState.blocked ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {planMessage(planState)}
        </div>
      )}

      {/* Plano atual */}
      <div className="rounded-2xl bg-white p-4 card-shadow mb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold">PLANO ATUAL</p>
            <p className="font-barlow font-[800] text-xl text-foreground mt-1">{profile?.plan || "Sem plano"}</p>
            {profile?.plan_value ? (
              <p className="text-xs font-dm text-muted">{fmtBRL(Number(profile.plan_value))} / mês</p>
            ) : null}
          </div>
          <span
            className={`text-[10px] font-dm font-semibold px-2.5 py-1 rounded-full ${
              profile?.status === "active" || !profile?.status ? "bg-primary/10 text-primary" : "bg-secondary text-muted"
            }`}
          >
            {profile?.status === "inactive" ? "Inativo" : "Ativo"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="p-3 rounded-xl bg-secondary">
            <p className="text-[10px] text-muted font-dm">Início</p>
            <p className="font-barlow font-[800] text-base text-foreground">{fmtDate(profile?.contract_start ?? null)}</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary">
            <p className="text-[10px] text-muted font-dm">Vencimento</p>
            <p className="font-barlow font-[800] text-base text-foreground">{fmtDate(profile?.contract_end ?? null)}</p>
          </div>
        </div>

        {left !== null && (
          <div
            className={`mt-3 flex items-center gap-2 p-3 rounded-xl ${
              left < 0 ? "bg-red-50" : expiring ? "bg-amber-50" : "bg-green-50"
            }`}
          >
            <CalendarClock
              size={16}
              className={left < 0 ? "text-red-600" : expiring ? "text-amber-600" : "text-green-600"}
            />
            <p
              className={`text-[11px] font-dm font-semibold ${
                left < 0 ? "text-red-700" : expiring ? "text-amber-700" : "text-green-700"
              }`}
            >
              {left < 0
                ? `Plano vencido há ${Math.abs(left)} dia(s)`
                : left === 0
                ? "Seu plano vence hoje"
                : `Faltam ${left} dia(s) para o vencimento`}
            </p>
          </div>
        )}

        <button
          onClick={() => setOpen(true)}
          className="mt-4 w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-dm font-semibold text-sm cta-shadow flex items-center justify-center gap-2"
        >
          <CreditCard size={16} /> Quero renovar
        </button>

        <button
          onClick={() => onNavigate?.("contratos")}
          className="mt-2 w-full py-3 rounded-2xl bg-secondary text-foreground font-dm font-semibold text-sm flex items-center justify-center gap-2"
        >
          <FileText size={15} /> Meus contratos
        </button>

        <button
          onClick={() => onNavigate?.("ciclos")}
          className="mt-2 w-full py-3 rounded-2xl bg-secondary text-foreground font-dm font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Sparkles size={15} /> Meus Ciclos EVO
        </button>
      </div>

      {/* Benefícios de renovação */}
      {benefits.length > 0 && (
        <div className="rounded-2xl bg-white p-4 card-shadow mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Gift size={16} className="text-primary" />
            <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold">
              BENEFÍCIOS DE RENOVAÇÃO
            </p>
          </div>
          <div className="space-y-2">
            {benefits.map((b) => (
              <div key={b.id} className="flex items-start justify-between gap-2 p-3 rounded-xl bg-secondary">
                <div>
                  <p className="text-xs font-dm font-semibold text-foreground">{b.title}</p>
                  {b.description && <p className="text-[10px] font-dm text-muted">{b.description}</p>}
                  {b.delivered_at && (
                    <p className="text-[10px] font-dm text-muted">
                      Entregue em {new Date(b.delivered_at).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                <span
                  className={`text-[10px] font-dm font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                    b.status === "delivered" ? "bg-green-50 text-green-700" : "bg-primary/10 text-primary"
                  }`}
                >
                  {b.status === "delivered" ? "Entregue" : "Disponível"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pedidos */}
      {requests.length > 0 && (
        <div className="rounded-2xl bg-white p-4 card-shadow mb-4">
          <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold mb-3">MEUS PEDIDOS</p>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary">
                <div>
                  <p className="text-xs font-dm font-semibold text-foreground">{r.desired_plan || "Renovação"}</p>
                  <p className="text-[10px] font-dm text-muted">
                    {new Date(r.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    {r.payment_method ? ` • ${r.payment_method}` : ""}
                  </p>
                </div>
                <span className="text-[10px] font-dm font-semibold text-primary flex items-center gap-1">
                  {r.status === "done" ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                  {STATUS[r.status] || r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contrato */}
      {myContract && (
        <div className="rounded-2xl bg-white p-4 card-shadow">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-primary" />
            <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold">MEU CONTRATO</p>
          </div>
          <p className="text-sm font-dm font-semibold text-foreground">{myContract.name}</p>
          {myContract.validity_months ? (
            <p className="text-[11px] font-dm text-muted mt-0.5">Vigência de {myContract.validity_months} mês(es)</p>
          ) : null}
          {myContract.renewal_rules && (
            <div className="mt-3">
              <p className="text-[11px] font-dm font-semibold text-foreground">Renovação</p>
              <p className="text-[11px] font-dm text-muted whitespace-pre-line">{myContract.renewal_rules}</p>
            </div>
          )}
          {myContract.cancellation_rules && (
            <div className="mt-3">
              <p className="text-[11px] font-dm font-semibold text-foreground">Cancelamento</p>
              <p className="text-[11px] font-dm text-muted whitespace-pre-line">{myContract.cancellation_rules}</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[340px] rounded-2xl p-5">
          <p className="font-barlow font-bold text-lg text-foreground">RENOVAR PLANO</p>
          <p className="text-[11px] font-dm text-muted -mt-1">A equipe confirma sua renovação pelo WhatsApp.</p>
          <label className="text-[11px] font-dm font-semibold text-foreground mt-2">Plano desejado</label>
          <input
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="Ex.: Mensal, Trimestral..."
            className="w-full rounded-xl border border-border px-3 py-3 text-sm font-dm outline-none"
          />
          <label className="text-[11px] font-dm font-semibold text-foreground">Forma de pagamento</label>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENTS.map((p) => (
              <button
                key={p}
                onClick={() => setPayment(p)}
                className={`text-[11px] font-dm py-2 rounded-xl font-semibold ${
                  payment === p ? "bg-primary text-primary-foreground" : "bg-secondary text-muted"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observação (opcional)"
            rows={3}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm font-dm outline-none resize-none"
          />
          <button
            disabled={saving}
            onClick={submit}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-dm font-semibold text-sm cta-shadow disabled:opacity-60"
          >
            {saving ? "Enviando..." : "Enviar pedido"}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanoTab;
