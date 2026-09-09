import { useUnit } from "@/contexts/UnitContext";
import PageShell from "@/components/admin/gerencial/PageShell";
import ComercialPanel from "@/components/admin/crm/ComercialPanel";
import CrmDashboard from "@/components/admin/crm/CrmDashboard";
import FilaAcaoAlunos from "@/components/admin/crm/FilaAcaoAlunos";

export default function CRM() {
  const { units, filterId } = useUnit();
  const unidade = filterId ? units.find((u) => u.id === filterId) : null;
  const subtitulo = filterId
    ? `Metas, funil, réguas de follow up e operação do dia — ${unidade?.name || "unidade selecionada"}.`
    : "Resultados consolidados de todas as unidades.";

  return (
    <PageShell
      title="CRM — DASHBOARD COMERCIAL"
      description={subtitulo}
    >
      <ComercialPanel indicadores={<CrmDashboard />} />
      <FilaAcaoAlunos />
    </PageShell>
  );
}
