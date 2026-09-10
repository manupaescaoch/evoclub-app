# Otimização PWA — App do Aluno (mobile)

## Objetivo
Deixar o app do aluno (`/aluno`) com comportamento de aplicativo nativo instalado: sem zoom acidental, respeitando áreas não clicáveis do celular (notch, barra de gestos) e sem gestos do navegador vazando para a página.

## Estado atual (verificado)
- `index.html` já tem `user-scalable=no, maximum-scale=1.0, viewport-fit=cover` e manifest linkado.
- `public/manifest.webmanifest` já existe com `display: standalone`.
- `src/index.css` já tem `touch-action: manipulation`, tap-highlight transparente e inputs com 16px (evita zoom do iOS ao focar).
- `AppShell`/`App.tsx` usam `safe-top` e `pb-24` fixo.

## Mudanças

### 1. Bloqueio total de zoom e gestos do navegador (`index.html` + `index.css`)
- Adicionar script inline pequeno no `index.html` que bloqueia `gesturestart`/`gesturechange` (pinch do iOS Safari) e duplo-toque em áreas não interativas.
- Garantir `touch-action: manipulation` também em `button`, `a` e elementos roláveis do app do aluno.
- Manter `overscroll-behavior-y: none` no `body` (já existe) e reforçar nos containers de scroll do app (evita pull-to-refresh e "bounce" que revela o fundo).

### 2. Áreas seguras (notch / barra de gestos) — `App.tsx`, `BottomNav.tsx`
- Trocar o `pb-24` fixo do container de conteúdo por espaçamento calculado: altura da barra inferior + `env(safe-area-inset-bottom)`, para nenhum botão/conteúdo ficar escondido atrás da barra de gestos do iPhone/Android.
- Conferir `BottomNav`: já usa `max(env(safe-area-inset-bottom), 8px)` — manter e alinhar o padding do conteúdo com esse valor.
- Aplicar `safe-top` nos headers fixos/modais fullscreen que hoje podem encostar no notch (dialogs do app do aluno, RetroStories fullscreen — já trata).

### 3. Modo standalone (app instalado)
- Ajustes de `100dvh` + `safe-area` já existentes; validar que em `display-mode: standalone` o topo não fica sob a status bar (`.safe-top` já cobre).
- Adicionar `@media (display-mode: standalone)` apenas se necessário para pequenos ajustes de padding.

### 4. O que NÃO será feito
- Não adicionar service worker de cache/offline (app shell) — não foi pedido e pode travar preview com conteúdo velho. O `push-sw.js` de notificações continua intocado.
- Não alterar lógica de telas, dados ou backend.

## Validação
- Preview em viewport mobile: testar zoom (pinch e duplo-toque não devem dar zoom), rolagem sem bounce, barra inferior clicável com margem da área de gestos, dialogs abrindo sem cobrir conteúdo.
- `bunx tsgo --noEmit` para typecheck.
