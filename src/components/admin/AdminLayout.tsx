import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import logoAsset from "@/assets/logo-evo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Users, CalendarDays, Megaphone, DollarSign,
  BarChart3, Dumbbell, Settings, Sparkles, HelpCircle, LogOut,
  Search, Bell, ChevronDown, ClipboardList, Library, Wrench, Menu, X, ClipboardEdit,
  FileSignature, CalendarRange, UserCog, Truck, ShieldCheck, Tag, Ticket, TrendingUp,
  Gift, ListTodo, ClipboardCheck, CalendarClock, HeartPulse, AlertTriangle,
  Clock, Trophy, History, Inbox, Workflow, RefreshCw,
  Wallet, Receipt, ArrowLeftRight, FileBarChart, Percent, Lock, LineChart, Smartphone,
  Store,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { logAudit } from "@/lib/audit";
import { useAccess, ModuleKey } from "@/contexts/AccessContext";
import { UnitSelect, PeriodSelect } from "@/components/admin/ScopeSelectors";
import AdminBottomNav from "@/components/admin/AdminBottomNav";

type NavItem = {
  label: string;
  icon: React.ElementType;
  path: string;
  module: ModuleKey;
  children?: { label: string; icon: React.ElementType; path: string }[];
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin", module: "dashboard" },
  { label: "Clientes", icon: Users, path: "/admin/clientes", module: "clientes" },
  { label: "Grade", icon: CalendarDays, path: "/admin/grade", module: "grade" },
  {
    label: "CRM", icon: Megaphone, path: "/admin/crm", module: "crm",
    children: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/admin/crm" },
      { label: "Leads", icon: Inbox, path: "/admin/leads" },
      { label: "Comissões", icon: DollarSign, path: "/admin/crm/comissoes" },
      { label: "Indicações", icon: Gift, path: "/admin/crm/indicacoes" },
      { label: "Tarefas", icon: ListTodo, path: "/admin/crm/tarefas" },
      { label: "Renovações", icon: RefreshCw, path: "/admin/crm/renovacoes" },
    ],
  },
  {
    label: "Financeiro", icon: DollarSign, path: "/admin/financeiro", module: "financeiro",
    children: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/admin/financeiro" },
      { label: "Fluxo de Caixa", icon: TrendingUp, path: "/admin/financeiro/fluxo" },
      { label: "Recebimentos", icon: Wallet, path: "/admin/financeiro/recebimentos" },
      { label: "Contas a Pagar", icon: Receipt, path: "/admin/financeiro/contas-a-pagar" },
      { label: "Inadimplência", icon: AlertTriangle, path: "/admin/financeiro/inadimplencia" },
      { label: "Transações", icon: ArrowLeftRight, path: "/admin/financeiro/transacoes" },
      { label: "Folha de Pagamento", icon: Users, path: "/admin/financeiro/folha" },
      { label: "Descontos e Estornos", icon: Percent, path: "/admin/financeiro/ajustes" },
      { label: "Conciliação Bancária", icon: ArrowLeftRight, path: "/admin/financeiro/conciliacao" },
      { label: "DRE", icon: FileBarChart, path: "/admin/financeiro/dre" },
      { label: "Forecast", icon: LineChart, path: "/admin/financeiro/forecast" },
      { label: "Relatórios", icon: BarChart3, path: "/admin/financeiro/relatorios" },
      { label: "Fechamentos", icon: Lock, path: "/admin/financeiro/fechamentos" },
      { label: "Configurações", icon: Settings, path: "/admin/financeiro/configuracoes" },
    ],
  },
  {
    label: "Gerencial", icon: BarChart3, path: "/admin/gerencial", module: "gerencial",
    children: [
      { label: "Contratos", icon: FileSignature, path: "/admin/gerencial/contratos" },
      { label: "Atividades na Grade", icon: CalendarRange, path: "/admin/gerencial/atividades" },
      { label: "Colaboradores", icon: UserCog, path: "/admin/gerencial/colaboradores" },
      { label: "Fornecedores", icon: Truck, path: "/admin/gerencial/fornecedores" },
      { label: "Permissões", icon: ShieldCheck, path: "/admin/gerencial/permissoes" },
      { label: "Serviços", icon: Tag, path: "/admin/gerencial/servicos" },
      { label: "Cupons de Desconto", icon: Ticket, path: "/admin/gerencial/cupons" },
      { label: "Crescimento", icon: TrendingUp, path: "/admin/gerencial/crescimento" },
    ],
  },
  {
    label: "Treinos", icon: Dumbbell, path: "/admin/treinos", module: "treinos",
    children: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/admin/treinos" },
      { label: "Prescrever Treino", icon: ClipboardEdit, path: "/admin/treinos/prescrever" },
      { label: "Fichas de Treino", icon: ClipboardList, path: "/admin/treinos/fichas" },
      { label: "Biblioteca de Exercícios", icon: Library, path: "/admin/treinos/biblioteca" },
      { label: "Métodos de Treino", icon: Wrench, path: "/admin/treinos/metodos" },
    ],
  },
  { label: "Avaliações", icon: HeartPulse, path: "/admin/avaliacoes", module: "avaliacao" },
  {
    label: "Equipe", icon: UserCog, path: "/admin/equipe", module: "equipe",
    children: [
      { label: "Visão geral", icon: UserCog, path: "/admin/equipe" },
      { label: "Colaboradores", icon: UserCog, path: "/admin/gerencial/colaboradores" },
      { label: "Escala", icon: CalendarClock, path: "/admin/equipe/escala" },
      { label: "Ponto e Jornada", icon: Clock, path: "/admin/equipe/ponto" },
      { label: "Desempenho", icon: Trophy, path: "/admin/equipe/desempenho" },
      { label: "Permissões", icon: ShieldCheck, path: "/admin/gerencial/permissoes" },
      { label: "Histórico", icon: History, path: "/admin/equipe/historico" },
    ],
  },
  {
    label: "Operacional", icon: ClipboardCheck, path: "/admin/operacional", module: "operacional",
    children: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/admin/operacional" },
      { label: "Calendário", icon: CalendarDays, path: "/admin/operacional/calendario" },
      { label: "Tarefas", icon: ListTodo, path: "/admin/crm/tarefas" },
      { label: "Renovações", icon: RefreshCw, path: "/admin/crm/renovacoes" },
      { label: "Formulários", icon: ClipboardList, path: "/admin/operacional/formularios" },
      { label: "Encerramento de Turno", icon: ClipboardCheck, path: "/admin/operacional/encerramento" },
      { label: "Respostas e Pendências", icon: Inbox, path: "/admin/operacional/respostas" },
      { label: "Automações", icon: Workflow, path: "/admin/operacional/automacoes" },
    ],
  },
  { label: "Ocorrências", icon: AlertTriangle, path: "/admin/ocorrencias", module: "ocorrencias" },
  {
    label: "EVO Club", icon: Ticket, path: "/admin/club", module: "club",
    children: [
      { label: "Visão Geral", icon: LayoutDashboard, path: "/admin/club" },
      { label: "Parceiros e Benefícios", icon: Store, path: "/admin/club/parceiros" },
      { label: "Validar Resgate", icon: Ticket, path: "/admin/club/validar" },
    ],
  },
  { label: "Comunidade", icon: Megaphone, path: "/admin/comunidade", module: "comunidade" },
  { label: "Configurações", icon: Settings, path: "/admin/configuracoes", module: "configuracoes" },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { can, loading: accessLoading, isAdmin, collaboratorId } = useAccess();
  const isStaffMobileUser = !!collaboratorId;
  // null = ainda carregando o cargo do colaborador
  const [isTrainerRole, setIsTrainerRole] = useState<boolean | null>(null);
  const [userName, setUserName] = useState("Admin");
  const [userEmail, setUserEmail] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());
  const [closedMenus, setClosedMenus] = useState<Set<string>>(new Set());
  const navRef = useRef<HTMLElement | null>(null);
  const [indicator, setIndicator] = useState<{ top: number; height: number; show: boolean }>({ top: 0, height: 0, show: false });

  // Indicador elástico que desliza até o item ativo
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const el = nav.querySelector<HTMLElement>('[data-nav-active="true"]');
      if (!el) {
        setIndicator((p) => (p.show ? { ...p, show: false } : p));
        return;
      }
      const top = el.offsetTop;
      const height = el.offsetHeight;
      setIndicator((p) => (p.show && p.top === top && p.height === height ? p : { top, height, show: true }));
    };
    measure();
    const t = setTimeout(measure, 60);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  });

  // Auto-expand menu when navigating to any of its child routes
  useEffect(() => {
    setClosedMenus((prev) => {
      const next = new Set(prev);
      navItems.forEach((item) => {
        const matches =
          location.pathname.startsWith(item.path) ||
          (item.children || []).some((c) => location.pathname.startsWith(c.path));
        if (item.children && matches) {
          next.delete(item.path);
        }
      });
      return next;
    });
  }, [location.pathname]);

  // Cargo/perfil do colaborador logado (professor, estagiário, coordenador técnico)
  useEffect(() => {
    if (!collaboratorId) { setIsTrainerRole(false); return; }
    let alive = true;
    supabase
      .from("collaborators")
      .select("role_title, permission_profiles(name)")
      .eq("id", collaboratorId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const d = data as any;
        const text = `${d?.role_title || ""} ${d?.permission_profiles?.name || ""}`.toLowerCase();
        setIsTrainerRole(/professor|estagi|treinador|coach|coordenador t/.test(text));
      });
    return () => { alive = false; };
  }, [collaboratorId]);

  // Professor/estagiário no celular entra direto no modo treinador (/pro),
  // a menos que tenha escolhido explicitamente a versão desktop.
  useEffect(() => {
    if (accessLoading || !isMobile) return;
    if (location.pathname !== "/admin") return;
    if (!collaboratorId || isTrainerRole === null) return;
    // o papel "admin" no banco não deve mascarar o cargo real: só ignoramos o
    // redirecionamento quando o colaborador não tem cargo de treinador.
    if (!isTrainerRole && isAdmin) return;
    if (sessionStorage.getItem("evo_desktop_mode") === "1") return;
    navigate("/pro", { replace: true });
  }, [accessLoading, isMobile, location.pathname, isAdmin, isTrainerRole, collaboratorId, navigate]);

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
    await logAudit({ action: "logout", entity: "auth", description: "Saiu do sistema" });
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const initials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const visibleItems = accessLoading ? navItems : navItems.filter(i => can(i.module, "view"));

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
          <img src={logoAsset.url} alt="EVO Club" className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="text-white font-barlow font-bold text-sm leading-tight">EVO CLUB</p>
          <p className="text-gray-500 text-[10px] font-dm">UND 1 — Admin</p>
        </div>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav ref={navRef} className="relative flex-1 px-3 mt-2 space-y-0.5 overflow-y-auto">
        {/* Indicador elástico */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-3 right-3 top-0 rounded-lg bg-[rgba(0,87,255,0.16)] border-l-[3px] border-l-primary"
          style={{
            height: indicator.height,
            opacity: indicator.show ? 1 : 0,
            transform: `translateY(${indicator.top}px)`,
            transition: "transform 0.5s cubic-bezier(0.68,-0.55,0.265,1.55), height 0.35s ease, opacity 0.2s ease",
          }}
        />
        {visibleItems.map((item) => {
          const hasChildren = !!item.children;
          const active = location.pathname === item.path || (item.path !== "/admin" && location.pathname.startsWith(item.path));
          const isExact = item.path === "/admin" && location.pathname === "/admin";
          const isActive = isExact || (item.path !== "/admin" && active);

          if (hasChildren) {
            const routeMatches =
              location.pathname.startsWith(item.path) ||
              (item.children || []).some((c) => location.pathname.startsWith(c.path));
            const expanded = (routeMatches && !closedMenus.has(item.path)) || openMenus.has(item.path);
            return (
              <div key={item.path}>
                <button
                  type="button"
                  onClick={() => {
                    if (expanded) {
                      setOpenMenus((prev) => {
                        const next = new Set(prev);
                        next.delete(item.path);
                        return next;
                      });
                      setClosedMenus((prev) => new Set(prev).add(item.path));
                    } else {
                      setOpenMenus((prev) => new Set(prev).add(item.path));
                      setClosedMenus((prev) => {
                        const next = new Set(prev);
                        next.delete(item.path);
                        return next;
                      });
                    }
                  }}
                  data-nav-active={isActive ? "true" : undefined}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-dm transition-colors w-full text-left border-l-[3px] border-l-transparent
                    ${isActive
                      ? "text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                >
                  <item.icon size={18} className={isActive ? "text-primary" : ""} />
                  <span className="flex-1">{item.label}</span>
                  <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`} />
                </button>
                {expanded && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
                    {item.children!.map((child) => {
                      const childActive = location.pathname === child.path;
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={() => isMobile && setSidebarOpen(false)}
                          className={`flex items-center gap-2.5 px-2 py-2 rounded-md text-xs font-dm transition-colors
                            ${childActive
                              ? "text-white bg-primary/15 font-semibold"
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
              onClick={() => isMobile && setSidebarOpen(false)}
              data-nav-active={isActive ? "true" : undefined}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-dm transition-colors border-l-[3px] border-l-transparent
                ${isActive
                  ? "text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
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
    <div className="flex min-h-screen min-h-[100dvh] w-full overflow-x-hidden">
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
          w-[220px] bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 bottom-0 z-50
          safe-top safe-bottom momentum-scroll
          transition-transform duration-200 ease-in-out
          ${isMobile ? (sidebarOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Main */}
      <div className={`flex-1 min-w-0 max-w-full flex flex-col ${isMobile ? "ml-0" : "ml-[220px]"}`}>
        {/* Topbar */}
        <header className="min-h-14 bg-card border-b border-border flex items-center justify-between gap-2 px-3 md:px-6 sticky top-0 z-30 safe-top">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto no-scrollbar momentum-scroll py-2">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Abrir menu"
                className="text-foreground shrink-0 h-11 w-11 -ml-2 flex items-center justify-center"
              >
                <Menu size={22} />
              </button>
            )}
            <UnitSelect />
            <PeriodSelect />
          </div>
          <div className="flex items-center gap-1 md:gap-3 shrink-0">
            {isMobile && isStaffMobileUser && (
              <button
                onClick={() => {
                  sessionStorage.removeItem("evo_desktop_mode");
                  navigate("/pro");
                }}
                aria-label="Modo treinador"
                className="flex items-center justify-center gap-1.5 h-11 w-11 rounded-lg bg-primary/10 text-primary font-dm text-[11px] font-semibold shrink-0"
              >
                <Smartphone size={18} />
              </button>
            )}
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
              <button aria-label="Buscar" className="text-muted-foreground hover:text-foreground h-11 w-11 flex items-center justify-center shrink-0">
                <Search size={20} />
              </button>
            )}
            <button aria-label="Notificações" className="relative text-muted-foreground hover:text-foreground h-11 w-11 flex items-center justify-center shrink-0">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full" />
            </button>
            <div className="w-8 h-8 shrink-0 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold font-barlow">
              {initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 min-w-0 max-w-full p-4 md:p-6 bg-background overflow-y-auto overflow-x-hidden momentum-scroll safe-bottom">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
