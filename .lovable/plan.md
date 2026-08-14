# Auditoria FASE 2 — Módulo da Academia (Admin)

Leitura feita em `/admin` (25 páginas, ~11k linhas) + schema do banco (86 tabelas). Nada foi alterado nesta rodada.

## 1. Já implementado (funcional hoje)

| Bloco da spec | Onde está | Situação |
|---|---|---|
| 16. Financeiro (Dashboard, Fluxo, Recebimentos, Contas a Pagar, Transações, Folha, DRE, Relatórios, Config.) | `admin/financeiro/*` | Completo com filtro por unidade (`UnitContext`) |
| 8. Treinos — Prescrever / Fichas / Biblioteca / Métodos / Dashboard | `Treinos*`, `PrescreverEditor` (1055 linhas), presets, séries especiais | Completo |
| Execução do treino (aderência, cargas, volume) | `treinos/ExecucaoAluno`, `workout_logs`, `workout_log_sets` | Completo |
| 19. Comunidade Admin (feed, moderação, ocultar, bloqueio 24h, institucional) | `admin/Comunidade.tsx` + trigger de 3 denúncias | Completo |
| 18. EVO Club (parceiros, validação por QR, resgates) | `club/ValidarResgate`, `partners`, `club_redemptions` | Completo (falta portal do parceiro) |
| 15. Contratos (emissão, assinatura, PDF, status) | `gerencial/Contratos`, `client_contracts` | Completo |
| Gerencial (Atividades na Grade, Colaboradores, Fornecedores, Serviços, Cupons, Crescimento) | `gerencial/*` | Completo |
| CRM: Comissões, Indicações, Tarefas (Kanban+WhatsApp), Escala fim de semana | `crm/*` | Completo |
| 12. Operacional (rotinas, formulários, grade semanal, templates WhatsApp) | `crm/Operacional.tsx` | Completo |
| 20. Auditoria (log de ações) | `audit_logs`, `lib/audit.ts`, `AuditLogTab` | Base pronta |
| 21. Configurações + push manual | `Configuracoes.tsx`, `NotificacoesPanel` | Base pronta |

## 2. Parcial (existe, mas incompleto)

**1. Dashboard Principal** — existe (713 linhas) com cards de clientes/churn/acessos. Falta: filtro de unidade e período (Hoje/Semana/Mês/Custom), blocos Operação de Hoje, CRM, Treinos, Equipe, Renovação e Ocorrências, e cards clicáveis abrindo o módulo já filtrado. Vários números ainda são estimativas fixas ("+5%", 8%).

**2. CRM** — hoje é dashboard + 5 submenus. Falta: página única "Pendências de Hoje" como fila de ação, busca unificada, os ~18 filtros da spec, tabela padrão (Pessoa/Status/Próxima ação/Responsável/Pendência/Data limite), painel 360º lateral, filtros salvos e ações em lote.

**3. Clientes / Perfil 360º** — existe lista + drawer, mas o drawer é apenas cadastro de novo cliente. Falta todo o Perfil 360º: 12 abas, timeline única, bloqueio de campos sensíveis e log antes/depois.

**5. Grade Admin** — existe visão diária/semanal, criação em massa, check-in com Superior/Inferior. Falta: capacidade temporária/bloqueio de horário por coordenador, estados Presente/Faltou/Cancelou geridos pela equipe, selo EXPERIMENTAL, resumo rápido do aluno (5.1), prontidão do dia e distribuição por professor com limite de 2 alunos (5.2).

**11. Equipe** — só `collaborators` (cadastro) e `staff_schedules` (fim de semana). Falta: Ponto e Jornada com foto/geolocalização/raio, Desempenho com score 0–100 e ranking, fluxo de troca de escala com aceite e aprovação, histórico.

**13. Ocorrências** — só existe dor/desconforto (`pain_reports`) dentro de Treinos. Falta a página única com os 9 tipos, status, regras de quem resolve e entrada na timeline.

**14. Renovações** — existe `renewal_requests` + benefícios. Falta a régua de 9 status, painel da Recepção, reatribuição e taxa de renovação por recepcionista.

**20. Permissões** — existe `permission_profiles` e a tela, mas **nada é aplicado**: o AdminLayout não checa cargo, não há níveis por módulo, escopo por unidade nem flag LIBERAÇÃO FINANCEIRA.

**9/10. Avaliações e Saúde no Admin** — tabelas existem (`physical_assessments`, `assessment_bioimpedance`, `assessment_measures`, `health_*`) e o aluno já vê. Falta todo o lado admin: nenhuma página, nenhum menu.

## 3. Não existe

- Menu **Avaliações** (Dashboard, Agenda, Realizar Avaliação, Histórico)
- **Saúde e Evolução no Admin** (espelho de indicadores, gráficos, alertas)
- Menu **Equipe** e menus **Operacional** / **Ocorrências** de primeiro nível (hoje escondidos no CRM)
- **Ponto e Jornada** (nenhuma tabela)
- **Experimentais e conversão** (6): vínculos Professor/Cadastrador/Vendedor e regras R$20 / 3% / 2%
- **Solicitações de troca de treino** (8)
- **Encerramento e Passagem de Turno** (12.1/12.2) e **NPS/Anamnese via WhatsApp rastreável** (12.3)
- **Frequência do aluno** (4): streak, meta x realizado, gatilho automático de +3 dias no CRM
- **Financeiro avançado**: Inadimplência, Descontos/Estornos, Fechamentos, Conciliação Bancária (16.1), Forecast (16.3), drill-down e rateio no DRE
- **17. Catraca / Controle de Acesso** e integrações externas (Open Finance, assinatura digital, bioimpedância, smartwatch)

## 4. Blocos de execução propostos (ordem de prioridade operacional)

**Bloco 1 — Base transversal** (destrava todo o resto)
Reorganizar o menu para o menu-base de 14 itens (Equipe, Operacional, Ocorrências e Avaliações saem do CRM para o primeiro nível), aplicar `UnitContext` + filtro de período em todo o admin, e implementar permissões de verdade: níveis por módulo, escopo por unidade, flag LIBERAÇÃO FINANCEIRA e auditoria antes/depois nas ações sensíveis.

**Bloco 2 — Perfil 360º e Frequência (3 e 4)**
Drawer/página do aluno com as 12 abas, timeline única, campos sensíveis bloqueados com log, e cálculo de frequência/streak/meta que alimenta o CRM.

**Bloco 3 — Grade operacional (5, 5.1, 5.2 e 6)**
Estados Presente/Faltou/Cancelou, capacidade e bloqueio temporário, resumo rápido + prontidão do dia, selo Experimental, distribuição por professor (máx. 2, abre 20 min antes, trava ao iniciar) e vínculos de conversão do experimental.

**Bloco 4 — CRM fila de ação (2) + Ocorrências (13)**
CRM como página única de Pendências de Hoje com filtros, ações em lote e painel 360º; Ocorrências como módulo próprio com os 9 tipos e regras de resolução.

**Bloco 5 — Avaliações e Saúde no Admin (9 e 10)**
Menu Avaliações completo (Dashboard, Agenda, Realizar, Histórico) com medidas e bioimpedância, correções auditadas, fotos privadas; espelho de Saúde e Evolução com gráficos e alertas.

**Bloco 6 — Treinos: gestão de pendências (8)**
Solicitações de troca, "assumir" treino vencido com responsável atual, publicar arquivando anterior + notificação, e prescrito x realizado nas Fichas.

**Bloco 7 — Equipe (11, 11.1, 11.2)**
Ponto e Jornada com foto/geo/raio e solicitação de ajuste, Desempenho com score e ranking, escala com troca entre pessoas e publicação notificada.

**Bloco 8 — Operacional avançado (12.1, 12.2, 12.3)**
Encerramento de turno por setor, passagem de turno com confirmação de leitura, NPS classificado e anamnese por link rastreável.

**Bloco 9 — Renovações e Contratos (14 e 15)**
Régua completa de 9 status com painel da Recepção, reatribuição, taxa de renovação; envio de contrato por link WhatsApp com status Enviado/Visualizado/Assinado/Expirado.

**Bloco 10 — Financeiro avançado (16.2, 16.3 e faltantes)**
Inadimplência, Descontos/Estornos, Fechamentos, DRE com drill-down/rateio/centro de custo e Forecast com cenários.

**Bloco 11 — Dashboard Principal final (1)**
Só depois dos módulos existirem: montar os 8 blocos de indicadores reais com cards clicáveis que abrem o módulo já filtrado.

**Bloco 12 — Integrações externas (17 e 21)** — por último
Catraca / Controle de Acesso com regras de tolerância, liberação manual auditada, encaixe e log em tempo real; depois Conciliação Open Finance, assinatura digital, bioimpedância e smartwatch.

## Observações técnicas

- Tabelas novas previstas: `staff_time_entries`, `occurrences`, `assessment_schedule` (ou reuso de `physical_assessments.status`), `plan_change_requests`, `shift_closures`, `nps_responses`, `access_events`, `experimental_conversions`, `permission_overrides`, `bank_transactions`.
- `permission_profiles.modules` (jsonb) já existe e serve de base para os níveis por módulo; falta o guard no client e RLS/`has_role` no banco.
- `units` só tem `name`/`address`: precisa de capacidade padrão, raio do ponto, horários e dados fiscais (bloco 1).
- Toda tela nova reaproveita `PageShell`, `StatCard` e os padrões visuais atuais — sem redesenho.
