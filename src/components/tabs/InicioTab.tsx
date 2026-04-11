import { Bell, Zap, ChevronRight, Check } from "lucide-react";
import logo from "@/assets/logo.png";

const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const dayStates = ["done", "today", "future", "future", "future", "future", "future"] as const;

const InicioTab = () => {
  return (
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Iron Lifting Club" className="w-9 h-9 rounded-lg object-contain" />
          <span className="font-barlow font-bold text-foreground text-lg">IRON LIFTING</span>
        </div>
        <div className="flex items-center gap-3">
          <Bell size={20} className="text-muted" />
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white text-xs font-semibold font-dm">RC</span>
          </div>
        </div>
      </div>

      {/* Hero — Total de Treinos */}
      <div className="rounded-2xl p-5 text-white mb-4 hero-shadow"
        style={{ background: "linear-gradient(135deg, #1400FF 0%, #0A00B0 100%)" }}>
        <p className="font-barlow text-[10px] tracking-[2px] uppercase text-white/70 mb-1">TOTAL DE TREINOS</p>
        <p className="font-barlow font-[800] text-[52px] leading-none">198</p>
        <p className="text-white/70 text-xs font-dm mt-1">desde Jan/2024 · média 5.2/semana</p>
        <div className="flex mt-4 rounded-xl overflow-hidden bg-white/10">
          {[
            { label: "Peso atual", value: "88.4kg" },
            { label: "XP Total", value: "205pts" },
            { label: "Streak", value: "3 dias" },
          ].map((s, i) => (
            <div key={i} className="flex-1 text-center py-2.5">
              <p className="text-[10px] text-white/60 font-barlow tracking-[1px] uppercase">{s.label}</p>
              <p className="font-barlow font-[800] text-sm">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Semana Ativa */}
      <div className="rounded-2xl bg-white p-4 card-shadow mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold">SEMANA ATUAL</p>
          <span className="text-[11px] font-dm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">1/5 concluídos</span>
        </div>
        <div className="flex justify-between mb-3">
          {days.map((d, i) => {
            const state = dayStates[i];
            return (
              <div key={d} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted font-dm">{d}</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold
                  ${state === "done" ? "bg-primary text-white" : state === "today" ? "border-2 border-primary bg-primary/10 text-primary" : "bg-secondary text-muted"}`}>
                  {state === "done" ? <Check size={14} /> : ""}
                </div>
              </div>
            );
          })}
        </div>
        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full w-[20%] rounded-full" style={{ background: "linear-gradient(90deg, #1400FF, #0A00B0)" }} />
        </div>
      </div>

      {/* XP do Dia */}
      <div className="rounded-2xl bg-white p-4 card-shadow mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Zap size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold">XP DO DIA</p>
            <span className="font-barlow font-[800] text-sm text-primary">+10 pts</span>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden mb-1">
            <div className="h-full w-[68%] rounded-full" style={{ background: "linear-gradient(90deg, #1400FF, #0A00B0)" }} />
          </div>
          <p className="text-[11px] text-muted font-dm">68 de 100 XP diários concluídos</p>
        </div>
      </div>

      {/* Treino de Hoje */}
      <div className="rounded-2xl bg-white p-4 card-shadow mb-4 border-l-4 border-l-primary">
        <div className="flex items-center justify-between mb-1">
          <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold">TREINO DE HOJE</p>
          <span className="text-[11px] font-dm font-semibold text-white bg-primary px-2.5 py-0.5 rounded-full">COSTAS</span>
        </div>
        <p className="font-barlow font-bold text-lg text-foreground">Costas & Bíceps</p>
        <p className="text-xs text-muted font-dm mb-3">8 exercícios · 28 séries · ~65 min</p>
        <div className="flex items-center justify-between">
          <button className="text-primary text-xs font-dm font-semibold flex items-center gap-1">
            Ver treino completo <ChevronRight size={14} />
          </button>
          <span className="text-[11px] font-dm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">3/8 ✓</span>
        </div>
      </div>
    </div>
  );
};

export default InicioTab;
