import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/contexts/AccessContext";

export type Unit = {
  id: string;
  name: string;
  address?: string | null;
  default_capacity?: number | null;
  opening_hours?: any;
  timeclock_radius_m?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  legal_name?: string | null;
  cnpj?: string | null;
  state_registration?: string | null;
  municipal_registration?: string | null;
  phone?: string | null;
  email?: string | null;
  fiscal_address?: string | null;
  status?: string | null;
};
export const CONSOLIDATED = "__all__";

type Ctx = {
  units: Unit[];
  selected: string;
  setSelected: (v: string) => void;
  isConsolidated: boolean;
  filterId: string | null;
  currentUnit: Unit | null;
  reloadUnits: () => Promise<void>;
};

const UnitContext = createContext<Ctx | null>(null);

export const UnitProvider = ({ children }: { children: ReactNode }) => {
  const { unitIds, canConsolidated, loading: accessLoading } = useAccess();
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [selected, setSelected] = useState<string>(() => localStorage.getItem("admin_unit") || localStorage.getItem("fin_unit") || CONSOLIDATED);

  const reloadUnits = async () => {
    const { data } = await supabase.from("units").select("*").order("name");
    setAllUnits((data as Unit[]) || []);
  };

  useEffect(() => { reloadUnits(); }, []);
  useEffect(() => { localStorage.setItem("admin_unit", selected); localStorage.setItem("fin_unit", selected); }, [selected]);

  // escopo por unidade
  const units = useMemo(() => {
    if (accessLoading || !unitIds.length) return allUnits;
    return allUnits.filter(u => unitIds.includes(u.id));
  }, [allUnits, unitIds, accessLoading]);

  // sem autorização para consolidado: força uma unidade
  useEffect(() => {
    if (accessLoading || !units.length) return;
    if (!canConsolidated && (selected === CONSOLIDATED || !units.some(u => u.id === selected))) {
      setSelected(units[0].id);
    } else if (selected !== CONSOLIDATED && !units.some(u => u.id === selected)) {
      setSelected(canConsolidated ? CONSOLIDATED : units[0].id);
    }
  }, [units, canConsolidated, selected, accessLoading]);

  const isConsolidated = selected === CONSOLIDATED;
  const currentUnit = units.find(u => u.id === selected) || null;

  return (
    <UnitContext.Provider value={{
      units, selected, setSelected, isConsolidated,
      filterId: isConsolidated ? null : selected,
      currentUnit, reloadUnits,
    }}>
      {children}
    </UnitContext.Provider>
  );
};

export const useUnit = () => {
  const ctx = useContext(UnitContext);
  if (!ctx) throw new Error("useUnit must be used within UnitProvider");
  return ctx;
};
