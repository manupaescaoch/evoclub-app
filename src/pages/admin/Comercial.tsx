import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAccess } from "@/contexts/AccessContext";
import { useUnit } from "@/contexts/UnitContext";
import { useComercial } from "@/hooks/useComercial";
import {
  fmtInt, fmtMoney0, fmtPct1, inRange, isPaid, isValidLead, orDash, periodRange, PeriodKey,
  previousRange, variation,
} from "@/lib/comercial";
import ComercialFilters, { FilterState } from "@/components/admin/comercial/ComercialFilters";
import MetasSection from "@/components/admin/comercial/MetasSection";
import FunilSection from "@/components/admin/comercial/FunilSection";
import AdsImportDialog from "@/components/admin/comercial/AdsImportDialog";
import LeadsDrawer from "@/components/admin/comercial/LeadsDrawer";
import { CampanhasTable, EquipeTable, OrigensTable } from "@/components/admin/comercial/TabelasComercial";
import { ExperimentaisBox, QualidadeBox, VelocidadeBox } from "@/components/admin/comercial/OperacaoComercial";
import { DiagnosticoBox, ReceitaBox, TrafegoBox } from "@/components/admin/comercial/ResultadoComercial";
import VarBadge from "@/components/admin/financeiro/VarBadge";

export default function Comercial() {
  const { can, isAdmin } = useAccess();
  const { filterId, units, currentUnit, isConsolidated } = useUnit();
  const podeImportar = isAdmin || can("crm", "create");

  const [f, setF] = useState<FilterState>({
    period: "mes",
    custom: periodRange("mes"),
    origem: "",
    plataforma: "",
    campanha: "",
    responsavel: "",
  });
  const range = useMemo(() => periodRange(f.period, f.custom), [f.period, f.custom]);
  const prevRange = useMemo(() => previousRange(range), [range]);

  const [importOpen, setImportOpen] = useState(false);
  const [drawer, setDrawer] = useState<{ title: string; key: string } | null>(null);

  const {
    loading, reload, raw, leads, interacoes, ads, cur, before, taxas, trafego, collabName,
  } = useComercial({
    unitId: filterId,
    range,
    origem: f.origem,
    plataforma: f.plataforma,
    campanha: f.campanha,
    responsavel: f.responsavel,
  });

  const campanhas = useMemo(() => {
    const set = new Set<string>();
    raw.ads.forEach((a) => a.campaign && set.add(a.campaign));
    raw.leads.forEach((l) => l.campanha && set.add(l.campanha));
    return [...set].sort();
  }, [raw.ads, raw.leads]);

  const matriculaClients = useMemo(
    () => new Set(raw.enrollments.filter((e) => inRange(e.enrollment_date, range)).map((e) => e.client_id)),
    [raw.enrollments, range],
  );

  const periodLeads = useMemo(
    () => leads.filter((l) => inRange(l.primeiro_contato_at || l.created_at, range)),
    [leads, range],
  );

  const drawerLeads = useMemo(() => {
    if (!drawer) return [];
    const expLeadIds = new Set(
      interacoes.filter((i) => i.agendou_experimental && inRange(i.data_experimental, range)).map((i) => i.lead_id),
    );
    const realizadasIds = new Set(
      interacoes.filter((i) => i.compareceu && inRange(i.data_experimental, range)).map((i) => i.lead_id),
    );
    switch (drawer.key) {
      case "leads": return periodLeads;
      case "validos": return periodLeads.filter((l) => isValidLead(l.qualidade, l.duplicado));
      case "agendadas": return periodLeads.filter((l) => expLeadIds.has(l.id));
      case "realizadas": return periodLeads.filter((l) => realizadasIds.has(l.id));
      case "matriculas":
        return periodLeads.filter((l) => l.matricula_client_id && matriculaClients.has(l.matricula_client_id));
      case "trafego": return periodLeads.filter((l) => isPaid(l.plataforma) || isPaid(l.origem));
      default:
        if (drawer.key.startsWith("origem:")) {
          const o = drawer.key.slice(7);
          return periodLeads.filter((l) => (l.origem || "Não informada") === o);
        }
        return periodLeads;
    }
  }, [drawer, periodLeads, interacoes, range, matriculaClients]);

  const metaReceita = raw.metas.reduce((a, m) => a + (Number(m.meta_receita_nova) || 0), 0);

  const exportar = () => {
    const rows = [
      ["Indicador", "Período", "Período anterior"],
      ["Conversas", cur.conversas, before.conversas],
      ["Leads", cur.leads, before.leads],
      ["Leads válidos", cur.leadsValidos, before.leadsValidos],
      ["Experimentais agendadas", cur.agendadas, before.agendadas],
      ["Experimentais realizadas", cur.realizadas, before.realizadas],
      ["Matrículas", cur.matriculas, before.matriculas],
      ["Receita nova", cur.receitaContratada, before.receitaContratada],
      ["Ticket médio", cur.ticket, before.ticket],
      ["Investimento em anúncios", cur.spend, before.spend],
      ["CAC", trafego.cac, ""],
      ["ROAS", trafego.roas, ""],
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `comercial_${range.from}_a_${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Resumo exportado");
  };

  const kpis = [
    { label: "Conversas", value: fmtInt(cur.conversas), prev: before.conversas, cur: cur.conversas, key: "trafego" },
    { label: "Leads", value: fmtInt(cur.leads), prev: before.leads, cur: cur.leads, key: "leads" },
    { label: "Leads válidos", value: fmtInt(cur.leadsValidos), prev: before.leadsValidos, cur: cur.leadsValidos, key: "validos" },
    { label: "Experimentais agendadas", value: fmtInt(cur.agendadas), prev: before.agendadas, cur: cur.agendadas, key: "agendadas" },
    { label: "Experimentais realizadas", value: fmtInt(cur.realizadas), prev: before.realizadas, cur: cur.realizadas, key: "realizadas" },
    { label: "Matrículas", value: fmtInt(cur.matriculas), prev: before.matriculas, cur: cur.matriculas, key: "matriculas" },
    { label: "Receita nova", value: fmtMoney0(cur.receitaContratada), prev: before.receitaContratada, cur: cur.receitaContratada, key: "matriculas" },
    { label: "Ticket médio", value: orDash(cur.matriculas, () => fmtMoney0(cur.ticket)), prev: before.ticket, cur: cur.ticket, key: "matriculas" },
  ];

  return (
    <div className="space-y-4 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-barlow font-bold text-2xl uppercase leading-tight">Comercial</h1>
          <p className="text-sm font-dm text-muted-foreground">
            Tráfego, atendimento, funil, matrículas e receita nova
            {isConsolidated ? " de todas as unidades" : currentUnit ? ` — ${currentUnit.name}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 font-dm" onClick={reload}>
            <RefreshCw size={14} className="mr-1.5" /> Atualizar
          </Button>
          <Button variant="outline" size="sm" className="h-9 font-dm" onClick={exportar}>
            <Download size={14} className="mr-1.5" /> Exportar
          </Button>
          {podeImportar && (
            <Button size="sm" className="h-9 font-dm" onClick={() => setImportOpen(true)}>
              <Upload size={14} className="mr-1.5" /> Importar métricas
            </Button>
          )}
        </div>
      </header>

      <ComercialFilters state={f} onChange={setF} campanhas={campanhas} collabs={raw.collabs} range={range} />

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <>
          <MetasSection
            metas={raw.metas}
            realizado={{
              leads: cur.leads,
              experimentais: cur.agendadas,
              matriculas: cur.matriculas,
              receita: cur.receitaContratada,
              alunosAtivos: raw.activeClients,
            }}
            onSaved={reload}
          />

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map((k) => (
              <button key={k.label} type="button"
                onClick={() => setDrawer({ title: k.label, key: k.key })}
                className="text-left rounded-2xl border bg-card p-3.5 hover:border-primary/50 transition-colors">
                <p className="text-[11px] uppercase tracking-wide font-dm text-muted-foreground">{k.label}</p>
                <p className="font-barlow font-bold text-2xl mt-1">{k.value}</p>
                <div className="mt-1.5">
                  {k.prev ? <VarBadge value={variation(k.cur, k.prev)} />
                    : <span className="text-[11px] font-dm text-muted-foreground">Sem base anterior</span>}
                </div>
              </button>
            ))}
          </section>

          <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Taxa label="Conversa → lead" value={orDash(cur.conversas, () => fmtPct1(taxas.conversaLead))} />
            <Taxa label="Lead → experimental" value={orDash(cur.leadsValidos, () => fmtPct1(taxas.leadExperimental))} />
            <Taxa label="Comparecimento" value={orDash(cur.agendadas, () => fmtPct1(taxas.comparecimento))} />
            <Taxa label="Experimental → matrícula" value={orDash(cur.realizadas, () => fmtPct1(taxas.experimentalMatricula))} />
            <Taxa label="Conversão geral" value={orDash(cur.leadsValidos, () => fmtPct1(taxas.geral))} />
          </section>

          <FunilSection cur={cur} onOpen={(key) => setDrawer({ title: "Detalhamento", key })} />

          <TrafegoBox cur={cur} trafego={trafego as any} />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <OrigensTable
              leads={periodLeads}
              matriculaClients={matriculaClients}
              onOpen={(o) => setDrawer({ title: `Leads · ${o}`, key: `origem:${o}` })}
            />
            <CampanhasTable
              ads={ads.filter((a) => inRange(a.date, range))}
              leads={periodLeads}
              enrollments={raw.enrollments.filter((e) => inRange(e.enrollment_date, range))}
              clients={raw.clients}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <QualidadeBox leads={periodLeads} />
            <VelocidadeBox leads={periodLeads} />
            <ExperimentaisBox cur={cur} interacoes={interacoes} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ReceitaBox cur={cur} before={before} metaReceita={metaReceita} />
            <DiagnosticoBox cur={cur} before={before} taxas={taxas as any} trafego={trafego as any} />
          </div>

          <EquipeTable leads={periodLeads} interacoes={interacoes} collabName={collabName} />

          {isConsolidated && units.length > 1 && (
            <p className="text-xs font-dm text-muted-foreground">
              Visão consolidada das {units.length} unidades. Selecione uma unidade no filtro para comparar o desempenho individual.
            </p>
          )}
        </>
      )}

      {importOpen && <AdsImportDialog open={importOpen} onOpenChange={setImportOpen} onDone={reload} />}
      {drawer && (
        <LeadsDrawer
          open={!!drawer}
          onOpenChange={(v) => !v && setDrawer(null)}
          title={drawer.title}
          leads={drawerLeads}
          collabs={raw.collabs}
          onChanged={reload}
        />
      )}
      <span className="hidden">{prevRange.from}</span>
    </div>
  );
}

function Taxa({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-[11px] uppercase tracking-wide font-dm text-muted-foreground">{label}</p>
      <p className="font-barlow font-bold text-xl mt-0.5">{value}</p>
    </div>
  );
}
