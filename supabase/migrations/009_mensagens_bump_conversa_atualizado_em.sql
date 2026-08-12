-- ============================================================
-- ROTEA · Migração 009 — Conversa sobe na lista ao receber msg
-- AFTER INSERT em mensagens atualiza conversas.atualizado_em
-- ============================================================

CREATE OR REPLACE FUNCTION public.mensagens_bump_conversa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversas
  SET atualizado_em = now()
  WHERE id = NEW.conversa_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mensagens_bump_conversa ON public.mensagens;

CREATE TRIGGER mensagens_bump_conversa
  AFTER INSERT ON public.mensagens
  FOR EACH ROW
  EXECUTE FUNCTION public.mensagens_bump_conversa();

-- Backfill: última mensagem ou criado_em da conversa
UPDATE public.conversas c
SET atualizado_em = COALESCE(
  (SELECT max(m.criado_em) FROM public.mensagens m WHERE m.conversa_id = c.id),
  c.criado_em
);
