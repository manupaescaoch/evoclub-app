

# Perfil do Aluno — Página Completa

Criar uma nova tab/página de perfil do aluno acessível ao clicar na foto/avatar no header da tab Início, seguindo o layout do MPFLOW.

## Estrutura da Página

```text
[Avatar + Nome + Editar]
[Trocar Foto]
─────────────────────────
[Stats: Dias Ativos | Sequência | Ranking | Conquistas]
─────────────────────────
[Conquistas] → card expandível com progresso
[Evolução do Peso] → gráfico + botão Registrar Peso
[Fotos de Progresso] → Antes/Depois (Frente, Lateral, Costas)
[Consistência] → calendário mensal com check-ins
[Resumo do Período] → dias ativos, treinos, pontos + dicas
[Notificações] → link/chevron
[Configurações] → link/chevron
[Privacidade] → link/chevron
[Sair da Conta] → botão vermelho
```

## Alterações

### 1. Novo componente: `src/components/tabs/PerfilTab.tsx`
Página completa com todas as seções acima, usando dados mock por enquanto:
- **Header**: Avatar grande com ícone de câmera para trocar foto, nome do aluno, ícone de edição
- **Stats row**: 4 cards (Dias Ativos, Sequência, Ranking, Conquistas)
- **Conquistas**: Card com barra de progresso "X/25 desbloqueadas", chevron para expandir
- **Evolução do Peso**: Área de gráfico placeholder + botão "Registrar Peso"
- **Fotos de Progresso**: Seção "ANTES" com 3 placeholders (Frente, Lateral, Costas) com ícone de câmera
- **Consistência**: Calendário mensal com switcher Semana/Mês/Ano/Tudo, dias coloridos para check-ins
- **Resumo do Período**: Stats (dias ativos, treinos, pontos) + seções "Pode melhorar" e "Atenção"
- **Menu items**: Notificações, Configurações, Privacidade — cada um como card com chevron
- **Sair da Conta**: Botão centralizado em vermelho

### 2. Atualizar `AppShell.tsx`
- Adicionar `"perfil"` ao array de tabs
- Renderizar `PerfilTab` quando `activeTab === "perfil"`

### 3. Atualizar `InicioTab.tsx`
- Tornar o avatar no header clicável — ao clicar, muda para tab "perfil"
- Passar `onTabChange` como prop para InicioTab

### 4. Atualizar `BottomNav.tsx`
- Não adicionar perfil no bottom nav (acessível apenas pelo avatar, como no MPFLOW)
- Alternativa: adicionar callback para navegação ao perfil

## Detalhes Técnicos
- Componente puramente visual com dados mock (sem DB por enquanto)
- Seguir paleta existente: primary #1400FF, bg #F4F5FA
- Fontes: Barlow Condensed para headings/números, DM Sans para corpo
- Max width 390px, PT-BR
- Ícones: lucide-react (Camera, ChevronRight, Scale, Calendar, Bell, Settings, Shield, LogOut)

