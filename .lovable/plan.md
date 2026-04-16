

# Fluxo Completo de Criação de Plano de Treino

Baseado nas telas do MPFLOW, vamos criar um fluxo de 4 etapas para prescrição de treino.

## Fluxo

```text
[Criar Plano] → Modal com opções (Manualmente / Biblioteca)
      ↓
[Prescrever Treino] → Nome do Plano + Descrição + lista de sessões
      ↓
[+ Adicionar Sessão] → Modal: Nome da Sessão, Dia da Semana ou número, Duração, Obs
      ↓
[+ Adicionar Exercício] → Modal: busca/cria exercício, configura séries/reps/carga/intervalo
```

## Alterações

### 1. Database Migration
- Create `workout_sessions` table: `id`, `workout_id`, `name` (ex: "Treino A"), `day_label` (segunda/terça ou numérico), `duration_min`, `notes`, `sort_order`
- Modify `workout_exercises` to reference `session_id` instead of directly `workout_id`, add `load` (text) column for weight/carga

### 2. Refactor TreinosClienteDetalhe.tsx
- Replace inline new workout form with a modal "Criar Novo Plano de Treino" with two cards: "Criar Manualmente" and "Usar da Biblioteca" (disabled/coming soon)
- On "Criar Manualmente" → navigate to a new prescription view

### 3. New Component: WorkoutPrescription.tsx
- Header: back arrow, "Prescrever Treino", client name, Salvar button
- Form: Nome do Plano + Descrição inputs
- List of sessions (Treino A - Segunda, etc.) each expandable with exercises inside
- "+ Adicionar Sessão de Treino" button at bottom
- Each session card has: settings gear, copy, delete icons, and "+ Adicionar Exercício" button

### 4. New Dialog: NewSessionDialog.tsx
- Modal with fields: Nome da Sessão (text), Dia da Semana (select dropdown with Seg-Dom + Numérico options), Duração em min (number), Observações (textarea)
- Buttons: Cancelar / Criar

### 5. New Dialog: AddExerciseDialog.tsx
- Modal "Adicionar Exercício" with search input + "Criar novo" button
- List of exercises from `workout_exercises` library or typed manually
- On select → opens config: Série × Rep, Carga, Intervalo(s)
- Buttons: Adicionar série, Cancelar, Salvar

### 6. Update workout expanded view
- When viewing existing workout, show sessions grouped with exercises inside each
- Each exercise row shows: name, sets × reps, load, rest

## Technical Details
- New table `workout_sessions` bridges `workouts` → sessions → exercises
- Add `session_id` (uuid, nullable) and `load` (text) columns to `workout_exercises`
- RLS: same pattern as existing tables (authenticated can manage)
- All labels in PT-BR, following existing font/color conventions (Barlow headings, DM Sans body, #1400FF primary)

