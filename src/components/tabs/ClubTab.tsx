import { useState } from "react";
import { ChevronRight, ChevronLeft, MapPin, Tag, Ticket } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export interface Partner {
  id: string;
  name: string;
  category: "Saúde" | "Lifestyle" | "Negócios";
  tag: string;
  discount: string;
  location: string;
  image: string;
  description: string;
  code: string;
  howTo: string;
}

const partners: Partner[] = [
  {
    id: "auto-clean",
    name: "Auto Clean",
    category: "Negócios",
    tag: "Serviços",
    discount: "15% OFF",
    location: "Zona Sul · Boa Viagem",
    image: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=600&h=400&fit=crop",
    description: "15% de desconto em lavagem completa e higienização interna do seu carro.",
    code: "EVO-AUTOCLEAN-15",
    howTo: "Apresente o QR Code no balcão antes de fechar o serviço.",
  },
  {
    id: "barbearia-classic",
    name: "Barbearia Classic",
    category: "Lifestyle",
    tag: "Lifestyle",
    discount: "20% OFF",
    location: "Zona Norte · Casa Amarela",
    image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&h=400&fit=crop",
    description: "20% de desconto em cortes, barba e combos para alunos Evo.",
    code: "EVO-CLASSIC-20",
    howTo: "Mostre o QR Code no agendamento ou no atendimento.",
  },
  {
    id: "cafe-cultura",
    name: "Café Cultura",
    category: "Lifestyle",
    tag: "Lifestyle",
    discount: "10% OFF",
    location: "Zona Sul · Pina",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop",
    description: "10% de desconto em cafés especiais, lanches e sobremesas.",
    code: "EVO-CAFECULTURA-10",
    howTo: "Informe que é aluno Evo e apresente o código no caixa.",
  },
  {
    id: "clinica-vitalis",
    name: "Clínica Vitalis",
    category: "Saúde",
    tag: "Saúde",
    discount: "25% OFF",
    location: "Centro · Ilha do Leite",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&h=400&fit=crop",
    description: "25% de desconto em consultas, exames laboratoriais e check-ups.",
    code: "EVO-VITALIS-25",
    howTo: "Apresente o QR Code na recepção no momento do agendamento.",
  },
  {
    id: "nutri-prime",
    name: "Nutri Prime",
    category: "Saúde",
    tag: "Saúde",
    discount: "30% OFF",
    location: "Zona Sul · Boa Viagem",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&h=400&fit=crop",
    description: "30% de desconto na primeira consulta de nutrição esportiva e avaliação corporal.",
    code: "EVO-NUTRIPRIME-30",
    howTo: "Envie o código no WhatsApp da clínica ao marcar a consulta.",
  },
];

const filters = ["Todos", "Saúde", "Lifestyle", "Negócios"] as const;

const tagStyle: Record<string, string> = {
  Saúde: "bg-primary/10 text-primary",
  Lifestyle: "bg-secondary text-foreground",
  Serviços: "bg-secondary text-foreground",
};

const ClubTab = () => {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");
  const [selected, setSelected] = useState<Partner | null>(null);

  if (selected) return <PartnerDetail partner={selected} onBack={() => setSelected(null)} />;

  const list = filter === "Todos" ? partners : partners.filter((p) => p.category === filter);

  return (
    <div className="px-4 pt-4 pb-4">
      <h1 className="font-barlow font-bold text-xl text-foreground">BENEFÍCIOS 🎟️</h1>
      <p className="text-xs font-dm text-muted mt-1 mb-4">
        Clube de vantagens exclusivo para alunos Evo Training Club.
      </p>

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
              src={p.image}
              alt={`Parceiro ${p.name}`}
              loading="lazy"
              className="w-16 h-16 rounded-xl object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-dm font-bold uppercase tracking-wide ${tagStyle[p.tag] ?? "bg-secondary text-foreground"}`}>
                {p.tag}
              </span>
              <p className="font-dm font-semibold text-sm text-foreground truncate mt-1">{p.name}</p>
              <p className="font-barlow font-bold text-base text-primary leading-none">{p.discount}</p>
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
    </div>
  );
};

const PartnerDetail = ({ partner, onBack }: { partner: Partner; onBack: () => void }) => (
  <div className="pb-4">
    <div className="relative">
      <img src={partner.image} alt={`Parceiro ${partner.name}`} className="w-full h-44 object-cover" />
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
        <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-dm font-bold uppercase tracking-wide ${tagStyle[partner.tag] ?? "bg-secondary text-foreground"}`}>
          {partner.tag}
        </span>
        <h1 className="font-barlow font-bold text-xl text-foreground mt-2">{partner.name}</h1>
        <p className="font-barlow font-bold text-2xl text-primary leading-none mt-1">{partner.discount}</p>
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
        <div className="mt-4 p-3 rounded-xl bg-secondary">
          <QRCodeSVG value={`EVOCLUB|${partner.id}|${partner.code}`} size={160} bgColor="transparent" fgColor="#1400FF" />
        </div>
        <div className="mt-4 w-full rounded-xl border border-dashed border-primary/40 py-3 text-center">
          <p className="text-[10px] font-dm text-muted uppercase tracking-wide">Código</p>
          <p className="font-barlow font-bold text-lg text-primary tracking-wider">{partner.code}</p>
        </div>
        <p className="text-[11px] font-dm text-muted text-center mt-3 flex items-start gap-1">
          <Tag size={12} className="shrink-0 mt-0.5" /> {partner.howTo}
        </p>
      </div>
    </div>
  </div>
);

export default ClubTab;