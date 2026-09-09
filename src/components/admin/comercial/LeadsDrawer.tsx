import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MessageCircle, UserCheck, XCircle } from "lucide-react";
import { useAccess } from "@/contexts/AccessContext";
import { qualidadeLabel, waLink } from "@/lib/comercial";
import type { Collab, Lead } from "@/hooks/useComercial";

export default function LeadsDrawer({
  open, onOpenChange, title, leads, collabs, onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  leads: Lead[];
  collabs: Collab[];
  onChanged: () => void;
}) {
  const nav = useNavigate();
  const { can, isAdmin } = useAccess();
  const podeEditar = isAdmin || can("crm", "edit");
  const [busy, setBusy] = useState<string | null>(null);

  const setResponsavel = async (lead: Lead, id: string) => {
    setBusy(lead.id);
    const { error } = await supabase.from("leads").update({ responsavel_id: id } as any).eq("id", lead.id);
    setBusy(null);
    if (error) return toast.error("Não foi possível alterar: " + error.message);
    toast.success("Responsável atualizado");
    onChanged();
  };

  const marcarPerdido = async (lead: Lead) => {
    setBusy(lead.id);
    const { error } = await supabase.from("leads").update({ status_funil: "perdido" } as any).eq("id", lead.id);
    setBusy(null);
    if (error) return toast.error("Não foi possível atualizar: " + error.message);
    toast.success("Lead marcado como perdido");
    onChanged();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-barlow uppercase">{title}</SheetTitle>
        </SheetHeader>
        <p className="text-xs font-dm text-muted-foreground mt-1">{leads.length} registro(s)</p>

        <div className="mt-4 space-y-3 pb-10">
          {leads.length === 0 && (
            <p className="text-sm font-dm text-muted-foreground">Nenhum registro para este indicador no período.</p>
          )}
          {leads.map((l) => (
            <div key={l.id} className="rounded-xl border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-dm font-medium truncate">{l.nome}</p>
                  <p className="text-xs font-dm text-muted-foreground truncate">
                    {l.telefone || "sem telefone"} · {l.origem || "origem não informada"}
                    {l.campanha ? ` · ${l.campanha}` : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="font-dm text-[10px] shrink-0">
                  {qualidadeLabel(l.qualidade)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <Button size="sm" variant="outline" className="h-8 font-dm"
                  onClick={() => nav(`/admin/leads/${l.id}`)}>
                  <ExternalLink size={13} className="mr-1" /> Abrir
                </Button>
                {l.telefone && (
                  <Button size="sm" variant="outline" className="h-8 font-dm" asChild>
                    <a href={waLink(l.telefone)} target="_blank" rel="noreferrer">
                      <MessageCircle size={13} className="mr-1" /> WhatsApp
                    </a>
                  </Button>
                )}
                {podeEditar && (
                  <>
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-xs font-dm max-w-[160px]"
                      value={l.responsavel_id || ""}
                      disabled={busy === l.id}
                      onChange={(e) => e.target.value && setResponsavel(l, e.target.value)}
                    >
                      <option value="">Responsável...</option>
                      {collabs.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                    {l.status_funil !== "perdido" && l.status_funil !== "convertido" && (
                      <Button size="sm" variant="ghost" className="h-8 font-dm text-destructive"
                        disabled={busy === l.id} onClick={() => marcarPerdido(l)}>
                        <XCircle size={13} className="mr-1" /> Perdido
                      </Button>
                    )}
                  </>
                )}
                {l.status_funil === "convertido" && (
                  <span className="inline-flex items-center text-xs font-dm text-emerald-600">
                    <UserCheck size={13} className="mr-1" /> Matriculado
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
