# Execução do treino no app do aluno — nova experiência

Melhorar a tela de execução do treino (aba TREINO do app do aluno) mantendo o layout e a identidade visual atuais: mesmo azul, mesmas fontes, mesmos cartões e o menu inferior intacto.

## O que muda para o aluno

### 1. Iniciar treino
- O cronômetro não começa sozinho. A tela abre em modo visualização, com o botão **Iniciar treino**.
- Ao iniciar: grava data e hora reais, status vira "Em andamento" e o botão dá lugar a um painel fixo compacto no topo com relógio, tempo total no formato `00:00:00`, pausar/continuar e **Finalizar treino**.
- O tempo é calculado a partir do horário real de início (guardado no banco e também no aparelho), então continua certo depois de trocar de aba, bloquear o celular, fechar o app ou ficar sem internet. Pausas são somadas e descontadas.
- Se já existir um treino em andamento, a sessão abre com **Continuar treino** em vez de iniciar outro — nunca dois treinos ativos ao mesmo tempo.

### 2. Cronômetro de intervalo
- O intervalo prescrito (ex.: 60s) passa a ser um cronômetro regressivo de verdade, em uma barra fixa na parte de baixo, acima do menu.
- Começa sozinho ao concluir uma série, com botões **Pausar**, **+15s** e **Pular**.
- Ao chegar a zero: vibração e um bipe curto (quando o aparelho permitir).
- Roda junto com o cronômetro geral, sem substituí-lo.

### 3. Registro por série
- Cada exercício mostra suas séries separadas: `Série 1 · 8–12 reps · [30] kg · ✓`.
- Campo de carga em kg (teclado numérico), campo opcional de repetições realizadas e botão de check.
- Ao marcar: salva carga, repetições e o horário da conclusão na hora, destaca a série em verde e inicia o intervalo. Dá para desmarcar se foi sem querer.

### 4. Carga mais rápida
- Sem o modal atual: a carga é digitada direto na linha da série, com "kg" ao lado, aceitando decimais, salva ao confirmar ou ao sair do campo.
- Cada série pode ter carga diferente; o campo já vem preenchido com a última carga usada naquele exercício, com a linha discreta "Última carga: 30 kg".
- Em exercícios de um lado só, um toque alterna entre "cada lado" e "total".
- Exercícios de cardio mantêm o registro atual (tempo, distância, velocidade, inclinação, calorias).

### 5. Conclusão do exercício
- Quando todas as séries estão marcadas, o exercício ganha check verde e recolhe, mostrando só nome, séries concluídas e maior carga registrada. Um toque expande de novo para editar.
- Também é possível marcar o exercício inteiro de uma vez; se houver séries pendentes, pede confirmação.

### 6. Progresso
- Abaixo do cronômetro: barra de progresso e "4 de 8 exercícios concluídos • 50%".

### 7. Finalização
- **Finalizar treino** abre uma confirmação com duração total, exercícios concluídos, séries realizadas e aviso dos exercícios pendentes (sem impedir finalizar).
- Depois de confirmar, mantém o questionário atual (esforço, estrelas, dor) e grava hora de término, duração total e todo o registro; status vira "Concluído" e aparece o resumo final com o Score ganho.
- O treino concluído fica protegido, com a opção **Editar registro** para voltar e corrigir.

### 8. Histórico e referência
- Fica salvo: treino, data, início, término, duração, exercícios, séries, cargas, repetições, intervalos usados e o que não foi realizado.
- Na próxima vez que o mesmo exercício aparecer, a carga anterior vem como referência.

### 9. Segurança dos dados
- Cada ação salva na hora; se a internet cair, fica guardada no aparelho e sincroniza sozinha quando voltar.
- A prescrição do treinador nunca é alterada — o aluno só registra o que fez.

## Detalhes técnicos

- **Banco (migração):** em `workout_log_sets` adicionar `set_index` (número da série dentro do grupo prescrito), `completed_at timestamptz`, `rest_seconds integer` e `side_mode text`; em `workout_logs` adicionar `paused_ms integer default 0` e `duration_seconds integer`. Sem mudar nada da prescrição (`training_exercise_sets`).
- **Novo hook `src/hooks/useWorkoutTimer.ts`:** cronômetro do treino baseado em `started_at` + pausas, persistido em `localStorage` (chave por `logId`) e recalculado no `visibilitychange`; expõe `elapsed`, `paused`, `pause/resume`.
- **Nova fila offline `src/lib/workoutQueue.ts`:** grava cada alteração de série no `localStorage` e faz upsert em `workout_log_sets` (chave `workout_log_id + session_exercise_id + order_index + set_index`); reenvia ao voltar online e antes de finalizar.
- **`src/components/tabs/TreinoTab.tsx`:** expandir cada grupo prescrito em séries individuais (`prescribedSets` linhas); substituir `LoadModal` por entrada inline (mantendo o modal apenas para cardio); trocar `RestTimer` modal por barra fixa inferior com pausar/+15s/pular, vibração (`navigator.vibrate`) e bipe (`AudioContext`); painel fixo do cronômetro + barra de progresso por exercícios; cartão do exercício recolhível quando concluído; diálogo de confirmação da finalização com resumo; botão "Continuar treino" quando há registro em andamento.
- **Compatibilidade:** `useWorkoutHistory` e as telas do treinador/admin continuam lendo os mesmos campos; `set_index` apenas detalha o registro.
- **Validação:** `tsgo --noEmit` e teste no navegador em 390×844 com a sessão do aluno (iniciar, marcar séries, intervalo, sair e voltar na página, finalizar).
