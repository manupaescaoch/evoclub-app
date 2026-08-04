import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageShell, { EmptyState } from "@/components/admin/gerencial/PageShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Check, Clock, Search, User } from "lucide-react";
import { fmtBRL } from "@/lib/finance";
import { logCreate, logUpdate } from "@/lib/audit";

type Member = { student_id: string; member_code: string; name: string | null; unit: string | null };
type Partner = { id: string; name: string };
type Redemption = {
  id: string; partner_id: string | null; amount_saved: number | null;
  status: string; redeemed_at: string; confirmed_by: string | null;
};

/** Extrai o ID do aluno de um QR (EVOCLUB-MEMBER|uuid) ou devolve o texto puro. */
const parseInput = (raw: string) => {
  const t = raw.trim();
  if (t.toUpperCase().startsWith("EVOCLUB-MEMBER|")) return t.split("|")[1]?.trim() ?? "";
  return t;
};

export default function ValidarResgate() {
  const [query, setQuery] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [partnerId, setPartnerId] = useState("");
  const [amount, setAmount] = useState("");
  const [staffName, setStaffName] = useState("Equipe");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("partners").select("id, name").eq("active", true).order("name")
      .then(({ data }) => setPartners((data ?? []) as Partner[]));
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      const meta = (u?.user_metadata || {}) as Record<string, string>;
      setStaffName(meta.full_name || meta.name || u?.email || "Equipe");
    });
  }, []);

  const loadRedemptions = async (studentId: string) => {
    const { data } = await supabase
      .from("club_redemptions")
      .select("id, partner_id, amount_saved, status, redeemed_at, confirmed_by")
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

  const createConfirmed = async () => {
    if (!member) return;
    if (!partnerId) return toast.error("Selecione o parceiro.");
    const value = parsedAmount();
    if (value === null) return toast.error("Informe o valor economizado.");
    setBusy(true);
    const { error } = await supabase.from("club_redemptions").insert({
      student_id: member.student_id,
      partner_id: partnerId,
      amount_saved: value,
      status: "confirmed",
      confirmed_by: staffName,
      confirmed_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) return toast.error("Não foi possível registrar o resgate.");
    toast.success("Resgate registrado e confirmado.");
    logCreate("club_redemption", null, `Resgate do Club registrado para ${member.name ?? member.member_code} (${fmtBRL(value)})`);
    setAmount("");
    setPartnerId("");
    loadRedemptions(member.student_id);
  };

  const partnerName = (id: string | null) => partners.find((p) => p.id === id)?.name ?? "Parceiro";
  const pending = redemptions.filter((r) => r.status === "pending");

  return (
    <PageShell
      title="Validar Resgate"
      description="Confirme os resgates do Club apresentados pelos alunos na recepção ou no parceiro."
    >
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

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="font-barlow font-bold text-base text-foreground">Valor economizado</p>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className="font-dm md:max-w-xs"
            />

            <div>
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

            <div className="border-t border-border pt-3">
              <p className="font-dm text-sm font-semibold text-foreground mb-2">
                Ou registrar um novo resgate já confirmado
              </p>
              <div className="flex flex-col md:flex-row gap-2">
                <Select value={partnerId} onValueChange={setPartnerId}>
                  <SelectTrigger className="font-dm md:max-w-xs">
                    <SelectValue placeholder="Selecione o parceiro" />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="font-dm">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={createConfirmed} disabled={busy} className="font-dm">
                  <Check size={15} className="mr-1" /> Registrar e confirmar
                </Button>
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
                      <p className="font-dm text-sm text-foreground">{partnerName(r.partner_id)}</p>
                      <p className="text-xs font-dm text-muted-foreground">
                        {new Date(r.redeemed_at).toLocaleDateString("pt-BR")}
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
