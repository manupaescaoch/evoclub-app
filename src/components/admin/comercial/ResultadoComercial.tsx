import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { fmtInt, fmtMoney0, fmtPct1, monthInfo, orDash, pct, safeDiv, variation } from "@/lib/comercial";
import { Box } from "./TabelasComercial";
import { Mini } from "./OperacaoComercial";
import type { Snapshot } from "@/hooks/useComercial";

export function ReceitaBox({
  cur, before, metaReceita,
}: { cur: Snapshot; before: Snapshot; metaReceita: number }) {
  const { total, elapsed } = monthInfo();
  const projecao = elapsed ? (cur.receitaContratada / elapsed) * total : 0;
  const v = variation(cur.receitaContratada, before.receitaContratada);

  return (
    <Box title="Receita nova" sub="Valor mensal contratado nas matrículas do período">
      <div className="grid grid-cols-2 gap-3">
        <Mini label="Receita contratada" value={fmtMoney0(cur.receitaContratada)} />
        <Mini label="Ticket médio" value={orDash(cur.matriculas, () => fmtMoney0(cur.ticket))} />
        <Mini label="Receita de tráfego" value={fmtMoney0(cur.receitaAtribuida)} />
        <Mini label="Projeção do mês" value={fmtMoney0(projecao)} />
        <Mini label="vs. período anterior" value={before.receitaContratada ? `${v > 0 ? "+" : ""}${fmtPct1(v)}` : "Sem base"} />
        <Mini label="Meta do mês" value={metaReceita ? `${fmtPct1(pct(cur.receitaContratada, metaReceita))} de ${fmtMoney0(metaReceita)}` : "Sem meta"} />
      </div>
    </Box>
  );
}

type Diag = { tone: "bad" | "warn" | "good"; text: string };

export function DiagnosticoBox({ cur, before, taxas, trafego }: {
  cur: Snapshot; before: Snapshot; taxas: Record<string, number>; trafego: Record<string, number>;
}) {
  const items = useMemo<Diag[]>(() => {
    const out: Diag[] = [];
    if (!cur.leads && !cur.spend) {
      out.push({ tone: "warn", text: "Sem leads e sem investimento registrados no período. Cadastre os atendimentos para o diagnóstico funcionar." });
      return out;
    }
    if (cur.leadsValidos && taxas.leadExperimental < 30)
      out.push({ tone: "bad", text: `Só ${fmtPct1(taxas.leadExperimental)} dos leads válidos viraram experimental. O gargalo está no agendamento, não na geração.` });
    if (cur.agendadas && taxas.comparecimento < 60)
      out.push({ tone: "bad", text: `Comparecimento de ${fmtPct1(taxas.comparecimento)}. Reforce confirmação no dia anterior e no dia da aula.` });
    if (cur.realizadas && taxas.experimentalMatricula < 40)
      out.push({ tone: "bad", text: `Fechamento de ${fmtPct1(taxas.experimentalMatricula)} nas experimentais realizadas. O gargalo está na oferta/fechamento.` });
    if (cur.realizadas && taxas.fechamentoDia < 30)
      out.push({ tone: "warn", text: `Apenas ${fmtPct1(taxas.fechamentoDia)} fecham no mesmo dia da experimental. Proposta na hora aumenta a conversão.` });
    if (cur.spend && cur.matriculasTrafego && trafego.cac > cur.ticket * 3)
      out.push({ tone: "warn", text: `CAC de ${fmtMoney0(trafego.cac)} contra ticket de ${fmtMoney0(cur.ticket)}. Revise campanha e criativos.` });
    if (cur.spend && !cur.leadsValidos)
      out.push({ tone: "bad", text: "Há investimento em anúncios sem leads válidos no período. Verifique o registro dos leads e o destino do anúncio." });
    if (before.matriculas && cur.matriculas < before.matriculas * 0.8)
      out.push({ tone: "warn", text: `Matrículas caíram ${fmtPct1(Math.abs(variation(cur.matriculas, before.matriculas)))} em relação ao período anterior.` });
    if (taxas.geral >= 15 && cur.matriculas)
      out.push({ tone: "good", text: `Conversão geral de ${fmtPct1(taxas.geral)} de lead a matrícula: o processo está saudável.` });
    if (!out.length)
      out.push({ tone: "good", text: "Nenhum gargalo relevante detectado no período." });
    return out;
  }, [cur, before, taxas, trafego]);

  return (
    <Box title="Diagnóstico automático" sub="Leitura do funil com base nos dados do período">
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm font-dm">
            {it.tone === "bad" ? <AlertTriangle size={16} className="text-destructive mt-0.5 shrink-0" />
              : it.tone === "warn" ? <Info size={16} className="text-amber-500 mt-0.5 shrink-0" />
              : <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />}
            <span>{it.text}</span>
          </li>
        ))}
      </ul>
    </Box>
  );
}

export function TrafegoBox({ cur, trafego }: { cur: Snapshot; trafego: Record<string, number> }) {
  if (!cur.spend && !cur.impressions)
    return (
      <Box title="Tráfego pago" sub="Investimento e custo por etapa">
        <p className="text-sm font-dm text-muted-foreground">
          Sem dados de tráfego no período. Use “Importar métricas” para enviar o relatório do Meta ou Google Ads.
        </p>
      </Box>
    );
  return (
    <Box title="Tráfego pago" sub="Investimento e custo por etapa do funil">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Mini label="Investimento" value={fmtMoney0(cur.spend)} />
        <Mini label="Impressões" value={fmtInt(cur.impressions)} />
        <Mini label="Alcance" value={fmtInt(cur.reach)} />
        <Mini label="Frequência" value={orDash(cur.reach, () => trafego.frequencia.toFixed(2).replace(".", ","))} />
        <Mini label="Cliques" value={fmtInt(cur.clicks)} />
        <Mini label="CTR" value={orDash(cur.impressions, () => fmtPct1(trafego.ctr))} />
        <Mini label="CPC" value={orDash(cur.clicks, () => fmtMoney0(trafego.cpc))} />
        <Mini label="Custo por conversa" value={orDash(cur.adConversations, () => fmtMoney0(trafego.custoConversa))} />
        <Mini label="CPL" value={orDash(cur.leadsValidos, () => fmtMoney0(trafego.cpl))} />
        <Mini label="Custo por experimental" value={orDash(cur.agendadas, () => fmtMoney0(trafego.custoExperimental))} />
        <Mini label="CAC" value={orDash(cur.matriculasTrafego, () => fmtMoney0(trafego.cac))} />
        <Mini label="ROAS" value={orDash(cur.spend, () => `${trafego.roas.toFixed(2).replace(".", ",")}x`)} />
      </div>
    </Box>
  );
}

export const projecaoMes = (valor: number) => {
  const { total, elapsed } = monthInfo();
  return elapsed ? safeDiv(valor, elapsed) * total : 0;
};
