# Tipos de série — exibir só campos pertinentes

Hoje, no editor de prescrição (`src/pages/admin/PrescreverEditor.tsx`), todos os tipos mostram os mesmos campos fixos (séries, reps, carga, intervalo) e só adicionam tempo/inclinação/cadência condicionalmente. Isso gera "Carga" em "Repetições e tempo", "Reps" em "Tempo e inclinação", etc.

## Mapeamento novo de campos por tipo

| Tipo | Séries | Reps | Carga | Tempo | Inclinação | Distância | Ritmo | Cadência | Intervalo | Obs |
|---|---|---|---|---|---|---|---|---|---|---|
| Repetições e carga | ✓ | ✓ | ✓ |  |  |  |  |  | ✓ | ✓ |
| Repetições, carga e tempo | ✓ | ✓ | ✓ | ✓ |  |  |  |  | ✓ | ✓ |
| Repetições e tempo | ✓ | ✓ |  | ✓ |  |  |  |  | ✓ | ✓ |
| Tempo e inclinação | ✓ |  |  | ✓ | ✓ |  |  |  | ✓ | ✓ |
| Corrida | ✓ |  |  | ✓ |  | ✓ | ✓ |  | ✓ | ✓ |
| Cadência | ✓ | ✓ | ✓ |  |  |  |  | ✓ | ✓ | ✓ |
| Observações |  |  |  |  |  |  |  |  |  | ✓ (campo único largo) |

## Mudanças técnicas

1. **`PrescreverEditor.tsx`** — substituir o bloco `<div className="flex flex-wrap items-end gap-1.5 ...">` (linhas ~584–626) por renderização condicional via um mapa `FIELDS_BY_TYPE` que lista quais inputs aparecer.
2. Adicionar inputs novos:
   - `distance` (km) e `pace` (min/km) para "Corrida"
3. **Banco**: adicionar colunas `distance_km numeric` e `pace text` em `workout_set_rows` (ou nome equivalente da tabela de sets). Migração separada antes do código.
4. Atualizar `newSetRow()` (linha ~77) para já criar com `set_type` adequado e os defaults certos.
5. Para tipo "Observações", esconder todos os campos numéricos e expandir `notes` para ocupar a linha inteira.

## Fora do escopo

- Não muda a lista de tipos (continua a mesma).
- Não muda a tela do aluno / execução do treino — só o editor de prescrição.

Confirma se a tabela de campos acima está correta antes de eu implementar?
