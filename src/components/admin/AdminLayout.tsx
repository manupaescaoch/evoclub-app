import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import logoSpartan from "@/assets/logo-spartan.png";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Users, CalendarDays, Megaphone, DollarSign,
  BarChart3, Dumbbell, Settings, Sparkles, HelpCircle, LogOut,
  Search, Bell, ChevronDown, ClipboardList, Library, Wrench, Menu, X,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

type NavItem = {
  label: string;
  icon: React.ElementType;
  path: string;
  children?: { label: string; icon: React.ElementType; path: string }[];
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { label: "Clientes", icon: Users, path: "/admin/clientes" },
  { label: "Grade", icon: CalendarDays, path: "/admin/grade" },
  { label: "CRM", icon: Megaphone, path: "/admin/crm" },
  { label: "Financeiro", icon: DollarSign, path: "/admin/financeiro" },
  { label: "Gerencial", icon: BarChart3, path: "/admin/gerencial" },
  {
    label: "Treinos", icon: Dumbbell, path: "/admin/treinos",
    children: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/admin/treinos" },
      { label: "Alunos", icon: Users, path: "/admin/treinos/alunos" },
      { label: "Fichas de Treino", icon: ClipboardList, path: "/admin/treinos/fichas" },
      { label: "Biblioteca de Exercícios", icon: Library, path: "/admin/treinos/biblioteca" },
      { label: "Métodos de Treino", icon: Wrench, path: "/admin/treinos/metodos" },
    ],
  },
  { label: "Configurações", icon: Settings, path: "/admin/configuracoes" },
  { label: "Novidades", icon: Sparkles, path: "/admin/novidades" },
  { label: "Central de Ajuda", icon: HelpCircle, path: "/admin/ajuda" },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [userName, setUserName] = useState("Admin");
  const [userEmail, setUserEmail] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin/login");
        return;
      }
      const meta = session.user.user_metadata;
      setUserName(meta?.full_name || meta?.name || session.user.email?.split("@")[0] || "Admin");
      setUserEmail(session.user.email || "");
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/admin/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const initials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
          <img src={logoSpartan} alt="Iron Club Fit" className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="text-white font-barlow font-bold text-sm leading-tight">IRON FIT</p>
          <p className="text-gray-500 text-[10px] font-dm">UND 1 — Admin</p>
        </div>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 mt-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const hasChildren = !!item.children;
          const isTreinosSection = location.pathname.startsWith("/admin/treinos");
          const active = location.pathname === item.path || (item.path !== "/admin" && location.pathname.startsWith(item.path));
          const isExact = item.path === "/admin" && location.pathname === "/admin";
          const isActive = isExact || (item.path !== "/admin" && active);

          if (hasChildren) {
            const expanded = isTreinosSection;
            return (
              <div key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-dm transition-colors w-full
                    ${isActive
                      ? "bg-[rgba(20,0,255,0.13)] text-white border-l-[3px] border-l-primary"
                      : "text-gray-400 hover:text-white hover:bg-white/5 border-l-[3px] border-l-transparent"
                    }`}
                >
                  <item.icon size={18} className={isActive ? "text-primary" : ""} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`} />
                </Link>
                {expanded && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
                    {item.children!.map((child) => {
                      const childActive = location.pathname === child.path;
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`flex items-center gap-2.5 px-2 py-2 rounded-md text-xs font-dm transition-colors
                            ${childActive
                              ? "text-white bg-white/5"
                              : "text-gray-500 hover:text-white hover:bg-white/5"
                            }`}
                        >
                          <child.icon size={14} className={childActive ? "text-primary" : ""} />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-dm transition-colors
                ${isActive
                  ? "bg-[rgba(20,0,255,0.13)] text-white border-l-[3px] border-l-primary"
                  : "text-gray-400 hover:text-white hover:bg-white/5 border-l-[3px] border-l-transparent"
                }`}
            >
              <item.icon size={18} className={isActive ? "text-primary" : ""} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold font-barlow">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-dm truncate">{userName}</p>
            <p className="text-gray-500 text-[10px] font-dm">Administrador</p>
          </div>
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          w-[220px] bg-[#0A0A1A] flex flex-col fixed left-0 top-0 bottom-0 z-50
          transition-transform duration-200 ease-in-out
          ${isMobile ? (sidebarOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Main */}
      <div className={`flex-1 flex flex-col ${isMobile ? "ml-0" : "ml-[220px]"}`}>
        {/* Topbar */}
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-foreground p-1"
              >
                <Menu size={22} />
              </button>
            )}
            <button className="text-sm font-dm text-foreground flex items-center gap-1">
              Unidade atual <span className="text-muted-foreground">▾</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            {!isMobile && (
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  placeholder="Buscar..."
                  className="pl-9 pr-4 py-1.5 text-sm bg-background rounded-lg border border-border w-[220px] font-dm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
            {isMobile && (
              <button className="text-muted-foreground hover:text-foreground">
                <Search size={20} />
              </button>
            )}
            <button className="relative text-muted-foreground hover:text-foreground">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold font-barlow">
              {initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 bg-background overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
