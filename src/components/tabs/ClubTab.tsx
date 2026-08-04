import { useState } from "react";
import { ChevronRight, ChevronLeft, MapPin, Tag, Ticket, QrCode, X, PiggyBank, Check, Clock } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useStudentName } from "@/hooks/useStudentName";
import { usePartners, useClubMember, useClubRedemptions, Partner, Redemption } from "@/hooks/useClub";
import { fmtBRL } from "@/lib/finance";

const STUDENT_UNIT = "Evo Training Club · Boa Viagem";

const filters = ["Todos", "Saúde", "Lifestyle", "Negócios"] as const;
const sections = ["Meu Cartão", "Parceiros", "Minha Economia"] as const;

const tagStyle: Record<string, string> = {
  Saúde: "bg-primary/10 text-primary",
  Lifestyle: "bg-secondary text-foreground",
  Serviços: "bg-secondary text-foreground",
};

const ClubTab = () => {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");
  const [selected, setSelected] = useState<Partner | null>(null);
  const [section, setSection] = useState<(typeof sections)[number]>("Meu Cartão");
  const { name } = useStudentName();
  const { studentId, memberCode } = useClubMember(name, STUDENT_UNIT);
  const { partners } = usePartners();
  const { items, total, request } = useClubRedemptions(studentId);

  if (selected)
    return (
      <PartnerDetail
        partner={selected}
        memberCode={memberCode}
        studentId={studentId}
        onBack={() => setSelected(null)}
        onRequest={() => request(selected.id)}
      />
    );

  const list = filter === "Todos" ? partners : partners.filter((p) => p.category === filter);

  return (
    <div className="px-4 pt-4 pb-4">
      <h1 className="font-barlow font-bold text-xl text-foreground">BENEFÍCIOS 🎟️</h1>
      <p className="text-xs font-dm text-muted mt-1 mb-4">
        Clube de vantagens exclusivo para alunos Evo Training Club.
      </p>

      {/* Sub-abas */}
      <div className="flex gap-1 p-1 rounded-full bg-secondary mb-4">
        {sections.map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`flex-1 py-2 rounded-full text-[11px] font-dm font-semibold transition-all ${
              section === s ? "bg-card text-primary card-shadow" : "text-muted"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {section === "Meu Cartão" && (
        <MemberCard name={name} memberId={memberCode} studentId={studentId} total={total} />
      )}

      {section === "Minha Economia" && <Savings total={total} items={items} />}

      {section === "Parceiros" && (
        <>
      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-dm font-semibold transition-all ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {list.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p)}
            className="w-full flex items-center gap-3 rounded-2xl bg-card p-3 card-shadow text-left"
          >
            <img
              src={p.image_url ?? ""}
              alt={`Parceiro ${p.name}`}
              loading="lazy"
              className="w-16 h-16 rounded-xl object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-dm font-bold uppercase tracking-wide ${tagStyle[p.tag ?? ""] ?? "bg-secondary text-foreground"}`}>
                {p.tag ?? p.category}
              </span>
              <p className="font-dm font-semibold text-sm text-foreground truncate mt-1">{p.name}</p>
              <p className="font-barlow font-bold text-base text-primary leading-none">{p.discount_label}</p>
              <p className="text-[11px] font-dm text-muted flex items-center gap-1 mt-1 truncate">
                <MapPin size={11} className="shrink-0" /> {p.location}
              </p>
            </div>
            <ChevronRight size={18} className="text-muted shrink-0" />
          </button>
        ))}
        {list.length === 0 && (
          <p className="text-center text-sm font-dm text-muted py-10">
            Nenhum parceiro nesta categoria.
          </p>
        )}
      </div>
        </>
      )}
    </div>
  );
};

const MemberCard = ({
  name, memberId, studentId, total,
}: { name: string; memberId: string; studentId: string | null; total: number }) => {
  const [full, setFull] = useState(false);
  const value = studentId ? `EVOCLUB-MEMBER|${studentId}` : "";

  return (
    <>
      <div className="rounded-3xl bg-primary p-5 card-shadow">
        <p className="text-[10px] font-dm font-bold uppercase tracking-widest text-primary-foreground/70">
          Cartão de membro
        </p>
        <h2 className="font-barlow font-bold text-2xl text-primary-foreground mt-2 leading-none">
          {name.toUpperCase()}
        </h2>
        <p className="text-xs font-dm text-primary-foreground/80 mt-2">{STUDENT_UNIT}</p>
        <div className="flex items-end justify-between mt-5">
          <div>
            <p className="text-[10px] font-dm uppercase tracking-wide text-primary-foreground/70">ID de membro</p>
            <p className="font-barlow font-bold text-lg text-primary-foreground tracking-wider">
              {memberId || "—"}
            </p>
          </div>
          {value && (
            <div className="rounded-xl bg-card p-2">
              <QRCodeSVG value={value} size={64} bgColor="transparent" fgColor="#1400FF" />
            </div>
          )}
        </div>
      </div>

      {value ? (
        <button
          onClick={() => setFull(true)}
          className="w-full mt-3 rounded-2xl bg-card py-3 card-shadow flex items-center justify-center gap-2 font-dm font-semibold text-sm text-primary"
        >
          <QrCode size={16} /> Mostrar QR Code
        </button>
      ) : (
        <p className="mt-3 rounded-2xl bg-card p-4 card-shadow text-xs font-dm text-muted text-center">
          Entre na sua conta para gerar o QR Code do seu cartão.
        </p>
      )}

      <div className="rounded-2xl bg-card p-4 card-shadow mt-3">
        <p className="text-[10px] font-dm uppercase tracking-wide text-muted">Total economizado</p>
        <p className="font-barlow font-bold text-2xl text-primary leading-none mt-1">{fmtBRL(total)}</p>
      </div>

      {full && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6">
          <button
            onClick={() => setFull(false)}
            aria-label="Fechar"
            className="absolute top-6 right-6 w-9 h-9 rounded-full bg-card flex items-center justify-center card-shadow"
          >
            <X size={18} className="text-foreground" />
          </button>
          <p className="font-barlow font-bold text-xl text-foreground">{name.toUpperCase()}</p>
          <p className="text-xs font-dm text-muted mt-1">{STUDENT_UNIT}</p>
          <div className="mt-6 p-5 rounded-3xl bg-card card-shadow">
            <QRCodeSVG value={value} size={240} bgColor="transparent" fgColor="#1400FF" />
          </div>
          <p className="font-barlow font-bold text-lg text-primary tracking-wider mt-5">{memberId}</p>
          <p className="text-xs font-dm text-muted text-center mt-2">
            Apresente este QR Code no balcão do parceiro.
          </p>
        </div>
      )}
    </>
  );
};

const Savings = ({ total, items }: { total: number; items: Redemption[] }) => (
  <div>
    <div className="rounded-3xl bg-primary p-5 card-shadow text-center">
      <PiggyBank size={22} className="text-primary-foreground mx-auto" />
      <p className="text-xs font-dm text-primary-foreground/80 mt-2">Você já economizou</p>
      <p className="font-barlow font-bold text-4xl text-primary-foreground leading-none mt-1">{fmtBRL(total)}</p>
      <p className="text-[11px] font-dm text-primary-foreground/70 mt-2">com o Club Evo</p>
    </div>

    <p className="font-barlow font-bold text-sm text-foreground mt-5 mb-2">ÚLTIMOS RESGATES</p>
    <div className="space-y-2">
      {items.map((r) => {
        const confirmed = r.status === "confirmed";
        return (
          <div key={r.id} className="flex items-center justify-between rounded-2xl bg-card p-3 card-shadow">
            <div className="min-w-0">
              <p className="font-dm font-semibold text-sm text-foreground truncate">
                {r.partners?.name ?? "Parceiro"}
              </p>
              <p className="text-[11px] font-dm text-muted">
                {new Date(r.redeemed_at).toLocaleDateString("pt-BR")}
              </p>
              <span
                className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[9px] font-dm font-bold uppercase tracking-wide ${
                  confirmed ? "bg-primary/10 text-primary" : "bg-secondary text-muted"
                }`}
              >
                {confirmed ? <Check size={10} /> : <Clock size={10} />}
                {confirmed ? "Confirmado" : "Aguardando confirmação"}
              </span>
            </div>
            <p className="font-barlow font-bold text-base text-primary shrink-0">
              {confirmed ? fmtBRL(Number(r.amount_saved || 0)) : "—"}
            </p>
          </div>
        );
      })}
      {items.length === 0 && (
        <p className="text-center text-sm font-dm text-muted py-8">
          Nenhum resgate registrado ainda.
        </p>
      )}
    </div>
  </div>
);

const PartnerDetail = ({
  partner, memberCode, studentId, onBack, onRequest,
}: {
  partner: Partner;
  memberCode: string;
  studentId: string | null;
  onBack: () => void;
  onRequest: () => Promise<{ error: string | null } | { error: "no-session" }>;
}) => {
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setSaving(true);
    const res = await onRequest();
    setSaving(false);
    if (res.error) setError("Não foi possível registrar. Entre na sua conta e tente novamente.");
    else setDone(true);
  };

  return (
  <div className="pb-4">
    <div className="relative">
      <img src={partner.image_url ?? ""} alt={`Parceiro ${partner.name}`} className="w-full h-44 object-cover" />
      <button
        onClick={onBack}
        aria-label="Voltar"
        className="absolute top-4 left-4 w-9 h-9 rounded-full bg-card flex items-center justify-center card-shadow"
      >
        <ChevronLeft size={18} className="text-foreground" />
      </button>
    </div>

    <div className="px-4 -mt-6 relative">
      <div className="rounded-2xl bg-card p-4 card-shadow">
        <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-dm font-bold uppercase tracking-wide ${tagStyle[partner.tag ?? ""] ?? "bg-secondary text-foreground"}`}>
          {partner.tag ?? partner.category}
        </span>
        <h1 className="font-barlow font-bold text-xl text-foreground mt-2">{partner.name}</h1>
        <p className="font-barlow font-bold text-2xl text-primary leading-none mt-1">{partner.discount_label}</p>
        <p className="text-xs font-dm text-muted flex items-center gap-1 mt-2">
          <MapPin size={12} /> {partner.location}
        </p>
        <p className="text-sm font-dm text-foreground mt-3">{partner.description}</p>
      </div>

      {/* Resgate */}
      <div className="rounded-2xl bg-card p-5 card-shadow mt-3 flex flex-col items-center">
        <p className="text-xs font-dm font-semibold text-muted uppercase tracking-wide flex items-center gap-1">
          <Ticket size={13} /> Resgatar benefício
        </p>
        {studentId ? (
          <div className="mt-4 p-3 rounded-xl bg-secondary">
            <QRCodeSVG value={`EVOCLUB-MEMBER|${studentId}`} size={160} bgColor="transparent" fgColor="#1400FF" />
          </div>
        ) : (
          <p className="mt-4 text-xs font-dm text-muted text-center">
            Entre na sua conta para exibir seu QR Code de membro.
          </p>
        )}
        <div className="mt-4 w-full rounded-xl border border-dashed border-primary/40 py-3 text-center">
          <p className="text-[10px] font-dm text-muted uppercase tracking-wide">ID de membro</p>
          <p className="font-barlow font-bold text-lg text-primary tracking-wider">{memberCode || "—"}</p>
        </div>
        <p className="text-[11px] font-dm text-muted text-center mt-3 flex items-start gap-1">
          <Tag size={12} className="shrink-0 mt-0.5" />
          {partner.redeem_instructions ?? "Apresente seu QR Code de membro no balcão do parceiro."}
        </p>

        {done ? (
          <p className="mt-4 w-full rounded-xl bg-secondary py-3 text-center text-xs font-dm font-semibold text-primary flex items-center justify-center gap-1">
            <Clock size={14} /> Resgate registrado — aguardando confirmação do parceiro
          </p>
        ) : (
          <>
            <button
              onClick={confirm}
              disabled={saving}
              className="mt-4 w-full rounded-xl bg-primary py-3 font-dm font-semibold text-sm text-primary-foreground disabled:opacity-60"
            >
              {saving ? "Registrando..." : "Usar esse benefício"}
            </button>
            {error && <p className="mt-2 text-[11px] font-dm text-destructive text-center">{error}</p>}
          </>
        )}
      </div>
    </div>
  </div>
  );
};

export default ClubTab;
