-- ============================================================
-- ROTEA · Migração 006 — Soft-delete de membros da equipe
-- ============================================================

alter table public.perfis
  add column if not exists ativo boolean not null default true;

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
    where p.id = auth.uid() and p.perfil = 'Administrador' and p.ativo
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

  if not exists (select 1 from public.perfis p where p.id = target_id and p.ativo) then
    raise exception 'Membro não encontrado';
  end if;

  update public.perfis
  set ativo = false, online = false
  where id = target_id;

  delete from auth.sessions where user_id = target_id;
  delete from auth.refresh_tokens where user_id = target_id;
end;
$$;
