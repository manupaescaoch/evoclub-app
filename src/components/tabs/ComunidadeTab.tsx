import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Camera, Image as ImageIcon, Megaphone, MoreHorizontal, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudent } from "@/contexts/StudentContext";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Post = {
  id: string;
  client_id: number | null;
  author_name: string | null;
  content: string | null;
  image_url: string | null;
  created_at: string;
  likes: number;
  liked: boolean;
  signedUrl?: string | null;
};

type Announcement = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
};

const initials = (name?: string | null) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

const timeAgo = (iso: string) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
};

const ComunidadeTab = () => {
  const { client } = useStudent();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [annRes, postRes, likeRes] = await Promise.all([
      supabase
        .from("community_announcements")
        .select("id, title, body, created_at")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("community_posts")
        .select("id, client_id, author_name, content, image_url, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("community_post_likes").select("post_id, client_id"),
    ]);

    setAnnouncements(annRes.data || []);

    const likes = likeRes.data || [];
    const rows = postRes.data || [];

    const paths = rows.map((r) => r.image_url).filter(Boolean) as string[];
    const signedMap = new Map<string, string>();
    if (paths.length) {
      const { data: signed } = await supabase.storage.from("community").createSignedUrls(paths, 3600);
      (signed || []).forEach((s) => {
        if (s.path && s.signedUrl) signedMap.set(s.path, s.signedUrl);
      });
    }

    setPosts(
      rows.map((r) => ({
        ...r,
        likes: likes.filter((l) => l.post_id === r.id).length,
        liked: !!client && likes.some((l) => l.post_id === r.id && l.client_id === client.id),
        signedUrl: r.image_url ? signedMap.get(r.image_url) ?? null : null,
      }))
    );
    setLoading(false);
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  const pickFile = (capture: boolean) => {
    if (fileRef.current) {
      if (capture) fileRef.current.setAttribute("capture", "environment");
      else fileRef.current.removeAttribute("capture");
      fileRef.current.click();
    }
  };

  const onFile = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const publish = async () => {
    if (!client) {
      toast.error("Faça login para publicar.");
      return;
    }
    if (!text.trim() && !file) {
      toast.error("Escreva algo ou escolha uma foto.");
      return;
    }
    setSending(true);
    let path: string | null = null;
    try {
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const { data: sess } = await supabase.auth.getUser();
        path = `${sess.user?.id}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("community").upload(path, file);
        if (up.error) throw up.error;
      }
      const { error } = await supabase.from("community_posts").insert({
        client_id: client.id,
        author_name: client.name,
        unit_id: client.unit_id,
        content: text.trim() || null,
        image_url: path,
      });
      if (error) throw error;
      setText("");
      onFile(null);
      toast.success("Publicado!");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erro ao publicar");
    } finally {
      setSending(false);
    }
  };

  const toggleLike = async (post: Post) => {
    if (!client) return;
    const liked = post.liked;
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, liked: !liked, likes: p.likes + (liked ? -1 : 1) } : p))
    );
    const res = liked
      ? await supabase
          .from("community_post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("client_id", client.id)
      : await supabase.from("community_post_likes").insert({ post_id: post.id, client_id: client.id });
    if (res.error) {
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, liked, likes: p.likes + (liked ? 1 : -1) } : p))
      );
    }
  };

  const report = async (post: Post) => {
    if (!client) return;
    const { error } = await supabase
      .from("community_reports")
      .insert({ post_id: post.id, client_id: client.id, reason: "Denunciado pelo aluno" });
    if (error) toast.error(error.message);
    else toast.success("Denúncia enviada para a equipe.");
  };

  const removePost = async (post: Post) => {
    const { error } = await supabase.from("community_posts").delete().eq("id", post.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Post removido");
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    }
  };

  return (
    <div className="px-4 pt-4">
      <h1 className="font-barlow font-bold text-xl text-foreground mb-4">COMUNIDADE</h1>

      {/* Mural de avisos */}
      {announcements.length > 0 && (
        <div className="space-y-3 mb-4">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl p-4 text-white hero-shadow"
              style={{ background: "linear-gradient(135deg, #1400FF 0%, #0A00B0 100%)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Megaphone size={14} />
                <p className="font-barlow text-[10px] tracking-[2px] uppercase font-bold">AVISO DA EQUIPE</p>
              </div>
              <p className="font-dm font-semibold text-sm">{a.title}</p>
              {a.body && <p className="text-white/80 text-xs font-dm mt-1 whitespace-pre-line">{a.body}</p>}
            </div>
          ))}
        </div>
      )}

      {/* New Post */}
      <div className="rounded-2xl bg-white p-4 card-shadow mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-semibold font-dm">
            {initials(client?.name)}
          </div>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Compartilhe seu treino..."
            className="flex-1 bg-background rounded-full px-4 py-2.5 text-sm font-dm text-foreground outline-none placeholder:text-muted min-w-0"
          />
          <button
            onClick={() => pickFile(true)}
            className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0"
          >
            <Camera size={18} />
          </button>
          <button
            onClick={() => pickFile(false)}
            className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0"
          >
            <ImageIcon size={18} />
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        {preview && (
          <div className="mt-3 relative">
            <img src={preview} alt="Pré-visualização" className="w-full rounded-xl object-cover max-h-64" />
            <button
              onClick={() => onFile(null)}
              className="absolute top-2 right-2 bg-black/60 text-white text-[11px] font-dm px-2 py-1 rounded-full"
            >
              Remover
            </button>
          </div>
        )}
        {(text.trim() || preview) && (
          <button
            onClick={publish}
            disabled={sending}
            className="mt-3 w-full bg-primary text-white rounded-full py-2.5 text-sm font-dm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {sending && <Loader2 size={16} className="animate-spin" />}
            Publicar
          </button>
        )}
      </div>

      {/* Feed */}
      <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold mb-3">FEED RECENTE</p>
      <div className="space-y-3 pb-4">
        {loading && <p className="text-sm font-dm text-muted">Carregando...</p>}
        {!loading && posts.length === 0 && (
          <div className="rounded-2xl bg-white p-6 card-shadow text-center">
            <p className="text-sm font-dm text-muted">Nenhum post ainda. Seja o primeiro a publicar!</p>
          </div>
        )}
        {posts.map((p) => (
          <div key={p.id} className="rounded-2xl bg-white card-shadow overflow-hidden">
            <div className="p-4 pb-2 flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-semibold font-dm">
                  {initials(p.author_name)}
                </div>
                <div>
                  <p className="font-dm font-semibold text-sm text-foreground">{p.author_name || "Aluno"}</p>
                  <p className="text-[11px] text-muted font-dm">{timeAgo(p.created_at)} atrás</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="text-muted p-1">
                  <MoreHorizontal size={18} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {client?.id === p.client_id ? (
                    <DropdownMenuItem onClick={() => removePost(p)}>Apagar post</DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => report(p)}>Denunciar post</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {p.content && (
              <div className="px-4 pb-2">
                <p className="text-sm font-dm text-foreground whitespace-pre-line">{p.content}</p>
              </div>
            )}

            {p.signedUrl && (
              <div className="w-full aspect-square bg-background">
                <img
                  src={p.signedUrl}
                  alt="Post da comunidade"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onDoubleClick={() => {
                    if (!p.liked) toggleLike(p);
                  }}
                />
              </div>
            )}

            <div className="px-4 py-3 flex items-center gap-5">
              <button
                onClick={() => toggleLike(p)}
                className={`flex items-center gap-1.5 text-xs font-dm transition-colors ${
                  p.liked ? "text-red-500" : "text-muted"
                }`}
              >
                <Heart size={18} className={p.liked ? "fill-red-500" : ""} />
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
