# Fase 2 — Registro de execução do treino pelo aluno

Objetivo: o aluno registra o que realmente executou (séries, carga, repetições) durante o treino, conclui a sessão, e esse histórico fica salvo por data e visível para o profissional no admin.

## 1. Banco de dados

Duas tabelas novas (nenhuma existente é alterada):

- `workout_logs` — uma linha por sessão de treino executada
  - aluno (`client_id`), plano, sessão prescrita, data do treino, início/fim, status (em andamento / concluído), observação do aluno
  - snapshot do nome da sessão, para o histórico sobreviver a uma represcrição
- `workout_log_sets` — uma linha por série executada
  - vínculo ao log, ao exercício e à série prescrita (`training_session_exercises` / `training_exercise_sets`)
  - snapshot do prescrito (nome do exercício, séries/reps/carga prescritos)
  - executado: séries feitas, reps feitas, carga usada, tipo de série, se foi concluída
  - índice de ordem para exibir na mesma ordem da prescrição

Regras de acesso: o aluno vê e grava apenas os próprios registros (via `current_client_id()`); a equipe (admin/coach/coordenador, via `can_manage_training`) pode ler todos.

Observação técnica importante: ao salvar um plano no editor, as sessões e séries são recriadas com novos IDs. Por isso o log guarda também um snapshot em texto do que foi prescrito, garantindo que o histórico continue legível mesmo depois de uma represcrição.

## 2. App do aluno (`TreinoTab`)

Sem mudar o visual atual da tela de exercícios:

- Ao apertar INICIAR, cria o registro da sessão (status em andamento) com a data de hoje (horário de Brasília).
- Cada série passa a ter, além do prescrito, os campos do executado: séries feitas, reps feitas e carga. O modal de carga atual é reaproveitado e ganha os campos de séries/reps executadas, já pré-preenchidos com o valor prescrito (o aluno só ajusta se fez diferente).
- Marcar o exercício como feito grava as séries daquele exercício.
- O botão FINALIZAR TREINO passa a: salvar tudo, fechar o log (status concluído, hora de fim) e só então mostrar o modal de XP já existente.
- Se o aluno reabrir o mesmo dia e já existir log em andamento, os valores executados são recarregados.
- Na lista de dias, dias já concluídos aparecem com o estado "done" real (hoje deixa de ser fixo).

## 3. Admin — visão de adesão (sem alterar layout)

Novo componente compartilhado de histórico de execução, acrescentado às telas existentes:

- **Prescrever (editor do aluno):** bloco recolhível ao final da página, listando as últimas sessões executadas do aluno com data, sessão, % de conclusão e, ao expandir, prescrito vs executado por exercício/série (carga e reps, com destaque quando diferente do prescrito).
- **Fichas de Treino:** mesma visão de adesão em bloco adicional, com resumo curto (treinos executados nos últimos 30 dias, última execução).
- Nenhuma alteração nos campos, botões ou layout já existentes dessas telas — apenas seções novas abaixo do conteúdo atual.

## 4. Fora de escopo (mantido intacto)

Grade, Club, Comunidade, Ranking, Perfil, login/onboarding e o fluxo de prescrição atual permanecem exatamente como estão. Gráficos de evolução de carga por exercício não entram nesta fase — a modelagem já deixa os dados prontos para isso.