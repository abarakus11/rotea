# Rotea — Central Inteligente de Atendimento via WhatsApp

Plataforma omnichannel do Grupo FIC: leads entram em um numero unico de WhatsApp
(+55 11 5304-9387), um bot faz a triagem (nome, empresa de interesse, assunto) e
encaminha ao setor correto — Comercial, Tecnologia/Suporte, Atendimento ou Juridico.

## Estrutura do repositorio

- Raiz: frontend da plataforma (Vite + React + Tailwind + Supabase Auth) —
  projeto `bothsales` na Vercel
- `webhook/`: motor do bot para a API oficial do WhatsApp (Meta Cloud API) —
  projeto `rotea-webhook` na Vercel (serverless functions)
- `supabase/migrations/`: SQL do banco (perfis/auth, conversas, mensagens)

## Rodar localmente (frontend)

```
npm install
npm run dev
```

## Deploy

Frontend: importar este repositorio na Vercel (framework Vite detectado
automaticamente). Motor: criar um segundo projeto na Vercel apontando para a
pasta `webhook/` (Root Directory = webhook) com as variaveis de ambiente:

- `WHATSAPP_TOKEN` — token de acesso da Meta
- `PHONE_NUMBER_ID` — id do numero na Meta (1262822560245420)
- `VERIFY_TOKEN` — palavra secreta usada na configuracao do webhook
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Settings → API → service_role

Webhook na Meta: URL `https://<projeto-webhook>.vercel.app/api/webhook`,
campo `messages` assinado. A anon key do Supabase presente no codigo e publica
por design (RLS protege os dados); as chaves secretas ficam apenas nas
variaveis de ambiente da Vercel.

## Endpoints do motor

- `GET/POST /api/webhook` — recebe mensagens da Meta e executa o fluxo do bot
- `POST /api/enviar` — resposta do atendente (autenticado) para o cliente
- `POST /api/simular` — cria conversa de teste no banco para treino da equipe

## Banco de dados

Executar as migracoes em ordem no SQL Editor do Supabase (001 → 002 → 003).
O primeiro usuario cadastrado na plataforma entra como Administrador.
