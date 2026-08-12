-- ============================================================
-- ROTEA · Migração 010 — Áudio/mídia nas mensagens + Storage
-- Colunas media_* e bucket público whatsapp-media (leitura)
-- Upload via anon (webhook) / leitura para equipe autenticada
-- ============================================================

alter table public.mensagens
  add column if not exists tipo text not null default 'text',
  add column if not exists media_url text,
  add column if not exists mime_type text,
  add column if not exists wa_media_id text;

comment on column public.mensagens.tipo is 'text | audio | image | document | sistema';
comment on column public.mensagens.media_url is 'URL pública ou assinada do arquivo no Storage';
comment on column public.mensagens.mime_type is 'MIME do arquivo de mídia';
comment on column public.mensagens.wa_media_id is 'ID da mídia na Meta Cloud API (referência)';

-- RPC estendida (mantém assinatura compatível com defaults)
drop function if exists public.wa_salvar_msg(text, uuid, text, text);

create or replace function public.wa_salvar_msg(
  p_secret text,
  p_conversa_id uuid,
  p_de text,
  p_texto text,
  p_tipo text default 'text',
  p_media_url text default null,
  p_mime_type text default null,
  p_wa_media_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_secret is distinct from (select value from private.rotea_secrets where key = 'webhook_secret') then
    raise exception 'unauthorized';
  end if;
  insert into public.mensagens (conversa_id, de, texto, tipo, media_url, mime_type, wa_media_id)
  values (
    p_conversa_id,
    p_de,
    p_texto,
    coalesce(nullif(trim(p_tipo), ''), 'text'),
    p_media_url,
    p_mime_type,
    p_wa_media_id
  );
end;
$$;

revoke all on function public.wa_salvar_msg(text, uuid, text, text, text, text, text, text) from public;
grant execute on function public.wa_salvar_msg(text, uuid, text, text, text, text, text, text) to anon, authenticated, service_role;

-- Bucket Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'whatsapp-media',
  'whatsapp-media',
  true,
  16777216,
  array[
    'audio/ogg',
    'audio/opus',
    'audio/mpeg',
    'audio/mp4',
    'audio/aac',
    'audio/amr',
    'audio/webm',
    'audio/x-wav',
    'audio/wav',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Políticas Storage
drop policy if exists "whatsapp_media_select" on storage.objects;
drop policy if exists "whatsapp_media_insert" on storage.objects;
drop policy if exists "whatsapp_media_update" on storage.objects;

create policy "whatsapp_media_select"
  on storage.objects for select
  to anon, authenticated, service_role
  using (bucket_id = 'whatsapp-media');

create policy "whatsapp_media_insert"
  on storage.objects for insert
  to anon, authenticated, service_role
  with check (bucket_id = 'whatsapp-media');

-- upsert no Storage precisa de UPDATE
create policy "whatsapp_media_update"
  on storage.objects for update
  to anon, authenticated, service_role
  using (bucket_id = 'whatsapp-media')
  with check (bucket_id = 'whatsapp-media');
