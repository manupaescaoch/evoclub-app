import { useState } from "react";
import { useStudentName } from "@/hooks/useStudentName";
import { useNavigate } from "react-router-dom";
import { useStudent } from "@/contexts/StudentContext";
import PushNotificationsCard from "@/components/tabs/PushNotificationsCard";
import {
  Camera, ChevronRight, ChevronLeft, Scale, Calendar,
  Settings, Shield, LogOut, Trophy, Flame, Award, TrendingUp,
  AlertTriangle, CheckCircle2, Edit2
} from "lucide-react";

const stats = [
  { label: "Dias Ativos", value: "142", icon: Calendar },
  { label: "Sequência", value: "12", icon: Flame },
  { label: "Ranking", value: "#3", icon: Trophy },
  { label: "Conquistas", value: "8/25", icon: Award },
];

const achievements = [
  { name: "Primeira Semana", done: true },
  { name: "10 Treinos", done: true },
  { name: "Streak 7 dias", done: true },
  { name: "50 Treinos", done: true },
  { name: "100 Treinos", done: true },
  { name: "Streak 30 dias", done: false },
  { name: "200 Treinos", done: false },
  { name: "1 Ano Ativo", done: false },
];

const weightData = [
  { month: "Jan", value: 92 },
  { month: "Fev", value: 91 },
  { month: "Mar", value: 90.2 },
  { month: "Abr", value: 89.5 },
  { month: "Mai", value: 89 },
  { month: "Jun", value: 88.4 },
];

const consistencyDays = [1, 2, 3, 5, 7, 8, 9, 10, 12, 14, 15, 16];

const menuItems = [
  { label: "Configurações", icon: Settings },
  { label: "Privacidade", icon: Shield },
];

interface PerfilTabProps {
  onBack: () => void;
}

const PerfilTab = ({ onBack }: PerfilTabProps) => {
  const [showAchievements, setShowAchievements] = useState(false);
  const { name: studentName, saveName } = useStudentName();
  const { signOut } = useStudent();
  const navigate = useNavigate();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const initials = studentName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const [consistencyView, setConsistencyView] = useState<"Semana" | "Mês" | "Ano" | "Tudo">("Mês");

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(today.getFullYear(), today.getMonth(), 1).getDay();

  const maxWeight = Math.max(...weightData.map(d => d.value));
  const minWeight = Math.min(...weightData.map(d => d.value));
  const range = maxWeight - minWeight || 1;

  return (
    <div className="px-4 pt-4 pb-8">
      {/* Header com voltar */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center">
          <ChevronLeft size={22} className="text-foreground" />
        </button>
        <p className="font-barlow font-bold text-lg text-foreground">Meu Perfil</p>
      </div>

      {/* Avatar + Nome */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative mb-3">
          <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white text-2xl font-bold font-dm">{initials || "?"}</span>
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border-2 border-primary flex items-center justify-center shadow-md">
            <Camera size={14} className="text-primary" />
          </button>
        </div>
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && nameDraft.trim()) { saveName(nameDraft); setEditingName(false); }
              }}
              className="text-center font-barlow font-bold text-xl text-foreground bg-white rounded-lg px-3 py-1 border border-border outline-none"
            />
            <button
              onClick={() => { if (nameDraft.trim()) saveName(nameDraft); setEditingName(false); }}
              className="text-[11px] font-dm font-semibold text-primary"
            >
              Salvar
            </button>
          </div>
        ) : (
          <button
            className="flex items-center gap-2"
            onClick={() => { setNameDraft(studentName); setEditingName(true); }}
          >
            <p className="font-barlow font-bold text-xl text-foreground">{studentName}</p>
            <Edit2 size={14} className="text-muted" />
          </button>
        )}
        <p className="text-xs text-muted font-dm">Membro desde Jan/2024</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-3 card-shadow text-center">
            <s.icon size={16} className="text-primary mx-auto mb-1" />
            <p className="font-barlow font-[800] text-base text-foreground">{s.value}</p>
            <p className="text-[9px] text-muted font-dm leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Conquistas */}
      <div className="rounded-2xl bg-white p-4 card-shadow mb-4">
        <button
          onClick={() => setShowAchievements(!showAchievements)}
          className="flex items-center justify-between w-full"
        >
          <div>
            <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold">CONQUISTAS</p>
            <p className="text-xs text-muted font-dm mt-0.5">8 de 25 desbloqueadas</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full w-[32%] rounded-full" style={{ background: "linear-gradient(90deg, #1400FF, #0A00B0)" }} />
            </div>
            <ChevronRight size={16} className={`text-muted transition-transform ${showAchievements ? "rotate-90" : ""}`} />
          </div>
        </button>
        {showAchievements && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {achievements.map((a) => (
              <div
                key={a.name}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-dm ${a.done ? "bg-primary/10 text-primary" : "bg-secondary text-muted"}`}
              >
                {a.done ? <CheckCircle2 size={14} /> : <Award size={14} />}
                {a.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evolução do Peso */}
      <div className="rounded-2xl bg-white p-4 card-shadow mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold">EVOLUÇÃO DO PESO</p>
          <button className="text-[11px] font-dm font-semibold text-white bg-primary px-3 py-1 rounded-full flex items-center gap-1">
            <Scale size={12} /> Registrar
          </button>
        </div>
        {/* Simple chart */}
        <div className="flex items-end gap-1 h-24 mb-2">
          {weightData.map((d, i) => {
            const h = ((d.value - minWeight) / range) * 80 + 16;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-dm text-muted">{d.value}</span>
                <div
                  className="w-full rounded-t-md"
                  style={{
                    height: `${h}%`,
                    background: i === weightData.length - 1
                      ? "linear-gradient(180deg, #1400FF, #0A00B0)"
                      : "hsl(var(--secondary))",
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between px-1">
          {weightData.map((d) => (
            <span key={d.month} className="text-[9px] text-muted font-dm flex-1 text-center">{d.month}</span>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div>
            <p className="text-[10px] text-muted font-dm">Peso atual</p>
            <p className="font-barlow font-[800] text-lg text-foreground">88.4 kg</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted font-dm">Variação</p>
            <p className="font-barlow font-[800] text-lg text-green-600">-3.6 kg</p>
          </div>
        </div>
      </div>

      {/* Fotos de Progresso */}
      <div className="rounded-2xl bg-white p-4 card-shadow mb-4">
        <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold mb-3">FOTOS DE PROGRESSO</p>
        <p className="text-[11px] font-dm font-semibold text-foreground mb-2">ANTES</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {["Frente", "Lateral", "Costas"].map((pos) => (
            <div key={pos} className="aspect-[3/4] rounded-xl bg-secondary flex flex-col items-center justify-center gap-1 border-2 border-dashed border-border">
              <Camera size={20} className="text-muted" />
              <span className="text-[9px] text-muted font-dm">{pos}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] font-dm font-semibold text-foreground mb-2">DEPOIS</p>
        <div className="grid grid-cols-3 gap-2">
          {["Frente", "Lateral", "Costas"].map((pos) => (
            <div key={pos} className="aspect-[3/4] rounded-xl bg-secondary flex flex-col items-center justify-center gap-1 border-2 border-dashed border-border">
              <Camera size={20} className="text-muted" />
              <span className="text-[9px] text-muted font-dm">{pos}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Consistência */}
      <div className="rounded-2xl bg-white p-4 card-shadow mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold">CONSISTÊNCIA</p>
        </div>
        <div className="flex gap-1 mb-3">
          {(["Semana", "Mês", "Ano", "Tudo"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setConsistencyView(v)}
              className={`flex-1 text-[10px] font-dm py-1.5 rounded-full font-semibold transition-colors ${
                consistencyView === v
                  ? "bg-primary text-white"
                  : "bg-secondary text-muted"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
            <span key={i} className="text-[9px] text-muted font-dm font-semibold">{d}</span>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`e-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isActive = consistencyDays.includes(day);
            const isToday = day === today.getDate();
            return (
              <div
                key={day}
                className={`w-full aspect-square rounded-full flex items-center justify-center text-[10px] font-dm ${
                  isActive
                    ? "bg-primary text-white font-semibold"
                    : isToday
                    ? "border border-primary text-primary font-semibold"
                    : "text-muted"
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-[9px] text-muted font-dm">Treinou</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full border border-primary" />
            <span className="text-[9px] text-muted font-dm">Hoje</span>
          </div>
        </div>
      </div>

      {/* Resumo do Período */}
      <div className="rounded-2xl bg-white p-4 card-shadow mb-4">
        <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold mb-3">RESUMO DO PERÍODO</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "Dias Ativos", value: "18" },
            { label: "Treinos", value: "22" },
            { label: "Pontos", value: "+340" },
          ].map((s) => (
            <div key={s.label} className="text-center p-2 rounded-xl bg-primary/5">
              <p className="font-barlow font-[800] text-base text-foreground">{s.value}</p>
              <p className="text-[9px] text-muted font-dm">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2 p-2 rounded-xl bg-green-50">
            <TrendingUp size={14} className="text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-dm font-semibold text-green-700">Pode melhorar</p>
              <p className="text-[10px] font-dm text-green-600">Aumente a frequência para 5x/semana para alcançar seu objetivo mais rápido.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2 rounded-xl bg-amber-50">
            <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-dm font-semibold text-amber-700">Atenção</p>
              <p className="text-[10px] font-dm text-amber-600">Você perdeu 2 treinos de perna este mês. Não pule o leg day!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <PushNotificationsCard />

      <div className="space-y-2 mb-4">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className="w-full flex items-center justify-between rounded-2xl bg-white p-4 card-shadow"
          >
            <div className="flex items-center gap-3">
              <item.icon size={18} className="text-muted" />
              <span className="text-sm font-dm text-foreground">{item.label}</span>
            </div>
            <ChevronRight size={16} className="text-muted" />
          </button>
        ))}
      </div>

      {/* Sair */}
      <button
        onClick={async () => { await signOut(); navigate("/aluno/login", { replace: true }); }}
        className="w-full py-3 rounded-2xl border border-red-200 text-red-500 font-dm font-semibold text-sm flex items-center justify-center gap-2 mb-4"
      >
        <LogOut size={16} />
        Sair da Conta
      </button>
    </div>
  );
};

export default PerfilTab;
