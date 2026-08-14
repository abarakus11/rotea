# Rotea — Central Inteligente de Atendimento via WhatsApp

Plataforma omnichannel da FIC Capital: leads entram em um numero unico de WhatsApp
(+55 11 5304-9387), o bot conduz o funil comercial (abertura → descoberta → rotas
PRO Invest / SEC Finances / RADAR / SIG / SEE / Advisor / Base ativa) e encaminha
ao comercial humano no handoff.

## Estrutura do repositorio

- Raiz: frontend da plataforma (Vite + React + Tailwind + Supabase Auth)
- `webhook/`: motor do bot para a API oficial do WhatsApp (Meta Cloud API) —
  projeto `rotea-webhook` na Vercel
- `supabase/migrations/`: SQL do banco (perfis/auth, conversas, mensagens)

## Rodar localmente (frontend)

```
npm install
npm run dev
```

## Deploy / variaveis

Frontend: Vercel (framework Vite). Motor: projeto `rotea-webhook` com Root Directory = `webhook`.

Variaveis no projeto `rotea-webhook`:

- `WHATSAPP_TOKEN` — token permanente da Meta (System User)
- `PHONE_NUMBER_ID` — ID do numero na Cloud API (`1279305148594714` para +55 11 5304-9387)
- `VERIFY_TOKEN` — palavra secreta do webhook (ex.: `rotea_wa_verify_2026_fic`)
- `WEBHOOK_SECRET` — mesmo valor do VERIFY_TOKEN (protege as RPCs no Supabase)
- `OPENAI_API_KEY` — opcional (Whisper, TTS, theme_guess no fallback)
- `LINK_AGENDA` — link Calendly/agenda do diagnostico (fallback: `CONFIGURE_LINK_AGENDA`)
- `LINK_AGENDA_ADVISOR` — agenda do Programa Advisor (fallback: `CONFIGURE_LINK_AGENDA_ADVISOR`)
- `FIC_COMERCIAL_WA` — WhatsApp do comercial para handoff (fallback: Carlos Eber)
- `FIC_COMERCIAL_NOME` — nome exibido no handoff (fallback: `Carlos Eber`)

WhatsApp Business Account ID: `1206658925872309`

Webhook na Meta (WhatsApp → Configuração → Assinar webhooks):

- Callback URL: `https://rotea-webhook.vercel.app/api/webhook`
- Verify token: o mesmo de `VERIFY_TOKEN`
- Campo assinado: `messages`

Diagnostico: `https://rotea-webhook.vercel.app/api/status`

## Endpoints do motor

- `GET/POST /api/webhook` — recebe mensagens da Meta e executa o fluxo do bot
- `POST /api/enviar` — resposta do atendente (autenticado) para o cliente
- `POST /api/simular` — cria conversa de teste no banco para treino da equipe
- `GET /api/status` — checagem das credenciais

## Banco de dados

Executar as migracoes em ordem no SQL Editor do Supabase (001 → 005), ou via MCP.
O primeiro usuario cadastrado na plataforma entra como Administrador.
