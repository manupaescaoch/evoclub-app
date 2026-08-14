import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { useAccess, ModuleKey, ActionKey } from "@/contexts/AccessContext";
import { Button } from "@/components/ui/button";

export default function ModuleGuard({
  module, action = "view", children,
}: { module: ModuleKey; action?: ActionKey; children: ReactNode }) {
  const { loading, can } = useAccess();

  if (loading) {
    return <div className="text-center py-16 text-sm text-muted-foreground font-dm">Carregando permissões...</div>;
  }
  if (!can(module, action)) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-3">
        <div className="w-12 h-12 rounded-xl bg-muted mx-auto flex items-center justify-center">
          <ShieldOff size={22} className="text-muted-foreground" />
        </div>
        <h2 className="font-barlow font-bold text-xl text-foreground">Sem acesso a este módulo</h2>
        <p className="text-sm text-muted-foreground font-dm">
          Seu perfil de permissão não libera esta tela. Fale com a gerência para solicitar liberação.
        </p>
        <Button asChild variant="outline"><Link to="/admin">Voltar ao Dashboard</Link></Button>
      </div>
    );
  }
  return <>{children}</>;
}
