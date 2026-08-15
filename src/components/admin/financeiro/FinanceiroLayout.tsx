import { Outlet, useLocation } from "react-router-dom";
import { useUnit, CONSOLIDATED } from "@/contexts/UnitContext";

const FinanceiroLayout = () => {
  const { units, selected, setSelected } = useUnit();
  useLocation();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-barlow font-bold text-2xl text-foreground">FINANCEIRO</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs font-dm text-muted-foreground uppercase tracking-wider">Unidade</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-dm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value={CONSOLIDATED}>Consolidado</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      <Outlet />
    </div>
  );
};

export default FinanceiroLayout;