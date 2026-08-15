import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeCadastrador, normalizeOrigem } from "@/lib/leads";

export type Lead = {
  id: string;
  unidade_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  telefone_normalizado: string | null;
  origem: string | null;
  status_funil: string;
  nivel_interesse: string | null;
  data_aula_experimental: string | null;
  hora_aula_experimental: string | null;
  status_taxa_experimental: string | null;
  cadastrado_por: string | null;
  atendido_por: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
};

export type Interacao = {
  id: string;
  lead_id: string;
  tipo: string;
  descricao: string | null;
  agendou_experimental: boolean;
  data_experimental: string | null;
  hora_experimental: string | null;
  compareceu: boolean | null;
  fechou_matricula: boolean;
  data_fechamento: string | null;
  valor_plano: number | null;
  plano_escolhido: string | null;
  atendido_por: string | null;
  quem_agendou: string | null;
  created_at: string;
};

export function useLeads(unidadeId: string | null, from: string | null, to: string | null) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!unidadeId) { setLeads([]); setInteracoes([]); setLoading(false); return; }
    setLoading(true);
    let q = supabase
      .from("leads")
      .select("*")
      .eq("unidade_id", unidadeId)
      .eq("ativo", true)
      .order("created_at", { ascending: false });
    if (from) q = q.gte("created_at", `${from}T00:00:00-03:00`);
    if (to) q = q.lte("created_at", `${to}T23:59:59-03:00`);

    let qi = supabase
      .from("interacoes")
      .select("*")
      .eq("unidade_id", unidadeId)
      .order("created_at", { ascending: false });
    if (from) qi = qi.gte("data_experimental", from);
    if (to) qi = qi.lte("data_experimental", to);

    const [{ data: l }, { data: i }] = await Promise.all([q, qi]);
    setLeads(((l || []) as unknown as Lead[]).map((x) => ({
      ...x,
      origem: normalizeOrigem(x.origem),
      cadastrado_por: normalizeCadastrador(x.cadastrado_por),
    })));
    setInteracoes((i || []) as unknown as Interacao[]);
    setLoading(false);
  }, [unidadeId, from, to]);

  useEffect(() => { load(); }, [load]);

  const expAgendadas = useMemo(
    () => new Set(interacoes.filter((i) => i.agendou_experimental && i.data_experimental).map((i) => i.lead_id)),
    [interacoes]
  );
  const expRealizadas = useMemo(
    () => new Set(interacoes.filter((i) => i.compareceu === true).map((i) => i.lead_id)),
    [interacoes]
  );

  return { leads, interacoes, loading, reload: load, expAgendadas, expRealizadas };
}
