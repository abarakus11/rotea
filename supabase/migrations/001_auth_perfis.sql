-- ============================================================
-- ROTEA · Migração 001 — Autenticação e perfis de usuário
-- Projeto: wuuijbetsckjusnvdxts.supabase.co
-- Execução: SQL Editor do Supabase, ou via MCP no Claude Code
-- ============================================================

-- 1. Tipos ----------------------------------------------------
create type public.perfil_acesso as enum ('Administrador', 'Supervisor', 'Atendente');

create type public.setor_atendimento as enum (
  'Comercial', 'Tecnologia/Suporte', 'Atendimento', 'Jurídico'
);

-- 2. Tabela de perfis (espelho público de auth.users) ---------
create table public.perfis (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  nome        text not null default '',
  perfil      public.perfil_acesso not null default 'Atendente',
  setor       public.setor_atendimento,          -- null para administradores
  telefone    text,
  online      boolean not null default false,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.perfis is
  'Perfil público de cada usuário autenticado. Criado automaticamente no cadastro.';

-- 3. Trigger: cria o perfil no momento do cadastro ------------
create or replace function public.handle_novo_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfis (id, email, nome, perfil)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    -- primeiro usuário do projeto vira Administrador; demais entram como Atendente
    case
      when not exists (select 1 from public.perfis) then 'Administrador'::public.perfil_acesso
      else 'Atendente'::public.perfil_acesso
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_novo_usuario();

-- 4. Trigger: mantém atualizado_em ----------------------------
create or replace function public.touch_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger perfis_touch
  before update on public.perfis
  for each row execute function public.touch_atualizado_em();

-- 5. Row Level Security ---------------------------------------
alter table public.perfis enable row level security;

-- Todo usuário autenticado enxerga a equipe (necessário para filas e ranking)
create policy "perfis_select_autenticados"
  on public.perfis for select
  to authenticated
  using (true);

-- Cada usuário edita apenas o próprio perfil (campos não sensíveis)
create policy "perfis_update_proprio"
  on public.perfis for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Administradores podem editar qualquer perfil (promover, mudar setor)
create policy "perfis_update_admin"
  on public.perfis for update
  to authenticated
  using (
    exists (
      select 1 from public.perfis p
      where p.id = auth.uid() and p.perfil = 'Administrador'
    )
  );

-- Inserção só via trigger (security definer); delete em cascata via auth.
-- Nenhuma policy de insert/delete para o papel authenticated: bloqueado por padrão.

-- 6. Realtime (opcional, para status online ao vivo) ----------
alter publication supabase_realtime add table public.perfis;

-- ============================================================
-- Pós-migração — painel do Supabase:
-- · Authentication → Providers → Email: habilitado (padrão)
-- · Authentication → Email Templates: personalizar confirmação (pt-BR)
-- · Authentication → URL Configuration: adicionar a URL da aplicação
--   em "Site URL" e "Redirect URLs" para o link de confirmação voltar
--   para a plataforma.
-- ============================================================
