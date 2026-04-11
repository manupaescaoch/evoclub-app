import { Heart, MessageCircle } from "lucide-react";

const posts = [
  { name: "Lucas Mendes", initials: "LM", time: "15 min", text: "Acabei de bater meu PR no supino! 120kg 💪", likes: 12, comments: 3 },
  { name: "Ana Beatriz", initials: "AB", time: "1h", text: "Alguém mais vai na aula das 18h hoje?", likes: 5, comments: 8 },
  { name: "Rafael Costa", initials: "RC", time: "2h", text: "Semana 4 de cutting e os resultados estão aparecendo! Bora! 🔥", likes: 24, comments: 6 },
  { name: "Juliana Alves", initials: "JA", time: "3h", text: "Dica: coloquem glutamina no shake pós-treino. Diferença absurda na recuperação.", likes: 18, comments: 11 },
];

const ComunidadeTab = () => {
  return (
    <div className="px-4 pt-4">
      <h1 className="font-barlow font-bold text-xl text-foreground mb-4">COMUNIDADE</h1>

      {/* Online */}
      <div className="rounded-2xl bg-white p-4 card-shadow mb-4 flex items-center gap-3">
        <div className="flex -space-x-2">
          {["LM", "AB", "RC", "JA"].map((init, i) => (
            <div key={i} className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold font-dm text-white border-2 border-white"
              style={{ background: `linear-gradient(135deg, #1400FF ${i * 20}%, #0A00B0 100%)`, zIndex: 4 - i }}>
              {init}
            </div>
          ))}
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-dm font-semibold text-primary border-2 border-white">
            +20
          </div>
        </div>
        <p className="text-sm font-dm font-semibold text-foreground">24 membros online</p>
      </div>

      {/* Feed */}
      <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold mb-3">FEED RECENTE</p>
      <div className="space-y-3 pb-4">
        {posts.map((p, i) => (
          <div key={i} className="rounded-2xl bg-white card-shadow overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-semibold font-dm">{p.initials}</div>
                <div>
                  <p className="font-dm font-semibold text-sm text-foreground">{p.name}</p>
                  <p className="text-[11px] text-muted font-dm">{p.time} atrás</p>
                </div>
              </div>
              <p className="text-sm font-dm text-foreground">{p.text}</p>
            </div>
            <div className="border-t border-border px-4 py-2.5 flex items-center gap-5">
              <button className="flex items-center gap-1 text-muted text-xs font-dm">
                <Heart size={14} /> {p.likes}
              </button>
              <button className="flex items-center gap-1 text-muted text-xs font-dm">
                <MessageCircle size={14} /> {p.comments}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComunidadeTab;
