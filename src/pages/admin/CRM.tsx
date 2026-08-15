import { useUnit } from "@/contexts/UnitContext";
import PageShell from "@/components/admin/gerencial/PageShell";
import ComercialPanel from "@/components/admin/crm/ComercialPanel";
import CrmDashboard from "@/components/admin/crm/CrmDashboard";
import FilaAcaoAlunos from "@/components/admin/crm/FilaAcaoAlunos";

export default function CRM() {
  const { units, filterId } = useUnit();
  const unidadeNome = units.find(u => u.id === (filterId || units[0]?.id))?.name || "todas as unidades";

  return (
    <PageShell
      title="CRM — DASHBOARD COMERCIAL"
      description={`Metas, funil, réguas de follow up e operação do dia — ${unidadeNome}.`}
    >
      <ComercialPanel indicadores={<CrmDashboard />} />
      <FilaAcaoAlunos />
    </PageShell>
  );
}
