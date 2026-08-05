import { useEffect, useMemo, useState } from "react";
import { Crown, Dumbbell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudent } from "@/contexts/StudentContext";

const periods = ["Semana", "Geral"];

type Row = {
  client_id: number;
  name: string;
  unit_id: string | null;
  class_checkins: number;
  workouts: number;
  daily_checkins: number;
  posts: number;
  points: number;
};

const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];
const medals = ["🥇", "🥈", "🥉"];

const initials = (name?: string | null) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

// Segunda-feira da semana atual no horário de Brasília
const weekStart = () => {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  now.setDate(now.getDate() - diff);
  return now.toISOString().slice(0, 10);
};

const RankingTab = () => {
  const { client } = useStudent();
  const [period, setPeriod] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.rpc("ranking_scores", {
        _unit_id: client?.unit_id ?? undefined,
        _from: period === 0 ? weekStart() : "1970-01-01",
      });
      setRows(((data as Row[]) || []).filter((r) => r.points > 0));
      setLoading(false);
    };
    load();
  }, [period, client?.unit_id]);

  const ranking = useMemo(
    () =>
      rows.map((r, i) => ({
        ...r,
        pos: i + 1,
        isMe: client?.id === r.client_id,
      })),
    [rows, client?.id]
  );

  const me = ranking.find((r) => r.isMe);
  const maxPoints = ranking[0]?.points || 1;

  return (
    <div className="px-4 pt-4 pb-4">
      <h1 className="font-barlow font-bold text-xl text-foreground mb-4">RANKING 🏆🔥</h1>

      {/* Period switcher */}
      <div className="rounded-xl bg-secondary p-1 flex mb-4">
        {periods.map((p, i) => (
          <button
            key={p}
            onClick={() => setPeriod(i)}
            className={`flex-1 text-xs font-dm font-semibold py-2 rounded-lg transition-all
              ${i === period ? "bg-white text-foreground shadow-sm" : "text-muted"}`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Minha posição */}
      <div
        className="rounded-2xl p-4 text-white mb-4 hero-shadow"
        style={{ background: "linear-gradient(135deg, #1400FF 0%, #0A00B0 100%)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold font-dm">
            {initials(client?.name)}
          </div>
          <div className="flex-1">
            <p className="font-dm font-semibold text-sm">{client?.name || "Você"}</p>
            <p className="text-white/70 text-xs font-dm">
              {me
                ? `#${me.pos} · ${me.points} pts · ${me.workouts} treinos · ${me.class_checkins} check-ins`
                : "Sem pontos neste período — treine e registre para pontuar!"}
            </p>
          </div>
        </div>
      </div>

      {/* Podium */}
      {ranking.length >= 3 && (
        <div className="rounded-2xl bg-primary/5 p-4 card-shadow mb-4">
          <div className="flex items-end justify-center gap-2 h-40">
            {/* #2 */}
            <div className="flex flex-col items-center">
              <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-semibold font-dm mb-1">
                {initials(ranking[1].name)}
              </div>
              <p className="text-[10px] font-dm font-semibold text-foreground">{ranking[1].name.split(" ")[0]}</p>
              <p className="text-[10px] font-barlow font-bold text-muted">{ranking[1].points} pts</p>
              <div className="w-16 h-16 rounded-t-lg bg-gray-300 flex items-center justify-center mt-1">
                <span className="text-lg">🥈</span>
              </div>
            </div>
            {/* #1 */}
            <div className="flex flex-col items-center">
              <Crown size={18} className="text-yellow-500 mb-0.5" />
              <div className="w-[54px] h-[54px] rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold font-dm mb-1">
                {initials(ranking[0].name)}
              </div>
              <p className="text-[10px] font-dm font-semibold text-foreground">{ranking[0].name.split(" ")[0]}</p>
              <p className="text-[10px] font-barlow font-bold text-muted">{ranking[0].points} pts</p>
              <div className="w-16 h-24 rounded-t-lg bg-yellow-400 flex items-center justify-center mt-1">
                <span className="text-2xl">🥇</span>
              </div>
            </div>
            {/* #3 */}
            <div className="flex flex-col items-center">
              <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-semibold font-dm mb-1">
                {initials(ranking[2].name)}
              </div>
              <p className="text-[10px] font-dm font-semibold text-foreground">{ranking[2].name.split(" ")[0]}</p>
              <p className="text-[10px] font-barlow font-bold text-muted">{ranking[2].points} pts</p>
              <div className="w-16 h-12 rounded-t-lg bg-amber-600/70 flex items-center justify-center mt-1">
                <span className="text-lg">🥉</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Como pontuar */}
      <div className="rounded-2xl bg-white p-4 card-shadow mb-4">
        <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold mb-2">COMO PONTUAR</p>
        <p className="text-[11px] font-dm text-muted">
          Check-in de aula = 10 pts · Treino completo = 15 pts · Check-in diário = 5 pts · Post na comunidade = 5 pts
        </p>
      </div>

      {/* Full list */}
      <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold mb-3">CLASSIFICAÇÃO COMPLETA</p>
      <div className="space-y-2 pb-4">
        {loading && <p className="text-sm font-dm text-muted">Carregando...</p>}
        {!loading && ranking.length === 0 && (
          <div className="rounded-2xl bg-white p-6 card-shadow text-center">
            <p className="text-sm font-dm text-muted">Ninguém pontuou neste período ainda.</p>
          </div>
        )}
        {ranking.map((r) => (
          <div
            key={r.client_id}
            className={`rounded-2xl p-3.5 card-shadow flex items-center gap-3
              ${r.isMe ? "bg-primary/5 border border-primary/20" : "bg-white"}`}
          >
            <span
              className={`font-barlow font-[800] text-lg w-6 text-center ${
                r.pos <= 3 ? medalColors[r.pos - 1] : "text-muted"
              }`}
            >
              {r.pos <= 3 ? medals[r.pos - 1] : r.pos}
            </span>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-semibold font-dm shrink-0">
              {initials(r.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-dm font-semibold text-sm text-foreground truncate">{r.name}</p>
                {r.isMe && (
                  <span className="text-[9px] font-barlow font-bold tracking-[1px] uppercase bg-primary text-white px-1.5 py-0.5 rounded-full shrink-0">
                    VOCÊ
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted font-dm">
                <Dumbbell size={10} className="inline" /> {r.workouts} treinos · {r.class_checkins} aulas ·{" "}
                {r.daily_checkins} check-ins · {r.posts} posts
              </p>
              <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden mt-1">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(r.points / maxPoints) * 100}%`,
                    background: r.isMe ? "linear-gradient(90deg, #1400FF, #0A00B0)" : "#D1D5DB",
                  }}
                />
              </div>
            </div>
            <span className="font-barlow font-[800] text-sm text-foreground shrink-0">{r.points}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RankingTab;
