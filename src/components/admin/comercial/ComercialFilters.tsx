import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SlidersHorizontal } from "lucide-react";
import { CONSOLIDATED, useUnit } from "@/contexts/UnitContext";
import { ORIGENS, PERIOD_LABEL, PeriodKey, PLATAFORMAS, Range } from "@/lib/comercial";
import type { Collab } from "@/hooks/useComercial";

export type FilterState = {
  period: PeriodKey;
  custom: Range;
  origem: string;
  plataforma: string;
  campanha: string;
  responsavel: string;
};

export default function ComercialFilters({
  state, onChange, campanhas, collabs, range,
}: {
  state: FilterState;
  onChange: (s: FilterState) => void;
  campanhas: string[];
  collabs: Collab[];
  range: Range;
}) {
  const { units, selected, setSelected } = useUnit();
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<FilterState>) => onChange({ ...state, ...patch });

  const periodos: PeriodKey[] = ["hoje", "ontem", "semana", "mes", "d7", "d30", "custom"];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="h-9 w-[190px] font-dm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={CONSOLIDATED}>Consolidado</SelectItem>
            {units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={state.period} onValueChange={(v) => set({ period: v as PeriodKey })}>
          <SelectTrigger className="h-9 w-[170px] font-dm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {periodos.map((p) => <SelectItem key={p} value={p}>{PERIOD_LABEL[p]}</SelectItem>)}
          </SelectContent>
        </Select>

        <span className="text-xs font-dm text-muted-foreground">
          {range.from.split("-").reverse().join("/")} a {range.to.split("-").reverse().join("/")}
        </span>

        <Collapsible open={open} onOpenChange={setOpen} className="w-full md:w-auto md:ml-auto">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 font-dm w-full md:w-auto">
              <SlidersHorizontal size={14} className="mr-1.5" /> Mais filtros
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-xl border bg-card p-3">
              {state.period === "custom" && (
                <>
                  <div>
                    <Label className="text-xs">De</Label>
                    <Input type="date" className="h-9" value={state.custom.from}
                      onChange={(e) => set({ custom: { ...state.custom, from: e.target.value } })} />
                  </div>
                  <div>
                    <Label className="text-xs">Até</Label>
                    <Input type="date" className="h-9" value={state.custom.to}
                      onChange={(e) => set({ custom: { ...state.custom, to: e.target.value } })} />
                  </div>
                </>
              )}
              <div>
                <Label className="text-xs">Origem do lead</Label>
                <Select value={state.origem || "all"} onValueChange={(v) => set({ origem: v === "all" ? "" : v })}>
                  <SelectTrigger className="h-9 font-dm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as origens</SelectItem>
                    {ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Plataforma</Label>
                <Select value={state.plataforma || "all"} onValueChange={(v) => set({ plataforma: v === "all" ? "" : v })}>
                  <SelectTrigger className="h-9 font-dm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {PLATAFORMAS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Campanha</Label>
                <Select value={state.campanha || "all"} onValueChange={(v) => set({ campanha: v === "all" ? "" : v })}>
                  <SelectTrigger className="h-9 font-dm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {campanhas.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Responsável comercial</Label>
                <Select value={state.responsavel || "all"} onValueChange={(v) => set({ responsavel: v === "all" ? "" : v })}>
                  <SelectTrigger className="h-9 font-dm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {collabs.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="ghost" size="sm" className="h-9 font-dm"
                  onClick={() => set({ origem: "", plataforma: "", campanha: "", responsavel: "" })}>
                  Limpar filtros
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
