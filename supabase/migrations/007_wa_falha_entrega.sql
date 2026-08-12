-- Registra falha de entrega WhatsApp (status webhook da Meta) na conversa do wamid
create or replace function public.wa_anotar_falha_wamid(p_secret text, p_wamid text, p_status text, p_erro text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversa_id uuid;
begin
  if p_secret is distinct from (select value from private.rotea_secrets where key = 'webhook_secret') then
    raise exception 'unauthorized';
  end if;
  if p_wamid is null or length(trim(p_wamid)) = 0 then
    return;
  end if;
  select conversa_id into v_conversa_id
  from public.mensagens
  where texto like '%' || p_wamid || '%'
  order by criado_em desc
  limit 1;
  if v_conversa_id is null then
    return;
  end if;
  insert into public.mensagens (conversa_id, de, texto)
  values (
    v_conversa_id,
    'sistema',
    'Entrega WhatsApp ' || coalesce(p_status, 'failed') || ' · ' || coalesce(left(p_erro, 240), 'sem detalhe') || ' · ' || p_wamid
  );
end;
$$;

revoke all on function public.wa_anotar_falha_wamid(text, text, text, text) from public;
grant execute on function public.wa_anotar_falha_wamid(text, text, text, text) to anon, authenticated, service_role;
