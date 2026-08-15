import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Megaphone, RefreshCw, Users2 } from "lucide-react";

type Post = {
  id: string; author_name: string | null; content: string | null;
  image_url: string | null; created_at: string; hidden: boolean;
  signedUrl?: string | null;
};
type Ann = { id: string; title: string; body: string | null; pinned: boolean; created_at: string };

export default function ProComunidade() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [anns, setAnns] = useState<Ann[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [p, a] = await Promise.all([
      supabase.from("community_posts")
        .select("id, author_name, content, image_url, created_at, hidden")
        .eq("hidden", false).order("created_at", { ascending: false }).limit(50),
      supabase.from("community_announcements")
        .select("id, title, body, pinned, created_at")
        .eq("active", true).order("created_at", { ascending: false }).limit(10),
    ]);
    if (p.error) setError(p.error.message);
    const rows = ((p.data as any[]) || []) as Post[];
    const paths = rows.map(r => r.image_url).filter(Boolean) as string[];
    let signedMap = new Map<string, string>();
    if (paths.length) {
      const { data: signed } = await supabase.storage.from("community").createSignedUrls(paths, 3600);
      signedMap = new Map((signed || []).map((s: any, i: number) => [paths[i], s?.signedUrl]).filter(([, v]) => !!v) as any);
    }
    setPosts(rows.map(r => ({ ...r, signedUrl: r.image_url ? signedMap.get(r.image_url) ?? null : null })));
    setAnns(((a.data as any[]) || []) as Ann[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <h1 className="font-barlow font-bold text-xl">COMUNIDADE</h1>

      {loading && <p className="py-10 text-center font-dm text-sm text-muted-foreground">Carregando feed...</p>}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-dm text-sm text-red-700">
          <p className="flex items-center gap-2"><AlertTriangle size={16} /> {error}</p>
          <button onClick={load} className="mt-3 h-10 w-full rounded-lg bg-white border border-red-200 font-semibold flex items-center justify-center gap-2">
            <RefreshCw size={14} /> Tentar de novo
          </button>
        </div>
      )}

      {!loading && !error && anns.map(a => (
        <div key={a.id} className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-barlow font-bold text-primary uppercase">
            <Megaphone size={12} /> Aviso da equipe
          </p>
          <p className="font-dm text-sm font-semibold mt-1.5">{a.title}</p>
          {a.body && <p className="font-dm text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{a.body}</p>}
        </div>
      ))}

      {!loading && !error && posts.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center font-dm text-sm text-muted-foreground">
          <Users2 size={22} className="mx-auto mb-2" />
          Nenhuma publicação no feed ainda.
        </div>
      )}

      {!loading && !error && posts.map(p => (
        <article key={p.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-full bg-primary/10 text-primary font-barlow font-bold text-xs flex items-center justify-center">
              {(p.author_name || "AL").slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="font-dm text-sm font-semibold truncate">{p.author_name || "Aluno EVO"}</p>
              <p className="font-dm text-[10px] text-muted-foreground">
                {new Date(p.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
          {p.content && <p className="font-dm text-sm mt-2.5 whitespace-pre-wrap">{p.content}</p>}
          {p.signedUrl && (
            <img src={p.signedUrl} alt="Publicação da comunidade" loading="lazy"
              className="mt-2.5 w-full rounded-xl object-cover max-h-72" />
          )}
        </article>
      ))}
    </div>
  );
}
