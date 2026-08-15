# Unificar Dashboard do CRM com o Dashboard Comercial

Hoje existem duas páginas separadas no menu CRM: **Dashboard** (`/admin/crm`, indicadores do funil + fila de ação de alunos) e **Dashboard Comercial** (`/admin/leads/dashboard`, meta vs realizado, réguas de follow up, experimentais de hoje e rankings). A proposta é ter uma única página, com o comercial em primeiro lugar.

## Resultado final

Uma página única em `/admin/crm` chamada **CRM — Dashboard Comercial**, com um seletor de mês/período no topo e as seções nesta ordem:

1. **Metas do mês** — matrículas, experimentais e alunos ativos: realizado, meta, projeção de fechamento e edição das metas (quem tem permissão de edição no CRM).
2. **Indicadores comerciais** — total de leads, experimentais agendadas, compareceram, matrículas, conversão geral, ticket médio.
3. **Funil comercial e taxas** — lead vira experimental, comparecimento, experimental vira matrícula, fechamento no dia da experimental.
4. **Diagnóstico da semana e dica estratégica** — leitura automática de onde está a maior perda do funil.
5. **Operação do dia** — experimentais de hoje (lista com hora, origem, taxa pendente, status de presença e WhatsApp direto), leads de hoje, matrículas de hoje, taxas pendentes, em negociação, agendamentos de amanhã.
6. **Réguas de follow up** — as 5 filas (sem contato 2+ dias, confirmar experimental hoje/amanhã, no-show, pós-experimental sem fechamento, negociação parada 3+ dias) com tabela e mensagem pronta de WhatsApp.
7. **Atividades e pendências do dia** — experimentais do dia/semana, confirmações, anamneses respondidas/pendentes, follow-ups enviados/agendados, experimentais sem status comercial.
8. **Rankings** — leads e conversão por origem e por quem cadastrou.
9. **Fila de ação de alunos (retenção)** — a fila atual de pendências por aluno (inadimplência, renovação, frequência, treino, avaliação, ocorrências), agora no fim da página, dentro de um bloco recolhível para não competir com o comercial.

No menu lateral o item **Dashboard Comercial** deixa de existir e o item **Dashboard** passa a levar para essa página unificada. Quem tiver o link antigo (`/admin/leads/dashboard`) é redirecionado automaticamente.

## Detalhes técnicos

- Nova estrutura: `src/pages/admin/CRM.tsx` passa a ser o container único; a lógica comercial vinda de `src/pages/admin/LeadsDashboard.tsx` (hook `useLeads`, metas, réguas `RULES`, rankings, experimentais de hoje) é movida para componentes em `src/components/admin/crm/`: `MetasPanel.tsx`, `FollowUpReguas.tsx`, `ExperimentaisHoje.tsx`, `RankingsComerciais.tsx`, mais o já existente `CrmDashboard.tsx` (indicadores/funil/diagnóstico/atividades) e `FilaAcaoAlunos.tsx` extraído da fila atual.
- Fonte de dados: mantida como está — `leads`, `interacoes` e `metas` (unidade + mês, upsert em `unidade_id,mes_referencia`) para o comercial; `client_overview` via `useClient360` para a fila de retenção. Sem mudança de banco.
- Seletor de período único no topo (mês atual/semana/hoje/todos os tempos) governa os blocos comerciais; as metas continuam por mês de referência.
- `src/pages/admin/LeadsDashboard.tsx` é removido e a rota `leads/dashboard` em `src/App.tsx` passa a ser um `Navigate` para `/admin/crm`.
- `src/components/admin/AdminLayout.tsx`: remover o item "Dashboard Comercial" do submenu CRM, mantendo Dashboard, Leads, Comissões, Indicações, Tarefas e Renovações.
- Unidade, permissões (`ModuleGuard` + `can("crm", "edit")`) e fuso de Brasília seguem o padrão atual.
