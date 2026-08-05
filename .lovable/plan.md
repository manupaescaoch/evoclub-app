# Login do aluno + onboarding no primeiro acesso

## Objetivo
O app do aluno passa a exigir login por e-mail e senha, vinculado a um cadastro existente em `clients`. No primeiro acesso, um tutorial curto apresenta as abas. Todo o resto (Grade, Club, Comunidade, Ranking, Treino, admin) continua igual visualmente.

## 1. Banco de dados
- `clients`: adicionar `auth_user_id uuid unique` (referência ao usuário autenticado) e `onboarding_completed boolean not null default false`.
- Função `public.current_client_id()` (security definer) que retorna o `clients.id` do usuário logado — usada nas políticas e no app.
- Função `public.link_client_by_email(text)` (security definer): procura em `clients` um registro com aquele e-mail e sem `auth_user_id`, e o vincula ao usuário logado. Retorna sucesso/erro para o app decidir a mensagem.
- RLS por aluno (mantendo as políticas de staff que já existem):
  - `daily_checkins`: aluno vê/insere/edita só linhas com `client_id = current_client_id()`. As políticas públicas atuais (`Public can insert/update/view daily checkins`) são removidas.
  - `class_bookings`: aluno vê/insere/cancela só as próprias (`client_id = current_client_id()`); as políticas públicas de insert/select saem. Leitura da lotação da grade continua possível via contagem agregada permitida a `authenticated`.
  - `training_plans`, `training_weeks`, `training_sessions`, `training_session_exercises`, `training_exercise_sets`: leitura restrita ao próprio plano do aluno (hoje qualquer autenticado lê tudo); staff continua com acesso total.
  - `clients`: aluno pode ler a própria linha e atualizar apenas `onboarding_completed`.
- `classes`, `partners` seguem legíveis para autenticados (grade e Club sem mudança de comportamento).

Observação: os check-ins e reservas antigos foram gravados só com `student_name` (sem `client_id`), então não aparecerão para o aluno após a mudança. Se quiser, posso tentar casar por nome numa etapa de limpeza depois.

## 2. Autenticação
- Auth por e-mail/senha (sem magic link, sem social). Sem confirmação automática por padrão: no cadastro o aluno vê "confirme seu e-mail". Se preferir entrar direto após cadastrar, ativo a confirmação automática — me diga.
- Novas telas, reaproveitando o visual de `/admin/login`, dentro do padrão mobile (máx 390px):
  - `/aluno/login` — e-mail + senha, link para cadastro.
  - `/aluno/cadastro` — e-mail, senha, confirmar senha. Após criar a conta, tenta vincular ao `clients` pelo e-mail; se não houver cadastro correspondente, mostra "Não encontramos seu cadastro. Fale com a recepção da sua unidade." e não deixa a conta seguir sem vínculo.
- `RoleSelect`: o botão "Sou aluno" passa a levar para `/aluno` protegido (redireciona ao login se não houver sessão).
- Guarda de rota `StudentGuard`: sem sessão → `/aluno/login`; com sessão mas sem vínculo em `clients` → tela de "procure a recepção" com opção de sair.
- Novo hook `useStudentProfile` (nome, `client_id`, unidade, `onboarding_completed`) substituindo o nome vindo do `localStorage`. `useStudentName` passa a ler do perfil autenticado (sem "Rafael Costa" fixo).

## 3. Ajustes nas telas do aluno (sem mudar layout)
- `GradeTab`: check-in grava `client_id` do aluno logado (mantém `student_name` preenchido a partir do perfil para o painel admin), sem input de nome.
- `DailyCheckinDialog`: grava `client_id`; controle de "uma vez por dia" passa a considerar o registro do dia no banco (fallback local mantido).
- `TreinoTab`: hoje usa dados de exemplo; passa a buscar o plano ativo do aluno logado (`training_plans` do próprio `client_id`), mantendo o layout atual. Se preferir deixar `TreinoTab` como está nesta etapa, é só dizer.
- `PerfilTab`: nome vem do perfil; edição de nome grava em `clients`.

## 4. Onboarding
- `OnboardingDialog` (carrossel de poucos slides) apresentando Início, Treino, Grade, Club, Comunidade, Ranking e Perfil, no design atual (azul #1400FF, Barlow/DM Sans).
- Aparece uma única vez, quando `clients.onboarding_completed = false`; ao concluir ou pular, marca `true`. Sem passo de "adicionar à tela de início".
- Ordem no `AppShell`: onboarding primeiro; o check-in diário só aparece depois de concluído.

## Fora de escopo nesta etapa
Login social, recuperação de senha por e-mail personalizado, notificações push, mudanças no painel admin e no layout das abas.
