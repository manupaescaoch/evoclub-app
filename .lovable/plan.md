

# Otimizar Layout do Treino — UX Mobile

## Problema
1. O popup de "Atualizar carga" abre na parte inferior (bottom-sheet) em vez de centralizado na tela
2. O layout dos exercícios precisa ser mais compacto e otimizado para a experiência mobile em 390px

## Alterações

### 1. Centralizar LoadModal
- Mudar de `items-end` para `items-center` no container fixo
- Trocar `rounded-t-3xl` por `rounded-3xl` com margem lateral
- Adicionar botão de fechar (X) no canto superior
- Input maior com melhor área de toque (min h-14)
- Botões de incremento rápido (+5kg, +10kg) para facilitar edição

### 2. Otimizar cards de exercício
- Reduzir padding dos cards (p-4 → p-3)
- Thumbnail menor (w-16 h-20) para dar mais espaço ao conteúdo
- Séries em layout mais compacto: uma linha por série com reps, carga e intervalo lado a lado
- Separadores visuais sutis entre séries
- Botão "Editar" mais visível com ícone de lápis

### 3. Melhorar área de toque
- Aumentar área clicável do checkbox de conclusão (min 44x44px)
- Botões de intervalo com padding maior
- Espaçamento adequado entre elementos interativos (min 8px gap)

### 4. Progress bar e header fixo
- Fixar header (título + barra de progresso) no topo durante scroll
- Adicionar `pb-24` ao container para garantir que o último exercício não fique atrás da bottom nav

### Arquivos modificados
- `src/components/tabs/TreinoTab.tsx` — LoadModal centralizado, cards otimizados, melhor UX mobile

