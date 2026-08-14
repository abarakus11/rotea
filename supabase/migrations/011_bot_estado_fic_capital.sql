-- ============================================================
-- ROTEA · Migração 011 — Estado do funil comercial FIC Capital
-- ============================================================

alter table public.conversas
  add column if not exists bot_estado jsonb not null default '{}'::jsonb;

comment on column public.conversas.bot_estado is
  'Estado estruturado do funil FIC Capital (rota, passo, respostas, flags).';

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
    nome_cliente = case
      when p_patch ? 'nome_cliente' then nullif(p_patch->>'nome_cliente', '')
      else nome_cliente
    end,
    empresa = case
      when p_patch ? 'empresa' then nullif(p_patch->>'empresa', '')
      else empresa
    end,
    assunto = case
      when p_patch ? 'assunto' then nullif(p_patch->>'assunto', '')
      else assunto
    end,
    setor = case
      when p_patch ? 'setor' then nullif(p_patch->>'setor', '')::public.setor_atendimento
      else setor
    end,
    status = coalesce(p_patch->>'status', status),
    etapa = coalesce((p_patch->>'etapa')::int, etapa),
    origem = coalesce(p_patch->>'origem', origem),
    bot_estado = case
      when p_patch ? 'bot_estado' then coalesce(p_patch->'bot_estado', '{}'::jsonb)
      else bot_estado
    end,
    atendente_id = case
      when p_patch ? 'atendente_id' and (p_patch->>'atendente_id') is null then null
      when p_patch ? 'atendente_id' then (p_patch->>'atendente_id')::uuid
      else atendente_id
    end
  where id = p_id;
end;
$$;

revoke all on function public.wa_atualizar_conversa(text, uuid, jsonb) from public;
grant execute on function public.wa_atualizar_conversa(text, uuid, jsonb) to anon, authenticated, service_role;
