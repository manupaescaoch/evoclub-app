# Diagnóstico para uso real nas unidades

Auditoria das três áreas (Aluno, Treinador, Admin) feita lendo o código e consultando o banco. Abaixo: o que está pronto, o que é fixo/falso, o que não persiste, riscos de acesso e integrações. No fim, a ordem de correção.

## Situação do banco hoje (dados reais consultados)

- 213 alunos cadastrados, mas **apenas 1 com login vinculado**.
- 1 colaborador cadastrado, 3 unidades, 1 plano, 1 ficha de treino, 16 agendamentos, 9 treinos executados.
- **0 contratos, 0 lançamentos financeiros, 0 inscrições de notificação no celular, 0 eventos de catraca.**

Ou seja: a estrutura existe, mas a operação ainda não foi carregada. Sem isso, várias telas aparecem vazias mesmo estando corretas.

## 1. O que já funciona ponta a ponta com dados reais

**Aluno:** login e vínculo com o cadastro, onboarding, grade com agendamento/lista de espera/cancelamento, treino do dia com registro de séries e cargas, volume semanal, saúde (peso, pressão, métricas), check-in diário, fotos de evolução, comunidade, ranking, conquistas, Club de vantagens, avaliações físicas, indicações, contratos e assinatura, Ciclo EVO, notificações.

**Treinador (/pro):** agenda do dia com presença, ficha rápida do aluno com histórico de treinos, escala e trocas de plantão, comunidade, desempenho, notificações internas.

**Admin:** Operação, Clientes, Grade, Ocorrências, CRM (leads, comissões, indicações, tarefas, renovações), Treinos, Avaliações, Financeiro (transações, contas a pagar, inadimplência, folha, ajustes, fechamentos, DRE, forecast, conciliação com importação OFX/CSV real), Equipe (escala, ponto, desempenho), Operacional, Gerencial, Club, Configurações. Assinatura digital de contrato e envio por WhatsApp funcionam de verdade.

## 2. Dados fixos / inventados que precisam virar reais

| Onde | O que está fixo |
|---|---|
| Dashboard admin — abas Vendas e Financeiro | Praticamente tudo inventado: gráfico de acessos por hora gerado aleatoriamente, metas e vendas por mês fixas, "mensalidade média R$ 555,74", visitantes 24 / conversões 17 / 70,83%, custo por cliente R$ 606, inadimplência calculada como 8% das vendas, gastos como 79% das vendas, gráfico de recebimentos/gastos com números aleatórios a cada abertura da tela |
| Dashboard admin — aba Clientes | Inadimplência estimada como 60% dos alunos suspensos |
| Grade (aluno e admin) | Quando a aula não tem vagas configuradas, assume **14 vagas** silenciosamente |
| Club (aluno) | Unidade fixa "EVO Boa Viagem" gravada no cartão de todos os alunos, seja qual for a unidade real |
| Ajuda (aluno) | Telefone da recepção fixo e claramente falso: 5581999999999; regras do FAQ escritas à mão |
| Treino (aluno) | Nome do professor sempre "Equipe EVO", nunca o professor real do plano |
| Renovação (aluno) | Lista Pix/Cartão/Dinheiro/Débito é só um rótulo, não cobra nada |
| Páginas "Novidades" e "Ajuda" do admin | Telas "em breve", sem conteúdo |

## 3. Telas sem persistência real

- Renovação do aluno: cria um pedido para a recepção, não gera cobrança.
- "Baixar PDF" do contrato: abre a impressão do navegador, não gera arquivo.
- Compartilhar comparação de fotos: envia link que expira em 1 hora.
- Abas Vendas/Financeiro do dashboard: números convincentes sem consulta real.
- Fora disso, não encontramos botões sem ação: exportações, WhatsApp e importação bancária são reais.

## 4. Acesso e segurança (o ponto mais grave)

- **Permissões abertas no banco:** várias tabelas permitem que *qualquer usuário logado — inclusive aluno —* leia e altere dados: aulas (`classes`), atividades da grade, biblioteca de exercícios, métodos e modelos de treino, serviços, formulários e rotinas operacionais, automações, check-ins e cancelamentos. Um aluno com conhecimento mínimo poderia apagar ou alterar a grade da academia.
- **Se a checagem de permissão falhar, o painel libera tudo:** por decisão anterior, um erro de rede na verificação de permissões faz o sistema tratar o usuário como acesso total no painel. Combinado com o item acima, é um caminho real de escalonamento.
- **/pro só confere se existe login**, não se a pessoa é colaborador: um aluno logado consegue abrir o app do treinador (as telas ficam vazias, mas não deveria entrar).
- **Vazamento entre unidades:** escala e trocas de plantão são visíveis para qualquer funcionário de qualquer unidade; a ficha resumida do aluno (`student_quick_summary`) entrega anamnese, dores e limitações de qualquer aluno de qualquer unidade para qualquer funcionário, inclusive perfil "viewer". Contratos, indicações, cupons, fornecedores e serviços no admin não filtram por unidade na tela.
- **Dados do aluno entre alunos:** as regras do banco protegem corretamente (treino, saúde, agendamentos, indicações). Curtidas da comunidade e posts sem unidade definida são visíveis entre unidades — impacto baixo.
- Check-in diário grava usando o **nome** do aluno como chave: dois alunos homônimos podem sobrescrever o registro um do outro.
- O verificador do banco aponta 244 avisos, quase todos sobre funções internas que podem ser chamadas por qualquer usuário logado (e 118 até sem login). Precisa de revisão.

## 5. Quebras e erros

- Nada trava o build; a verificação de tipos passa.
- Gráficos do dashboard se reembaralham a cada interação (dados aleatórios recalculados).
- Aba "Meus alunos" no /pro fica vazia sem aviso quando o login não tem colaborador vinculado.
- Rotas do menu admin todas existem; nenhum link quebrado.

## 6. Integrações pendentes — status real

| Integração | Status |
|---|---|
| Catraca Relsystem | Sistema pronto (dispositivos, eventos, função de comunicação). Falta o agente local instalado na academia e a documentação do fabricante. 0 eventos registrados. |
| Pagamento Pix/cartão | **Não existe.** Nenhum meio de cobrança conectado; baixa manual ou conciliação bancária. |
| Conciliação bancária | Funciona por importação manual de OFX/CSV. Sem sincronização automática com banco. |
| Notificações no celular | Implementado e ativo, mas **0 aparelhos inscritos** — ninguém ativou ainda. |
| WhatsApp | Só link direto (wa.me). Não há envio automático. |
| E-mail (SMTP) | Pendente, sem envio configurado. |
| Apple Health / Health Connect / smartwatch | Não existe; peso e métricas 100% manuais. |

## Prioridade para abrir com alunos pagantes esta semana

### Bloqueadores críticos
1. Fechar as permissões abertas do banco (grade, aulas, exercícios, serviços, formulários, automações, check-ins, cancelamentos) para que aluno não altere dados da operação.
2. Remover o "libera tudo" quando a checagem de permissão falha; passar a bloquear e avisar.
3. Exigir vínculo de colaborador para entrar no /pro.
4. Restringir a ficha de saúde do aluno (anamnese/dores/limitações) e a escala à unidade do funcionário.
5. Vincular os logins dos alunos: hoje só 1 de 213 tem acesso. Definir e executar o processo de convite/primeiro acesso em massa.
6. Cadastrar a operação real: unidades, capacidade de cada horário, planos e valores, colaboradores. Sem capacidade configurada a grade mente "14 vagas".
7. Corrigir a unidade fixa "EVO Boa Viagem" no Club e o telefone falso da recepção.

### Importante
8. Substituir as abas Vendas e Financeiro do dashboard por dados reais (ou esconder até estarem prontas) — hoje mostram números inventados a gestores.
9. Trocar a chave do check-in diário de nome para código do aluno.
10. Filtrar por unidade contratos, indicações, cupons, fornecedores e serviços no admin.
11. Mostrar o professor real no treino do aluno.
12. Definir o fluxo de cobrança da renovação enquanto não houver Pix/cartão: deixar claro na tela do aluno que a recepção finaliza o pagamento.
13. Ativar notificações no celular com alunos e equipe reais (hoje ninguém inscrito) e revisar os 244 avisos do banco.

### Nice-to-have
14. Gateway de pagamento Pix/cartão de verdade.
15. Catraca em campo (depende do agente local e da documentação).
16. Smartwatch / Apple Health / Health Connect.
17. PDF real do contrato, links de foto com validade maior, páginas "Novidades" e "Ajuda" do admin, e-mail SMTP.

## Observações técnicas

- Permissões abertas: políticas com `USING (true)` para o papel `authenticated` em `classes`, `grade_activities`, `exercise_library`, `training_methods`, `workout_templates`, `template_sessions`, `template_exercises`, `services`, `operational_forms`, `operational_form_submissions`, `operational_routines`, `automations`, `check_ins`, `cancellations`, `training_set_presets`, `app_settings`.
- Fail-open: `src/contexts/AccessContext.tsx:56-61` + `can()` retornando `true` quando `fallback`.
- Guarda do /pro: `src/components/pro/ProLayout.tsx:24-33` só checa sessão.
- Sem escopo de unidade: RPC `student_quick_summary` e políticas de `shift_schedules`/`shift_swap_requests` (apenas `is_staff`).
- Vagas fixas: `src/components/tabs/GradeTab.tsx:184` e `src/pages/admin/Grade.tsx:324` (`|| 14`).
- Unidade fixa: `src/components/tabs/ClubTab.tsx:8`. Telefone: `src/components/tabs/AjudaTab.tsx:16`. Professor: `src/hooks/useTrainingPlan.ts:259`.
- Dados falsos do dashboard: `src/pages/admin/Dashboard.tsx` linhas 46, 70-91, 451-557, 581-669.
- Check-in por nome: `src/components/tabs/DailyCheckinDialog.tsx:136` (`onConflict: "student_name,checkin_date"`).

Nada foi alterado nesta auditoria. Aprovando, começo pelos bloqueadores críticos na ordem acima.
