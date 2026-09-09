import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtInt, fmtMoney0, fmtPct1, isPaid, safeDiv } from "@/lib/comercial";
import type { AdRow, Enrollment, Interacao, Lead, ClientRow } from "@/hooks/useComercial";

const BAR = ["bg-primary", "bg-primary/80", "bg-primary/60", "bg-primary/45", "bg-primary/30", "bg-primary/20"];

function Box({ title, children, sub }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 overflow-hidden">
      <h3 className="font-barlow font-bold uppercase">{title}</h3>
      {sub && <p className="text-xs font-dm text-muted-foreground mb-2">{sub}</p>}
      <div className="mt-2 -mx-1 overflow-x-auto">{children}</div>
    </div>
  );
}

export function OrigensTable({
  leads, matriculaClients, onOpen,
}: {
  leads: Lead[];
  matriculaClients: Set<number>;
  onOpen: (origem: string) => void;
}) {
  const rows = useMemo(() => {
    const map = new Map<string, { leads: number; matriculas: number }>();
    leads.forEach((l) => {
      const key = l.origem || "Não informada";
      const cur = map.get(key) || { leads: 0, matriculas: 0 };
      cur.leads += 1;
      if (l.matricula_client_id && matriculaClients.has(l.matricula_client_id)) cur.matriculas += 1;
      map.set(key, cur);
    });
    const total = leads.length;
    return [...map.entries()]
      .map(([origem, v]) => ({ origem, ...v, share: safeDiv(v.leads, total) * 100, conv: safeDiv(v.matriculas, v.leads) * 100 }))
      .sort((a, b) => b.leads - a.leads);
  }, [leads, matriculaClients]);

  return (
    <Box title="Origens dos leads" sub="Participação e conversão em matrícula por canal">
      {rows.length === 0 ? (
        <p className="text-sm font-dm text-muted-foreground">Sem leads no período.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <button key={r.origem} type="button" onClick={() => onOpen(r.origem)}
              className="w-full text-left rounded-lg border p-2.5 hover:bg-accent/40 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-dm font-medium truncate">{r.origem}</span>
                <span className="font-barlow font-bold text-sm shrink-0">{fmtInt(r.leads)} leads</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${BAR[i % BAR.length]}`} style={{ width: `${r.share}%` }} />
              </div>
              <p className="text-[11px] font-dm text-muted-foreground mt-1">
                {fmtPct1(r.share)} do total · {fmtInt(r.matriculas)} matrículas · conversão {fmtPct1(r.conv)}
              </p>
            </button>
          ))}
        </div>
      )}
    </Box>
  );
}

export function CampanhasTable({
  ads, leads, enrollments, clients,
}: {
  ads: AdRow[];
  leads: Lead[];
  enrollments: Enrollment[];
  clients: ClientRow[];
}) {
  const rows = useMemo(() => {
    const map = new Map<string, any>();
    ads.forEach((a) => {
      const key = a.campaign || "(sem campanha)";
      const r = map.get(key) || { campanha: key, plataforma: a.platform, spend: 0, impressions: 0, clicks: 0, conversas: 0, leads: 0, matriculas: 0, receita: 0 };
      r.spend += Number(a.spend) || 0;
      r.impressions += a.impressions || 0;
      r.clicks += a.clicks || 0;
      r.conversas += a.conversations || 0;
      map.set(key, r);
    });
    leads.forEach((l) => {
      const key = l.campanha || (isPaid(l.plataforma) || isPaid(l.origem) ? "(sem campanha)" : null);
      if (!key) return;
      const r = map.get(key) || { campanha: key, plataforma: l.plataforma || "—", spend: 0, impressions: 0, clicks: 0, conversas: 0, leads: 0, matriculas: 0, receita: 0 };
      r.leads += 1;
      if (l.matricula_client_id) {
        const e = enrollments.find((x) => x.client_id === l.matricula_client_id);
        if (e) {
          r.matriculas += 1;
          r.receita += Number(e.first_monthly_value) || Number(clients.find((c) => c.id === e.client_id)?.plan_value) || 0;
        }
      }
      map.set(key, r);
    });
    return [...map.values()]
      .map((r) => ({
        ...r,
        cpl: safeDiv(r.spend, r.leads),
        cac: safeDiv(r.spend, r.matriculas),
        roas: safeDiv(r.receita, r.spend),
      }))
      .sort((a, b) => b.spend - a.spend || b.leads - a.leads);
  }, [ads, leads, enrollments, clients]);

  return (
    <Box title="Campanhas" sub="Investimento, leads gerados, matrículas e retorno">
      {rows.length === 0 ? (
        <p className="text-sm font-dm text-muted-foreground">
          Sem campanhas no período. Importe as métricas de anúncios ou registre a campanha nos leads.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-dm">Campanha</TableHead>
              <TableHead className="font-dm text-right">Investido</TableHead>
              <TableHead className="font-dm text-right">Leads</TableHead>
              <TableHead className="font-dm text-right">CPL</TableHead>
              <TableHead className="font-dm text-right">Matrículas</TableHead>
              <TableHead className="font-dm text-right">CAC</TableHead>
              <TableHead className="font-dm text-right">ROAS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.campanha}>
                <TableCell className="font-dm">
                  <span className="block truncate max-w-[220px]">{r.campanha}</span>
                  <span className="text-[11px] text-muted-foreground">{r.plataforma}</span>
                </TableCell>
                <TableCell className="text-right font-dm">{r.spend ? fmtMoney0(r.spend) : "—"}</TableCell>
                <TableCell className="text-right font-dm">{fmtInt(r.leads)}</TableCell>
                <TableCell className="text-right font-dm">{r.leads && r.spend ? fmtMoney0(r.cpl) : "—"}</TableCell>
                <TableCell className="text-right font-dm">{fmtInt(r.matriculas)}</TableCell>
                <TableCell className="text-right font-dm">{r.matriculas && r.spend ? fmtMoney0(r.cac) : "—"}</TableCell>
                <TableCell className="text-right font-dm">{r.spend ? `${r.roas.toFixed(2).replace(".", ",")}x` : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}

export function EquipeTable({
  leads, interacoes, collabName,
}: {
  leads: Lead[];
  interacoes: Interacao[];
  collabName: (id?: string | null) => string | null;
}) {
  const rows = useMemo(() => {
    const map = new Map<string, { nome: string; leads: number; agendadas: number; realizadas: number; matriculas: number; receita: number }>();
    const get = (nome: string) => {
      const r = map.get(nome) || { nome, leads: 0, agendadas: 0, realizadas: 0, matriculas: 0, receita: 0 };
      map.set(nome, r);
      return r;
    };
    leads.forEach((l) => {
      const nome = collabName(l.responsavel_id) || l.atendido_por || "Sem responsável";
      get(nome).leads += 1;
    });
    interacoes.forEach((i) => {
      const nome = collabName(i.responsavel_presencial) || collabName(i.quem_agendou) || i.atendido_por || "Sem responsável";
      const r = get(nome);
      if (i.agendou_experimental) r.agendadas += 1;
      if (i.compareceu) r.realizadas += 1;
      if (i.fechou_matricula) { r.matriculas += 1; r.receita += Number(i.valor_plano) || 0; }
    });
    return [...map.values()]
      .map((r) => ({ ...r, conv: safeDiv(r.matriculas, r.leads) * 100, ticket: safeDiv(r.receita, r.matriculas) }))
      .sort((a, b) => b.matriculas - a.matriculas || b.leads - a.leads);
  }, [leads, interacoes, collabName]);

  return (
    <Box title="Desempenho da equipe" sub="Leads atendidos, experimentais e fechamentos por pessoa">
      {rows.length === 0 ? (
        <p className="text-sm font-dm text-muted-foreground">Sem atendimentos registrados no período.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-dm">Pessoa</TableHead>
              <TableHead className="font-dm text-right">Leads</TableHead>
              <TableHead className="font-dm text-right">Agendadas</TableHead>
              <TableHead className="font-dm text-right">Realizadas</TableHead>
              <TableHead className="font-dm text-right">Matrículas</TableHead>
              <TableHead className="font-dm text-right">Conversão</TableHead>
              <TableHead className="font-dm text-right">Ticket</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.nome}>
                <TableCell className="font-dm">{r.nome}</TableCell>
                <TableCell className="text-right font-dm">{fmtInt(r.leads)}</TableCell>
                <TableCell className="text-right font-dm">{fmtInt(r.agendadas)}</TableCell>
                <TableCell className="text-right font-dm">{fmtInt(r.realizadas)}</TableCell>
                <TableCell className="text-right font-dm">{fmtInt(r.matriculas)}</TableCell>
                <TableCell className="text-right font-dm">{r.leads ? fmtPct1(r.conv) : "—"}</TableCell>
                <TableCell className="text-right font-dm">{r.matriculas ? fmtMoney0(r.ticket) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}

export { Box };
