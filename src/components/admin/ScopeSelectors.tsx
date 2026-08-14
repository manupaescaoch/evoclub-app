import { useState } from "react";
import { Building2, CalendarRange } from "lucide-react";
import { CONSOLIDATED, useUnit } from "@/contexts/UnitContext";
import { usePeriod, PeriodMode } from "@/contexts/PeriodContext";
import { useAccess } from "@/contexts/AccessContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const MODES: { key: PeriodMode; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
  { key: "custom", label: "Personalizado" },
];

export function UnitSelect() {
  const { units, selected, setSelected } = useUnit();
  const { canConsolidated } = useAccess();
  return (
    <div className="flex items-center gap-1.5">
      <Building2 size={14} className="text-muted-foreground shrink-0" />
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="h-8 max-w-[150px] md:max-w-none rounded-lg border border-border bg-card px-2 text-xs md:text-sm font-dm focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {canConsolidated && <option value={CONSOLIDATED}>Todas as unidades</option>}
        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
    </div>
  );
}

export function PeriodSelect() {
  const { mode, setMode, from, to, setCustom, label } = usePeriod();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="h-8 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs md:text-sm font-dm hover:bg-muted/50">
          <CalendarRange size={14} className="text-muted-foreground" />
          <span className="max-w-[120px] md:max-w-none truncate">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3 space-y-3">
        <div className="grid grid-cols-2 gap-1.5">
          {MODES.map(m => (
            <button
              key={m.key}
              onClick={() => { if (m.key !== "custom") { setMode(m.key); setOpen(false); } else setMode("custom"); }}
              className={`h-8 rounded-lg text-xs font-dm border transition-colors ${
                mode === m.key ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {mode === "custom" && (
          <div className="space-y-2">
            <div><Label className="text-[11px] text-muted-foreground">De</Label><Input type="date" value={f} onChange={e => setF(e.target.value)} className="h-8" /></div>
            <div><Label className="text-[11px] text-muted-foreground">Até</Label><Input type="date" value={t} onChange={e => setT(e.target.value)} className="h-8" /></div>
            <Button size="sm" className="w-full" onClick={() => { setCustom(f, t); setOpen(false); }}>Aplicar</Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
