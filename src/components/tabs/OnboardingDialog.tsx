import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useStudent } from "@/contexts/StudentContext";

const slides = [
  {
    emoji: "👋",
    title: "BEM-VINDO AO EVO",
    text: "Seu treino, sua grade e seus benefícios em um só app. Vamos dar uma volta rápida.",
  },
  {
    emoji: "🏠",
    title: "INÍCIO",
    text: "Seu resumo do dia: treino de hoje, próximos horários e novidades da unidade.",
  },
  {
    emoji: "🏋️",
    title: "TREINO",
    text: "Seu plano prescrito pelo professor. Marque exercícios, anote cargas e use o cronômetro de intervalo.",
  },
  {
    emoji: "📅",
    title: "GRADE",
    text: "Veja os horários das aulas e faça seu check-in escolhendo se vai treinar inferior ou superior.",
  },
  {
    emoji: "🎟️",
    title: "CLUB",
    text: "Descontos em parceiros. Mostre seu cartão de membro na loja e acompanhe quanto já economizou.",
  },
  {
    emoji: "🤝",
    title: "COMUNIDADE E RANKING",
    text: "Acompanhe a galera, ganhe XP nos treinos e dispute o topo do ranking da unidade.",
  },
  {
    emoji: "🔔",
    title: "INSTALE NA TELA DE INÍCIO",
    text: "Assim o EVO abre como app e você recebe o lembrete da aula 30 minutos antes.",
    install: true,
  },
  {
    emoji: "👤",
    title: "PERFIL",
    text: "Seus dados, histórico de presença e evolução. Pronto para começar?",
  },
] as { emoji: string; title: string; text: string; install?: boolean }[];

const OnboardingDialog = () => {
  const { client, completeOnboarding } = useStudent();
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);

  const open = !!client && !client.onboarding_completed && !closing;
  const slide = slides[step];
  const last = step === slides.length - 1;

  const finish = async () => {
    setClosing(true);
    await completeOnboarding();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) finish(); }}>
      <DialogContent className="max-w-[340px] rounded-3xl p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-3xl">
          {slide.emoji}
        </div>
        <h2 className="font-barlow font-bold text-xl text-foreground mt-3">{slide.title}</h2>
        <p className="text-sm font-dm text-muted-foreground mt-1">{slide.text}</p>

        {slide.install && (
          <div className="mt-4 space-y-2 text-left">
            <div className="rounded-xl bg-amber-50 p-3">
              <p className="text-[11px] font-dm font-semibold text-amber-700">iPhone (Safari)</p>
              <p className="text-[10px] font-dm text-amber-700 leading-relaxed mt-0.5">
                Toque em Compartilhar (o quadrado com a seta para cima) → "Adicionar à Tela de Início" → Adicionar.
                No iPhone as notificações só funcionam depois desse passo.
              </p>
            </div>
            <div className="rounded-xl bg-primary/5 p-3">
              <p className="text-[11px] font-dm font-semibold text-primary">Android (Chrome)</p>
              <p className="text-[10px] font-dm text-muted-foreground leading-relaxed mt-0.5">
                Toque no menu (três pontinhos) → "Instalar app" ou "Adicionar à tela inicial".
              </p>
            </div>
            <p className="text-[10px] font-dm text-muted-foreground leading-relaxed">
              Depois é só ativar as notificações no seu Perfil.
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 mt-5">
          {slides.map((s, i) => (
            <span
              key={s.title}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-5 bg-primary" : "w-1.5 bg-secondary"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => (last ? finish() : setStep((s) => s + 1))}
          className="w-full mt-5 py-3.5 rounded-2xl bg-primary text-primary-foreground font-dm font-semibold text-sm cta-shadow"
        >
          {last ? "Começar" : "Continuar"}
        </button>
        {!last && (
          <button onClick={finish} className="mt-2 text-xs font-dm font-semibold text-muted-foreground">
            Pular tutorial
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingDialog;