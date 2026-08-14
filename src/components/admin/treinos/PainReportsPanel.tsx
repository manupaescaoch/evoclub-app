import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HeartPulse } from "lucide-react";
import { toast } from "sonner";

type PainReport = {
  id: string;
  client_id: number;
  note: string | null;
  status: string;
  created_at: string;
  client_name?: string;
};

const STATUS = [
  { key: "novo", label: "NOVO", cls: "bg-red-50 text-red-600 border-red-100" },
  { key: "acompanhamento", label: "EM ACOMPANHAMENTO", cls: "bg-yellow-50 text-yellow-700 border-yellow-100" },
  { key: "resolvido", label: "RESOLVIDO", cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
];

const PainReportsPanel = () => {
  const [rows, setRows] = useState<PainReport[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("pain_reports")
      .select("id, client_id, note, status, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    const list = (data as PainReport[]) || [];
    const ids = [...new Set(list.map((r) => r.client_id))];
    const { data: clients } = ids.length
      ? await supabase.from("clients").select("id, name").in("id", ids)
      : { data: [] as { id: number; name: string }[] };
    const nameById = new Map((clients || []).map((c) => [c.id, c.name]));
    setRows(list.map((r) => ({ ...r, client_name: nameById.get(r.client_id) || `#${r.client_id}` })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("pain_reports")
      .update({ status, handled_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error("Não foi possível atualizar"); return; }
    toast.success("Ocorrência atualizada");
    load();
  };

  if (loading) return null;

  return (
    <div className="mb-6">
      <h2 className="font-barlow font-bold text-sm text-muted-foreground tracking-wider mb-3">
        OCORRÊNCIAS DE DOR
      </h2>
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {rows.length === 0 && (
          <p className="p-4 text-sm font-dm text-muted-foreground">Nenhuma dor relatada.</p>
        )}
        {rows.map((r) => {
          const st = STATUS.find((s) => s.key === r.status) || STATUS[0];
          return (
            <div key={r.id} className="p-4 flex items-start gap-3">
              <HeartPulse size={18} className="text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-dm font-semibold text-sm text-foreground">{r.client_name}</span>
                  <span className={`text-[10px] font-dm px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                  <span className="text-[11px] font-dm text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                {r.note && <p className="text-sm font-dm text-muted-foreground mt-1">{r.note}</p>}
              </div>
              <select
                value={r.status}
                onChange={(e) => setStatus(r.id, e.target.value)}
                className="text-xs font-dm border border-border rounded-lg px-2 py-1 bg-background"
              >
                {STATUS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PainReportsPanel;
