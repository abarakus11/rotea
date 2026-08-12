-- ============================================================
-- ROTEA · Migração 008 — Corrigir remover_membro
-- Não apaga auth.sessions/refresh_tokens (gera permission denied).
-- Soft-delete em perfis.ativo basta; o app bloqueia login inativo.
-- ============================================================

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
    where p.id = auth.uid() and p.perfil = 'Administrador' and coalesce(p.ativo, true)
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

  if not exists (select 1 from public.perfis p where p.id = target_id and coalesce(p.ativo, true)) then
    raise exception 'Membro não encontrado';
  end if;

  update public.perfis
  set ativo = false, online = false
  where id = target_id;
end;
$$;

create or replace function public.remover_membro(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.remover_membro(target_id);
end;
$$;

revoke all on function private.remover_membro(uuid) from public;
grant execute on function private.remover_membro(uuid) to authenticated;
revoke all on function public.remover_membro(uuid) from public;
grant execute on function public.remover_membro(uuid) to authenticated;
