# Área do Aluno EVO — Ajustes e Expansão (por fases)

O escopo enviado cobre ~42 blocos funcionais. Entregar tudo de uma vez seria instável, então proponho fases incrementais, cada uma testável, **sem tocar na identidade visual atual** (fundo claro, azul EVO, cards brancos, Barlow/DM Sans, nav inferior com 6 abas).

Premissas assumidas (corrija se preciso):
- Integrações físicas (catraca Relsystem, bioimpedância, smartwatch/HealthKit/Health Connect) não rodam dentro de um app web puro. Vamos preparar **schema + telas + endpoints/webhook**; a ponte local do equipamento fica como etapa separada.
- Pagamentos (Pix/cartão) precisam de provedor: entra numa fase própria, depois de decidirmos o meio.
- Fotos de evolução e contratos usam armazenamento privado do backend.

## Fase 1 — Home, Check-in, Notificações (base)
- Home: header com 3 ícones (Saúde & Evolução, sino com badge de não lidas, avatar). Bloco XP do dia passa a usar regras de XP cadastradas, sem meta fixa de 100.
- Check-in diário: remover "Nível de estresse"; "Pular" persiste no banco (não reaparece no dia); registro imutável após salvo; histórico consultável.
- Central de Notificações: tela cronológica, lida/não lida, marcar todas como lidas, excluir individual, ação relacionada, expurgo automático > 90 dias.
- Banco: `notifications`, `daily_checkin_skips` (ou coluna `skipped`), `xp_rules`/`xp_events`.

## Fase 2 — Grade, Agendamento e Lista de Espera
- Botão passa a ser **Agendar** (não check-in físico). Modal "O que vai treinar hoje?" (Inferior/Superior) → Confirmar agendamento.
- Regras: janela de 12h antes, 1 treino/dia, agendar e cancelar até 20 min antes, depois "Falar com a recepção"; capacidade por horário definida pela unidade.
- Estados: Agendar, Agendado, Lotado, Lista de espera, Bloqueado pelo plano, Encerrado.
- Lista de espera: máx. 5, FIFO, promoção automática com push, bloqueio para quem já tem agendamento no dia.
- Banco: `class_bookings` ganha tipo/estado; `class_waitlist`; validações em função do banco.

## Fase 3 — Treino: visão ativa, ciclo de troca, execução
- Tela Treino com treino ativo: nome, início, professor, previsão de troca, exercícios, volume semanal resumido, Iniciar treino, arquivados.
- Troca de treino: aviso 7 dias antes, status Troca próxima / Troca vencida (sem bloquear), arquivamento automático ao publicar novo + push.
- Execução: ordem fixa mas acesso livre a qualquer exercício; ver método, ver observação (oculta por padrão), vídeo em modal.
- Registro por série: concluída, carga, reps (opcionais), referência da última execução, edição posterior, sem apagar conclusão após finalizar.
- Descanso: cronômetro automático ao concluir série, pular/reiniciar, encerra ao iniciar a próxima.
- Início/fim: manual; auto-finaliza em 2h salvando só o registrado.

## Fase 4 — Pós-treino, dor, volume semanal e cardio
- Questionário pós-treino (só na finalização manual): PSE por emoji (1–5), estrelas de acompanhamento (1–2 abre campo), dor sim/não com relato.
- Alerta de dor: ocorrência interna com status NOVO / EM ACOMPANHAMENTO / RESOLVIDO.
- Volume semanal (seg→dom): prescrito x realizado por grupo, auxiliar conta 0,5, só séries concluídas.
- Cardio: prescrição por tempo, blocos contínuos/intervalados, cronômetro com alertas, pausa/retomada, registro de tempo/distância/velocidade/inclinação/calorias.
- Biblioteca de exercícios: até 2 auxiliares; biblioteca de métodos com autoria (edita/exclui só quem criou, exclusão não afeta treinos existentes).

## Fase 5 — Saúde & Evolução
- Tela própria: resumo (peso, meta, FC repouso, pressão, sono), cards reordenáveis pelo aluno, gráficos com filtros 30d/3m/6m/1a/tudo.
- Peso: aluno e equipe registram, sem exclusão, histórico de alterações, meta com push ao atingir.
- Pressão arterial: manual, editável, sem exclusão, histórico com origem.
- Avaliações físicas: agendamento, próxima/última, histórico, comparações, medidas fixas (10 itens), bioimpedância com origem INTEGRADO/MANUAL, push de nova avaliação.
- Fotos de evolução: frente/lado/costas, privadas, comparação lado a lado e slider, exportar com logo discreta e confirmação antes de compartilhar.

## Fase 6 — Comunidade, Ranking, Club
- Comunidade: feed por unidade, editar/excluir/denunciar, ver quem curtiu, 3 denúncias distintas ocultam e abrem ocorrência, bloqueio de 24h (lê e curte, não publica).
- Ranking: por unidade, filtros Semana/Mês/Ano, mostra só posição/foto/nome/XP/streak, opção "Não aparecer no ranking".
- Club: manter as 3 seções; registro de resgate com parceiro, data/hora, benefício e economia estimada.

## Fase 7 — Perfil, contratos, plano e jornada de renovação
- Perfil com o menu completo pedido (13 itens), sem exclusão de conta.
- Contratos: visualizar, PDF, histórico, assinatura digital com versão/data/hora.
- Plano e pagamentos: status, vencimento, tolerância de 3 dias, bloqueios de plano irregular (agendamento, catraca, check-in, posts, curtidas, cartão Club) mantendo leitura liberada.
- Ciclo EVO: retrospectiva vertical animada 30 dias antes do vencimento, reaparece até concluir, arquivo em "Meus Ciclos EVO"; régua de 21/14/7 dias; benefícios de renovação com status Disponível/Entregue.
- Indicações: link rastreável via WhatsApp, 5% por indicado ativo até 100%, reserva interna acima de 20, tela "Minhas Indicações".

## Fase 8 — Integrações físicas e pagamentos
- Catraca: webhook de liberação/presença, tolerância de 20 min, encaixe autorizado pela recepção contando como treino/XP/streak.
- Smartwatch/saúde: importação de FC, calorias, duração, distância, ritmo, passos, sono; prioridade do relógio; "Dispositivos conectados" no perfil.
- Pagamentos de renovação (Pix, Pix recorrente, cartão), com cancelamentos apenas pela recepção.

## Detalhes técnicos
- Frontend: React + Vite + Tailwind, componentes novos em `src/components/tabs/*` e `src/components/aluno/*`, reaproveitando `card-shadow`, `cta-shadow`, tokens do `index.css`. Nenhum token de cor novo hardcoded.
- Estado: `StudentContext` ganha status do plano (regular/irregular) para os bloqueios; hooks por domínio (`useSchedule`, `useTrainingPlan`, `useHealth`, `useNotifications`).
- Backend: novas tabelas com RLS por `auth_user_id`/`current_client_id()` e GRANTs; regras sensíveis (agendamento, lista de espera, desconto de indicação, XP) em funções `security definer` para não confiar no cliente.
- Push: reutiliza `push-send` e o cron existente; novos gatilhos entram como funções de borda.
- Cada fase termina com build limpo e verificação no preview.

## Sugestão de início
Começar pela Fase 1 (Home + Check-in + Central de Notificações) e seguir na ordem, uma fase por rodada.
