# Auditoria em Configurações

Registrar tudo que cada usuário faz no sistema (criar, editar, excluir) e exibir em uma nova aba de Configurações com filtros e busca.

## 1. Banco de dados

Nova tabela `audit_logs`:
- `user_id` (uuid) — quem fez
- `user_name`, `user_email` (text) — snapshot legível mesmo se o usuário sair
- `action` (text) — `create` | `update` | `delete` | `login` | `logout` | `custom`
- `entity` (text) — ex.: `client`, `sale`, `training_plan`, `contract`, `transaction`…
- `entity_id` (text) — id do registro afetado
- `description` (text) — texto amigável ("Vendeu plano Mensal para João")
- `unit_id` (uuid, opcional) — unidade em que ocorreu
- `metadata` (jsonb) — diff antes/depois, valores relevantes
- `ip`, `user_agent` (text)

RLS: leitura só para admin/coordinator (via `has_role`). Inserção permitida a qualquer usuário autenticado (o app grava o próprio log).

## 2. Helper de log

Criar `src/lib/audit.ts` com `logAudit({ action, entity, entity_id, description, metadata, unit_id })` que:
- pega usuário atual da sessão
- insere em `audit_logs` sem bloquear a UI (fire-and-forget)
- exporta helpers curtos: `logCreate`, `logUpdate`, `logDelete`

## 3. Instrumentação (nesta fase, pontos de maior valor)

Chamar o helper após sucesso das operações-chave já existentes:
- Clientes (criar/editar/excluir)
- Vendas / planos contratados
- Contratos, Cupons, Serviços, Colaboradores (módulo Gerencial)
- Transações, Contas a pagar, Folha (Financeiro)
- Planos de treino (criar/prescrever/apagar)
- Login/Logout (em `AdminLayout` e `Login`)

Os demais módulos ficam preparados para receber `logAudit` depois — a tabela e o helper já suportam qualquer entidade.

## 4. UI — nova aba "Auditoria" em `/admin/configuracoes`

Adicionar aba ao lado de Empresa / Sistema / Integrações / Conta:

- Filtros: período (data de/até), usuário, entidade, ação, unidade, busca por texto
- Tabela paginada: Data/hora · Usuário · Ação (badge colorido) · Entidade · Descrição · Unidade
- Clique numa linha → drawer com `metadata` completo (JSON formatado, ip, user agent)
- Botão "Exportar CSV" do resultado filtrado
- Acesso restrito: se o usuário não é admin/coordinator, mostrar aviso "Sem permissão"

## Detalhes técnicos

- Índices: `(created_at desc)`, `(user_id)`, `(entity, entity_id)`, `(action)`
- Política RLS de leitura usa `public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordinator')`
- Política de inserção: `auth.uid() = user_id` e `user_id NOT NULL`
- Nenhum trigger no `auth` schema — o registro é feito do client após cada mutação bem-sucedida
- Sem alteração visual nas outras abas
