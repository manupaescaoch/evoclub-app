

# Fichas de Treino, Biblioteca de Exercícios e Banco de Métodos

Implementar as 3 páginas do módulo Treinos baseadas no layout MPFLOW.

## Database Migration

### Nova tabela: `exercise_library`
- `id` uuid PK
- `name` text NOT NULL
- `muscle_group` text (grupo muscular principal)
- `secondary_muscle` text (grupo muscular secundário)
- `equipment` text
- `video_url` text
- `is_global` boolean default true
- `created_at` timestamptz

### Nova tabela: `training_methods`
- `id` uuid PK
- `name` text NOT NULL
- `description` text
- `is_global` boolean default true
- `created_at` timestamptz

### Nova tabela: `workout_templates` (fichas de treino modelo)
- `id` uuid PK
- `name` text NOT NULL
- `category` text (ex: "Masculino", "Feminino", "Iniciante")
- `description` text
- `created_at` timestamptz

### Nova tabela: `template_sessions`
- `id` uuid PK
- `template_id` uuid FK → workout_templates
- `name` text
- `day_label` text
- `duration_min` int
- `notes` text
- `sort_order` int

### Nova tabela: `template_exercises`
- `id` uuid PK
- `template_session_id` uuid FK → template_sessions
- `name` text
- `sets` int
- `reps` text
- `load` text
- `rest_seconds` int
- `notes` text
- `sort_order` int

RLS: authenticated users can CRUD all tables.

## 1. Fichas de Treino (`TreinosFichas.tsx`)

Layout baseado na imagem MPFLOW "Biblioteca de Treinos":
- Header: "Fichas de Treino" + subtítulo + botão "+ Adicionar"
- Barra de busca + filtro "Todas as categorias"
- Grid de cards com categorias (ex: "Masculino") com ícone de pasta e menu de ações (⋮)
- Ao clicar numa categoria → lista de fichas dentro dela
- Ao criar ficha → reutiliza o mesmo fluxo do `WorkoutPrescription` mas salva em `workout_templates` em vez de `workouts`
- Funcionalidade de clonar ficha para um aluno específico

## 2. Biblioteca de Exercícios (`TreinosBiblioteca.tsx`)

Layout baseado na imagem MPFLOW "Biblioteca de Exercícios":
- Header: "Biblioteca de Exercícios" + "Banco de exercícios com vídeos" + botão "+ Criar exercício"
- Tabs: Favoritos | Exercícios do app | Seus exercícios
- Barra de busca + filtros: "Grupos musculares" e "Equipamento" (dropdowns)
- Tabela com colunas: ícone vídeo, Exercício (sortable), Ativação (badges coloridas por grupo muscular), Equipamento, Ações
- Dialog para criar/editar exercício: nome, grupo muscular, músculo secundário, equipamento, URL do vídeo

## 3. Banco de Métodos (`TreinosMetodos.tsx`)

Layout baseado na imagem MPFLOW "Banco de Métodos":
- Header: "Banco de Métodos" + "Métodos de treino para prescrição" + botão "+ Novo Método"
- Barra de busca
- Lista de cards com: nome do método (bold, uppercase), badge "Global", descrição
- Pré-popular com métodos comuns: 100/10, BACK OFF SET, BI-SET, BÚLGARO + PARCIAIS, CLUSTER SET, DROP-SET, REST-PAUSE, SUPER-SET, etc.
- Dialog para criar novo método: nome + descrição

## Arquivos Alterados

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar 5 tabelas + RLS + seed de métodos |
| `src/pages/admin/TreinosFichas.tsx` | Reescrever com CRUD completo |
| `src/pages/admin/TreinosBiblioteca.tsx` | Reescrever com tabela + CRUD |
| `src/pages/admin/TreinosMetodos.tsx` | Reescrever com lista + CRUD |

