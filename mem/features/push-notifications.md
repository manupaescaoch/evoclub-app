---
name: Notificações push (Fase 4)
description: Web Push com VAPID, lembrete de aula 30 min antes via cron e mensagem direta da equipe
type: feature
---
- Web Push com service worker dedicado `public/push-sw.js` (não faz cache de app shell).
- Chave pública VAPID nunca fica no frontend: vem da função `push-config`. Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (o Manu preenche os valores reais).
- Tabelas: `push_subscriptions` (inscrições por aluno) e `push_notifications` (histórico/dedupe).
- Funções: push-config, push-subscribe, push-unsubscribe, push-send (staff, valida can_manage_training), push-class-reminders.
- Cron `push-class-reminders-every-5min` roda a cada 5 min; janela de 25–35 min antes da aula (horário de Brasília); dedupe por booking_id nas últimas 2h (reservas da grade são semanais, então não pode ser dedupe permanente).
- Permissão é pedida só no botão "Ativar notificações" do Perfil. iPhone precisa instalar na tela de início antes (avisado no onboarding e no Perfil).