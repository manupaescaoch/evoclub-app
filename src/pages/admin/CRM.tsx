import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Copy, MoreHorizontal } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type Automation = {
  id: string;
  name: string;
  trigger_rule: string | null;
  segment: string | null;
  active: boolean | null;
};

const CRM = () => {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from("automations").select("*");
      setAutomations((data as Automation[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("automations").update({ active: !current }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar automação");
    } else {
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: !current } : a));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-barlow font-bold text-2xl text-foreground">CRM — AUTOMAÇÃO</h1>
        <Button className="gap-2 font-dm"><Plus size={16} /> NOVA AUTOMAÇÃO</Button>
      </div>

      {/* Info banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
        <p className="text-sm font-dm text-foreground">
          Configure automações para engajar seus clientes automaticamente. Defina regras de disparo e segmentação para mensagens personalizadas.
        </p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-dm font-semibold bg-green-100 text-green-700">Ativas</span>
          <Button variant="outline" size="sm" className="text-xs font-dm">+ FILTROS</Button>
        </div>
        <span className="text-xs text-muted-foreground font-dm">{automations.length} automações</span>
      </div>

      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        <table className="w-full text-sm font-dm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Nome da automação</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Regra de disparo</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Segmento</th>
              <th className="text-center px-4 py-3 text-xs text-muted-foreground font-medium">Status</th>
              <th className="text-center px-4 py-3 text-xs text-muted-foreground font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted/30 rounded animate-pulse w-24" /></td>
                  ))}
                </tr>
              ))
            ) : automations.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Nenhuma automação configurada</td></tr>
            ) : (
              automations.map(a => (
                <tr key={a.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{a.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.trigger_rule || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.segment || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <Switch checked={!!a.active} onCheckedChange={() => toggleActive(a.id, !!a.active)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button className="text-muted-foreground hover:text-foreground"><Eye size={16} /></button>
                      <button className="text-muted-foreground hover:text-foreground"><Copy size={16} /></button>
                      <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CRM;
