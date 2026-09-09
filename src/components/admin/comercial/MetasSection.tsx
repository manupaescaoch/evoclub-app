import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { useAccess } from "@/contexts/AccessContext";
import { useUnit } from "@/contexts/UnitContext";
import { fmtInt, fmtMoney0, monthInfo, pct } from "@/lib/comercial";

export type MetaRow = {
  id?: string;
  unidade_id: string;
  mes_referencia: string;
  meta_leads: number;
  meta_experimentais: number;
  meta_matriculas: number;
  meta_receita_nova: number;
  meta_alunos_ativos: number;
};

type Realizado = {
  leads: number;
  experimentais: number;
  matriculas: number;
  receita: number;
  alunosAtivos: number;
};

const linhas: { key: keyof Realizado; metaKey: keyof MetaRow; label: string; money?: boolean }[] = [
  { key: "leads", metaKey: "meta_leads", label: "Leads" },
  { key: "experimentais", metaKey: "meta_experimentais", label: "Experimentais" },
  { key: "matriculas", metaKey: "meta_matriculas", label: "Matrículas" },
  { key: "receita", metaKey: "meta_receita_nova", label: "Receita nova", money: true },
  { key: "alunosAtivos", metaKey: "meta_alunos_ativos", label: "Alunos ativos" },
];

export default function MetasSection({
  metas, realizado, onSaved,
}: {
  metas: any[];
  realizado: Realizado;
  onSaved: () => void;
}) {
  const { can, isAdmin } = useAccess();
  const { units, filterId } = useUnit();
  const { total, elapsed, ref } = monthInfo();
  const podeEditar = isAdmin || can("crm", "edit");
  const [open, setOpen] = useState(false);

  const soma = (k: keyof MetaRow) => metas.reduce((a, m) => a + (Number(m[k]) || 0), 0);
  const meta: MetaRow = {
    unidade_id: filterId || "",
    mes_referencia: ref,
    meta_leads: soma("meta_leads"),
    meta_experimentais: soma("meta_experimentais"),
    meta_matriculas: soma("meta_matriculas"),
    meta_receita_nova: soma("meta_receita_nova"),
    meta_alunos_ativos: soma("meta_alunos_ativos"),
  };

  return (
    <section className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-barlow font-bold text-lg uppercase">Metas do mês</h2>
          <p className="text-xs font-dm text-muted-foreground">
            {filterId ? units.find((u) => u.id === filterId)?.name : "Soma das unidades"} · dia {elapsed} de {total}
          </p>
        </div>
        {podeEditar && (
          <Button variant="outline" size="sm" className="h-8 font-dm" onClick={() => setOpen(true)}>
            <Pencil size={14} className="mr-1.5" /> Editar metas
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {linhas.map((l) => {
          const feito = realizado[l.key] || 0;
          const alvo = Number(meta[l.metaKey]) || 0;
          const perc = pct(feito, alvo);
          const falta = Math.max(alvo - feito, 0);
          const projecao = elapsed ? (feito / elapsed) * total : 0;
          const fmt = l.money ? fmtMoney0 : (v: number) => fmtInt(v);
          return (
            <div key={l.label} className="rounded-xl border p-3">
              <p className="text-[11px] uppercase tracking-wide font-dm text-muted-foreground">{l.label}</p>
              <p className="font-barlow font-bold text-xl mt-1">
                {fmt(feito)} <span className="text-sm text-muted-foreground font-dm font-normal">de {alvo ? fmt(alvo) : "—"}</span>
              </p>
              <Progress value={Math.min(perc, 100)} className="h-2 mt-2" />
              <p className="text-[11px] font-dm text-muted-foreground mt-1.5">
                {alvo
                  ? `${perc.toFixed(0)}% · faltam ${fmt(falta)} · projeção ${fmt(projecao)}`
                  : "Meta não cadastrada"}
              </p>
            </div>
          );
        })}
      </div>

      {open && <MetaDialog open={open} onOpenChange={setOpen} onSaved={onSaved} />}
    </section>
  );
}

function MetaDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const { units, filterId } = useUnit();
  const { ref } = monthInfo();
  const [unidade, setUnidade] = useState(filterId || units[0]?.id || "");
  const [form, setForm] = useState<Partial<MetaRow>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!unidade) return;
    (async () => {
      const { data } = await supabase.from("metas").select("*").eq("unidade_id", unidade).eq("mes_referencia", ref).maybeSingle();
      setForm((data as any) || {});
    })();
  }, [unidade, ref]);

  const num = (k: keyof MetaRow) => Number((form as any)[k]) || 0;

  const save = async () => {
    if (!unidade) return toast.error("Selecione a unidade");
    setSaving(true);
    const { error } = await supabase.from("metas").upsert({
      unidade_id: unidade,
      mes_referencia: ref,
      meta_leads: num("meta_leads"),
      meta_experimentais: num("meta_experimentais"),
      meta_matriculas: num("meta_matriculas"),
      meta_receita_nova: num("meta_receita_nova"),
      meta_alunos_ativos: num("meta_alunos_ativos"),
    } as any, { onConflict: "unidade_id,mes_referencia" });
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar: " + error.message);
    toast.success("Metas atualizadas");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-barlow uppercase">Metas do mês</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Unidade</Label>
            <select className="w-full h-9 rounded-md border bg-background px-2 text-sm font-dm"
              value={unidade} onChange={(e) => setUnidade(e.target.value)}>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          {linhas.map((l) => (
            <div key={l.label}>
              <Label>{l.label}</Label>
              <Input type="number" min={0} value={(form as any)[l.metaKey] ?? ""}
                onChange={(e) => setForm({ ...form, [l.metaKey]: e.target.value })} />
            </div>
          ))}
          <Button className="w-full font-dm" disabled={saving} onClick={save}>
            {saving ? "Salvando..." : "Salvar metas"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
