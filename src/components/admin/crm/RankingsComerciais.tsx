import { Card } from "@/components/ui/card";

export type RankRow = { k: string; total: number; conv: number };

const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
const fmtPct = (v: number) => `${v.toFixed(1).replace(".", ",")}%`;

export default function RankingsComerciais({
  porOrigem, porCadastrador,
}: { porOrigem: RankRow[]; porCadastrador: RankRow[] }) {
  const blocks = [
    { title: "Leads por origem", rows: porOrigem },
    { title: "Leads por cadastrador", rows: porCadastrador },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {blocks.map((block) => (
        <Card key={block.title} className="p-4">
          <h2 className="font-barlow font-bold text-lg mb-3">{block.title}</h2>
          {block.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground font-dm">Sem dados no período.</p>
          ) : (
            <div className="space-y-2">
              {block.rows.map((r) => (
                <div key={r.k}>
                  <div className="flex justify-between text-sm font-dm">
                    <span className="truncate">{r.k}</span>
                    <span className="text-muted-foreground">
                      {r.total} · {r.conv} matr. ({fmtPct(pct(r.conv, r.total))})
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                    <div className="h-full bg-primary rounded-full"
                      style={{ width: `${pct(r.total, block.rows[0].total)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
