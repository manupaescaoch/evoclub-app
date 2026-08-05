# Fase 3 — Comunidade e Ranking com dados reais

Substituir os mockups de ComunidadeTab e RankingTab por dados do banco, mantendo exatamente o visual atual (mesmos cards, gradientes, pódio, tipografia).

## 1. Comunidade

Feed real de posts dos alunos + mural de avisos do staff.

- **Avisos do staff** fixados no topo do feed (card destacado, mesmo estilo dos cards atuais). Publicados pelo admin.
- **Post do aluno**: texto e/ou foto. O campo "Compartilhe seu treino..." abre um composer; o botão de câmera/imagem faz upload da foto.
- **Curtidas**: coração já existente passa a gravar/remover curtida real; contador vem do banco; estado "curtido por mim" persistente.
- **Sem moderação prévia**: o post entra direto no feed.
- **Denúncia + remoção**: aluno pode denunciar um post (menu discreto no card); autor pode apagar o próprio post; staff pode apagar qualquer post. Uma página admin simples lista posts denunciados e avisos do mural (criar/editar/remover).

## 2. Ranking

Pontuação real, por unidade, com dois períodos: **Semana atual** e **Geral (acumulado)**.

Fontes e pesos:
- Check-in de aula (class_bookings com check-in): 10 pts
- Treino completo registrado (workout_logs concluídos): 15 pts
- Check-in diário de bem-estar (daily_checkins): 5 pts
- Post na comunidade: 5 pts

O visual atual é preservado: seletor de período (passa a ter Semana / Geral), card "minha posição" em gradiente, pódio top 3 e lista abaixo. Cada linha mostra os pontos e a quantidade de treinos do período; a posição do aluno logado fica destacada. Se o aluno ainda não tem pontos, aparece fora do top mas com sua pontuação.

## Detalhes técnicos

**Banco (uma migração):**
- `community_posts` (client_id, author_name, content, image_url, created_at) — leitura para alunos autenticados; insert/delete do próprio autor; staff pode apagar.
- `community_post_likes` (post_id, client_id, unique) — aluno gerencia as próprias curtidas, leitura autenticada.
- `community_reports` (post_id, client_id, reason) — insert pelo aluno, leitura/remoção pelo staff.
- `community_announcements` (title, body, unit_id, pinned, active, created_by) — leitura autenticada, escrita restrita a staff via `can_manage_training`/`has_role('admin')`.
- GRANTs para `authenticated`/`service_role` e RLS em todas, mais triggers de `updated_at`.
- Bucket de storage público `community` para as fotos dos posts (upload apenas autenticado).
- Função `security definer` `ranking_scores(_unit_id uuid, _from date)` que agrega as quatro fontes por `client_id` e devolve nome, pontos e contagens — necessária porque o RLS atual impede um aluno de ler check-ins/treinos dos outros. A tab chama essa função duas vezes (início da semana e data zero para o acumulado).

**Front-end:**
- `ComunidadeTab.tsx`: buscar avisos + posts (com contagem de likes e like do usuário), composer com upload, otimismo no like, empty state. Mesma marcação visual.
- `RankingTab.tsx`: consumir `ranking_scores` via RPC, calcular pódio/lista/minha posição a partir do retorno, sem alterar layout.
- Nova página admin `Comunidade` (mural de avisos + posts denunciados) no menu do admin, usando o `PageShell` existente.

Grade, Club, Treino, Perfil e login seguem intactos.
