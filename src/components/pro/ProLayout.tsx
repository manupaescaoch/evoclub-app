import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/logo-evo.png.asset.json";
import { useAccess } from "@/contexts/AccessContext";
import { useStaffNotifications } from "@/hooks/useStaffNotifications";
import { Bell, CalendarCheck, LayoutGrid, Monitor, Users2, Clock3 } from "lucide-react";

const NAV = [
  { to: "/pro", label: "Painel", icon: CalendarCheck, end: true },
  { to: "/pro/turnos", label: "Turnos", icon: Clock3, end: false },
  { to: "/pro/comunidade", label: "Alunos", icon: Users2, end: false },
  { to: "/pro/notificacoes", label: "Alertas", icon: Bell, end: false },
  { to: "/pro/mais", label: "Mais", icon: LayoutGrid, end: false },
];

export default function ProLayout() {
  const navigate = useNavigate();
  const { loading, collaboratorId, isAdmin } = useAccess();
  const { unread } = useStaffNotifications();
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!alive) return;
      if (!session) { navigate("/admin/login", { replace: true }); return; }
      setChecking(false);
    })();
    return () => { alive = false; };
  }, [navigate]);

  // Somente colaboradores (ou administradores) podem usar o Modo treinador
  useEffect(() => {
    if (checking || loading) return;
    if (!collaboratorId && !isAdmin) navigate("/", { replace: true });
  }, [checking, loading, collaboratorId, isAdmin, navigate]);


  useEffect(() => {
    if (!collaboratorId) return;
    supabase.from("collaborators").select("full_name, role_title").eq("id", collaboratorId).maybeSingle()
      .then(({ data }) => setName((data as any)?.full_name || ""));
  }, [collaboratorId]);

  if (checking || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="font-dm text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const first = name.split(" ")[0];

  return (
    <div className="min-h-screen bg-background">
      <header className="safe-top sticky top-0 z-20 bg-sidebar text-sidebar-primary-foreground px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={logoAsset.url} alt="EVO Club" className="w-9 h-9 rounded-lg" />
          <div className="min-w-0">
            <p className="font-barlow font-bold text-base leading-tight truncate">
              {first ? `Olá, ${first}` : "Modo treinador"}
            </p>
            <p className="text-[11px] font-dm text-sidebar-foreground leading-tight">EVO Club · treinador</p>
          </div>
          <Link to="/pro/notificacoes" className="ml-auto relative p-2 rounded-lg hover:bg-sidebar-border" aria-label="Notificações">
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[10px] font-barlow font-bold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pt-4" style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom, 0px))" }}>
        <Outlet />
      </main>

      <div className="safe-bottom fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card nav-shadow">
        <nav className="mx-auto flex max-w-3xl">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-2.5 font-dm text-[11px] font-semibold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
              <Icon size={22} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:flex justify-center border-t border-border py-1.5">
          <Link to="/admin" onClick={() => sessionStorage.setItem("evo_desktop_mode", "1")} className="flex items-center gap-1.5 text-[11px] font-dm text-muted-foreground">
            <Monitor size={13} /> {isAdmin ? "Abrir painel completo" : "Abrir versão desktop"}
          </Link>
        </div>
      </div>
    </div>
  );
}
