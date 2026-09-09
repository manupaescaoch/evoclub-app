import { Link, useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowUpRight, AlertTriangle, PieChart as PieIcon } from "lucide-react";
import { fmtBRL, fmtPct } from "@/lib/finance";
import type { CategorySlice } from "@/hooks/useFinanceDashboard";

type Props = {
  categories: CategorySlice[];
  total: number;
  loading: boolean;
  uncategorizedCount: number;
  seeAllHref: string;
  categoryHref: (name: string) => string;
  uncategorizedHref: string;
};

const DespesasCategoria = ({
  categories, total, loading, uncategorizedCount, seeAllHref, categoryHref, uncategorizedHref,
}: Props) => {
  const navigate = useNavigate();

  return (
    <div className="bg-card rounded-xl card-shadow p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-sm font-dm font-semibold text-foreground">Despesas por categoria</p>
        <Link to={seeAllHref} className="text-xs font-dm font-medium text-primary hover:underline inline-flex items-center gap-1">
          Ver todas <ArrowUpRight size={12} />
        </Link>
      </div>

      {uncategorizedCount > 0 && (
        <button
          onClick={() => navigate(uncategorizedHref)}
          className="w-full mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left min-h-11"
        >
          <AlertTriangle size={14} className="text-amber-600 shrink-0" />
          <span className="text-[11px] font-dm font-medium text-amber-700">
            {uncategorizedCount} {uncategorizedCount === 1 ? "transação está" : "transações estão"} sem categoria.
          </span>
        </button>
      )}

      {loading ? (
        <div className="h-56 rounded-lg bg-background animate-pulse" />
      ) : categories.length === 0 ? (
        <div className="py-10 text-center">
          <PieIcon size={22} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-xs font-dm text-muted-foreground">Nenhum lançamento encontrado neste período</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categories} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={2}>
                  {categories.map((c) => <Cell key={c.name} fill={c.color} />)}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [fmtBRL(Number(v)), n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex-1 w-full space-y-1.5">
            {categories.map((c) => (
              <li key={c.name}>
                <button
                  onClick={() => navigate(categoryHref(c.name))}
                  className="w-full flex items-center justify-between gap-2 text-left rounded-lg px-1.5 py-1.5 min-h-11 hover:bg-background/60 transition-colors"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                    <span className="text-xs font-dm text-foreground truncate">{c.name}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-xs font-dm font-semibold text-foreground">{fmtBRL(c.value)}</span>
                    <span className="block text-[10px] font-dm text-muted-foreground">
                      {fmtPct(c.pct)} · {c.count} {c.count === 1 ? "lançamento" : "lançamentos"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            <li className="flex items-center justify-between border-t border-border pt-2 px-1.5">
              <span className="text-[11px] font-dm text-muted-foreground">Total de despesas</span>
              <span className="text-xs font-dm font-bold text-red-500">{fmtBRL(total)}</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default DespesasCategoria;
