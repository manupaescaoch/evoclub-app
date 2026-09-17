# Atendimento no padrão EVO Flow

## Objetivo
Transformar a área de atendimento do modo treinador em uma experiência equivalente ao EVO Flow, trazendo **Painel de turno** e **Turnos** para o EVO CLUB sem copiar dados ou configurações do outro projeto.

## O que será alterado

### 1. Navegação e estrutura do modo treinador
- Substituir a tela atual “Hoje” por **Painel de turno**.
- Disponibilizar **Turnos** na navegação do modo treinador.
- Ajustar cabeçalho e barra inferior para a hierarquia visual mostrada no EVO Flow, mantendo a marca EVO CLUB e a experiência mobile segura.

### 2. Painel de turno
- Reproduzir a composição do EVO Flow: saudação, unidade e função, data, botão “Equipe do dia”, períodos Manhã/Tarde/Noite e horários com contagem.
- Mostrar no horário selecionado: total e capacidade, Rádio Apoio, alunos, divisão Superior/Inferior e profissionais ativos.
- Permitir busca e inclusão de alunos, distribuição por responsável, redistribuição, alteração manual, confirmação do tipo de treino e abertura da ficha completa.
- Manter presença/falta, experimental, treino ativo e demais informações já existentes no EVO CLUB.
- Exibir estados reais de carregamento, vazio, erro, horário bloqueado e capacidade excedida.

### 3. Turnos
- Criar a visão diária de Manhã, Tarde e Noite com professores e treinadores escalados.
- Permitir confirmar presença individual ou de todo o turno.
- Permitir marcar Rádio Apoio quando a permissão autorizar.
- Registrar substituições pontuais, motivo, autor, horário e desfazer alteração.
- Integrar com a escala já existente, evitando duplicar a página de escala de fins de semana e feriados.

### 4. Dados reais e permissões
- Reaproveitar `classes`, `class_bookings`, `collaborators`, `shift_schedules`, `shift_swap_requests`, planos e avaliações existentes.
- Criar apenas os registros operacionais ausentes para distribuição diária, presença da equipe, Rádio Apoio e alterações do turno.
- Aplicar isolamento por unidade e permissões por perfil, com alterações de distribuição/equipe limitadas aos cargos autorizados.
- Não usar nomes, horários, capacidade ou alunos fixos do EVO Flow.

### 5. Validação
- Validar Painel de turno e Turnos em 393×622 e desktop.
- Testar troca de data/período/horário, inclusão e distribuição de aluno, confirmação da equipe, Rádio Apoio e substituição.
- Confirmar que o app compila sem erros e que os dados persistem no EVO CLUB.

## Detalhes técnicos
- O código do EVO Flow usa tabelas próprias (`day_sessions`, `assignments`, `day_participants`, `day_team_changes` e `radio_support_shifts`). A experiência será portada para React Router e para o design system atual.
- A capacidade virá da grade e da equipe real; o limite por responsável será configurável na estrutura operacional, não hardcoded.
- As operações novas serão protegidas por políticas de acesso e unidade no banco.
