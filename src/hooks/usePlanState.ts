import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudent } from "@/contexts/StudentContext";

export type PlanState = {
  state: "ok" | "expiring" | "overdue" | "blocked" | "unknown";
  blocked: boolean;
  days_left: number | null;
  grace_days?: number;
};

const FALLBACK: PlanState = { state: "unknown", blocked: false, days_left: null };

/** Situação do plano do aluno (em dia / vencendo / atrasado / bloqueado). */
export const usePlanState = () => {
  const { client } = useStudent();
  const [plan, setPlan] = useState<PlanState>(FALLBACK);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!client?.id) { setPlan(FALLBACK); setLoading(false); return; }
    const { data } = await supabase.rpc("plan_state");
    setPlan(((data as unknown) as PlanState) || FALLBACK);
    setLoading(false);
  }, [client?.id]);

  useEffect(() => { load(); }, [load]);

  return { plan, loading, reload: load };
};

export const planMessage = (plan: PlanState) => {
  const d = plan.days_left;
  if (plan.state === "blocked")
    return "Seu plano está irregular. Agendamentos bloqueados — regularize na recepção.";
  if (plan.state === "overdue")
    return `Plano vencido${d !== null ? ` há ${Math.abs(d)} dia(s)` : ""}. Você está no período de tolerância.`;
  if (plan.state === "expiring")
    return d === 0 ? "Seu plano vence hoje." : `Seu plano vence em ${d} dia(s).`;
  return "";
};
