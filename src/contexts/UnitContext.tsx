import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Unit = { id: string; name: string };
export const CONSOLIDATED = "__all__";

type Ctx = {
  units: Unit[];
  selected: string;
  setSelected: (v: string) => void;
  isConsolidated: boolean;
  filterId: string | null;
};

const UnitContext = createContext<Ctx | null>(null);

export const UnitProvider = ({ children }: { children: ReactNode }) => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [selected, setSelected] = useState<string>(() => localStorage.getItem("fin_unit") || CONSOLIDATED);

  useEffect(() => {
    supabase.from("units").select("id,name").order("name").then(({ data }) => setUnits((data as Unit[]) || []));
  }, []);

  useEffect(() => { localStorage.setItem("fin_unit", selected); }, [selected]);

  const isConsolidated = selected === CONSOLIDATED;
  return (
    <UnitContext.Provider value={{ units, selected, setSelected, isConsolidated, filterId: isConsolidated ? null : selected }}>
      {children}
    </UnitContext.Provider>
  );
};

export const useUnit = () => {
  const ctx = useContext(UnitContext);
  if (!ctx) throw new Error("useUnit must be used within UnitProvider");
  return ctx;
};