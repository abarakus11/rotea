import { Msg } from "./data";

const PLACEHOLDERS = new Set([
  "[Áudio]",
  "[Áudio recebido]",
  "Áudio",
  "[Audio]",
  "[Audio recebido]",
]);

export function ehPlaceholderAudio(texto?: string | null): boolean {
  const t = (texto || "").trim();
  return PLACEHOLDERS.has(t);
}

/** Mensagem de áudio: tipo, URL ou placeholder legado. */
export function ehMsgAudio(m: Pick<Msg, "tipo" | "mediaUrl" | "texto">): boolean {
  if (m.tipo === "audio" || m.tipo === "voice" || m.tipo === "ptt") return true;
  if (m.mediaUrl) return true;
  return ehPlaceholderAudio(m.texto);
}

export function rotuloPreviewAudio(m: Pick<Msg, "texto">): string {
  const t = m.texto?.trim();
  if (!t || ehPlaceholderAudio(t)) return "🎤 Áudio";
  return `🎤 ${t}`;
}
