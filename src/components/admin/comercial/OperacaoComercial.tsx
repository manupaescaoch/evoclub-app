import { useMemo } from "react";
import { fmtDec, fmtInt, fmtPct1, orDash, pct, qualidadeLabel, safeDiv } from "@/lib/comercial";
import { Box } from "./TabelasComercial";
import type { Interacao, Lead, Snapshot } from "@/hooks/useComercial";

const minutesBetween = (a?: string | null, b?: string | null) => {
  if (!a || !b) return null;
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 60000;
  return d >= 0 ? d : null;
};

const humanMin = (m: number) => (m < 60 ? `${Math.round(m)} min` : `${fmtDec(m / 60, 1)} h`);

export function QualidadeBox({ leads }: { leads: Lead[] }) {
  const rows = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach((l) => {
      const k = l.qualidade || "sem_classificacao";
      map.set(k, (map.get(k) || 0) + 1);
    });
    const total = leads.length;
    return [...map.entries()].map(([k, v]) => ({ k, v, share: pct(v, total) })).sort((a, b) => b.v - a.v);
  }, [leads]);

  const motivos = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach((l) => {
      if (l.motivo_desqualificacao) map.set(l.motivo_desqualificacao, (map.get(l.motivo_desqualificacao) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [leads]);

  const duplicados = leads.filter((l) => l.duplicado).length;

  return (
    <Box title="Qualidade dos leads" sub="Classificação, duplicidade e motivos de desqualificação">
      {leads.length === 0 ? (
        <p className="text-sm font-dm text-muted-foreground">Sem leads no período.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.k} className="flex items-center justify-between text-sm font-dm">
              <span>{qualidadeLabel(r.k === "sem_classificacao" ? null : r.k)}</span>
              <span className="text-muted-foreground">{fmtInt(r.v)} · {fmtPct1(r.share)}</span>
            </div>
          ))}
          <div className="pt-2 border-t text-xs font-dm text-muted-foreground">
            Duplicados marcados: {fmtInt(duplicados)} ({fmtPct1(pct(duplicados, leads.length))})
          </div>
          {!!motivos.length && (
            <div className="pt-1">
              <p className="text-[11px] uppercase tracking-wide font-dm text-muted-foreground mb-1">Motivos de desqualificação</p>
              {motivos.map(([m, v]) => (
                <div key={m} className="flex justify-between text-xs font-dm">
                  <span className="truncate">{m}</span><span className="text-muted-foreground">{fmtInt(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Box>
  );
}

export function VelocidadeBox({ leads }: { leads: Lead[] }) {
  const stats = useMemo(() => {
    const tempos = leads
      .map((l) => minutesBetween(l.primeiro_contato_at || l.created_at, l.primeira_resposta_at))
      .filter((v): v is number => v !== null);
    const sorted = [...tempos].sort((a, b) => a - b);
    const media = safeDiv(tempos.reduce((a, b) => a + b, 0), tempos.length);
    const mediana = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    const em5 = tempos.filter((t) => t <= 5).length;
    const em30 = tempos.filter((t) => t <= 30).length;
    const semResposta = leads.filter((l) => !l.primeira_resposta_at).length;
    return { n: tempos.length, media, mediana, em5, em30, semResposta };
  }, [leads]);

  return (
    <Box title="Velocidade de atendimento" sub="Tempo entre o primeiro contato do lead e a primeira resposta">
      {stats.n === 0 ? (
        <p className="text-sm font-dm text-muted-foreground">
          Sem dados de resposta no período. Registre a primeira resposta no lead para acompanhar esse indicador.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Mini label="Tempo médio" value={humanMin(stats.media)} />
          <Mini label="Tempo mediano" value={humanMin(stats.mediana)} />
          <Mini label="Respondidos em 5 min" value={fmtPct1(pct(stats.em5, stats.n))} />
          <Mini label="Respondidos em 30 min" value={fmtPct1(pct(stats.em30, stats.n))} />
          <Mini label="Sem resposta" value={fmtInt(stats.semResposta)} />
        </div>
      )}
    </Box>
  );
}

export function ExperimentaisBox({ cur, interacoes }: { cur: Snapshot; interacoes: Interacao[] }) {
  const motivos = useMemo(() => {
    const map = new Map<string, number>();
    interacoes.forEach((i) => {
      if (i.compareceu && !i.fechou_matricula && i.motivo_nao_fechamento)
        map.set(i.motivo_nao_fechamento, (map.get(i.motivo_nao_fechamento) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [interacoes]);

  return (
    <Box title="Experimentais" sub="Confirmação, comparecimento e fechamento">
      <div className="grid grid-cols-2 gap-3">
        <Mini label="Agendadas" value={fmtInt(cur.agendadas)} />
        <Mini label="Confirmadas" value={orDash(cur.agendadas, () => fmtPct1(pct(cur.confirmadas, cur.agendadas)))} />
        <Mini label="Comparecimento" value={orDash(cur.agendadas, () => fmtPct1(pct(cur.realizadas, cur.agendadas)))} />
        <Mini label="No-show" value={orDash(cur.agendadas, () => fmtPct1(pct(cur.noShows, cur.agendadas)))} />
        <Mini label="Reagendadas" value={fmtInt(cur.reagendadas)} />
        <Mini label="Fechamento no dia" value={orDash(cur.realizadas, () => fmtPct1(pct(cur.matriculasMesmoDia, cur.realizadas)))} />
      </div>
      {!!motivos.length && (
        <div className="pt-3 mt-3 border-t">
          <p className="text-[11px] uppercase tracking-wide font-dm text-muted-foreground mb-1">Por que não fechou</p>
          {motivos.map(([m, v]) => (
            <div key={m} className="flex justify-between text-xs font-dm">
              <span className="truncate">{m}</span><span className="text-muted-foreground">{fmtInt(v)}</span>
            </div>
          ))}
        </div>
      )}
    </Box>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2.5">
      <p className="text-[11px] uppercase tracking-wide font-dm text-muted-foreground">{label}</p>
      <p className="font-barlow font-bold text-lg">{value}</p>
    </div>
  );
}

export { Mini };
