import { useState } from "react";
import { Heart, Camera, Image } from "lucide-react";

interface Post {
  name: string;
  initials: string;
  time: string;
  text: string;
  image?: string;
  likes: number;
}

const initialPosts: Post[] = [
  {
    name: "Lucas Mendes", initials: "LM", time: "15 min",
    text: "Acabei de bater meu PR no supino! 120kg 💪",
    image: "https://images.unsplash.com/photo-1534368786749-b63e05c92717?w=600&h=600&fit=crop",
    likes: 12,
  },
  {
    name: "Ana Beatriz", initials: "AB", time: "1h",
    text: "Treino de perna destruidor hoje 🦵🔥",
    image: "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=600&h=600&fit=crop",
    likes: 31,
  },
  {
    name: "Rafael Costa", initials: "RC", time: "2h",
    text: "Semana 4 de cutting e os resultados estão aparecendo! Bora! 🔥",
    image: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&h=600&fit=crop",
    likes: 24,
  },
  {
    name: "Juliana Alves", initials: "JA", time: "3h",
    text: "Dica: coloquem glutamina no shake pós-treino. Diferença absurda na recuperação.",
    likes: 18,
  },
  {
    name: "Pedro Henrique", initials: "PH", time: "4h",
    text: "Shape do dia 📸 3 meses de consistência!",
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&h=600&fit=crop",
    likes: 42,
  },
];

const ComunidadeTab = () => {
  const [posts, setPosts] = useState(initialPosts);
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());

  const toggleLike = (index: number) => {
    setPosts((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        const isLiked = likedPosts.has(i);
        return { ...p, likes: isLiked ? p.likes - 1 : p.likes + 1 };
      })
    );
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

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

      {/* New Post CTA */}
      <div className="rounded-2xl bg-white p-4 card-shadow mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-semibold font-dm">MP</div>
          <div className="flex-1 bg-background rounded-full px-4 py-2.5 text-sm font-dm text-muted">
            Compartilhe seu treino...
          </div>
          <button className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Camera size={18} />
          </button>
          <button className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Image size={18} />
          </button>
        </div>
      </div>

      {/* Feed */}
      <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold mb-3">FEED RECENTE</p>
      <div className="space-y-3 pb-4">
        {posts.map((p, i) => (
          <div key={i} className="rounded-2xl bg-white card-shadow overflow-hidden">
            {/* Header */}
            <div className="p-4 pb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-semibold font-dm">{p.initials}</div>
                <div>
                  <p className="font-dm font-semibold text-sm text-foreground">{p.name}</p>
                  <p className="text-[11px] text-muted font-dm">{p.time} atrás</p>
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="px-4 pb-2">
              <p className="text-sm font-dm text-foreground">{p.text}</p>
            </div>

            {/* Image */}
            {p.image && (
              <div className="w-full aspect-square bg-background">
                <img
                  src={p.image}
                  alt="Post"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onDoubleClick={() => {
                    if (!likedPosts.has(i)) toggleLike(i);
                  }}
                />
              </div>
            )}

            {/* Actions */}
            <div className="px-4 py-3 flex items-center gap-5">
              <button
                onClick={() => toggleLike(i)}
                className={`flex items-center gap-1.5 text-xs font-dm transition-colors ${
                  likedPosts.has(i) ? "text-red-500" : "text-muted"
                }`}
              >
                <Heart
                  size={18}
                  className={likedPosts.has(i) ? "fill-red-500" : ""}
                />
                {p.likes}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComunidadeTab;
