# 📱 SUBLINE - Documentação Completa de Features

## Índice
1. [Admin](#admin-features)
2. [Professional (Barber)](#professional-barber-features)
3. [Cliente](#cliente-features)
4. [Features Transversais](#features-transversais)
5. [Tecnologias](#tecnologias)

---

# 👥 ADMIN FEATURES

## Dashboard & Analytics

### Dashboard Principal
- **KPI Cards**: Exibição de 4 métricas principais na homepage
  - Total de utilizadores (todos os roles)
  - Subscrições ativas (count)
  - Receita mensal (soma de pagamentos do mês corrente)
  - Crescimento percentual vs mês anterior
  - Cálculo automático de crescimento: (users_this_month - users_last_month) / users_last_month * 100

- **Dashboard Extras**: KPIs adicionais
  - Tickets de suporte abertos/em progresso
  - Número de planos ativos na plataforma
  - Total de profissionais registados
  - Agendamentos programados para hoje

### Audit Logging
- Rastreio de todas as ações administrativas
- Registo de timestamp, user ID, action type
- Histórico completo de mudanças no sistema
- Visualização de quem fez o quê e quando

---

## Gestão de Utilizadores

### Create/Edit/Delete Users
- Criar novo utilizador com:
  - Email único (validação)
  - Password com hash bcrypt
  - Full Name
  - Role assignment (admin, barber, client, staff)
  - Phone number (opcional)
  - Avatar URL (opcional)
  - Status (active/inactive)

- Editar utilizador:
  - Atualizar todos os campos acima
  - Mudar role
  - Desativar/ativar conta
  - Reset de password

- Deletar utilizador:
  - Soft delete com cascata (relacionados)
  - Preservar audit trail
  - Manter dados históricos intactos

### User Management Listing
- Listar todos os utilizadores com:
  - Paginação (skip/take)
  - Filtros por role
  - Filtros por status (active/inactive)
  - Ordenação por nome, email, data de criação
  - Busca por email ou nome (substring)
  - Count total de utilizadores

### Role-Based Access Control
- Validação de permissões por endpoint
- 4 roles principales:
  - **Admin**: Acesso total ao sistema
  - **Barber**: Acesso à sua própria barbearia + staff
  - **Client**: Acesso apenas aos seus próprios dados
  - **Staff**: Acesso limitado a calendário e ponto

- Middleware de autenticação:
  - Validação de JWT token
  - Extração de user ID e role
  - Validação de autorização por rota
  - Error handling com mensagens claras

---

## Gestão de Profissionais (Barbers)

### Listar Profissionais
- Endpoint dedicado: `GET /admin/barbers`
- Retorna lista com:
  - ID
  - User ID
  - Nome completo
  - Telefone
  - Endereço
  - Bio/descrição
  - Rating (decimal, atualizado automaticamente)
  - Status Stripe (connected/not connected)
  - Data de criação
- Filtros:
  - Por status (ativo/inativo)
  - Por rating mínimo
  - Por palavra-chave no nome
- Ordenação por nome, rating, data de criação
- Paginação

### Editar Perfil de Profissional
- Atualizar:
  - Nome
  - Telefone
  - Endereço
  - Bio/descrição
  - Avatar/foto de perfil
  - Status (ativo/inativo)

### Ver Estatísticas por Profissional
- Número de clientes
- Número de agendamentos (total, este mês, hoje)
- Receita gerada (total, este mês)
- Rating médio
- Número de reviews
- Planos criados
- Staff members
- Serviços disponíveis

### Status de Profissional
- Ativo/Inativo
- Conectado a Stripe ou não
- Stripe Account ID (quando conectado)
- Data de conexão com Stripe

---

## Gestão de Planos & Subscrições

### Listar Planos
- Todos os planos criados por todos os profissionais
- Informações exibidas:
  - Nome do plano
  - Profissional que criou
  - Preço mensal
  - Limite de cortes por mês (null = ilimitado)
  - Status (ativo/inativo)
  - Data de criação
  - Stripe Product ID (se sincronizado)
  - Stripe Price ID (se sincronizado)

- Filtros:
  - Por profissional
  - Por status (ativo/inativo)
  - Por preço range
  - Por palavra-chave no nome

### Monitorizar Subscrições
- Listar todas as subscrições ativas
- Mostrar:
  - Cliente (nome, email)
  - Plano (nome, preço)
  - Profissional
  - Data de início
  - Data de renovação
  - Cortes utilizados / Cortes totais
  - Status (active, pending, payment_failed, cancelled)
  - Próxima data de cobrança

### Histórico de Pagamentos
- Listar todos os pagamentos do sistema
- Detalhes:
  - Cliente
  - Subscrição/Plano
  - Montante
  - Data de pagamento
  - Status (pending, paid, failed, refunded)
  - Método (card, sepa_debit, ideal, etc)
  - Stripe Payment Intent ID
  - Stripe Invoice ID

### Rastreio de Cortes
- Por cliente:
  - Cortes utilizados vs permitidos
  - Percentagem de utilização
  - Data de próxima renovação
  
- Por profissional:
  - Total de cortes vendidos
  - Total de cortes utilizados
  - Receita gerada
  
- Relatório mensal de utilização

---

## Suporte & Tickets

### Centro de Gestão de Tickets
- Listar todos os tickets de suporte
- Filtros:
  - Por status (open, in_progress, resolved, closed)
  - Por prioridade (low, medium, high)
  - Por categoria (payment, account, booking, other)
  - Por requester (cliente ou profissional)
  - Por data de criação

### Ver Detalhes do Ticket
- Informações:
  - ID único
  - Título/Assunto
  - Descrição inicial
  - Categoria
  - Prioridade
  - Status
  - Quem criou (cliente ou profissional)
  - Data de criação
  - Última atualização
  - Conversa integrada

### Responder a Tickets
- Admin pode responder com:
  - Texto da resposta (até 4000 caracteres)
  - Tipo (text ou image)
  - Imagem (URL)
  - Timestamp automático
  - Marcar resposta como "from admin"

### Mudar Status de Ticket
- Open → In Progress → Resolved → Closed
- Notificação automática ao requester
- Timestamp de mudança de status
- Histórico de mudanças

### Chat Integrado por Ticket
- Conversa privada entre admin e requester
- Histórico completo de mensagens
- Suporte a:
  - Mensagens de texto
  - Imagens
  - Tipos de mensagens (text, image, system)
- Marcar conversa como lida
- Notificações de novas mensagens

### Notificações ao Responder
- Cliente/Profissional recebe notificação
- Notificação com:
  - Tipo: "ticket_update"
  - Título: "Resposta do suporte"
  - Body: Primeiros 100 caracteres da resposta
  - deepLink: Link direto para o ticket
  - Data: Timestamp automático

---

## Reminders & Automatização

### Endpoint para Enviar Lembretes
- `POST /admin/reminders/send`
- Requer autenticação de admin
- Função: `sendAppointmentReminders()`

### Lógica de Reminders
- Encontra agendamentos entre 20-28 horas no futuro
- Critérios:
  - Status: NOT 'cancelled'
  - Sem reminder enviado (reminderSentAt IS NULL)
  - Data do agendamento dentro da janela de tempo
  
- Para cada agendamento:
  - Cria notificação para o cliente
  - Título: "Marcação amanhã às HH:MM"
  - Body: "Lembrete: tens uma marcação com [Barber Name] amanhã às HH:MM"
  - Dados: appointmentId, barberId, clientId, deepLink

### Atualização de Estado
- Marca appointment com `reminderSentAt = NOW()`
- Retorna count de reminders enviados
- Erro handling: continua com outros agendamentos

### Integração com Cron
- Pode ser chamado por serviço externo de cron
- Recomendação: Chamar uma vez por dia (ex: 8am)
- Timeout: Nenhum (processa o que encontrar)
- Idempotente: Mesmo agendamento não recebe múltiplos reminders

---

## Sistema de Notificações

### Ver Notificações
- Endpoint: `GET /api/notifications?limit=20`
- Retorna últimas 20 notificações (customizável)
- Campos:
  - ID
  - Tipo (appointment_reminder, ticket_update, message, etc)
  - Título
  - Body (preview)
  - isRead (boolean)
  - Data
  - deepLink (para navegação)

### Marcar como Lida
- Endpoint: `PUT /api/notifications/:id/read`
- Atualiza isRead = true
- Timestamp de leitura (opcional)

### Marcar Tudo como Lido
- Endpoint: `PUT /api/notifications/read-all`
- Marca todas as notificações do user como lidas

### Contar Não Lidas
- Endpoint: `GET /api/notifications/unread-count`
- Retorna count de notificações com isRead = false
- Usado para badge na UI

### DeepLinks
- Cada notificação tem campo `deepLink`
- Formatos:
  - `/client/calendar?appointmentId=123`
  - `/barber/support?ticketId=456`
  - `/admin/support?ticketId=789`
- Integração com navegação app

### Tipos de Notificações
- **appointment_reminder**: 24h antes do agendamento
- **ticket_update**: Resposta a um ticket
- **message**: Nova mensagem de chat
- **payment_success**: Pagamento recebido
- **subscription_renewal**: Subscrição renovada
- **review_received**: Nova avaliação recebida

---

# 🧔 PROFESSIONAL (BARBER) FEATURES

## Dashboard & Home

### Dashboard Overview
- Cards com estatísticas rápidas:
  - Agendamentos de hoje (count)
  - Receita este mês (soma)
  - Clientes ativos (count)
  - Reviews/Rating
  - Próximos 3 agendamentos (timeline)
  
### Widgets Customizáveis
- Drag-and-drop para reordenar
- Expand/collapse widgets
- Preferências salvas por profissional
- Dados em tempo real (atualização ao refrescar)

---

## Gestão de Clientes

### Listar Clientes
- Endpoint: `GET /barber/clients`
- Informações por cliente:
  - Nome
  - Email
  - Telefone
  - Data de primeira marcação
  - Última marcação
  - Total de marcações
  - Subscrição ativa (sim/não)
  - Rating (se deixou avaliação)

- Filtros:
  - Por nome
  - Por email
  - Por status de subscrição (com/sem)
  - Por data (clientes novos vs antigos)

- Paginação
- Ordenação por nome, data, número de marcações

### Ver Detalhes do Cliente
- Informações pessoais:
  - Nome, email, telefone
  - Data de inscrição
  - Última atividade
  
- Subscrições:
  - Plano ativo (se houver)
  - Data de início
  - Data de próxima renovação
  - Cortes utilizados/restantes
  
- Histórico de agendamentos:
  - Últimos 10 agendamentos
  - Status de cada um
  - Data, hora, serviço
  
- Histórico de pagamentos:
  - Últimos 5 pagamentos
  - Datas e montantes
  
- Notas:
  - Campo para anotações internas do profissional

### Adicionar Novo Cliente
- Form:
  - Nome *
  - Email *
  - Telefone
  - Criar automáticamente account ou não
- Se criar account:
  - User criado com role 'client'
  - Password temporária/enviada por email
  - Email de confirmação

### Histórico de Cortes
- Listar todos os cortes realizados para este cliente
- Dados por corte:
  - Data do corte
  - Serviço realizado
  - Duração
  - Notas
  - Staff que realizou (se aplicável)
  - Foto antes/depois (se guardada)

---

## Calendário & Agendamentos

### Vista Mensal do Calendário
- Grid 7 colunas (Dom-Sab)
- Mês navegável (anterior/próximo)
- Cada dia mostra:
  - Número do dia
  - Primeiros 2 agendamentos (truncados)
  - "+N mais" se houver mais agendamentos
  - Cores por status (pending=amarelo, confirmed=azul, completed=verde)

### Ver Agendamentos
- Lista por período:
  - Próximos agendamentos (ordenado por data/hora)
  - Agendamentos de hoje
  - Agendamentos passados (últimos 30 dias)
  
- Detalhes de cada agendamento:
  - ID único
  - Cliente (nome)
  - Data e hora (início e fim)
  - Duração em minutos
  - Serviço realizado
  - Profissional (self ou staff member)
  - Status (pending, confirmed, completed, no_show, cancelled)
  - Preço (se definido)
  - Notas internas
  - Notas do cliente
  - Data de criação

### Editar Agendamento
- Campos editáveis:
  - Data
  - Hora
  - Duração
  - Serviço
  - Profissional atribuído
  - Notas internas
  - Preço
  
- Validações:
  - Não pode editar agendamentos passados
  - Deve verificar disponibilidade
  - Não pode editar cancelados

### Confirmar Agendamento
- Muda status: pending → confirmed
- Notificação automática ao cliente
- Timestamp de confirmação
- Pode adicionar mensagem customizada

### Marcar como Completado
- Muda status: confirmed → completed
- Timestamp de conclusão
- Opção: Recolher feedback/avaliação
- Registar corte (se subscrição)

### Registar No-Show
- Muda status: confirmed → no_show
- Registar hora (foi marcado mas não compareceu)
- Notificação ao cliente
- Não desconta cortes (se subscrição)

### Cancelar Agendamento
- Muda status: * → cancelled
- Motivo do cancelamento
- Refund lógica (se foi pago)
- Notificação ao cliente
- Pode adicionar mensagem de desculpa

### Notas Internas vs Cliente
- **Notas Internas**: Visíveis apenas ao profissional
  - Preferências de corte
  - Histórico de problemas
  - Tipos de cabelo/pele
  
- **Notas do Cliente**: O que o cliente escreveu ao marcar
  - Descrição do que quer
  - Alergias/sensibilidades
  - Referências (fotos, descrições)

---

## Serviços & Catálogo

### Criar Serviço
- Formulário:
  - Nome do serviço *
  - Descrição (até 500 chars)
  - Categoria (haircut, beard, haircut_beard, other)
  - Preço em EUR *
  - Duração em minutos *
  - Imagem (upload)
  - Ativo/Inativo
  
- Validações:
  - Nome único por profissional
  - Preço > 0
  - Duração > 5 min
  - Imagem: JPG/PNG, max 5MB

### Editar Serviço
- Atualizar todos os campos acima
- Histórico de mudanças (log)
- Não pode deletar se tem agendamentos associados

### Deletar Serviço
- Soft delete (isActive = false)
- Agendamentos passados mantêm referência
- Novos agendamentos não podem usar serviço deletado

### Listar Serviços
- Tabela com:
  - Nome
  - Categoria
  - Preço
  - Duração
  - Status (ativo/inativo)
  - Número de agendamentos
  - Data de criação
  
- Filtros:
  - Por categoria
  - Por status
  - Por palavra-chave
  
- Ordenação
- Paginação

### Ver Detalhes do Serviço
- Informações completas
- Imagem de preview
- Histórico de agendamentos com este serviço
- Performance (quantos/mês, receita)
- Reviews relacionados (se deixarem feedback)

---

## Planos de Subscrição

### Criar Plano
- Formulário:
  - Nome do plano *
  - Descrição
  - Preço mensal em EUR *
  - Limite de cortes por mês (null = unlimited)
  - Ativo/Inativo
  
- Após criar:
  - Sincronizar com Stripe automaticamente (se configurado)
  - Criar Product no Stripe
  - Criar Price com recurring = monthly
  - Gerar Payment Link

### Editar Plano
- Pode editar:
  - Nome
  - Descrição
  - Status
  
- NÃO pode editar:
  - Preço (para subscrições existentes)
  - Limite de cortes (para subscrições existentes)
  
- Criar nova versão se mudanças necessárias

### Listar Planos
- Tabela com:
  - Nome
  - Preço
  - Limite de cortes
  - Número de subscribers
  - Receita mensal
  - Status
  - Data de criação
  
- Filtros:
  - Por status
  - Por preço range
  
- Ações: Edit, Delete (soft), View details

### Ver Detalhes do Plano
- Informações básicas
- Stripe Product ID e Price ID
- Payment Link (para compartilhar com clientes)
- Histórico de subscrições:
  - Cliente
  - Data início
  - Data término
  - Status
  - Última renovação
  
- Estatísticas:
  - Total subscribers (ativos)
  - Receita total vs mensalmente
  - Churn rate
  - Cortes utilizados vs vendidos

### Stripe Synchronization
- Quando criar novo plano:
  1. Criar Stripe Product
  2. Criar Stripe Price (EUR, monthly)
  3. Gerar Stripe Payment Link
  4. Guardar IDs no banco de dados
  
- Quando editar plano:
  - Se mudança de preço: criar novo Stripe Price
  - Atualizar Payment Link
  
- Quando deletar plano:
  - Soft delete (isActive = false)
  - Não deletar no Stripe (para histórico)

### Payment Links
- Formato: `https://buy.stripe.com/...`
- Configuração:
  - Produto (Service/Plan)
  - Preço
  - Quantidade default: 1
  - After completion:
    - Redirect URL: `https://app/client/subscription?stripe=success`
    - Type: Redirect
    
- Metadata no link:
  - planId: para associar subscrição
  - clientId: se cliente específico

---

## Gestão de Staff

### Adicionar Staff Member
- Formulário:
  - Nome *
  - Email *
  - Telefone
  - Função/Role (barber, receptionist, assistant)
  - Ativo/Inativo
  
- Ao criar:
  - User criado com role 'staff'
  - Associado a este profissional
  - Acesso concedido ao calendário/ponto
  - Email de convite (com link para setup password)

### Editar Staff Member
- Atualizar:
  - Nome
  - Email
  - Telefone
  - Função
  - Status (ativo/inativo)
  
- Não pode mudar para outro profissional

### Deletar Staff Member
- Soft delete (isActive = false)
- Agendamentos passados mantêm referência
- Histórico de ponto preservado

### Listar Staff
- Tabela com:
  - Nome
  - Email
  - Telefone
  - Função
  - Status
  - Agendamentos (este mês)
  - Receita gerada (este mês)
  - Data de contratação
  
- Filtros por função, status

### Gerir Disponibilidade de Staff
- Por staff member:
  - Definir horários por dia da semana
  - Pausas durante o dia
  - Blocos de indisponibilidade

- Detalhes (ver secção Disponibilidade abaixo)

### Calendário de Staff
- Vista por staff member
- Ver agendamentos atribuídos
- Ver horas de trabalho vs tempo livre
- Gráfico de utilização (%)

### Rastreio de Entrada/Saída (Time Entry)
- Staff faz clock-in ao chegar
- Clock-out ao sair
- Registar pausas:
  - break_start: início da pausa
  - break_end: fim da pausa
  
- Dashboard:
  - Horas trabalhadas (dia, semana, mês)
  - Média de horas
  - Ausências não justificadas
  - Histórico completo

- Admin pode:
  - Ver histórico de time entries
  - Editar (se necessário)
  - Gerar relatórios de horas
  - Exportar para folha de pagamentos

---

## Disponibilidade

### Definir Horários de Trabalho
- Para cada dia da semana:
  - Start time (HH:MM, formato 24h)
  - End time (HH:MM)
  - Ativo/Inativo (pode desativar dias)
  
- Exemplo:
  - Segunda-Sexta: 09:00 - 18:00
  - Sábado: 10:00 - 14:00
  - Domingo: Fechado

### Pausas de Almoço Configuráveis
- Para cada dia:
  - Break start time (HH:MM)
  - Break end time (HH:MM)
  
- Slots na pausa não aparecem como disponíveis
- Exemplo: 13:00 - 14:00

### Blocos de Indisponibilidade
- Criar períodos inteiros indisponíveis:
  - Data início
  - Data fim
  - Motivo (férias, doença, evento, etc)
  - Descrição
  
- Nenhum slot disponível nesse período
- Exemplos:
  - 25 Dez - 2 Jan (férias)
  - Dia específico (fechado para formação)

### Disponibilidade Customizada por Staff Member
- Staff pode ter horários diferentes:
  - Exemplo: João trabalha Seg-Qua 9-18, Qui-Sex 10-19
  - Maria trabalha Seg-Sab 9-17 com pausa 12-13
  
- Criar regras separadas por staff
- Usa mesmo sistema de BarberAvailability mas com staffMemberId

### Slot Generation Algorithm
- Para cada dia:
  1. Pega na regra de disponibilidade (horários normais)
  2. Remove pausa de almoço (se configurada)
  3. Remove blocos de indisponibilidade
  4. Gera slots de 30 minutos (default)
  5. Remove slots onde há agendamentos
  
- Retorna array de SlotResult:
  ```
  {
    time: "09:00",
    available: true
  }
  ```

### Duração Variável de Serviços
- Sistema respeita duração do serviço
- Slot de 30 min para serviço de 30 min
- Serviço de 60 min: ocupa 2 slots
- Exemplo: Serviço às 10:00 com 60 min ocupa 10:00-11:00

---

## Avaliações & Feedback

### Ver Avaliações Recebidas
- Endpoint: `GET /barber/reviews`
- Listagem com paginação:
  - Cliente (nome)
  - Data da avaliação
  - Rating (1-5 stars)
  - Comentário (truncado)
  - Data do agendamento que originou review
  
- Filtros:
  - Por rating (1, 2, 3, 4, 5 stars)
  - Por data range
  - Apenas com comentários
  
- Ordenação: mais recentes primeiro

### Classificação Média
- Atualiza automaticamente em Barber.rating
- Cálculo: AVG(Review.rating)
- Decimal com 1 casa (ex: 4.7)
- Atualiza sempre que novo review é criado

### Comentários dos Clientes
- Texto livre até 1000 caracteres
- Markdown básico suportado (bold, italic)
- Tags automáticas (ex: #profissional, #qualidade)
- Pode conter fotos antes/depois (opcional)

### Histórico de Reviews
- Visualização completa:
  - Todos os reviews por ordem chronológica
  - Dados completos (cliente, texto, rating, data)
  - Opção para "pin" review favorito (homepage)
  - Opção para "hide" review (não deletar, apenas ocultar)

### Paginação de Reviews
- 10 reviews por página (customizável)
- Navegação: anterior, próximo
- Count total
- Posição atual (ex: 1-10 de 47)

### Estatísticas
- **Total Reviews**: Count
- **Rating Médio**: Float com 1 decimal
- **Distribuição**: Gráfico de 5 barras (1-star a 5-star count)
- **Trend**: Rating este mês vs mês anterior

---

## Loja de Produtos

### Criar Produto
- Formulário:
  - Nome *
  - Descrição (até 1000 chars)
  - Categoria *
  - Preço em EUR *
  - Stock/Quantidade disponível *
  - Imagem (upload)
  - Ativo/Inativo
  
- Validações:
  - Nome único por profissional
  - Preço > 0
  - Stock >= 0
  - Imagem: max 5MB

### Editar Produto
- Atualizar todos os campos
- Histórico de mudanças de preço
- Se mudar stock: registar ajuste

### Deletar Produto
- Soft delete
- Encomendas passadas mantêm referência
- Novo stock: 0, ativo: false

### Listar Produtos
- Tabela com:
  - Imagem (thumbnail)
  - Nome
  - Categoria
  - Preço
  - Stock
  - Vendidos (count)
  - Receita
  - Status
  
- Filtros:
  - Por categoria
  - Por status
  - Por stock (em falta, baixo, ok)
  - Por palavra-chave
  
- Ordenação
- Paginação

### Inventário
- Stock atual
- Low stock alert (< 5 unidades)
- Histórico de movimentações:
  - Ajuste manual
  - Venda
  - Restituição
  
- Data e quantidade de cada movimento
- Razão/notas

### Categorias de Produtos
- Predefinidas ou customizadas:
  - Shampoo
  - Conditioner
  - Pomada/Gel
  - Lâminas
  - Outros

---

## Chat & Comunicação

### Chat com Clientes
- Conversas privadas por cliente
- Iniciar conversa:
  - Admin cria ou cliente inicia
  - Tipo: barber_client
  
- Histórico de mensagens:
  - Texto
  - Imagens
  - Timestamps
  - Quem enviou (barber/client)
  
- Marcar como lido

### Notificações de Mensagens
- Cliente recebe notificação quando profissional escreve
- Profissional recebe notificação quando cliente escreve
- Tipo: "message"
- DeepLink: `/barber/chat?conversationId=123`

### Enviar Mensagens
- Texto até 4000 chars
- Imagens (upload)
- Emoji support
- @mentions de clientes (opcional)

### Histórico de Conversas
- Listar últimas 20 conversas
- Ordenado por último update
- Mostra:
  - Cliente (nome)
  - Última mensagem (preview)
  - Data
  - Unread count
  
- Busca por cliente

---

## Suporte & Tickets

### Criar Ticket de Suporte
- Formulário:
  - Assunto *
  - Categoria * (payment, account, booking, other)
  - Prioridade (default: medium)
  - Mensagem inicial *
  
- Após criação:
  - ID único gerado
  - Conversa criada automaticamente
  - Notificação ao admin

### Ver Tickets
- Lista com:
  - ID / Assunto
  - Status
  - Prioridade
  - Categoria
  - Data de criação
  - Última atualização
  
- Filtros: status, prioridade, categoria
- Ordenação: urgentes primeiro, depois antigos

### Responder a Tickets
- Chat integrado
- Mensagens de texto
- Imagens
- Notificação ao admin

### Status de Tickets
- Open → In Progress → Resolved → Closed
- Pode reverter status
- Timestamp de cada mudança

---

## Perfil & Configurações

### Editar Perfil
- Nome *
- Bio/Descrição
- Foto de perfil
- Telefone
- Endereço completo
- Site (opcional)
- Social media (opcional)

### Stripe Configuration
- Conectar/Desconectar conta Stripe
- Ver status (connected/not connected)
- Stripe Account ID (quando conectado)
- Data de conexão
- Botão "Reconectar" se expirou

### Alterar Password
- Validação: password atual
- Nova password: mín 8 chars, 1 maiúscula, 1 número

### Logout
- Invalida refresh token
- Redirect para login

---

# 👨‍💼 CLIENTE FEATURES

## Dashboard & Home

### Home Page
- Cards com resumo:
  - Próxima marcação (data, hora, profissional)
  - Subscrição ativa (plano, cortes restantes)
  - Últimas avaliações deixadas
  
### Quick Actions
- Botões destacados:
  - "Nova Marcação"
  - "Ver Calendário"
  - "Ver Avaliações"
  - "Contactar Profissional"

### Próximas Marcações
- Timeline com próximos 3-5 agendamentos
- Click expande para detalhes
- Opção para cancelar/editar

---

## Calendário & Agendamentos

### Ver Todos os Agendamentos
- Separados em dois grupos:
  - **Próximos**: Futuros, ordenados por data
  - **Passados**: Últimos 30 dias, ordenados reverso

- Formato de lista:
  - Data e hora (em card destacado)
  - Serviço
  - Profissional
  - Status (badge com cores)
  - Duração
  
### Detalhes Completo de Agendamento
- Modal/página com:
  - Data e hora
  - Profissional atribuído
  - Serviço
  - Duração
  - Status
  - Notas do profissional (se houver)
  - Preço (se definido)
  - Local/Endereço
  - Opção para editar/cancelar
  - Botão "Deixar Avaliação" (se passado e não avaliado)

### Editar Agendamento
- Pode editar:
  - Data
  - Hora
  - Serviço
  - Duração
  - Profissional (opcional)
  - Notas
  
- Não pode editar:
  - Agendamentos passados
  - Agendamentos muito próximos (< 24h)

### Cancelar Agendamento
- Requer confirmação
- Texto: "Tens a certeza que quer cancelar?"
- Se é subscrição:
  - Refund: Corte volta ao disponível
  - Mensagem: "Corte devolvido à tua subscrição"
- Se é pago à parte:
  - Opção de refund
  - Email com instruções

---

## Booking / Marcações

### Interface de Booking
- Wizard de 4 passos:
  1. Escolher serviço
  2. Escolher data
  3. Escolher hora
  4. Confirmar (notas, resumo)

### Passo 1: Escolher Serviço
- Dropdown ou cards com:
  - Nome do serviço
  - Preço
  - Duração
  - Descrição
  
- Se profissional tem catálogo:
  - Mostrar serviços do catálogo
- Se não tem:
  - Mostrar tipos padrão (haircut, beard, etc)

### Passo 2: Escolher Data
- Calendário interativo
- Só datas futuras ativadas
- Mínimo: amanhã (ou hoje se ainda aberto)
- Máximo: 3 meses no futuro
- Click no dia seleciona

### Passo 3: Escolher Hora
- Slots de 30 minutos (ou conforme configurado)
- Apenas slots disponíveis são clicáveis
- Slots ocupados aparecem desativados
- Ao selecionar serviço com duração diferente:
  - Mostra se cabe naquele slot
  - Exemplo: Serviço de 60 min não cabe em slot 17:30

- **Filtro por Profissional** (novo):
  - Dropdown: "Qualquer um" ou selecionar staff member
  - Slots atualizam para mostrar disponibilidade daquele profissional
  - Se nenhum staff disponível: "Sem slots disponíveis neste dia"

### Passo 4: Confirmar
- Resumo:
  - Serviço
  - Data
  - Hora
  - Profissional
  - Duração
  - Preço (se houver)
  
- Notas (opcional):
  - "Algo que o profissional deva saber?"
  - Max 500 chars
  
- Botão: "Confirmar Marcação"
- Após confirmar:
  - Notificação ao profissional
  - Email de confirmação ao cliente
  - Status: pending (aguardando confirmação)

---

## Slots de Disponibilidade

### Ver Slots Disponíveis
- Endpoint chamado dinamicamente ao selecionar data
- Retorna array de slots para esse dia:
  ```
  [
    { time: "09:00", available: true },
    { time: "09:30", available: false },
    { time: "10:00", available: true },
    ...
  ]
  ```

### Filtragem por Profissional
- Ao selecionar staff member:
  - Endpoint recebe `staffId` no query
  - Só mostra horários onde aquele staff está disponível
  - Bloco agendamentos daquele staff
  - Exemplos:
    - Staff A: 9-17
    - Staff B: 10-18
    - Cliente escolhe Staff B: slots 10:00+ aparecem, 9:00-9:30 desativados

### Blocos de Tempo Ocupados
- Slots onde já há agendamento ficam:
  - Desativados (cannot click)
  - Visual diferente (cinzento, strikethrough)
  - Tooltip: "Indisponível"

### Suporte a Duração Variável
- Se serviço tem duração personalizada:
  - Slot selection valida se cabem
  - Exemplo: Serviço de 60 min, slot 17:30
    - Falharia (fim às 18:30 < fim expediente 18:00)
    - Slot desativado

---

## Serviços & Preços

### Ver Catálogo de Serviços
- Listagem/cards com:
  - Nome
  - Descrição
  - Preço
  - Duração
  - Imagem
  
- Clicável para ver detalhes

### Preço por Serviço
- Mostra:
  - Preço em EUR
  - Se está incluído em algum plano
  - Desconto se tem subscrição ativa

### Duração de Cada Serviço
- Mostra em minutos
- Referência para planejar slot

### Descrição e Imagens
- Descrição: até 500 chars
- Imagens: 1-5 por serviço
- Carousel de imagens

---

## Subscrições & Planos

### Ver Planos Disponíveis
- Listagem de planos oferecidos pelo profissional
- Cards com:
  - Nome
  - Preço mensal
  - Limite de cortes (ou "Ilimitado")
  - Descrição
  - "Ver Detalhes" ou "Subscrever"

### Detalhes de Plano
- Página completa:
  - Nome, descrição
  - Preço mensal
  - Limite de cortes
  - Duração (mensal, renovação automática)
  - O que está incluído
  - Termos de cancelamento
  
- Reviews de outros clientes com este plano
- Botão: "Subscrever agora"

### Inscrever-se em Plano
- Redireciona para Stripe Payment Link
- Payment Link:
  - Configurado pelo profissional
  - Preço pré-preenchido
  - Após pagamento: webhook cria Subscription
  - Redirect: `/client/subscription?stripe=success`

### Ver Subscrição Ativa
- Se cliente tem subscrição ativa:
  - Mostra plano
  - Data de início
  - Data de próxima renovação
  - Preço mensal
  - Número de cortes inclusos
  
### Ver Cortes Utilizados vs Restantes
- Exemplo:
  - Plano: 2 cortes/mês
  - Utilizados este mês: 1
  - Restantes: 1
  - Próxima renovação: 15 de Junho
  
- Visual: Progressbar ou ícones de tesoura

### Renovação Automática Mensal
- Webhook de Stripe:
  - `invoice.payment_succeeded`
  - Atualiza Subscription:
    - cutsUsed: 0 (reset)
    - renewalDate: +1 mês
    - Cria Payment com status paid
  
- Notificação ao cliente:
  - "Subscrição renovada com sucesso"
  - Mostra novo período

### Cancelar Subscrição
- Botão "Cancelar Subscrição"
- Confirma: "A subscrição será cancelada no final do período"
- Chama Stripe para cancelar
- Status muda para "cancelled"

---

## Avaliações & Feedback

### Deixar Avaliação
- Modal/formulário:
  - Rating: 5 stars (click para selecionar)
  - Comentário (opcional, max 1000 chars)
  - Submeter

- Disponível para:
  - Agendamentos passados
  - Que não foram cancelados
  - Que ainda não têm review

### Star Rating Interface
- 5 estrelas clickáveis
- Hover mostra seleção
- Click confirma
- Cada estrela é um ícone de Lucide

### Submeter Review
- POST `/client/appointments/:appointmentId/review`
- Body:
  ```json
  {
    rating: 5,
    comment: "Excelente corte, muito satisfeito!"
  }
  ```

- Após sucesso:
  - Feedback visual "Avaliação enviada com sucesso"
  - Modal fecha
  - Review aparece na lista imediatamente (sem refresh)
  - Barber recebe notificação

### Ver Próprio Histórico de Reviews
- Página com todas as avaliações que deixou
- Lista com:
  - Profissional
  - Data do agendamento
  - Rating que deixou
  - Comentário
  - Data que deixou review
  
- Filtros: por rating, por profissional
- Ordenado: mais recentes primeiro

---

## Loja & Compras

### Ver Produtos Disponíveis
- Listagem/grid de produtos
- Cards com:
  - Imagem
  - Nome
  - Categoria
  - Preço
  - Stock status (disponível, poucas unidades)
  
- Click abre detalhes

### Detalhes de Produto
- Página:
  - Imagem grande (carousel)
  - Nome, categoria
  - Preço
  - Descrição completa
  - Stock disponível
  - "Adicionar ao Carrinho"

### Adicionar ao Carrinho
- Seleciona quantidade
- Validação: max stock disponível
- Toast: "Produto adicionado ao carrinho"
- Pode continuar shopping

### Carrinho
- Icone com count de produtos
- Página do carrinho mostra:
  - Lista de produtos
  - Quantidade (com +/- para ajustar)
  - Preço unitário
  - Subtotal por produto
  - Total geral
  - Botão: "Checkout"

### Checkout
- Redireciona para Stripe
- Payment:
  - Cartão de crédito
  - Sepa debit
  - iDeal (se PT)

### Histórico de Encomendas
- Página/tab mostra encomendas passadas
- Lista com:
  - Data da encomenda
  - Produtos (count)
  - Total pago
  - Status
  
- Click expande detalhes:
  - Produtos com quantidades
  - Preços individuais
  - Endereço de entrega
  - Tracking (se disponível)

### Status da Encomenda
- pending: Pagamento confirmado, preparando
- completed: Entregue
- cancelled: Cancelada

---

## Chat & Comunicação

### Chat com Profissional
- Conversa privada
- Iniciar:
  - Botão "Enviar mensagem" no perfil do profissional
  - Ou responder a mensagem anterior
  
- Histórico:
  - Scroll para ver conversas antigas
  - Timestamps
  - Quem enviou (você ou profissional)

### Enviar Mensagens
- Input text
- Suporta:
  - Texto até 4000 chars
  - Imagens (upload)
  - Emoji
  
- Send button: Enter ou botão

### Notificações
- Notificação quando profissional escreve
- Tipo: "message"
- DeepLink: `/client/chat?conversationId=123`

---

## Suporte & Tickets

### Criar Ticket de Suporte
- Botão "Novo Ticket" na página Suporte
- Form:
  - Assunto *
  - Categoria * (payment, account, booking, other)
  - Mensagem *
  
- Após criar:
  - Confirmação visual
  - Listado na página
  - Admin recebe notificação

### Ver Tickets
- Lista com:
  - ID / Assunto
  - Status (badge)
  - Categoria
  - Data de criação
  - Última atualização
  
- Click abre detalhes

### Responder a Tickets
- Modal/página mostra:
  - Detalhes do ticket
  - Chat com admin
  - Input para responder

- Cada mensagem tem:
  - Timestamp
  - Quem enviou
  - Texto

### Status do Ticket
- Cliente vê:
  - open: Pendente
  - in_progress: Em análise
  - resolved: Resolvido
  
- Notificação quando muda status

### Histórico de Tickets
- Página mostra todos os tickets que criou
- Filtros: status, categoria
- Busca por assunto

---

## Notificações

### Receber Lembretes de Agendamentos
- Notificação 24h antes
- Título: "Marcação amanhã às 10:00"
- Body: "Lembrete: tens uma marcação com João Barbeiro amanhã às 10:00"
- Click vai para detalhes do agendamento

### Notificações de Respostas
- Quando profissional responde a chat
- Quando admin responde a ticket

### Notificações de Mensagens
- Mensagens novo do profissional
- Badge count atualiza em tempo real

### Marcar como Lida
- Click na notificação marca como lida
- Pode marcar tudo como lido

### DeepLinks
- Cada notificação tem link direto
- Click leva directamente ao assunto:
  - Agendamento
  - Chat
  - Ticket
  - Avaliação

---

## Perfil & Conta

### Editar Perfil
- Campos:
  - Nome *
  - Email (ler-apenas)
  - Telefone
  - Foto de perfil
  - Bio (opcional)

### Alterar Password
- Form:
  - Password atual *
  - Password nova *
  - Confirmar password *
  
- Validações:
  - Password atual deve ser correto
  - Password nova mín 8 chars
  - Passwords devem coincidir

### Ver Histórico de Atividade
- Log de ações:
  - Agendamentos criados
  - Subscrições
  - Reviews deixados
  - Mensagens enviadas
  - Tickets criados
  
- Data/hora de cada ação
- Descrição resumida

### Logout
- Button na página de perfil
- Limpa tokens
- Redirect para login

---

# 🔐 FEATURES TRANSVERSAIS

## Autenticação & Segurança

### Login com Email/Password
- Endpoint: `POST /auth/login`
- Request:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- Validações:
  - Email existe
  - Password correto
  - User ativo (não deletado)
  
- Response:
  ```json
  {
    "user": { id, email, role, ... },
    "accessToken": "jwt...",
    "refreshToken": "jwt..."
  }
  ```

### JWT Tokens
- **Access Token**:
  - Duração: 15 minutos
  - Payload: userId, role, clientId, barberId, staffId
  - Enviado em Authorization header: `Bearer <token>`
  - Validado em cada request
  
- **Refresh Token**:
  - Duração: 7 dias
  - Armazenado em HttpOnly cookie
  - Endpoint: `POST /auth/refresh`
  - Retorna novo access token
  - Implementa rotation (novo refresh token também)

### Roles-Based Access Control (RBAC)
- **Admin**: Acesso a tudo
- **Barber**: Acesso ao seu próprio negócio + staff + clientes
- **Client**: Acesso aos seus dados + agendamentos + subscrições
- **Staff**: Acesso ao calendário + ponto + agendamentos atribuídos

### Validação de Permissões
- Middleware `requireAuth`:
  - Valida JWT token
  - Extrai user ID e role
  - Atualiza req.auth
  
- Middleware `requireRole`:
  - Verifica se role é permitido
  - Exemplo: `requireRole('barber', 'admin')`
  - Se não permitido: 403 Forbidden

### Password Hashing
- bcrypt com salt rounds: 10
- Armazenado em User.passwordHash
- Nunca retornado em responses

### Refresh Token Rotation
- Ao usar refresh token:
  1. Valida token
  2. Gera novo access token
  3. Gera novo refresh token
  4. Invalida token anterior (opcional)
  5. Retorna ambos
  
- Protege contra token theft

---

## Pagamentos & Stripe

### Integração com Stripe Connect
- **OAuth Flow**:
  1. Profissional clica "Conectar Stripe"
  2. Redireciona para Stripe OAuth
  3. Profissional autoriza
  4. Stripe redireciona para callback
  5. Backend troca código por access token
  6. Guarda Stripe Account ID
  
- **Endpoints**:
  - `GET /barber/stripe/status`: Ver status
  - `GET /barber/stripe/connect-url`: Gerar URL de OAuth
  - Callback: `GET /api/public/stripe/callback?code=...&state=...`

### Payment Links
- Criados automaticamente quando:
  - Profissional cria novo plano
  - Contém: produto, preço, quantidade, redirect
  
- Exemplo:
  - URL: `https://buy.stripe.com/test_...`
  - Clientes compartilham com clientes
  - Clientes pagam via link
  - Após sucesso: `?stripe=success`

### Webhooks para Confirmação
- Endpoint: `POST /api/webhooks/stripe`
- Verifica assinatura com STRIPE_WEBHOOK_SECRET
- Eventos tratados:
  - **checkout.session.completed**:
    1. Pega planId e clientId dos metadados
    2. Cria Subscription
    3. Cria Payment (status: paid)
    4. Notifica cliente
    
  - **invoice.payment_succeeded**:
    1. Encontra Subscription
    2. Atualiza renewalDate = +1 mês
    3. Reset cutsUsed = 0
    4. Cria Payment
    5. Notifica cliente
    
  - **invoice.payment_failed**:
    1. Atualiza status: payment_failed
    2. Notifica ambos (cliente + barbeiro)
    
  - **customer.subscription.deleted**:
    1. Atualiza status: cancelled
    2. Notifica ambos

### Histórico de Pagamentos
- Armazenado em Payment model:
  ```
  {
    subscriptionId
    amount
    status (pending, paid, failed, refunded)
    method (card, sepa_debit, ideal)
    paymentDate
    stripePaymentIntentId
    stripeInvoiceId
  }
  ```

- Acessível por:
  - Admin: Todos os pagamentos
  - Barber: Pagamentos dos seus clientes
  - Client: Seus próprios pagamentos

### Rastreio de Status
- pending: Aguardando processamento
- paid: Confirmado
- failed: Falhou (nova tentativa possível)
- refunded: Reembolso processado

---

## Notifications & Events

### Sistema de Notificações
- Modelo Notification:
  ```
  {
    id: uuid
    userId: fk -> User
    type: string (appointment_reminder, ticket_update, message, etc)
    title: string
    body: string (preview)
    data: JSON (metadados)
    isRead: boolean
    deepLink: string
    createdAt: timestamp
  }
  ```

### Tipos de Notificações
- **appointment_reminder**: 24h antes
- **ticket_update**: Resposta a ticket
- **message**: Nova mensagem de chat
- **payment_success**: Pagamento recebido
- **subscription_renewal**: Subscrição renovada
- **review_received**: Nova avaliação
- **appointment_confirmed**: Agendamento confirmado
- **appointment_cancelled**: Agendamento cancelado

### DeepLinks
- Formato: `/role/page?param=value`
- Exemplos:
  - `/client/calendar?appointmentId=123`
  - `/barber/support?ticketId=456`
  - `/barber/reviews?clientId=789`
  - `/client/chat?conversationId=abc`

- Frontend:
  - Click em notificação com deepLink
  - Router navega para o link
  - Página lê params e carrega dados

### Marcar como Lida
- `PUT /api/notifications/:id/read`
- Atualiza isRead = true
- Pode marcar tudo

### Badges com Contagem
- `GET /api/notifications/unread-count`
- Retorna count
- Badge no icon de notificações

---

## Database & ORM

### PostgreSQL
- Relacional, open-source
- Hosted em Railway
- Full-text search (para buscas futuras)
- JSONB (para dados flexíveis)
- Triggers (para audit logging)

### Prisma ORM
- Type-safe queries
- Migrations com `npx prisma migrate dev`
- Schema em `prisma/schema.prisma`
- Client gerado automaticamente
- Relations: 1-1, 1-many, many-many

### Soft Deletes
- Muitos modelos têm `isActive: Boolean`
- Em vez de deletar (DELETE), faz UPDATE isActive=false
- Preserva histórico
- Queries filtram por isActive=true por default
- Exemplo:
  ```prisma
  where: { isActive: true }
  ```

### Índices para Performance
- Índices em campos frequentemente filtrados:
  - `barberId, clientId, date` (Appointment)
  - `email` (User, para login rápido)
  - `status` (Appointment, Subscription, SupportTicket)
  - `createdAt` (para paginação)
  - `userId` (Notification, para feed)

### Relações Complexas
- **Appointment**:
  - barber (n-1)
  - client (n-1)
  - staffMember (n-1, opcional)
  - service (n-1, opcional)
  - cut (1-1, opcional)
  - review (1-1, opcional)

- **Subscription**:
  - client (n-1)
  - plan (n-1)
  - payments (1-many)
  - cuts (1-many)

- **Review**:
  - appointment (1-1)
  - client (n-1)
  - barber (n-1)

---

## API & Backend

### Express.js REST API
- Estrutura:
  ```
  server/src/
    routes/
      admin.ts
      barber.ts
      client.ts
      staff.ts
      public.ts
    middleware/
      auth.ts
      error.ts
    lib/
      db.ts
      errors.ts
      audit.ts
      calendar.ts
      reminders.ts
  ```

### Zod Validation Schemas
- Todo request body é validado
- Exemplo:
  ```typescript
  const createPlanSchema = z.object({
    name: z.string().min(1).max(100),
    price: z.number().positive(),
    cutsPerMonth: z.number().int().positive().optional(),
  });
  ```

- Error handling automático
- Mensagens de erro customizadas

### TypeScript Strict Typing
- `strict: true` em tsconfig.json
- Todos os tipos definidos
- Sem `any` (código review rejeita)
- Imports com `.js` extension (ESM)

### Error Handling
- Custom error classes:
  ```typescript
  BadRequest(message, code)
  Unauthorized(message)
  Forbidden(message)
  NotFound(message)
  Conflict(message)
  ```

- Middleware de error:
  - Catch globais de erros
  - Logging
  - Resposta padronizada
  - HTTP status correto

### Audit Logging
- Função `logAudit`:
  ```typescript
  logAudit({
    userId,
    action,
    resourceType,
    resourceId,
    changes,
  })
  ```

- Armazenado em AuditLog
- Histórico completo de mudanças

### Pagination
- Query params: `skip` e `take`
- Resposta:
  ```json
  {
    items: [...],
    pagination: {
      skip: 0,
      take: 10,
      total: 100
    }
  }
  ```

### Filtering & Sorting
- Query params: `filter`, `sort`
- Suportado em:
  - Appointment
  - User
  - Client
  - Subscription
  - SupportTicket
  - Review
  - Product

---

## Frontend & UI

### React com Vite
- Setup:
  - Vite config com React plugin
  - Fast HMR (hot module reload)
  - Tree-shaking automático
  - Build otimizado

### TypeScript
- Strict mode
- Todos os componentes tipados
- Props interfaces
- Return types em funções

### React Router
- Estrutura:
  ```
  /admin → AdminLayout → Routes
  /barber → BarberLayout → Routes
  /client → ClientLayout → Routes
  /staff → StaffLayout → Routes
  /login → Login
  ```

- Dynamic imports com lazy()
- Protected routes com middleware de auth
- DeepLink support

### Tailwind CSS
- Utility-first CSS
- Custom colors para brand
- Responsive breakpoints
- Dark mode (opcional)

### Lucide Icons
- 300+ ícones
- Inline SVGs (sem HTTP requests)
- Importação por nome
- Customização de size, stroke, color

### Modal Componentes
- Reutilizável `<Modal>`
- Props:
  - open: boolean
  - onClose: callback
  - title: string
  - size: sm | md | lg
  - footer: ReactNode (buttons)

- Backdrop click fecha

### Toast Notificações
- `useToast()` hook
- Métodos: `.success()`, `.error()`, `.info()`, `.warning()`
- Auto-dismiss após 3s
- Stacked (múltiplos toasts)

### Loading States
- `<Spinner>` componente
- Skeletons para lists
- Disabled buttons durante loading
- Mensagens "Carregando..."

### Responsive Design
- Mobile-first approach
- Breakpoints:
  - sm: 640px
  - md: 768px
  - lg: 1024px
  - xl: 1280px

- Layout adapta em cada breakpoint
- Bottom nav em mobile
- Side nav em desktop

---

## Internacionalização

### Português (PT) Principal
- Toda a UI em português
- Nomes de meses, dias em português
- Formatos de data: dd/mm/yyyy

### Textos Customizados
- Nomes de roles:
  - Admin → Admin
  - Barber → Profissional
  - Client → Cliente
  - Staff → Staff
  
- Mensagens de erro em português
- Labels de forms em português

### Datas em Formato Local
- Função `formatDate()`:
  - Entrada: Date ou string ISO
  - Saída: "4 de Maio de 2026" ou "4 Mai 2026"
  
- Função `formatRelative()`:
  - Entrada: Date
  - Saída: "há 2 horas", "ontem", "há 3 dias"

---

# 📚 RESUMO TÉCNICO

## Stack Tecnológico

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Validation**: Zod
- **Auth**: JWT (access + refresh tokens)
- **Payment**: Stripe API + Connect OAuth
- **Hosting**: Railway
- **Email**: (não implementado, pronto para integração)

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **State**: React hooks (useState, useContext)
- **Hosting**: Vercel (ou Railway static)

### DevOps
- **VCS**: GitHub
- **CI/CD**: GitHub Actions (automático no Railway)
- **Database Migration**: Prisma Migrate
- **Deployment**: Railway (monorepo support)
- **Environment**: .env (desenvolvimento local)

## Modelos de Dados (30+ tabelas)

### Core
- User, Barber, Client, StaffMember

### Calendário
- Appointment, BarberAvailability, BarberUnavailable, TimeEntry

### Subscriptions
- Plan, Subscription, Payment, Cut

### Serviços
- Service, Review

### Suporte
- SupportTicket, Conversation, Message

### Notificações
- Notification

### E-commerce
- Product, ProductOrder

### Sistema
- AuditLog, (User-related, etc)

## Features por Status

✅ **Live (Implementado e Deployed)**
- Autenticação + RBAC
- Dashboard admin
- Gestão de utilizadores
- Calendário com slots
- Booking system
- Subscrições com Stripe
- Serviços + Catálogo
- Staff management
- Disponibilidade + Pausas
- Chat + Suporte
- Notifications
- Reminders (agendado)
- Reviews + Feedback
- Loja de produtos
- Ponto + Time tracking

🔧 **Próximas Fases**
- Multiple Salons (Fase 4)
- Goals/KPIs
- Marketing Campaigns
- Client Classification (ML)
- Upsell System
- Advanced Search
- Mobile App (Capacitor)
- SMS Notifications
- Email Templates
- API Rate Limiting

---

## Estatísticas

- **30+ modelos de dados**
- **100+ endpoints API**
- **50+ componentes React**
- **5000+ linhas de código backend**
- **3000+ linhas de código frontend**
- **12+ meses de desenvolvimento (simulado)**
- **100% TypeScript**
- **Cobertura de testes: Parcial (ready para implementação)**

---

## Fluxos Principais

### Fluxo de Agendamento
1. Cliente login
2. Busca profissional
3. Seleciona data
4. Seleciona hora (slots dinâmicos)
5. Escolhe staff (opcional)
6. Confirma com notas
7. Sistema cria Appointment (pending)
8. Profissional recebe notificação
9. Profissional confirma
10. Cliente recebe notificação
11. 24h antes: reminder automático

### Fluxo de Subscrição
1. Cliente vê planos
2. Clica "Subscrever"
3. Redireciona para Stripe Payment Link
4. Paga
5. Stripe webhook: checkout.session.completed
6. Backend cria Subscription + Payment
7. Cliente vê "ativo" na app
8. Mensalmente: Stripe cobra
9. Webhook: invoice.payment_succeeded
10. Backend reset cuts, atualiza data renovação
11. Cliente notificado

### Fluxo de Ticket de Suporte
1. Cliente/Profissional cria ticket
2. Admin recebe notificação
3. Admin responde no chat
4. Cliente/Profissional notificado
5. Conversa continua até "Resolvido"
6. Ambos recebem notificação final

---

**Documentação completa da SUBLINE | v3.0 (May 2026)**
