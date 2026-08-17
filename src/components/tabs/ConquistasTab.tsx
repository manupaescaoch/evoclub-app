import { ChevronLeft, Lock } from "lucide-react";
import { useGamification, levelTitle, type Achievement } from "@/hooks/useGamification";
import AchievementIcon from "@/components/gamification/AchievementIcon";

const CATEGORY_LABELS: Record<string, string> = {
  treino: "Treinos",
  consistencia: "Consistência",
  "bem-estar": "Bem-estar",
  presenca: "Presença nas aulas",
  comunidade: "Comunidade",
  xp: "Marcos de Score",
};

const ConquistasTab = ({ onBack }: { onBack: () => void }) => {
  const g = useGamification();

  const groups = g.achievements.reduce<Record<string, Achievement[]>>((acc, a) => {
    (acc[a.category] ||= []).push(a);
    return acc;
  }, {});

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center" aria-label="Voltar">
          <ChevronLeft size={22} className="text-foreground" />
        </button>
        <p className="font-barlow font-bold text-lg text-foreground">Conquistas</p>
      </div>

      <div
        className="rounded-2xl p-5 text-white mb-5 hero-shadow"
        style={{ background: "linear-gradient(135deg, #0057FF 0%, #0043C4 100%)" }}
      >
        <p className="font-barlow text-[10px] tracking-[2px] uppercase text-white/70">Nível {g.level}</p>
        <p className="font-barlow font-[800] text-3xl leading-tight">{levelTitle(g.level)}</p>
        <div className="h-2 rounded-full bg-white/20 mt-3 overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${g.levelPct}%` }} />
        </div>
        <p className="text-white/70 text-xs font-dm mt-2">
          {g.xp} Score · faltam {g.xpToNext} Score para o nível {g.level + 1}
        </p>
        <p className="text-white/70 text-xs font-dm mt-1">
          {g.unlockedCount} de {g.achievements.length} conquistas desbloqueadas
        </p>
      </div>

      {g.loading && <p className="text-muted text-sm font-dm">Carregando conquistas…</p>}

      {Object.entries(groups).map(([cat, items]) => (
        <div key={cat} className="mb-5">
          <p className="font-barlow font-bold text-sm text-foreground mb-2 uppercase tracking-[1px]">
            {CATEGORY_LABELS[cat] || cat}
          </p>
          <div className="space-y-2">
            {items.map((a) => {
              const unlocked = !!a.unlocked_at;
              const pct = Math.min(100, Math.round((a.progress / a.threshold) * 100));
              return (
                <div
                  key={a.code}
                  className={`rounded-xl p-3 bg-card border flex gap-3 items-center ${
                    unlocked ? "border-primary/40" : "border-border"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      unlocked ? "bg-primary text-white" : "bg-muted/10 text-muted"
                    }`}
                  >
                    {unlocked ? <AchievementIcon icon={a.icon} size={20} /> : <Lock size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-barlow font-bold text-sm text-foreground">{a.name}</p>
                    <p className="text-muted text-xs font-dm">{a.description}</p>
                    {!unlocked ? (
                      <>
                        <div className="h-1.5 rounded-full bg-muted/15 mt-2 overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-muted text-[11px] font-dm mt-1">
                          {a.progress}/{a.threshold}
                          {a.xp_bonus > 0 ? ` · +${a.xp_bonus} Score ao concluir` : ""}
                        </p>
                      </>
                    ) : (
                      <p className="text-primary text-[11px] font-dm mt-1">
                        Desbloqueada em{" "}
                        {new Date(a.unlocked_at as string).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConquistasTab;
