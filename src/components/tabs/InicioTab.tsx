import { Bell, Zap, ChevronRight, Check, HeartPulse, Trophy } from "lucide-react";
import logoAsset from "@/assets/logo-evo.png.asset.json";
import { useNotifications } from "@/hooks/useNotifications";
import { useStudentStats } from "@/hooks/useStudentStats";
import { useStudentName } from "@/hooks/useStudentName";
import { useLatestWeight } from "@/hooks/useHealth";
import { useGamification, levelTitle } from "@/hooks/useGamification";

const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "EV";

const monthYear = (iso: string | null) =>
  iso
    ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
    : "—";

interface InicioTabProps {
  onTabChange?: (tab: any) => void;
}

const InicioTab = ({ onTabChange }: InicioTabProps) => {
  const { unread } = useNotifications();
  const { name } = useStudentName();
  const stats = useStudentStats();
  const { weight } = useLatestWeight();
  const gam = useGamification();

  const todayIdx = (() => {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getDay();
    return d === 0 ? 6 : d - 1;
  })();

  const doneCount = stats.weekDone.filter(Boolean).length;
  const weekPct = Math.round((doneCount / 7) * 100);
  const xpPct = stats.xpBestDay > 0 ? Math.min(100, Math.round((stats.xpToday / stats.xpBestDay) * 100)) : 0;

  return (
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <img src={logoAsset.url} alt="EVO Training Club" className="w-9 h-9 rounded-lg object-contain" />
          <span className="font-barlow font-bold text-foreground text-lg">EVO TRAINING</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => onTabChange?.("saude")} aria-label="Saúde e Evolução">
            <HeartPulse size={20} className="text-muted" />
          </button>
          <button onClick={() => onTabChange?.("notificacoes")} aria-label="Notificações" className="relative">
            <Bell size={20} className="text-muted" />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[9px] font-barlow font-bold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          <button
            onClick={() => onTabChange?.("perfil")}
            aria-label="Perfil"
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
          >
            <span className="text-white text-xs font-semibold font-dm">{initials(name)}</span>
          </button>
        </div>
      </div>

      {/* Hero — Total de Treinos */}
      <div
        className="rounded-2xl p-5 text-white mb-4 hero-shadow"
        style={{ background: "linear-gradient(135deg, #1400FF 0%, #0A00B0 100%)" }}
      >
        <p className="font-barlow text-[10px] tracking-[2px] uppercase text-white/70 mb-1">TOTAL DE TREINOS</p>
        <p className="font-barlow font-[800] text-[52px] leading-none">
          {stats.loading ? "—" : stats.totalWorkouts}
        </p>
        <p className="text-white/70 text-xs font-dm mt-1">
          {stats.firstWorkoutDate
            ? `desde ${monthYear(stats.firstWorkoutDate)} · média ${stats.weeklyAverage ?? 0}/semana`
            : "comece seu primeiro treino"}
        </p>
        <div className="flex mt-4 rounded-xl overflow-hidden bg-white/10">
          {[
            { label: "Peso atual", value: weight != null ? `${weight}kg` : "—" },
            { label: "XP Total", value: `${stats.xpTotal}pts` },
            { label: "Streak", value: `${stats.streak} dia${stats.streak === 1 ? "" : "s"}` },
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
          <span className="text-[11px] font-dm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {doneCount} treino{doneCount === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex justify-between mb-3">
          {days.map((d, i) => {
            const state = stats.weekDone[i] ? "done" : i === todayIdx ? "today" : "future";
            return (
              <div key={d} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted font-dm">{d}</span>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold
                  ${state === "done" ? "bg-primary text-white" : state === "today" ? "border-2 border-primary bg-primary/10 text-primary" : "bg-secondary text-muted"}`}
                >
                  {state === "done" ? <Check size={14} /> : ""}
                </div>
              </div>
            );
          })}
        </div>
        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${weekPct}%`, background: "linear-gradient(90deg, #1400FF, #0A00B0)" }}
          />
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
            <span className="font-barlow font-[800] text-sm text-primary">+{stats.xpToday} pts</span>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden mb-1">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${xpPct}%`, background: "linear-gradient(90deg, #1400FF, #0A00B0)" }}
            />
          </div>
          <p className="text-[11px] text-muted font-dm">
            {stats.xpTodayRows.filter((r) => r.total > 0).length > 0
              ? stats.xpTodayRows
                  .filter((r) => r.total > 0)
                  .map((r) => `${r.label} +${r.total}`)
                  .join(" · ")
              : "Sem pontos hoje — treine, agende ou faça seu check-in"}
          </p>
        </div>
      </div>

      {/* Treino de Hoje */}
      <div className="rounded-2xl bg-white p-4 card-shadow mb-4 border-l-4 border-l-primary">
        <div className="flex items-center justify-between mb-1">
          <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold">TREINO DE HOJE</p>
        </div>
        <p className="font-barlow font-bold text-lg text-foreground">Seu treino ativo</p>
        <p className="text-xs text-muted font-dm mb-3">Veja os exercícios e registre suas séries</p>
        <button
          onClick={() => onTabChange?.("treino")}
          className="text-primary text-xs font-dm font-semibold flex items-center gap-1"
        >
          Ver treino completo <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default InicioTab;
