# Bela Donzela — do código à Play Store

Este projeto tem duas partes:

- `backend/` — API (Express + Prisma + SQLite): horários, agendamentos, notificações e área administrativa.
- `app/` — aplicativo Android (Expo / React Native) com as telas do seu app atual.

> O que foi testado aqui e o que não foi: veja a seção **"Estado da verificação"** no final.

---

## 1. Rodar o backend no seu computador

Precisa do Node 20 ou mais novo.

```bash
cd backend
cp .env.example .env        # edite: JWT_SECRET, ADMIN_PHONE, ADMIN_EMAIL e os dados SMTP (envio do código)
npm install
npm run setup               # cria o banco, os serviços e o usuário admin
npm start                   # API em http://localhost:3000/api
```

Em outro terminal, confira se tudo responde direito:

```bash
npm test                    # lógica de horários (roda sem o servidor)
npm run smoke               # percorre a API de verdade: cadastro, agenda, recusa horário repetido, cancela, admin
```

**Como funciona o login agora.** Ao tocar em "Fazer Agendamento", quem ainda não se cadastrou informa só **nome e
telefone** (ficam salvos no banco e no aparelho, então não precisa repetir). Se o telefone digitado for o do admin
(`ADMIN_PHONE`), o app abre a tela de **e-mail**: o admin digita o `ADMIN_EMAIL`, recebe um **código de 6 dígitos**
(vale 10 minutos, uso único, 5 tentativas) e só então entra no painel.

- O envio é feito por SMTP. No Gmail, ative a verificação em duas etapas e crie uma **senha de app**; use-a em `SMTP_PASS`.
- Em desenvolvimento, **sem SMTP configurado**, o código aparece no terminal onde a API está rodando.
- Em produção (`NODE_ENV=production`) o SMTP é obrigatório.
- O telefone do WhatsApp do ateliê aparece publicamente no app. Use em `ADMIN_PHONE` um número que só você conheça,
  nunca o público: quem souber esse número chega à tela do e-mail (mas ainda precisaria do e-mail e do código).
- Ao atualizar um banco que já existia, rode `npm run setup` de novo (cria as tabelas novas e grava o e-mail do admin).

## 2. Colocar o backend na internet

O app publicado na Play Store não alcança o seu computador. A API precisa estar online **com HTTPS**
(o Android bloqueia conexões sem HTTPS em apps de loja).

Ponto de atenção: o banco é um arquivo SQLite. Hospedagens gratuitas que apagam o disco a cada atualização
**perdem os agendamentos**. Escolha uma que ofereça **disco/volume persistente** (Fly.io, Railway com volume,
Render com disk, ou um VPS) e aponte `DATABASE_URL` para esse volume, por exemplo `file:/data/prod.db`.
Faça backup periódico desse arquivo.

No servidor: configure as variáveis do `.env`, rode `npm install && npm run setup` e `npm start`.
Teste abrindo `https://SEU-DOMINIO/api/health` — deve responder `{"ok":true}`.

## 3. Rodar o app no celular

```bash
cd app
npm install
npm run deps                # instala as versões compatíveis com o SDK do Expo
cp .env.example .env        # EXPO_PUBLIC_API_URL com o IP do seu PC (teste) ou a URL online
npx expo start
```

Abra com o app Expo Go no Android (mesma rede Wi-Fi). Se `npm install` reclamar de versões, rode `npm run fix`.

**Teste no aparelho:** o teclado na etapa 3 do agendamento (nome e telefone). O Android recente desenha o app de ponta
a ponta e, em alguns aparelhos, o teclado pode cobrir o campo; se acontecer, me avise que ajusto.

## 4. Gerar o arquivo para a loja (.aab)

```bash
npm install -g eas-cli
eas login                    # crie uma conta gratuita em expo.dev
eas build:configure          # só na primeira vez
```

Antes de gerar, abra `app/eas.json` e troque as duas URLs de exemplo pela URL real da sua API
(`https://.../api`) e pela página da política de privacidade. Depois:

```bash
npm run build:aab            # gera o .aab de produção (a Play Store exige .aab)
npm run build:apk            # opcional: .apk para instalar direto e testar
```

O EAS cria e guarda a **chave de assinatura** para você. Não perca o acesso à conta do Expo.
O app está configurado para **Android 16 (API 36)**, exigência do Google Play para apps novos desde 31/08/2026.

## 5. Play Console

1. Crie a conta de desenvolvedor em play.google.com/console (taxa única de US$ 25; pede verificação de identidade).
2. **Criar app** → nome "Bela Donzela", idioma Português (Brasil), tipo App, gratuito.
3. **Ficha da loja:** descrição curta e completa, ícone `app/assets/play-store-icon-512.png`,
   gráfico de recursos `app/assets/feature-graphic-1024x500.png` e **pelo menos 2 capturas de tela** do celular
   (tire do app rodando; não consigo gerar prints reais aqui).
4. **Política de privacidade:** hospede o texto de `docs/politica-de-privacidade.md` em qualquer página pública
   e informe a URL (também em `eas.json`).
5. **Segurança dos dados** (declaração do app): coleta *nome* e *número de telefone*, para *funcionalidade do app*,
   não compartilhados com terceiros, transmitidos criptografados (HTTPS). Sem anúncios, sem rastreamento.
   O app não tem contas de usuário; pedidos de exclusão de dados podem ser feitos pelo WhatsApp do ateliê.
6. **Acesso ao app:** a Área Administrativa é restrita. Informe que há funcionalidade restrita e dê ao revisor um
   login **de teste** (crie um segundo admin só para isso e apague depois). Não entregue o login real.
7. **Classificação de conteúdo** e **público-alvo** (adultos), declaração de anúncios (não tem).
8. Envie o `.aab` em **Teste interno** primeiro, para conferir no seu celular.

### Regra para contas pessoais novas

Contas pessoais criadas depois de 13/11/2023 precisam rodar um **teste fechado** com **no mínimo 12 testadores
participando por 14 dias seguidos** antes de pedir acesso à produção (o Google responde em geral em até 7 dias).
Se a conta for de organização/empresa, essa regra não se aplica. Planeje esse prazo: é ele que costuma atrasar a
primeira publicação.

---

## O que ainda precisa de você antes de publicar

- **Logo original.** Recortei o logo dos seus prints; ele é pequeno e fica borrado em telas grandes e no ícone.
  Substitua `app/assets/logo.png` e regere os ícones (`icon.png`, `adaptive-icon.png`, `splash-icon.png`,
  `play-store-icon-512.png`) a partir do arquivo original.
- **Nome do pacote** `br.com.beladonzela.agenda` (em `app/app.json`): é permanente depois da primeira publicação.
  Confirme ou troque agora.
- **Rodapé** mostra "© 2026 Ateliê Bela Donzela · Monex", copiado do seu app atual. Remova "Monex" se não for desejado
  (`app/app/(tabs)/index.tsx`).
- **Domingo fechado.** O calendário atual mostrava o domingo disponível; segui o horário informado na tela de Contato
  (domingo fechado). Horários ficam em `backend/src/lib/schedule.js`, com atendimentos de 1 em 1 hora.
- **Notificações** são dentro do app (aparecem na aba Notificações). Não há aviso "push" com o app fechado;
  isso exigiria configurar o Firebase e pode ser uma segunda etapa.

## Estado da verificação

| Item | Situação |
|---|---|
| Regras de horário e telefone (`backend/src/lib/schedule.js`) | Testadas: 7 de 7 testes passam |
| Sintaxe de todo o backend | Verificada (`node --check`) |
| Sintaxe TypeScript/JSX do app | Sem erros de sintaxe; checagem completa de tipos **não feita** (sem as dependências) |
| API rodando (Express, Prisma) | **Não executada**: o ambiente de criação bloqueia o npm. Use `npm run smoke` no seu computador |
| App no celular / build `.aab` | **Não executados**: faltam instalar e rodar no seu computador |

Se algo falhar no `npm install`, no `smoke` ou no build, copie a mensagem de erro e me envie que eu corrijo.
