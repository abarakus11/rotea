-- ============================================================
-- ROTEA · Migração 005 — RPCs do webhook WhatsApp (sem service_role)
-- ============================================================

create schema if not exists private;

create table if not exists private.rotea_secrets (
  key text primary key,
  value text not null
);

revoke all on table private.rotea_secrets from public, anon, authenticated;

insert into private.rotea_secrets(key, value)
values ('webhook_secret', 'rotea_wa_verify_2026_fic')
on conflict (key) do update set value = excluded.value;

drop policy if exists "conversas_insert_equipe" on public.conversas;
create policy "conversas_insert_equipe" on public.conversas
  for insert to authenticated with check (true);

create or replace function public.wa_achar_ou_criar_conversa(p_secret text, p_wa_id text)
returns public.conversas
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.conversas;
begin
  if p_secret is distinct from (select value from private.rotea_secrets where key = 'webhook_secret') then
    raise exception 'unauthorized';
  end if;
  select * into c from public.conversas where wa_id = p_wa_id;
  if found then
    return c;
  end if;
  insert into public.conversas (wa_id)
  values (p_wa_id)
  returning * into c;
  return c;
end;
$$;

create or replace function public.wa_salvar_msg(p_secret text, p_conversa_id uuid, p_de text, p_texto text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_secret is distinct from (select value from private.rotea_secrets where key = 'webhook_secret') then
    raise exception 'unauthorized';
  end if;
  insert into public.mensagens (conversa_id, de, texto)
  values (p_conversa_id, p_de, p_texto);
end;
$$;

create or replace function public.wa_atualizar_conversa(p_secret text, p_id uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_secret is distinct from (select value from private.rotea_secrets where key = 'webhook_secret') then
    raise exception 'unauthorized';
  end if;
  update public.conversas set
    nome_cliente = coalesce(p_patch->>'nome_cliente', nome_cliente),
    empresa = coalesce(p_patch->>'empresa', empresa),
    assunto = coalesce(p_patch->>'assunto', assunto),
    setor = coalesce((p_patch->>'setor')::public.setor_atendimento, setor),
    status = coalesce(p_patch->>'status', status),
    etapa = coalesce((p_patch->>'etapa')::int, etapa),
    origem = coalesce(p_patch->>'origem', origem),
    atendente_id = case
      when p_patch ? 'atendente_id' and (p_patch->>'atendente_id') is null then null
      when p_patch ? 'atendente_id' then (p_patch->>'atendente_id')::uuid
      else atendente_id
    end
  where id = p_id;
end;
$$;

revoke all on function public.wa_achar_ou_criar_conversa(text, text) from public;
revoke all on function public.wa_salvar_msg(text, uuid, text, text) from public;
revoke all on function public.wa_atualizar_conversa(text, uuid, jsonb) from public;
grant execute on function public.wa_achar_ou_criar_conversa(text, text) to anon, authenticated, service_role;
grant execute on function public.wa_salvar_msg(text, uuid, text, text) to anon, authenticated, service_role;
grant execute on function public.wa_atualizar_conversa(text, uuid, jsonb) to anon, authenticated, service_role;
