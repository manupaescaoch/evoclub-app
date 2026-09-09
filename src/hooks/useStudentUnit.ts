import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudent } from "@/contexts/StudentContext";

export type StudentUnit = {
  id: string;
  name: string;
  phone: string | null;
  default_capacity: number | null;
};

/** Unidade real do aluno logado (nome, telefone da recepção e capacidade padrão). */
export function useStudentUnit() {
  const { client } = useStudent();
  const [unit, setUnit] = useState<StudentUnit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!client?.unit_id) { setUnit(null); setLoading(false); return; }
      const { data } = await supabase
        .from("units")
        .select("id, name, phone, default_capacity")
        .eq("id", client.unit_id)
        .maybeSingle();
      if (!alive) return;
      setUnit((data as StudentUnit) || null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [client?.unit_id]);

  return { unit, loading };
}
