import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, Wallet, Receipt, ArrowLeftRight,
  Users, FileBarChart, BarChart3, Settings,
} from "lucide-react";
import { useUnit, CONSOLIDATED } from "@/contexts/UnitContext";

const sections = [
  {
    label: "Gestão",
    items: [
      { to: "/admin/financeiro", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/admin/financeiro/fluxo", label: "Fluxo de Caixa", icon: TrendingUp },
      { to: "/admin/financeiro/recebimentos", label: "Recebimentos", icon: Wallet },
      { to: "/admin/financeiro/contas-a-pagar", label: "Contas a Pagar", icon: Receipt },
    ],
  },
  {
    label: "Operação",
    items: [
      { to: "/admin/financeiro/transacoes", label: "Transações", icon: ArrowLeftRight },
      { to: "/admin/financeiro/folha", label: "Folha de Pagamento", icon: Users },
    ],
  },
  {
    label: "Análise",
    items: [
      { to: "/admin/financeiro/dre", label: "DRE", icon: FileBarChart },
      { to: "/admin/financeiro/relatorios", label: "Relatórios", icon: BarChart3 },
    ],
  },
  {
    label: "Sistema",
    items: [{ to: "/admin/financeiro/configuracoes", label: "Configurações", icon: Settings }],
  },
];

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

      {/* Submenu */}
      <nav className="bg-card rounded-xl p-2 card-shadow overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {sections.map((sec) => (
            <div key={sec.label} className="flex items-center gap-1">
              <span className="text-[10px] uppercase tracking-wider font-dm font-semibold text-muted-foreground px-2">
                {sec.label}
              </span>
              {sec.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end as boolean | undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-dm transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-primary text-white"
                        : "text-muted-foreground hover:text-foreground hover:bg-background"
                    }`
                  }
                >
                  <it.icon size={14} />
                  {it.label}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      </nav>

      <Outlet />
    </div>
  );
};

export default FinanceiroLayout;