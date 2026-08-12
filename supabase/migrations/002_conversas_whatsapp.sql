-- ============================================================
-- ROTEA · Migração 002 — Conversas reais do WhatsApp
-- Executar no SQL Editor do Supabase (mesmo processo da migração 001)
-- ============================================================

create table public.conversas (
  id           uuid primary key default gen_random_uuid(),
  wa_id        text not null unique,          -- telefone do cliente no WhatsApp
  nome_cliente text,
  empresa      text,
  assunto      text,
  setor        public.setor_atendimento,
  atendente_id uuid references public.perfis (id),
  status       text not null default 'bot',   -- bot | fila | andamento | encerrado | abandonado
  etapa        int  not null default 0,       -- posição no fluxo do bot
  origem       text default 'WhatsApp',
  criado_em    timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.mensagens (
  id          uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas (id) on delete cascade,
  de          text not null,                  -- cliente | bot | atendente | sistema
  texto       text not null,
  criado_em   timestamptz not null default now()
);

create index mensagens_conversa_idx on public.mensagens (conversa_id, criado_em);

create trigger conversas_touch
  before update on public.conversas
  for each row execute function public.touch_atualizado_em();

-- RLS: equipe autenticada lê tudo; escrita da equipe em conversas
-- (o webhook grava com a service role, que ignora RLS por design)
alter table public.conversas enable row level security;
alter table public.mensagens enable row level security;

create policy "conversas_select_equipe" on public.conversas
  for select to authenticated using (true);
create policy "conversas_update_equipe" on public.conversas
  for update to authenticated using (true);
create policy "mensagens_select_equipe" on public.mensagens
  for select to authenticated using (true);
create policy "mensagens_insert_equipe" on public.mensagens
  for insert to authenticated with check (true);

-- Realtime para o chat ao vivo
alter publication supabase_realtime add table public.conversas;
alter publication supabase_realtime add table public.mensagens;
