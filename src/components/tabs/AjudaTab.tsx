import { useState } from "react";
import { ChevronLeft, ChevronDown, MessageCircle } from "lucide-react";
import { openWhatsApp } from "@/lib/whatsapp";

const FAQ = [
  { q: "Como agendo meu treino?", a: "Na aba Grade, escolha o dia e o horário e toque em Agendar. O agendamento abre 12 horas antes da aula e você pode ter 1 treino por dia." },
  { q: "Até quando posso cancelar?", a: "Até 20 minutos antes do horário. Depois disso, fale com a recepção." },
  { q: "O que é a lista de espera?", a: "Se o horário estiver lotado, você entra na fila (máximo 5 alunos). Se alguém cancelar, o primeiro da fila é promovido automaticamente e recebe um aviso." },
  { q: "Como funciona o XP e a sequência?", a: "Você ganha XP com check-in diário, treinos concluídos e participação na comunidade. A sequência conta dias seguidos com atividade registrada." },
  { q: "Quando meu treino é trocado?", a: "Cada ficha tem previsão de troca. Você é avisado 7 dias antes e o treino antigo é arquivado automaticamente quando o novo é publicado." },
  { q: "Como uso o Club de vantagens?", a: "Na aba Club, escolha o parceiro e gere o QR Code do seu cartão. A equipe do parceiro valida o resgate na hora." },
  { q: "Minhas fotos de evolução são privadas?", a: "Sim. Ficam em armazenamento privado e só você tem acesso. Nada é compartilhado sem a sua confirmação." },
  { q: "Como renovo meu plano?", a: "Em Perfil › Meu plano e contrato, toque em Quero renovar. A recepção recebe o pedido e entra em contato." },
];

const RECEPTION_PHONE = "5581999999999";

const AjudaTab = ({ onBack }: { onBack: () => void }) => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center" aria-label="Voltar">
          <ChevronLeft size={22} className="text-foreground" />
        </button>
        <p className="font-barlow font-bold text-lg text-foreground">Ajuda</p>
      </div>

      <div className="space-y-2 mb-4">
        {FAQ.map((item, i) => (
          <div key={item.q} className="rounded-2xl bg-white card-shadow overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-3 p-4 text-left"
            >
              <span className="text-sm font-dm font-semibold text-foreground">{item.q}</span>
              <ChevronDown
                size={16}
                className={`text-muted shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`}
              />
            </button>
            {open === i && <p className="px-4 pb-4 text-xs font-dm text-muted leading-relaxed">{item.a}</p>}
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-4 card-shadow">
        <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold mb-1">AINDA COM DÚVIDA?</p>
        <p className="text-xs font-dm text-muted mb-3">Fale direto com a recepção da sua unidade.</p>
        <button
          onClick={() => openWhatsApp(RECEPTION_PHONE, "Olá! Preciso de ajuda com o app EVO Club.")}
          className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-dm font-semibold text-sm cta-shadow flex items-center justify-center gap-2"
        >
          <MessageCircle size={16} />
          Falar com a recepção
        </button>
      </div>
    </div>
  );
};

export default AjudaTab;
