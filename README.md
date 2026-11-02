# Bela Donzela — app de agendamento

- `backend/` API Express + Prisma + SQLite
- `app/` aplicativo Android (Expo / React Native)
- `docs/` modelo de política de privacidade para a Play Store
- **`GUIA-PLAY-STORE.md`** passo a passo completo (comece por aqui)

## Configuração do admin (horários, datas e limite de agendamentos)

No painel do admin, o botão **Configuração** abre: Horários (duração dos serviços), Datas (dias fechados, horário fixo e horário de um dia específico) e Agendamentos (limite de agendamentos novos por dia).

Depois de atualizar o código, aplique a migração do banco antes de iniciar a API: `cd backend && npx prisma migrate deploy` (ou `npm run setup`).

## Agendamento confirmado automaticamente e vários serviços

- **Confirmação automática:** todo agendamento já nasce `CONFIRMED`. O admin não confirma nem recusa nada; na aba **Agenda** ele só tem o botão **Cancelar agendamento** (libera o horário e avisa a cliente). As abas *Pendentes* e *Recusados* foram removidas.
- **Vários serviços:** a cliente marca quantos serviços quiser. O tempo do atendimento é a **soma** da duração deles, e os horários livres já consideram essa soma. Os serviços ficam na tabela `AppointmentService` (`Appointment.serviceId` guarda só o primeiro).
- **Banco já existente:** a migração `20261102000000_confirmacao_automatica_e_varios_servicos` cria a tabela nova, copia o serviço de cada agendamento antigo e confirma os que estavam pendentes. Quem usa `npm run setup` (`prisma db push`) tem o mesmo ajuste feito pelo `seed` e na inicialização da API (`src/lib/upgrade.js`).
- A API continua aceitando `serviceId` (um serviço) de versões antigas do app, além de `serviceIds` (lista).

## Dados pessoais criptografados no banco

Nome, telefone, e-mail do admin, mensagens das notificações e motivos (recusa/ausência) ficam **criptografados** (AES-256-GCM) no arquivo do banco. No app (cliente e admin) tudo aparece normalmente: a API descriptografa ao ler.

- A chave fica em `ENCRYPTION_KEY` no `backend/.env` (mínimo 32 caracteres; o servidor não inicia sem ela). **Guarde uma cópia em local seguro e não a troque**: sem a chave os dados não podem ser lidos.
- Em um banco que já tem dados em texto puro, faça uma cópia do `dev.db` e rode uma vez: `cd backend && npm run encrypt-existing` (pode repetir sem problema).
- Por trás disso: `backend/src/lib/crypto.js` (cifra) e `backend/src/lib/pii.js` (quais campos). Para criptografar outro campo, inclua-o em `FIELDS` no `pii.js`.
- Telefone e dono do push usam criptografia determinística, para a busca por igualdade continuar funcionando; nome e mensagens usam valor aleatório. Por isso não é possível filtrar por trecho de nome/telefone no banco.

## Rotas de monitoramento (somente admin)

Todas exigem o cabeçalho `Authorization: Bearer <token>` do login do admin (o mesmo da Área Administrativa), têm limite de 60 consultas por minuto e respondem com `Cache-Control: no-store`.

- `GET /api/admin/users?q=&sort=recent|name&page=1&pageSize=20`: lista de usuários com a quantidade de agendamentos de cada um e o próximo horário.
- `GET /api/admin/users/:id`: um usuário com todos os agendamentos e o andamento de cada um.
- `GET /api/admin/monitor/overview`: totais de usuários e de agendamentos por status.
- `GET /api/admin/monitor/appointments?status=CONFIRMED,DONE&from=AAAA-MM-DD&to=AAAA-MM-DD&q=&stage=&sort=asc|desc&page=1&pageSize=20`: andamento de todos os agendamentos (etapa atual e linha do tempo).
- `GET /api/admin/monitor/logs?level=info|warn|error&type=&q=&since=&until=&limit=100&offset=0`: registros do servidor (acessos, logins do admin, erros). Não guardam corpo das requisições, telefones, códigos nem tokens.

Os logs ficam em `backend/logs/app.log` (gira sozinho aos 5 MB). Para guardar em outra pasta, defina `LOG_DIR` no `.env`.
