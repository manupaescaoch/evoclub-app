import { useState } from "react";
import { Crown, Flame } from "lucide-react";

const periods = ["Semana", "Mês", "Ano"];

const ranking = [
  { pos: 1, name: "Pedro Henrique", initials: "PH", xp: 480, treinos: 6, streak: 12 },
  { pos: 2, name: "Mariana Silva", initials: "MS", xp: 445, treinos: 5, streak: 9 },
  { pos: 3, name: "Lucas Mendes", initials: "LM", xp: 410, treinos: 5, streak: 7 },
  { pos: 4, name: "Ana Beatriz", initials: "AB", xp: 380, treinos: 4, streak: 5 },
  { pos: 5, name: "Rafael Costa", initials: "RC", xp: 340, treinos: 4, streak: 8, isMe: true },
  { pos: 6, name: "Juliana Alves", initials: "JA", xp: 310, treinos: 3, streak: 4 },
  { pos: 7, name: "Thiago Oliveira", initials: "TO", xp: 290, treinos: 3, streak: 6 },
  { pos: 8, name: "Camila Rocha", initials: "CR", xp: 270, treinos: 3, streak: 3 },
];

const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];
const medals = ["🥇", "🥈", "🥉"];

const RankingTab = () => {
  const [period, setPeriod] = useState(0);
  const me = ranking.find((r) => r.isMe)!;
  const maxXp = ranking[0].xp;

  return (
    <div className="px-4 pt-4 pb-4">
      <h1 className="font-barlow font-bold text-xl text-foreground mb-4">RANKING 🏆🔥</h1>

      {/* Period switcher */}
      <div className="rounded-xl bg-secondary p-1 flex mb-4">
        {periods.map((p, i) => (
          <button key={p} onClick={() => setPeriod(i)}
            className={`flex-1 text-xs font-dm font-semibold py-2 rounded-lg transition-all
              ${i === period ? "bg-white text-foreground shadow-sm" : "text-muted"}`}>
            {p}
          </button>
        ))}
      </div>

      {/* Minha posição */}
      <div className="rounded-2xl p-4 text-white mb-4 hero-shadow"
        style={{ background: "linear-gradient(135deg, #1400FF 0%, #0A00B0 100%)" }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold font-dm">RC</div>
          <div className="flex-1">
            <p className="font-dm font-semibold text-sm">Rafael Costa</p>
            <p className="text-white/70 text-xs font-dm">#{me.pos} · {me.xp} XP · {me.treinos} treinos · <Flame size={12} className="inline" /> {me.streak} dias</p>
          </div>
        </div>
      </div>

      {/* Podium */}
      <div className="rounded-2xl bg-primary/5 p-4 card-shadow mb-4">
        <div className="flex items-end justify-center gap-2 h-40">
          {/* #2 */}
          <div className="flex flex-col items-center">
            <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-semibold font-dm mb-1">{ranking[1].initials}</div>
            <p className="text-[10px] font-dm font-semibold text-foreground">{ranking[1].name.split(" ")[0]}</p>
            <p className="text-[10px] font-barlow font-bold text-muted">{ranking[1].xp} XP</p>
            <div className="w-16 h-16 rounded-t-lg bg-gray-300 flex items-center justify-center mt-1">
              <span className="text-lg">🥈</span>
            </div>
          </div>
          {/* #1 */}
          <div className="flex flex-col items-center">
            <Crown size={18} className="text-yellow-500 mb-0.5" />
            <div className="w-[54px] h-[54px] rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold font-dm mb-1">{ranking[0].initials}</div>
            <p className="text-[10px] font-dm font-semibold text-foreground">{ranking[0].name.split(" ")[0]}</p>
            <p className="text-[10px] font-barlow font-bold text-muted">{ranking[0].xp} XP</p>
            <div className="w-16 h-24 rounded-t-lg bg-yellow-400 flex items-center justify-center mt-1">
              <span className="text-lg">🥇</span>
            </div>
          </div>
          {/* #3 */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-semibold font-dm mb-1">{ranking[2].initials}</div>
            <p className="text-[10px] font-dm font-semibold text-foreground">{ranking[2].name.split(" ")[0]}</p>
            <p className="text-[10px] font-barlow font-bold text-muted">{ranking[2].xp} XP</p>
            <div className="w-16 h-12 rounded-t-lg bg-amber-600 flex items-center justify-center mt-1">
              <span className="text-lg">🥉</span>
            </div>
          </div>
        </div>
        <div className="h-1 rounded-full mt-0" style={{ background: "linear-gradient(90deg, #1400FF, #0A00B0)" }} />
      </div>

      {/* Full list */}
      <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold mb-3">CLASSIFICAÇÃO COMPLETA</p>
      <div className="space-y-2 pb-4">
        {ranking.map((r) => (
          <div key={r.pos}
            className={`rounded-2xl p-3.5 card-shadow flex items-center gap-3
              ${r.isMe ? "bg-primary/5 border border-primary/20" : "bg-white"}`}>
            <span className={`font-barlow font-[800] text-lg w-6 text-center ${r.pos <= 3 ? medalColors[r.pos - 1] : "text-muted"}`}>
              {r.pos <= 3 ? medals[r.pos - 1] : r.pos}
            </span>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-semibold font-dm shrink-0">{r.initials}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-dm font-semibold text-sm text-foreground truncate">{r.name}</p>
                {r.isMe && <span className="text-[9px] font-barlow font-bold tracking-[1px] uppercase bg-primary text-white px-1.5 py-0.5 rounded-full shrink-0">VOCÊ</span>}
              </div>
              <p className="text-[10px] text-muted font-dm">{r.treinos} treinos · <Flame size={10} className="inline" /> {r.streak}</p>
              <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden mt-1">
                <div className="h-full rounded-full" style={{
                  width: `${(r.xp / maxXp) * 100}%`,
                  background: r.isMe ? "linear-gradient(90deg, #1400FF, #0A00B0)" : "#D1D5DB",
                }} />
              </div>
            </div>
            <span className="font-barlow font-[800] text-sm text-foreground shrink-0">{r.xp}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RankingTab;
