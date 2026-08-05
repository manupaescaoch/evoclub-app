import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil, Flag } from "lucide-react";
import { toast } from "sonner";
import PageShell, { EmptyState, LoadingState, SummaryCard } from "@/components/admin/gerencial/PageShell";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

type Ann = {
  id: string; title: string; body: string | null; pinned: boolean; active: boolean; created_at: string;
};

type Report = {
  id: string; post_id: string; reason: string | null; created_at: string;
  post?: { id: string; author_name: string | null; content: string | null; created_at: string } | null;
};

const empty: Partial<Ann> = { title: "", body: "", pinned: true, active: true };

export default function Comunidade() {
  const [anns, setAnns] = useState<Ann[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Ann>>(empty);

  const load = async () => {
    setLoading(true);
    const [a, r] = await Promise.all([
      supabase.from("community_announcements").select("*").order("created_at", { ascending: false }),
      supabase
        .from("community_reports")
        .select("id, post_id, reason, created_at, post:community_posts(id, author_name, content, created_at)")
        .order("created_at", { ascending: false }),
    ]);
    if (a.error) toast.error("Erro ao carregar avisos");
    setAnns((a.data as Ann[]) || []);
    setReports((r.data as any[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title?.trim()) { toast.error("Título é obrigatório"); return; }
    const payload: any = {
      title: form.title, body: form.body || null,
      pinned: form.pinned ?? true, active: form.active ?? true,
    };
    const res = form.id
      ? await supabase.from("community_announcements").update(payload).eq("id", form.id)
      : await supabase.from("community_announcements").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Salvo!"); setOpen(false); setForm(empty); load();
  };

  const removeAnn = async (id: string) => {
    const { error } = await supabase.from("community_announcements").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Aviso removido"); load(); }
  };

  const removePost = async (postId: string) => {
    const { error } = await supabase.from("community_posts").delete().eq("id", postId);
    if (error) toast.error(error.message); else { toast.success("Post removido"); load(); }
  };

  const dismissReport = async (id: string) => {
    const { error } = await supabase.from("community_reports").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Denúncia arquivada"); load(); }
  };

  return (
    <PageShell
      title="Comunidade"
      description="Mural de avisos do staff e moderação dos posts dos alunos."
      primaryAction={
        <Button onClick={() => { setForm(empty); setOpen(true); }} className="font-dm">
          <Plus size={16} className="mr-1" /> Novo aviso
        </Button>
      }
      summary={
        <>
          <SummaryCard label="Avisos ativos" value={anns.filter((a) => a.active).length} accent="blue" />
          <SummaryCard label="Denúncias" value={reports.length} accent={reports.length ? "red" : "default"} />
        </>
      }
    >
      {loading ? <LoadingState /> : (
        <div className="space-y-6">
          <div>
            <p className="font-barlow font-bold text-lg mb-2">Mural de avisos</p>
            {anns.length === 0 ? <EmptyState message="Nenhum aviso publicado." /> : (
              <div className="space-y-2">
                {anns.map((a) => (
                  <div key={a.id} className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-dm font-semibold text-sm">{a.title}</p>
                      {a.body && <p className="text-xs text-muted-foreground font-dm mt-1 whitespace-pre-line">{a.body}</p>}
                      <p className="text-[11px] text-muted-foreground font-dm mt-1">
                        {a.active ? "Ativo" : "Inativo"} · {new Date(a.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => { setForm(a); setOpen(true); }}>
                      <Pencil size={15} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeAnn(a.id)}>
                      <Trash2 size={15} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="font-barlow font-bold text-lg mb-2">Posts denunciados</p>
            {reports.length === 0 ? <EmptyState message="Nenhuma denúncia pendente." /> : (
              <div className="space-y-2">
                {reports.map((r) => (
                  <div key={r.id} className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                    <Flag size={16} className="text-red-600 mt-1" />
                    <div className="flex-1">
                      <p className="font-dm font-semibold text-sm">{r.post?.author_name || "Aluno"}</p>
                      <p className="text-xs font-dm text-foreground mt-1">{r.post?.content || "(post sem texto)"}</p>
                      <p className="text-[11px] text-muted-foreground font-dm mt-1">
                        Denunciado em {new Date(r.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="font-dm" onClick={() => dismissReport(r.id)}>
                      Arquivar
                    </Button>
                    <Button variant="destructive" size="sm" className="font-dm" onClick={() => removePost(r.post_id)}>
                      Apagar post
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Editar aviso" : "Novo aviso"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="font-dm">Título</Label>
              <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label className="font-dm">Mensagem</Label>
              <Textarea rows={4} value={form.body || ""} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active ?? true} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label className="font-dm">Visível no app</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="font-dm">Cancelar</Button>
            <Button onClick={save} className="font-dm">Salvar</Button>
          </DialogFooter>
        </DialogFooter>
      </Dialog>
    </PageShell>
  );
}
