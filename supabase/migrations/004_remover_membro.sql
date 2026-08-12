-- ============================================================
-- ROTEA · Migração 004 — Remover membro da equipe (admin)
-- ============================================================
-- Apaga o usuário em auth.users; public.perfis cai em cascata.
-- Chamada via RPC: supabase.rpc('remover_membro', { target_id })

-- Se conversas existir, desvincula o atendente ao apagar o perfil
do $$
begin
  if to_regclass('public.conversas') is not null then
    alter table public.conversas drop constraint if exists conversas_atendente_id_fkey;
    alter table public.conversas
      add constraint conversas_atendente_id_fkey
      foreign key (atendente_id) references public.perfis (id) on delete set null;
  end if;
end $$;

create schema if not exists private;

create or replace function private.remover_membro(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if not exists (
    select 1 from public.perfis p
    where p.id = auth.uid() and p.perfil = 'Administrador'
  ) then
    raise exception 'Apenas administradores podem remover membros';
  end if;

  if target_id = auth.uid() then
    raise exception 'Você não pode remover a si mesmo';
  end if;

  if exists (
    select 1 from public.perfis p
    where p.id = target_id and p.perfil = 'Administrador'
  ) then
    raise exception 'Não é permitido remover outro administrador';
  end if;

  if not exists (select 1 from public.perfis p where p.id = target_id) then
    raise exception 'Membro não encontrado';
  end if;

  if to_regclass('public.conversas') is not null then
    execute 'update public.conversas set atendente_id = null where atendente_id = $1' using target_id;
  end if;

  delete from auth.users where id = target_id;
end;
$$;

create or replace function public.remover_membro(target_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  select private.remover_membro(target_id);
$$;

revoke all on function private.remover_membro(uuid) from public;
grant execute on function private.remover_membro(uuid) to authenticated;

revoke all on function public.remover_membro(uuid) from public;
grant execute on function public.remover_membro(uuid) to authenticated;
