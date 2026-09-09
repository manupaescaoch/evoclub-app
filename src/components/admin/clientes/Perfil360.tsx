import { useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { OverviewRow } from "@/hooks/useClient360";
import {
  ResumoTab, DadosTab, FrequenciaTab, HistoricoTab, TreinosTab, SaudeTab,
  AvaliacoesTab, FinanceiroTab, ContratosTab, RenovacaoTab, IndicacoesTab, OcorrenciasTab,
  AnamneseTab, fmtDate,
} from "./Perfil360Tabs";

const TABS = [
  { key: "resumo", label: "Resumo" },
  { key: "dados", label: "Dados" },
  { key: "frequencia", label: "Frequência" },
  { key: "anamnese", label: "Anamnese" },
  { key: "treinos", label: "Treinos" },
  { key: "saude", label: "Saúde" },
  { key: "avaliacoes", label: "Avaliações" },
  { key: "financeiro", label: "Financeiro" },
  { key: "contratos", label: "Contratos" },
  { key: "renovacao", label: "Renovação" },
  { key: "indicacoes", label: "Indicações" },
  { key: "ocorrencias", label: "Ocorrências" },
  { key: "historico", label: "Histórico" },
];

export default function Perfil360({ client, onClose, onSaved, variant = "overlay" }: {
  client: OverviewRow; onClose: () => void; onSaved: () => void; variant?: "overlay" | "page";
}) {
  const [tab, setTab] = useState("resumo");
  const initials = client.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const isPage = variant === "page";

  return (
    <div className={isPage ? "" : "fixed inset-0 z-50 flex justify-end"}>
      {!isPage && <div className="absolute inset-0 bg-black/25" onClick={onClose} />}
      <div className={isPage
        ? "relative w-full bg-background"
        : "relative w-full md:w-[860px] bg-background h-full max-h-[100dvh] shadow-xl overflow-y-auto overflow-x-hidden momentum-scroll animate-in slide-in-from-right"}>
        <div className="sticky top-0 z-10 bg-card border-b border-border safe-top">
          <div className="flex items-start justify-between p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground overflow-hidden">
                {client.avatar_url ? <img src={client.avatar_url} alt={client.name} className="w-full h-full object-cover" /> : initials}
              </div>
              <div className="min-w-0">
                <h2 className="font-barlow font-bold text-lg md:text-xl text-foreground leading-tight uppercase break-words">{client.name}</h2>
                <p className="text-[11px] font-dm text-muted-foreground">
                  #{client.id} · {client.plan || "sem plano"} · vence {fmtDate(client.contract_end)}
                </p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Fechar" className="shrink-0 h-11 w-11 -mr-2 -mt-2 flex items-center justify-center text-muted-foreground hover:text-foreground"><X size={22} /></button>
          </div>
          <div className="flex gap-4 px-4 overflow-x-auto no-scrollbar momentum-scroll">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`pb-2 min-h-11 shrink-0 text-xs font-dm font-medium whitespace-nowrap transition-colors ${
                  tab === t.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 pb-24 safe-bottom">
          {tab === "resumo" && <ResumoTab c={client} onGoTab={setTab} />}
          {tab === "dados" && <DadosTab c={client} onSaved={onSaved} />}
          {tab === "frequencia" && <FrequenciaTab c={client} />}
          {tab === "anamnese" && <AnamneseTab c={client} />}
          {tab === "treinos" && <TreinosTab c={client} />}
          {tab === "saude" && <SaudeTab c={client} />}
          {tab === "avaliacoes" && <AvaliacoesTab c={client} />}
          {tab === "financeiro" && <FinanceiroTab c={client} />}
          {tab === "contratos" && <ContratosTab c={client} />}
          {tab === "renovacao" && <RenovacaoTab c={client} />}
          {tab === "indicacoes" && <IndicacoesTab c={client} />}
          {tab === "ocorrencias" && <OcorrenciasTab c={client} />}
          {tab === "historico" && <HistoricoTab c={client} />}
        </div>
      </div>
    </div>
  );
}
