import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { OverviewRow } from "@/hooks/useClient360";
import Perfil360 from "@/components/admin/clientes/Perfil360";

export default function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<OverviewRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("client_overview").select("*").eq("id", Number(id)).maybeSingle();
    if (error) setError(error.message);
    setClient((data as any) ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const voltar = () => navigate("/admin/clientes");

  if (loading) return <div className="p-6 font-dm text-sm text-muted-foreground">Carregando aluno...</div>;
  if (error || !client)
    return (
      <div className="p-6 space-y-3">
        <p className="font-dm text-sm text-muted-foreground">{error || "Aluno não encontrado."}</p>
        <button onClick={voltar} className="font-dm text-sm text-primary">Voltar para clientes</button>
      </div>
    );

  return <Perfil360 variant="page" client={client} onClose={voltar} onSaved={load} />;
}
