# Fase 4 — Notificações Push

## Resumo
Push web (Android + desktop) via Service Worker próprio de push, com dois gatilhos: lembrete automático 30 min antes da aula reservada e mensagem direta da equipe (individual ou por unidade). Permissão pedida com contexto, no Perfil. Onboarding ganha um passo explicando a instalação na tela de início (obrigatória no iPhone).

## 1. VAPID / chaves
- Um par de chaves VAPID é gerado uma única vez e guardado em Secrets do projeto:
  - `VAPID_PUBLIC_KEY` (pode ser exposta ao navegador)
  - `VAPID_PRIVATE_KEY` (só backend)
  - `VAPID_SUBJECT` (mailto de contato)
- A chave pública **não** vai hardcoded no frontend: uma função `push-config` devolve `{ publicKey }` para o app usar no `subscribe()`. Assim trocar as chaves não exige alterar código.
- Preciso que você gere e salve as duas chaves em Project Settings → Secrets (VAPID é um par assinado; não posso gerar um segredo que você também precisa conferir/reusar). Passo a passo:
  1. `npx web-push generate-vapid-keys` (ou o gerador em https://www.attheminute.com/vapid-key-generator)
  2. salvar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` (ex.: `mailto:contato@evotrainingclub.com`) nos Secrets.
- Se trocar as chaves depois, as inscrições antigas param de valer: a rotina de envio marca essas inscrições como inativas e o aluno reativa no Perfil.

## 2. Banco
Nova tabela `push_subscriptions`:
- `client_id`, `user_id`, `endpoint` (único), `p256dh`, `auth`, `user_agent`, `active`, timestamps
- Aluno só vê/gerencia as próprias inscrições; equipe e funções internas com acesso de serviço.

Nova tabela `push_notifications` (histórico/auditoria de envios):
- `title`, `body`, `url`, `target` (`student` | `unit` | `all`), `client_id`, `unit_id`, `kind` (`class_reminder` | `staff_message`), `sent_count`, `failed_count`, `created_by`, `created_at`
- Serve também para deduplicar o lembrete de aula (uma notificação por reserva/dia).

Em `class_bookings` não muda nada; o lembrete usa uma linha de controle em `push_notifications` referenciando a reserva.

## 3. Service Worker e manifest
- `public/push-sw.js`: worker dedicado a push (eventos `push` e `notificationclick` que abre o app na aba certa). Não faz cache de app shell, não interfere no preview.
- `public/manifest.webmanifest` + ícones e tags de head (`manifest`, `theme-color`, `apple-touch-icon`) — necessário para o iPhone poder instalar na tela de início, que é pré-requisito do push no Safari.
- Registro do worker acontece só quando o aluno clica em "Ativar notificações".

## 4. Funções de backend
- `push-config` — devolve a chave pública VAPID.
- `push-subscribe` — grava/atualiza a inscrição do aluno autenticado (e `push-unsubscribe` para desativar).
- `push-send` — usada pela equipe: recebe `{ title, body, url, target, client_id?, unit_id? }`, valida sessão e cargo (admin/coordenador), resolve os destinatários, envia e registra em `push_notifications`. Inscrições que retornarem 404/410 são marcadas inativas.
- `push-class-reminders` — roda periodicamente, busca reservas confirmadas cuja aula começa entre 25 e 35 minutos (horário de Brasília), pula as já notificadas e dispara "Sua aula começa em 30 minutos".

## 5. Agendador
- `pg_cron` + `pg_net` chamando `push-class-reminders` a cada 5 minutos.
- Janela de 25–35 min + registro de envio evita duplicidade e cobre atraso de execução.
- O cron é criado via inserção de SQL com a URL da função e a chave anônima do projeto (não vai para migração pública).

## 6. Aluno (Perfil)
- O item "Notificações" do menu do Perfil passa a abrir um bloco com estado real:
  - não suportado / bloqueado / desativado / ativo
  - botão "Ativar notificações" (só aí o navegador pede permissão) e opção de desativar
  - aviso para iPhone: "instale o app na tela de início antes de ativar", com o passo a passo
- Visual atual do Perfil preservado; só o item ganha comportamento e um card abaixo.

## 7. Onboarding
- Novo slide (antes do último) "INSTALE NA TELA DE INÍCIO": instruções curtas iOS (Safari → Compartilhar → Adicionar à Tela de Início) e Android (menu → Instalar app), destacando que no iPhone o push só funciona depois disso. Mesmo layout de slide já usado.

## 8. Admin
- Nova página em Comunidade (aba "Notificações", sem criar módulo novo): formulário com título, mensagem, link opcional, destino (aluno específico, unidade ou todos) e histórico dos últimos envios com contagem de entregues/falhos.

## Detalhes técnicos
- Envio usa `web-push` compatível com Deno (`npm:web-push`) nas funções de envio; JWT VAPID assinado com a chave privada dos Secrets.
- Todas as funções validam a sessão em código e retornam erros com o status/corpo real.
- Nenhuma alteração em Grade, Club, Comunidade (feed), Ranking, Treino ou login.

## Pré-requisito para começar
As chaves VAPID nos Secrets (item 1). Sem elas eu já implemento tudo, mas o envio só passa a funcionar depois que forem salvas.
