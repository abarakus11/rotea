import { SupabaseClient } from "@supabase/supabase-js";
import { Chat, Msg, Setor, StatusChat } from "./data";

export const WEBHOOK_BASE = "https://rotea-webhook.vercel.app";

interface ConversaDB {
  id: string; wa_id: string; nome_cliente: string | null; empresa: string | null;
  assunto: string | null; setor: Setor | null; atendente_id: string | null;
  status: string; etapa: number; origem: string | null; criado_em: string;
  atualizado_em: string; etiquetas: string[] | null; notas: string[] | null;
}
interface MensagemDB {
  id: string; conversa_id: string; de: string; texto: string; criado_em: string;
  tipo?: string | null; media_url?: string | null; mime_type?: string | null;
}

const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export async function carregarConversasLive(sb: SupabaseClient, nomesPorId: Record<string, string>): Promise<Chat[]> {
  const { data: convs, error } = await sb.from("conversas").select("*").order("atualizado_em", { ascending: false });
  if (error || !convs) return [];
  const { data: msgs } = await sb.from("mensagens").select("*").order("criado_em", { ascending: true });
  const porConversa: Record<string, MensagemDB[]> = {};
  ((msgs ?? []) as MensagemDB[]).forEach(m => {
    (porConversa[m.conversa_id] = porConversa[m.conversa_id] ?? []).push(m);
  });
  const valida = (s: string): StatusChat =>
    (["bot", "fila", "andamento", "encerrado", "abandonado"].includes(s) ? s : "bot") as StatusChat;
  const chats = (convs as ConversaDB[]).map(c => {
    const msgsConv = porConversa[c.id] ?? [];
    return {
      chat: {
        id: c.id,
        cliente: c.nome_cliente || `+${c.wa_id}`,
        telefone: c.wa_id.startsWith("sim_") ? "(conversa de teste)" : `+${c.wa_id}`,
        origem: c.origem ?? "WhatsApp",
        empresa: c.empresa ?? undefined,
        aoVivo: true,
        setor: c.setor,
        atendente: c.atendente_id ? (nomesPorId[c.atendente_id] ?? "Atendente") : null,
        status: valida(c.status),
        etiquetas: c.etiquetas ?? [],
        notas: c.notas ?? [],
        inicio: hora(c.criado_em),
        espera: Math.max(0, Math.round((Date.now() - new Date(c.criado_em).getTime()) / 60000)),
        naoLidas: 0,
        msgs: msgsConv.map(m => {
          const mediaUrl = m.media_url ?? null;
          const tipoBruto = (m.tipo || "").trim().toLowerCase();
          // Garante player mesmo se tipo vier vazio/legado, desde que haja media_url.
          const tipo = tipoBruto || (mediaUrl ? "audio" : "text");
          return {
            id: m.id,
            de: (["cliente", "bot", "atendente", "sistema"].includes(m.de) ? m.de : "sistema") as Msg["de"],
            texto: m.texto,
            hora: hora(m.criado_em),
            tipo,
            mediaUrl,
            mimeType: m.mime_type ?? null,
          };
        }),
      } satisfies Chat,
      // Fallback JS: última mensagem, senão atualizado_em do banco
      ordem: msgsConv[msgsConv.length - 1]?.criado_em ?? c.atualizado_em ?? c.criado_em,
    };
  });
  return chats
    .sort((a, b) => new Date(b.ordem).getTime() - new Date(a.ordem).getTime())
    .map(x => x.chat);
}

export function assinarLive(sb: SupabaseClient, onChange: () => void) {
  const canal = sb.channel("rotea-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "mensagens" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "conversas" }, onChange)
    .subscribe();
  return () => { sb.removeChannel(canal); };
}

export async function patchConversa(sb: SupabaseClient, id: string, patch: Record<string, unknown>) {
  await sb.from("conversas").update(patch).eq("id", id);
}

export async function msgSistema(sb: SupabaseClient, conversaId: string, texto: string) {
  await sb.from("mensagens").insert({ conversa_id: conversaId, de: "sistema", texto });
}

export async function enviarLive(sb: SupabaseClient, conversaId: string, texto: string): Promise<{ enviado: boolean; aviso: string | null }> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token ?? "";
  try {
    const r = await fetch(`${WEBHOOK_BASE}/api/enviar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ conversa_id: conversaId, texto }),
    });
    const j = await r.json().catch(() => ({}));
    return { enviado: Boolean(j.enviado), aviso: j.aviso ?? (r.ok ? null : "falha no envio") };
  } catch {
    return { enviado: false, aviso: "não foi possível contatar o motor de envio" };
  }
}

export async function simularLive(sb: SupabaseClient): Promise<boolean> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token ?? "";
  try {
    const r = await fetch(`${WEBHOOK_BASE}/api/simular`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export interface BotPerfilWA {
  telefone: string | null;
  verified_name: string | null;
  name_status: string | null;
  quality_rating: string | null;
  nome_exibicao_somente_leitura: boolean;
  aviso_nome: string;
  perfil: {
    about: string;
    address: string;
    description: string;
    email: string;
    websites: string[];
    vertical: string;
    profile_picture_url: string | null;
  };
}

async function tokenAuth(sb: SupabaseClient) {
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? "";
}

export async function buscarBotPerfil(sb: SupabaseClient): Promise<BotPerfilWA> {
  const token = await tokenAuth(sb);
  const r = await fetch(`${WEBHOOK_BASE}/api/bot-perfil`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || j.detalhe || "falha ao carregar perfil do WhatsApp");
  return j as BotPerfilWA;
}

export async function salvarBotPerfil(
  sb: SupabaseClient,
  campos: Partial<{
    about: string;
    address: string;
    description: string;
    email: string;
    websites: string[];
    vertical: string;
  }>,
): Promise<void> {
  const token = await tokenAuth(sb);
  const r = await fetch(`${WEBHOOK_BASE}/api/bot-perfil`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(campos),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || j.detalhe || "falha ao salvar perfil do WhatsApp");
}

export async function salvarBotPerfilFoto(sb: SupabaseClient, arquivo: File): Promise<void> {
  const token = await tokenAuth(sb);
  const buf = await arquivo.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const imagem_base64 = btoa(bin);
  const r = await fetch(`${WEBHOOK_BASE}/api/bot-perfil-foto`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      imagem_base64,
      mime_type: arquivo.type || "image/jpeg",
      file_name: arquivo.name || "perfil.jpg",
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || j.detalhe || "falha ao enviar foto do WhatsApp");
}
