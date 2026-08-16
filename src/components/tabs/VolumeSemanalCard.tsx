import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, ChevronDown } from "lucide-react";
import type { VolumeRow } from "@/hooks/useTrainingPlan";

const fmt = (n: number) => (n % 1 ? n.toFixed(1) : String(n));

const Delta = ({ now, prev }: { now: number; prev: number }) => {
  if (prev === 0 && now === 0) return <Minus size={11} className="text-muted" />;
  if (prev === 0) return <ArrowUpRight size={11} className="text-primary" />;
  const pct = Math.round(((now - prev) / prev) * 100);
  if (pct === 0) return <Minus size={11} className="text-muted" />;
  const up = pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-dm ${up ? "text-primary" : "text-destructive"}`}>
      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(pct)}%
    </span>
  );
};

const VolumeSemanalCard = ({ volume }: { volume: VolumeRow[] }) => {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="rounded-2xl bg-card card-shadow p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-barlow tracking-[1px] uppercase text-muted">Volume semanal (seg→dom)</p>
        <span className="text-[9px] font-dm text-muted">realizado · meta</span>
      </div>

      <div className="space-y-1">
        {volume.map((v) => {
          const pct = Math.min(100, (v.total / Math.max(v.target, 1)) * 100);
          const isOpen = open === v.group;
          const maxHist = Math.max(...v.history.map((h) => h.total), 1);
          return (
            <div key={v.group} className="border-b border-secondary last:border-0 pb-1.5">
              <button
                onClick={() => setOpen(isOpen ? null : v.group)}
                className="w-full flex items-center gap-2 py-1.5 text-left min-h-[38px]"
              >
                <span className="text-[11px] font-dm text-foreground w-[74px] truncate" title={v.group}>{v.group}</span>
                <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden relative">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-primary/25"
                    style={{ width: `${Math.min(100, ((v.direct + v.indirect) / Math.max(v.target, 1)) * 100)}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-primary"
                    style={{ width: `${Math.min(100, (v.direct / Math.max(v.target, 1)) * 100)}%` }} />
                </div>
                <span className="text-[11px] font-dm font-semibold text-muted w-[62px] text-right">
                  {fmt(v.total)}<span className="text-muted/70"> · {v.target}</span>
                </span>
                <Delta now={v.total} prev={v.prevTotal} />
                <ChevronDown size={13} className={`text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="pl-1 pb-2 space-y-1.5">
                  <p className="text-[11px] font-dm text-foreground">
                    {fmt(v.direct)} diretas + {fmt(v.indirect)} equivalentes indiretas = <b>{fmt(v.total)} total</b>
                  </p>
                  <p className="text-[10px] font-dm text-muted">
                    Frequência: {v.days} {v.days === 1 ? "dia" : "dias"} · {v.sessions} {v.sessions === 1 ? "sessão" : "sessões"} ·
                    {" "}semana anterior {fmt(v.prevTotal)} · média 4 sem. {v.avg4.toFixed(1)} · progresso {Math.round(pct)}% da meta
                  </p>
                  <div className="flex items-end gap-1.5 h-12 pt-1">
                    {v.history.map((h, i) => (
                      <div key={h.week} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-t bg-primary/70"
                          style={{ height: `${Math.max(2, (h.total / maxHist) * 36)}px` }} />
                        <span className="text-[8px] font-dm text-muted">
                          {i === v.history.length - 1 ? "atual" : `-${v.history.length - 1 - i}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] font-dm text-muted mt-2">
        Séries realizadas: grupo principal conta 1,0 · acessório 0,5.
      </p>
    </div>
  );
};

export default VolumeSemanalCard;
