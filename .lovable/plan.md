
# Evolução da seção Treinos

Reaproveitando 100% das páginas atuais (Dashboard, Alunos, Fichas, Biblioteca, Métodos), conectando-as a um novo fluxo central de **Prescrição**. Nada será apagado.

## Visão geral

```
Treinos
├── Dashboard           (existente)
├── Alunos              (existente, ganha ações rápidas)
├── Prescrever Treino   (NOVO – atalho global)
├── Fichas de Treino    (existente, integrada ao "Copiar")
├── Biblioteca          (existente, usada pelo Adicionar Exercício)
└── Métodos             (existente, usada no Configurar Exercício)
```

Fluxos suportados:
- **Treinos > Alunos > [aluno] > Prescrever Treino** (atual, melhorado)
- **Treinos > Prescrever Treino > buscar aluno > editor** (novo atalho)

## Mudanças no menu (AdminLayout)

Adicionar item filho `Prescrever Treino` (ícone `ClipboardEdit`) entre **Alunos** e **Fichas de Treino**. Sem rota duplicada para os outros itens.

## Roteamento (App.tsx)

```text
/admin/treinos/prescrever              → seletor de aluno
/admin/treinos/prescrever/:clientId    → editor de plano (novo)
/admin/treinos/prescrever/:clientId/:workoutId → editar plano existente
```

## Página Alunos – ações rápidas

Cada card do aluno passa a ter um menu (botão `MoreVertical` já existe) com:
- Ver perfil → `/admin/treinos/alunos/:id`
- **Prescrever treino** → `/admin/treinos/prescrever/:id`
- Ver treino ativo → abre detalhe expandido na ficha ativa
- Ver histórico → tab "Histórico" no detalhe

## Nova página: Prescrever Treino

**Sem aluno selecionado:** busca de aluno reaproveitando a UI de `TreinosAlunos` (search + filtro status/plano), botão "Selecionar".

**Com aluno selecionado**, header fixo:
- Avatar + nome do aluno
- Status do plano (Rascunho / Ativo / Vencido)
- Status financeiro (de `clients.plan` se existir)
- Objetivo do plano
- Botões: **Novo Plano**, **Copiar Plano**, **Histórico**, **Salvar na biblioteca**, **Salvar** (rascunho), **Enviar para aluno** (ativar)

No mobile esses botões viram uma barra fixa no rodapé.

### Modal "Novo Plano" – 3 caminhos
1. **Criar manualmente** – abre editor em branco
2. **Usar da biblioteca** – lista de `workout_templates`, ao escolher carrega sessões/exercícios da template
3. **Assistente MP TREINO** – card visual "em breve" (placeholder, sem IA agora)

### Campos do plano (cabeçalho do editor)
Nome, Descrição, Objetivo (select), Nível (select), Frequência (2x–6x ou personalizado), Tipo de organização (Dias da semana | Treino numerado).

### Estrutura semanas/sessões/exercícios

```text
Abas: Semana 1 | Semana 2 | ... | + Adicionar semana
└── Sessões (Treino A, B... ou Segunda, Terça...)
    ├── Nome, dia, observação
    ├── [Adicionar exercício]  [Duplicar]  [Excluir]  [Reordenar]
    └── Exercícios
        ├── ordem · nome · séries · reps · carga · interv · método · obs
        └── [editar séries] [duplicar] [excluir] [arrastar]
```

Botões globais: **Expandir todos / Recolher todos**.

### Adicionar exercício – modal usa Biblioteca real

Reescrever `AddExerciseDialog` para buscar de `exercise_library` (não da lista hardcoded). Modal com:
- Tabs: Favoritos | Exercícios do app | Seus exercícios
- Busca por nome
- Filtros: grupo muscular, equipamento, secundário
- Cards mostram vídeo (play link), músculos (chips coloridos como em Biblioteca), equipamento
- Botões "favoritar" (estrela) e "adicionar"
- Atalho "Criar exercício" (insere em `exercise_library`)

Após adicionar → abre **Configurar Exercício** (já existente, expandido).

### Configurar exercício – evoluções
Manter o componente atual e adicionar:
- Tipos de série faltantes: **Aquecimento**, **Preparatória**, **Válidas (com variantes existentes)**
- "Adicionar Método" passa a ser **Select de `training_methods`** (em vez de input livre) + observação livre opcional
- Salvar gera múltiplas linhas em `training_exercise_sets` (nova tabela – ver banco)

## Copiar Plano

Modal com 5 opções:
1. Copiar deste aluno (lista `workouts` do mesmo client_id)
2. Copiar de outro aluno (busca aluno + lista workouts)
3. Usar ficha da biblioteca (`workout_templates`)
4. Duplicar semana (dentro do plano atual)
5. Duplicar sessão

Sempre cria nova versão editável (não altera origem).

## Histórico

Drawer/aba com:
- Lista de planos anteriores (data, objetivo, status)
- Observações do treinador (do plano)
- Anamneses do aluno (`anamnesis`)
- Check-ins recentes (`check_ins`) como adesão

## Salvar na biblioteca

Modal: nome do modelo, objetivo, nível, categoria, descrição, tags. Persiste em `workout_templates` + `template_sessions` + `template_exercises`.

## Enviar para aluno (Ativar)

Validação: ≥1 sessão e ≥1 exercício. Modal de confirmação. Ao confirmar:
- `training_plans.status = 'active'`, `is_active = true`
- Demais planos do aluno → `is_active = false` (treino ativo único)
- O plano fica visível no app do aluno

## Permissões

Hook `useUserRole` consulta `user_roles` (ver banco). Apenas `admin`, `coach`, `coordinator` podem editar/enviar. Outros: somente leitura quando autorizado.

## Responsividade

- Sidebar drawer (já feito)
- Cards empilhados no mobile
- Botões principais fixos no rodapé durante edição (`fixed bottom-0` em mobile)
- Modais usam `max-h-[90vh] overflow-y-auto`
- Lista de exercícios com `overflow-y-auto` e scroll suave

## Banco de dados

**Reaproveitar:**
- `clients` (alunos), `exercise_library`, `training_methods`, `workout_templates` + `template_sessions` + `template_exercises`, `anamnesis`, `check_ins`.

**Criar (migração):**

```sql
-- Enum de roles + tabela
create type public.app_role as enum ('admin','coach','coordinator','student','viewer');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique(user_id, role)
);
alter table public.user_roles enable row level security;
create function public.has_role(_user_id uuid, _role app_role)
  returns boolean language sql stable security definer set search_path=public
  as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

-- Novo modelo de plano (coexiste com workouts antigo)
create table public.training_plans (
  id uuid primary key default gen_random_uuid(),
  student_id integer not null,
  coach_id uuid,
  name text not null,
  description text,
  goal text,
  level text,
  frequency text,
  organization_type text default 'weekday', -- 'weekday' | 'numeric'
  status text default 'draft', -- 'draft' | 'active' | 'archived'
  is_active boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.training_weeks (
  id uuid primary key default gen_random_uuid(),
  training_plan_id uuid not null references training_plans(id) on delete cascade,
  week_number int not null,
  name text,
  created_at timestamptz default now()
);

create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  training_week_id uuid not null references training_weeks(id) on delete cascade,
  name text not null,
  day_of_week text,
  session_number int,
  notes text,
  order_index int default 0,
  created_at timestamptz default now()
);

create table public.training_session_exercises (
  id uuid primary key default gen_random_uuid(),
  training_session_id uuid not null references training_sessions(id) on delete cascade,
  exercise_id uuid references exercise_library(id),
  order_index int default 0,
  notes text,
  created_at timestamptz default now()
);

create table public.training_exercise_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references training_session_exercises(id) on delete cascade,
  set_type text default 'reps_load',
  sets int default 1,
  reps text,
  load text,
  rest_seconds int,
  time_seconds int,
  incline text,
  cadence text,
  method_id uuid references training_methods(id),
  notes text,
  order_index int default 0,
  created_at timestamptz default now()
);

-- RLS: leitura para autenticados; escrita só com role admin/coach/coordinator
-- (políticas detalhadas via has_role em todas as 5 tabelas novas)

-- Trigger garantia de plano ativo único por aluno
create function public.ensure_single_active_plan()
returns trigger language plpgsql as $$
begin
  if NEW.is_active then
    update training_plans set is_active=false, status='archived'
      where student_id = NEW.student_id and id <> NEW.id and is_active=true;
  end if;
  return NEW;
end $$;
create trigger trg_single_active before insert or update on training_plans
  for each row execute function ensure_single_active_plan();
```

`workouts` antigo continua funcionando para compatibilidade. Novo editor escreve em `training_plans`. O detalhe do aluno passa a ler dos dois (mesclado).

## Permissão inicial

Seed: atribuir role `admin` ao usuário logado atualmente (após criar a tabela), via insert manual.

## Arquivos afetados

**Criar:**
- `src/pages/admin/PrescreverTreino.tsx` (seletor de aluno + redireciona)
- `src/pages/admin/PrescreverEditor.tsx` (editor completo)
- `src/components/admin/prescrever/PlanHeader.tsx`
- `src/components/admin/prescrever/WeekTabs.tsx`
- `src/components/admin/prescrever/SessionCard.tsx`
- `src/components/admin/prescrever/NewPlanDialog.tsx`
- `src/components/admin/prescrever/CopyPlanDialog.tsx`
- `src/components/admin/prescrever/HistoryDrawer.tsx`
- `src/components/admin/prescrever/SaveTemplateDialog.tsx`
- `src/components/admin/prescrever/SendToStudentDialog.tsx`
- `src/components/admin/prescrever/ExerciseLibraryPicker.tsx` (substitui modal hardcoded)
- `src/hooks/useUserRole.ts`

**Editar:**
- `src/App.tsx` – novas rotas
- `src/components/admin/AdminLayout.tsx` – item "Prescrever Treino"
- `src/pages/admin/TreinosAlunos.tsx` – menu de ações rápidas
- `src/pages/admin/TreinosClienteDetalhe.tsx` – botão "Prescrever" leva para nova página
- `src/components/admin/AddExerciseDialog.tsx` – Método via select de `training_methods` + tipos extras de série

**Não alterar / não apagar:** `TreinosFichas.tsx`, `TreinosBiblioteca.tsx`, `TreinosMetodos.tsx`, `TreinosDashboard.tsx`.

## Implementação incremental (ordem de entrega)

1. Migração do banco (5 tabelas + roles + trigger + RLS) e seed de role admin
2. Hook `useUserRole` + rota e item de menu "Prescrever Treino"
3. Página seletor de aluno
4. Editor: header, semanas, sessões (CRUD em memória + persistência)
5. `ExerciseLibraryPicker` real (`exercise_library`)
6. Configurar exercício – métodos via select de `training_methods` + sets múltiplos
7. Copiar Plano (5 opções) + Histórico + Salvar na biblioteca + Enviar/Ativar
8. Ações rápidas em `TreinosAlunos`
9. Ajustes de responsividade (rodapé fixo, modais)

Tudo segue paleta atual (#1400FF, #F4F5FA, Barlow Condensed/DM Sans), cards/border-radius existentes e PT-BR.
