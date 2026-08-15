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
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-border nav-shadow z-50"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)", touchAction: "manipulation" }}>
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative"
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-primary" />
              )}
              <Icon
                size={20}
                className={isActive ? "text-primary" : "text-muted"}
              />
              <span
                className={`text-[10px] font-dm ${isActive ? "text-primary font-semibold" : "text-muted"}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
