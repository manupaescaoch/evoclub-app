## Objetivo

No app do aluno, ao reservar/fazer check-in numa aula da grade, perguntar qual grupamento vai treinar (Inferior / Superior) e confirmar. Na grade do admin/professor (desktop), mostrar em cada horário o nome do aluno + grupamento escolhido.

## Escopo

### 1. Banco de dados
Nova migration adicionando colunas em `class_bookings`:
- `student_name text` — nome do aluno (cacheado para exibição rápida)
- `muscle_group text` — valor `inferior` ou `superior`
- `checked_in_at timestamptz` — quando confirmou

Sem novas tabelas, sem mudar RLS existente.

### 2. App do aluno — `src/components/tabs/GradeTab.tsx`
- Botão "Reservar" abre um `Dialog` (shadcn) com:
  - Título: "Confirmar check-in"
  - Info da aula (horário + professor)
  - Duas opções grandes lado a lado: **INFERIOR** / **SUPERIOR** (cards clicáveis, seleção destaca em `primary`)
  - Botões "Cancelar" / "Confirmar" (Confirmar desabilitado até escolher)
- Ao confirmar → `insert` em `class_bookings` com `class_id`, `student_name` (pega do perfil/localStorage), `muscle_group`, `checked_in_at = now()`, `status = 'confirmed'`.
- Feedback: toast "Check-in confirmado" e botão vira "Reservado ✓".
- Substitui a geração fake atual por leitura real de `classes` do dia selecionado (mantém o layout timeline já existente).

### 3. Grade admin/professor — `src/pages/admin/Grade.tsx`
Dentro de cada célula de aula, abaixo do `filled/max` e nome da atividade, renderizar a lista de alunos reservados:

```text
06:00 - 07:00      3/14
Musculação
─────────────
• João Silva      INF
• Maria Souza     SUP
• Pedro Alves     INF
```

- Buscar `class_bookings` já retorna `student_name` e `muscle_group` (uma query só, agrupa em memória por `class_id`).
- Badge colorido pequeno: azul p/ INF, âmbar p/ SUP.
- No mobile/admin compacto, mostrar só contagem por grupamento (ex: `2 INF · 1 SUP`); no desktop (≥md) mostrar a lista completa.

### 4. Não muda
- Layout, cores, filtros, seleção em massa e criação em massa da grade admin.
- Estrutura da `GradeTab` (dias, cards).
- Nenhum outro módulo é tocado.

## Detalhes técnicos

- Migration (schema only):
  ```sql
  ALTER TABLE public.class_bookings
    ADD COLUMN IF NOT EXISTS student_name text,
    ADD COLUMN IF NOT EXISTS muscle_group text,
    ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;
  ```
  Sem CHECK constraint no valor (validação no client) para manter flexibilidade caso surjam mais grupos depois.
- `GradeTab` passa a receber/consultar `supabase.from("classes")` filtrado por `day_of_week` do dia ativo, ordenado por `start_time`.
- Componente novo pequeno: `src/components/tabs/CheckInDialog.tsx` reaproveitável.
- `Grade.tsx`: adicionar ao `select` de `class_bookings` os campos `student_name, muscle_group` e montar `bookingsByClass: Record<string, {name,group}[]>`.

## Perguntas em aberto

- Opções: manter apenas **Inferior** e **Superior**? (Full Body / Cardio podem entrar depois se quiser — posso deixar preparado.)
- Nome do aluno: por ora usarei o nome salvo no perfil local (`localStorage`) já que o app do aluno hoje não tem auth Supabase completa; quando integrar auth de aluno, plugamos no `auth.uid()` + tabela `clients`.
