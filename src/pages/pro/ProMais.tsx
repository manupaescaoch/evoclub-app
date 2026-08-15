import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/contexts/AccessContext";
import { UnitSelect, PeriodSelect } from "@/components/admin/ScopeSelectors";
import {
  ArrowLeftRight, ChevronRight, ClipboardEdit, Clock, LogOut, Monitor, Trophy, Users,
} from "lucide-react";

export default function ProMais() {
  const navigate = useNavigate();
  const { can } = useAccess();

  const items = [
    { to: "/pro/escala", label: "Minha escala e trocas", desc: "Plantões, pedidos e aprovações", icon: ArrowLeftRight, show: true },
    { to: "/pro/desempenho", label: "Meu desempenho", desc: "Score e posição no ranking", icon: Trophy, show: can("equipe") },
    { to: "/admin/treinos/prescrever", label: "Montar treino", desc: "Prescrever ou duplicar ficha", icon: ClipboardEdit, show: can("treinos", "edit") },
    { to: "/admin/clientes", label: "Alunos", desc: "Perfil 360º e anamnese", icon: Users, show: can("clientes") },
    { to: "/admin/equipe/ponto", label: "Meu ponto", desc: "Bater ponto com foto e GPS", icon: Clock, show: can("equipe") },
  ].filter(i => i.show);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="space-y-4">
      <h1 className="font-barlow font-bold text-xl">MAIS</h1>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <p className="font-barlow font-bold text-sm">UNIDADE E PERÍODO</p>
        <UnitSelect />
        <PeriodSelect />
      </div>

      <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
        {items.map(({ to, label, desc, icon: Icon }) => (
          <Link key={to} to={to} className="flex items-center gap-3 px-4 py-4">
            <Icon size={20} className="text-primary shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block font-dm text-sm font-semibold">{label}</span>
              <span className="block font-dm text-[11px] text-muted-foreground">{desc}</span>
            </span>
            <ChevronRight size={18} className="text-muted-foreground shrink-0" />
          </Link>
        ))}
      </div>

      <Link to="/admin" className="flex items-center justify-center gap-2 h-12 rounded-xl bg-card border border-border font-dm text-sm font-semibold">
        <Monitor size={16} /> Abrir painel completo
      </Link>

      <button onClick={logout} className="w-full h-12 rounded-xl bg-card border border-border font-dm text-sm font-semibold text-red-600 flex items-center justify-center gap-2">
        <LogOut size={16} /> Sair
      </button>
    </div>
  );
}
