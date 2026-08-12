-- ============================================================
-- ROTEA · Migração 003 — Etiquetas e notas nas conversas reais
-- Executar no SQL Editor do Supabase (após a 002)
-- ============================================================

alter table public.conversas
  add column if not exists etiquetas text[] not null default '{}';

alter table public.conversas
  add column if not exists notas text[] not null default '{}';
