import { fmtInt, fmtPct1, orDash, pct, safeDiv } from "@/lib/comercial";
import type { Snapshot } from "@/hooks/useComercial";

type Step = { label: string; value: number; base: number | null; hint?: string; onClick?: () => void };

function Funnel({ title, steps }: { title: string; steps: Step[] }) {
  const top = Math.max(steps[0]?.value || 0, 1);
  return (
    <div className="rounded-2xl border bg-card p-4">
      <h3 className="font-barlow font-bold uppercase mb-3">{title}</h3>
      <div className="space-y-2">
        {steps.map((s, i) => {
          const w = Math.max((s.value / top) * 100, s.value ? 8 : 3);
          const conv = s.base === null ? null : pct(s.value, s.base);
          return (
            <button key={s.label} type="button" onClick={s.onClick}
              className="w-full text-left group disabled:cursor-default" disabled={!s.onClick}>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="h-9 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors relative overflow-hidden">
                    <div className="h-full rounded-lg bg-primary/70" style={{ width: `${w}%`, opacity: 1 - i * 0.12 }} />
                    <div className="absolute inset-0 flex items-center justify-between px-3">
                      <span className="text-xs font-dm font-medium truncate">{s.label}</span>
                      <span className="font-barlow font-bold text-sm">{fmtInt(s.value)}</span>
                    </div>
                  </div>
                </div>
                <span className="w-20 text-right text-[11px] font-dm text-muted-foreground">
                  {conv === null ? (s.hint || "") : orDash(s.base || 0, () => fmtPct1(conv))}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function FunilSection({
  cur, onOpen,
}: {
  cur: Snapshot;
  onOpen: (key: string) => void;
}) {
  const comercial: Step[] = [
    { label: "Conversas iniciadas", value: cur.conversas, base: null, hint: "base" },
    { label: "Leads registrados", value: cur.leads, base: cur.conversas, onClick: () => onOpen("leads") },
    { label: "Leads válidos", value: cur.leadsValidos, base: cur.leads, onClick: () => onOpen("validos") },
    { label: "Experimentais agendadas", value: cur.agendadas, base: cur.leadsValidos, onClick: () => onOpen("agendadas") },
    { label: "Experimentais realizadas", value: cur.realizadas, base: cur.agendadas, onClick: () => onOpen("realizadas") },
    { label: "Matrículas", value: cur.matriculas, base: cur.realizadas, onClick: () => onOpen("matriculas") },
  ];

  const trafego: Step[] = [
    { label: "Impressões", value: cur.impressions, base: null, hint: "base" },
    { label: "Cliques", value: cur.clicks, base: cur.impressions },
    { label: "Conversas do anúncio", value: cur.adConversations, base: cur.clicks },
    { label: "Leads de tráfego pago", value: cur.leadsValidos, base: cur.adConversations },
    { label: "Matrículas de tráfego", value: cur.matriculasTrafego, base: cur.leadsValidos },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Funnel title="Funil comercial" steps={comercial} />
      {cur.impressions || cur.spend ? (
        <Funnel title="Funil de tráfego pago" steps={trafego} />
      ) : (
        <div className="rounded-2xl border bg-card p-4">
          <h3 className="font-barlow font-bold uppercase mb-2">Funil de tráfego pago</h3>
          <p className="text-sm font-dm text-muted-foreground">
            Sem dados de tráfego no período. Importe as métricas de anúncios para ver impressões, cliques,
            custo por conversa e CAC.
          </p>
        </div>
      )}
    </div>
  );
}

export { Funnel };
export const conversao = (a: number, b: number) => safeDiv(a, b);
