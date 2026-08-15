import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Camera, Share2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useStudentName } from "@/hooks/useStudentName";

const POSES = [
  { key: "frente", label: "Frente" },
  { key: "lado", label: "Lado" },
  { key: "costas", label: "Costas" },
] as const;
type Pose = (typeof POSES)[number]["key"];

type Photo = { id: string; pose: string; storage_path: string; taken_at: string; url?: string };

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

const FotosEvolucaoTab = ({ onBack }: { onBack: () => void }) => {
  const { clientId } = useStudentName();
  const [pose, setPose] = useState<Pose>("frente");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [compare, setCompare] = useState<{ a: Photo; b: Photo } | null>(null);
  const [slider, setSlider] = useState(50);
  const [confirmShare, setConfirmShare] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("evolution_photos")
      .select("id, pose, storage_path, taken_at")
      .eq("client_id", clientId)
      .eq("pose", pose)
      .order("taken_at", { ascending: false });
    const rows = (data || []) as Photo[];
    const withUrls = await Promise.all(
      rows.map(async (r) => {
        const { data: signed } = await supabase.storage.from("evolution").createSignedUrl(r.storage_path, 3600);
        return { ...r, url: signed?.signedUrl };
      })
    );
    setPhotos(withUrls);
    setLoading(false);
  }, [clientId, pose]);

  useEffect(() => { load(); }, [load]);

  const upload = async (file: File) => {
    if (!clientId) return;
    const { data: session } = await supabase.auth.getUser();
    const uid = session.user?.id;
    if (!uid) return;
    setUploading(true);
    const path = `${uid}/${pose}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "")}`;
    const { error: upErr } = await supabase.storage.from("evolution").upload(path, file, { upsert: false });
    if (upErr) { setUploading(false); toast.error(upErr.message); return; }
    const { error } = await supabase.from("evolution_photos").insert({
      client_id: clientId, pose, storage_path: path,
    });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Foto adicionada!");
    load();
  };

  const startCompare = () => {
    if (photos.length < 2) { toast.error("Envie pelo menos duas fotos desta pose."); return; }
    setCompare({ a: photos[photos.length - 1], b: photos[0] });
    setSlider(50);
  };

  return (
    <div>
      <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="w-8 h-8 -ml-1 flex items-center justify-center">
            <ChevronLeft size={22} className="text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-barlow font-bold text-xl text-foreground">FOTOS DE EVOLUÇÃO</h1>
            <p className="text-xs text-muted font-dm flex items-center gap-1">
              <Lock size={11} /> Privadas · somente você vê
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 px-4 py-3">
        {POSES.map((p) => (
          <button
            key={p.key}
            onClick={() => setPose(p.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-dm font-semibold ${
              pose === p.key ? "bg-primary text-white cta-shadow" : "bg-white text-muted card-shadow"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-4 space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-1 bg-primary text-white font-dm font-bold text-sm py-3 rounded-xl cta-shadow flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Camera size={16} /> {uploading ? "Enviando..." : "Nova foto"}
          </button>
          <button
            onClick={startCompare}
            className="flex-1 bg-white text-primary font-dm font-bold text-sm py-3 rounded-xl card-shadow"
          >
            Comparar
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
        />

        {loading && <div className="h-40 rounded-2xl bg-white card-shadow animate-pulse" />}

        {!loading && photos.length === 0 && (
          <div className="rounded-2xl bg-white card-shadow p-8 text-center">
            <Camera size={28} className="text-muted mx-auto mb-2" />
            <p className="font-barlow font-bold text-base text-foreground">Nenhuma foto ainda</p>
            <p className="text-xs text-muted font-dm mt-1">Registre sua primeira foto de {pose}.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="rounded-2xl bg-white card-shadow overflow-hidden">
              {p.url && <img src={p.url} alt={`Evolução ${p.pose}`} className="w-full h-44 object-cover" />}
              <p className="text-[11px] text-muted font-dm px-2 py-1.5">{fmt(p.taken_at)}</p>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!compare} onOpenChange={(o) => { if (!o) setCompare(null); }}>
        <DialogContent className="max-w-[360px] p-0 rounded-2xl overflow-hidden">
          {compare && (
            <div className="px-4 pt-5 pb-4">
              <h2 className="font-barlow font-[800] text-xl text-foreground">ANTES E DEPOIS</h2>
              <p className="text-xs text-muted font-dm">
                {fmt(compare.a.taken_at)} → {fmt(compare.b.taken_at)}
              </p>

              <div className="relative mt-3 rounded-xl overflow-hidden bg-secondary" style={{ height: 320 }}>
                {compare.a.url && (
                  <img src={compare.a.url} alt="Antes" className="absolute inset-0 w-full h-full object-cover" />
                )}
                {compare.b.url && (
                  <img
                    src={compare.b.url}
                    alt="Depois"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ clipPath: `inset(0 0 0 ${slider}%)` }}
                  />
                )}
                <span className="absolute bottom-2 left-2 text-[10px] font-barlow font-bold tracking-[1px] uppercase bg-black/50 text-white px-2 py-0.5 rounded">
                  EVO CLUB
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={slider}
                onChange={(e) => setSlider(Number(e.target.value))}
                className="w-full accent-primary mt-3"
              />

              <div className="grid grid-cols-2 gap-2 mt-2">
                {[compare.a, compare.b].map((p, i) => (
                  <div key={i} className="rounded-xl overflow-hidden card-shadow bg-white">
                    {p.url && <img src={p.url} alt="" className="w-full h-32 object-cover" />}
                    <p className="text-[10px] text-muted font-dm px-2 py-1">{fmt(p.taken_at)}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setConfirmShare(true)}
                className="w-full mt-3 bg-primary text-white font-dm font-bold text-sm py-3 rounded-xl cta-shadow flex items-center justify-center gap-2"
              >
                <Share2 size={16} /> Compartilhar comparação
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmShare} onOpenChange={setConfirmShare}>
        <DialogContent className="max-w-[320px] rounded-2xl">
          <h2 className="font-barlow font-bold text-lg text-foreground">Atenção</h2>
          <p className="text-sm text-muted-foreground font-dm">
            Esta imagem contém fotos pessoais. Deseja continuar?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmShare(false)}
              className="flex-1 bg-secondary text-foreground font-dm font-semibold text-sm py-3 rounded-xl"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                setConfirmShare(false);
                const urls = compare ? [compare.a.url, compare.b.url].filter(Boolean).join("\n") : "";
                if (navigator.share) {
                  try {
                    await navigator.share({ title: "Minha evolução — EVO Club", text: urls });
                  } catch { /* cancelado */ }
                } else {
                  await navigator.clipboard.writeText(urls);
                  toast.success("Links copiados!");
                }
              }}
              className="flex-1 bg-primary text-white font-dm font-bold text-sm py-3 rounded-xl cta-shadow"
            >
              Continuar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FotosEvolucaoTab;
