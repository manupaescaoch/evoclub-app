import { LayoutDashboard, Users, CalendarDays, Dumbbell, Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { id: "clientes", label: "Clientes", icon: Users, path: "/admin/clientes" },
  { id: "grade", label: "Grade", icon: CalendarDays, path: "/admin/grade" },
  { id: "treinos", label: "Treinos", icon: Dumbbell, path: "/admin/treinos" },
  { id: "menu", label: "Menu", icon: Menu, path: null },
] as const;

interface AdminBottomNavProps {
  onMenuToggle: () => void;
}

const AdminBottomNav = ({ onMenuToggle }: AdminBottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const count = navItems.length;

  const activeIndex = navItems.findIndex((i) => {
    if (!i.path) return false;
    if (i.path === "/admin") return location.pathname === "/admin";
    return location.pathname === i.path || location.pathname.startsWith(`${i.path}/`);
  });

  // Se a rota atual não estiver entre os atalhos principais, destaca o botão Menu.
  const effectiveActiveIndex = activeIndex >= 0 ? activeIndex : count - 1;
  const slot = 100 / count;

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-border nav-shadow z-50"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)", touchAction: "manipulation" }}
    >
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <filter id="admin-nav-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -11"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <div className="relative h-16">
        <div
          className="pointer-events-none absolute inset-x-0 -top-3 h-16"
          style={{ filter: "url(#admin-nav-goo)" }}
        >
          <div
            className="absolute top-0 h-full transition-[left] duration-500"
            style={{
              left: `${effectiveActiveIndex * slot}%`,
              width: `${slot}%`,
              transitionTimingFunction: "cubic-bezier(.55,-0.35,.35,1.45)",
            }}
          >
            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-11 h-11 rounded-full bg-primary" />
            <div className="absolute left-1/2 -translate-x-1/2 top-6 w-9 h-9 rounded-full bg-primary" />
          </div>
        </div>

        <div className="relative flex items-center justify-around h-full">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = index === effectiveActiveIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => (item.id === "menu" ? onMenuToggle() : item.path && navigate(item.path))}
                aria-current={isActive && item.path ? "page" : undefined}
                aria-label={item.label}
                className="flex flex-col items-center justify-center flex-1 h-full relative"
              >
                <span
                  className="transition-transform duration-500"
                  style={{
                    transform: isActive ? "translateY(-16px)" : "translateY(4px)",
                    transitionTimingFunction: "cubic-bezier(.55,-0.35,.35,1.45)",
                  }}
                >
                  <Icon size={20} className={isActive ? "text-white" : "text-muted"} />
                </span>
                <span
                  className={`absolute bottom-1 text-[10px] font-dm transition-all duration-300 ${
                    isActive ? "text-primary font-semibold opacity-100" : "text-muted opacity-100"
                  }`}
                  style={{ transform: isActive ? "translateY(0)" : "translateY(6px)" }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default AdminBottomNav;
