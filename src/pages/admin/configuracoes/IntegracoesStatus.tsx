import { CheckCircle2, Clock, Wrench, XCircle } from "lucide-react";

type St = "active" | "manual" | "pending" | "off";

const BADGE: Record<St, { label: string; cls: string; icon: any }> = {
  active: { label: "Ativa", cls: "bg-green-100 text-green-700", icon: CheckCircle2 },
  manual: { label: "Manual", cls: "bg-amber-100 text-amber-700", icon: Wrench },
  pending: { label: "Pendente", cls: "bg-gray-100 text-gray-600", icon: Clock },
  off: { label: "Não configurada", cls: "bg-red-100 text-red-700", icon: XCircle },
};

const ITEMS: { name: string; status: St; where: string; note: string }[] = [
  { name: "WhatsApp (wa.me / Z-API)", status: "active", where: "CRM, Renovações, Cobrança, Formulários", note: "Envio a partir do número principal configurado abaixo." },
  { name: "Push (Web Push / PWA)", status: "active", where: "App do aluno, lembretes de aula e régua de renovação", note: "Funções de envio já publicadas no backend." },
  { name: "Assinatura digital de contratos", status: "active", where: "Gerencial › Contratos e link público de assinatura", note: "Assinatura nativa com hash e evidências; sem provedor externo." },
  { name: "Pagamentos", status: "manual", where: "Financeiro › Recebimentos e Contas a Receber", note: "Baixa manual ou por conciliação bancária; gateway não conectado." },
  { name: "Open Finance / Extrato bancário", status: "manual", where: "Financeiro › Conciliação Bancária", note: "Estrutura pronta; importação de OFX/CSV manual, sem provedor automático." },
  { name: "E-mail (SMTP)", status: "pending", where: "Notificações e recibos", note: "Preencha o servidor abaixo e cadastre a senha nos segredos do backend." },
  { name: "Bioimpedância", status: "manual", where: "Avaliações › Realizar avaliação", note: "Dados digitados manualmente; sem leitura direta da balança." },
  { name: "Apple Health / Health Connect", status: "pending", where: "App do aluno › Saúde e Evolução", note: "Peso e métricas ainda registrados manualmente pelo aluno." },
  { name: "Catraca / controle de acesso", status: "pending", where: "Configurações › Catraca e entrada da unidade", note: "Lado do sistema pronto: cadastro da catraca, chave do agente e registro de acessos. Falta instalar o agente local na academia." },
];

export default function IntegracoesStatus() {
  return (
    <div className="bg-card rounded-xl card-shadow p-5 space-y-3">
      <div>
        <p className="font-barlow font-bold text-base">Painel de integrações</p>
        <p className="text-xs text-muted-foreground font-dm">Visão do que está ativo, manual ou pendente e onde cada integração pluga no sistema.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ITEMS.map(i => {
          const b = BADGE[i.status];
          return (
            <div key={i.name} className="rounded-lg border border-border p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-dm font-semibold">{i.name}</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-dm font-medium shrink-0 ${b.cls}`}>
                  <b.icon size={11} /> {b.label}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-dm">Onde entra: {i.where}</p>
              <p className="text-[11px] text-muted-foreground font-dm">{i.note}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
