import { Home, CalendarDays, Dumbbell, Users, Trophy, Ticket } from "lucide-react";

const navItems = [
  { id: "inicio", label: "Início", icon: Home },
  { id: "grade", label: "Grade", icon: CalendarDays },
  { id: "treino", label: "Treino", icon: Dumbbell },
  { id: "comunidade", label: "Comunidade", icon: Users },
  { id: "ranking", label: "Ranking", icon: Trophy },
  { id: "club", label: "Club", icon: Ticket },
] as const;

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const count = navItems.length;
  const activeIndex = Math.max(
    0,
    navItems.findIndex((i) => i.id === activeTab)
  );
  const slot = 100 / count;

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-border nav-shadow z-50"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)", touchAction: "manipulation" }}
    >
      {/* gooey filter for the liquid blob */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <filter id="nav-goo">
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
        {/* liquid layer */}
        <div
          className="pointer-events-none absolute inset-x-0 -top-3 h-16"
          style={{ filter: "url(#nav-goo)" }}
        >
          <div
            className="absolute top-0 h-full transition-[left] duration-500"
            style={{ left: `${activeIndex * slot}%`, width: `${slot}%`, transitionTimingFunction: "cubic-bezier(.55,-0.35,.35,1.45)" }}
          >
            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-11 h-11 rounded-full bg-primary" />
            <div className="absolute left-1/2 -translate-x-1/2 top-6 w-9 h-9 rounded-full bg-primary" />
          </div>
        </div>

        <div className="relative flex items-center justify-around h-full">
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                aria-current={isActive ? "page" : undefined}
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
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
