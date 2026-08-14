import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ModuleKey =
  | "dashboard" | "clientes" | "grade" | "crm" | "financeiro" | "gerencial"
  | "treinos" | "avaliacao" | "equipe" | "operacional" | "ocorrencias"
  | "club" | "comunidade" | "configuracoes";

export type ActionKey = "view" | "create" | "edit" | "delete" | "sensitive";

export const ACTION_LABEL: Record<string, string> = {
  view: "Visualizar",
  create: "Criar",
  edit: "Editar",
  delete: "Excluir",
  sensitive: "Ação sensível",
};

type AccessCtx = {
  loading: boolean;
  isAdmin: boolean;
  collaboratorId: string | null;
  financialRelease: boolean;
  canConsolidated: boolean;
  unitIds: string[];
  modules: Record<string, string[]>;
  can: (module: ModuleKey | string, action?: ActionKey) => boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AccessCtx | null>(null);

const FULL: ActionKey[] = ["view", "create", "edit", "delete", "sensitive"];

export const AccessProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<Omit<AccessCtx, "loading" | "can" | "refresh">>({
    isAdmin: false,
    collaboratorId: null,
    financialRelease: false,
    canConsolidated: true,
    unitIds: [],
    modules: {},
  });
  const [fallback, setFallback] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setFallback(false);
      setState({ isAdmin: false, collaboratorId: null, financialRelease: false, canConsolidated: true, unitIds: [], modules: {} });
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("my_admin_access" as any);
    if (error || !data) {
      // não trava o painel se a checagem falhar — o banco continua sendo a fonte de verdade (RLS)
      setFallback(true);
      setLoading(false);
      return;
    }
    const d = data as any;
    setFallback(false);
    setState({
      isAdmin: !!d.is_admin,
      collaboratorId: d.collaborator_id ?? null,
      financialRelease: !!d.financial_release,
      canConsolidated: !!d.can_consolidated,
      unitIds: (d.unit_ids || []) as string[],
      modules: (d.modules || {}) as Record<string, string[]>,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { load(); });
    return () => subscription.unsubscribe();
  }, [load]);

  const can = useCallback((module: string, action: ActionKey = "view") => {
    if (fallback || state.isAdmin) return true;
    const actions = state.modules[module] || [];
    if (actions.includes(action)) return true;
    // "approve"/"export" legados contam como ação sensível
    if (action === "sensitive") return actions.includes("approve");
    return false;
  }, [fallback, state]);

  return (
    <Ctx.Provider value={{
      loading,
      ...state,
      canConsolidated: fallback ? true : state.canConsolidated,
      can,
      refresh: load,
    }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAccess = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAccess must be used within AccessProvider");
  return ctx;
};

export const ALL_ACTIONS = FULL;
