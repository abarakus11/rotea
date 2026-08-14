// ============================================================
// ROTEA · Webhook WhatsApp (Meta Cloud API) — FIC Capital
// Número: +55 11 5304-9387
// Funil: abertura → descoberta → rotas A–H (PRO/SEC/RADAR/SIG/SEE/Advisor/Base/Fallback)
// Env: WHATSAPP_TOKEN, PHONE_NUMBER_ID, VERIFY_TOKEN, WEBHOOK_SECRET
// Opcional: OPENAI_API_KEY (Whisper + TTS + theme_guess fallback)
//          LINK_AGENDA, LINK_AGENDA_ADVISOR, FIC_COMERCIAL_WA, FIC_COMERCIAL_NOME
// ============================================================

const TTS_VOICE = "nova";
const TTS_MODEL = "tts-1";
const TTS_MAX_CHARS = 800;
const CHAT_MODEL = "gpt-4o-mini";

const SUPABASE_URL = "https://wuuijbetsckjusnvdxts.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dWlqYmV0c2NranVzbnZkeHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjAwODAsImV4cCI6MjEwMTUzNjA4MH0.VzHyjS2goE1tX0udysdjnuXcfym39jPkJWc3j-xFYbA";

const TZ = "America/Sao_Paulo";
const BH_START = 9;
const BH_END = 20; // exclusivo → atendimento até 20:00 America/Sao_Paulo

const LINK_AGENDA_FALLBACK = "CONFIGURE_LINK_AGENDA";
const LINK_AGENDA_ADVISOR_FALLBACK = "CONFIGURE_LINK_AGENDA_ADVISOR";
const COMERCIAL_WA_FALLBACK = "5511943870655";
const COMERCIAL_NOME_FALLBACK = "Carlos Eber";

const ABERTURA_NOME = [
  "Antes de eu te passar qualquer coisa: com quem eu falo?",
  "Como posso te chamar?",
  "Me diz seu nome que eu já te direciono direito.",
];

const ABERTURA_EMPRESA = [
  "E de qual empresa você fala?",
  "Qual a empresa?",
  "Me conta de qual empresa você é.",
];

const LGPD =
  "Só um aviso rápido: seus dados ficam com a FIC Capital e são usados só pra esse atendimento. Nada de terceiros.";

const ROTAS = {
  A: {
    produto: "PRO Invest",
    keywords: [
      "captar", "captacao", "investidor", "socio", "fundo", "aporte", "expandir",
      "comprar terra", "comprar planta", "terra", "planta", "investimento", "captacao de",
    ],
  },
  B: {
    produto: "SEC Finances",
    keywords: [
      "receita", "margem", "lucro", "vender mais", "holding", "exterior",
      "reestruturar", "societario", "receita liquida",
    ],
  },
  C: {
    produto: "RADAR Benefits",
    keywords: [
      "imposto", "tributo", "icms", "divida ativa", "pgfn", "incentivo",
      "isencao", "subvencao", "execucao fiscal", "tributario", "divida",
    ],
  },
  D: {
    produto: "SIG",
    keywords: [
      "sistema", "erp", "crm", "planilha", "gestao", "controle", "integrar", "integracao",
    ],
  },
  E: {
    produto: "SEE",
    keywords: [
      "plano", "contratar", "quanto custa", "pacote", "como funciona", "preco", "valor",
    ],
  },
  F: {
    produto: "Programa Advisor",
    keywords: [
      "parceria", "ser consultor", "advisor", "indicar cliente", "escritorio", "licenca",
      "credenciamento",
    ],
  },
  G: {
    produto: "Base ativa",
    keywords: [
      "cliente", "contrato", "andamento", "protocolo", "meu processo", "ja sou cliente",
      "sou cliente", "parceiro",
    ],
  },
};

// ---------- utils ----------

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function norm(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function linkAgenda() {
  return process.env.LINK_AGENDA || LINK_AGENDA_FALLBACK;
}

function linkAgendaAdvisor() {
  return process.env.LINK_AGENDA_ADVISOR || LINK_AGENDA_ADVISOR_FALLBACK;
}

function comercialInfo() {
  return {
    especialistaWa: (process.env.FIC_COMERCIAL_WA || COMERCIAL_WA_FALLBACK).replace(/\D/g, ""),
    especialistaNome: process.env.FIC_COMERCIAL_NOME || COMERCIAL_NOME_FALLBACK,
    nome: "FIC Capital",
    setor: "Comercial",
  };
}

function fill(tpl, vars = {}) {
  return String(tpl).replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = vars[k];
    return v == null || v === "" ? "" : String(v);
  });
}

function agoraSP() {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = weekdayMap[parts.weekday] ?? new Date().getDay();
  let hour = Number(parts.hour);
  if (parts.hour === "24") hour = 0;
  const minute = Number(parts.minute) || 0;
  return { day, hour, minute };
}

function horaLabelSP() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

/** Mon–Fri 09:00–20:00 America/Sao_Paulo */
function statusHorario() {
  const { day, hour, minute } = agoraSP();
  if (day === 0 || day === 6) return "fim_semana";
  const mins = hour * 60 + minute;
  if (mins >= BH_START * 60 && mins < BH_END * 60) return "comercial";
  return "fora_horario";
}

function getEstado(conversa) {
  const raw = conversa.bot_estado;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return { ...raw };
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      if (p && typeof p === "object") return p;
    } catch { /* ignore */ }
  }
  return {};
}

function ehReinicio(texto) {
  const t = norm(texto).replace(/[!?.]+$/g, "").trim();
  return [
    "oi", "ola", "oie", "oii", "oiii", "oiee",
    "hey", "hello", "hi", "eai", "eae", "fala",
    "inicio", "reiniciar", "recomecar", "comecar",
    "bom dia", "boa tarde", "boa noite",
    "voltar ao inicio", "comecar de novo", "nova conversa",
  ].includes(t);
}

/** Extrai nome + empresa de uma resposta livre. */
function parseNomeEmpresa(texto, estado) {
  const t = String(texto || "").trim();
  let nome = estado.nome_parcial || null;
  let empresa = estado.empresa_parcial || null;

  const mSou = t.match(/^(?:eu\s+)?(?:sou|me\s+chamo|meu\s+nome\s+(?:é|e))\s+([^,.\n]+)/i);
  if (mSou) nome = mSou[1].trim().slice(0, 80);

  const mEmp = t.match(/(?:da|de|empresa|da empresa|trabalho(?:\s+na|\s+na empresa)?|represento)\s+([^,.\n]+)/i);
  if (mEmp) empresa = mEmp[1].trim().slice(0, 120);

  // "Nome, Empresa" ou "Nome - Empresa" ou "Nome / Empresa"
  if (!nome || !empresa) {
    const parts = t.split(/\s*[,/\-–—|]\s*/).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      if (!nome) nome = parts[0].slice(0, 80);
      if (!empresa) empresa = parts.slice(1).join(" ").slice(0, 120);
    }
  }

  // "Nome da Empresa X" / "Nome Empresa X"
  if (!empresa) {
    const mDa = t.match(/^(.{2,40}?)\s+(?:da|de)\s+(.{2,80})$/i);
    if (mDa) {
      nome = nome || mDa[1].trim();
      empresa = mDa[2].trim();
    }
  }

  // Se só pedimos o que falta
  if (estado.faltando === "nome" && !nome) {
    nome = t.replace(/^(?:meu\s+nome\s+(?:é|e)\s+)/i, "").trim().slice(0, 80);
  }
  if (estado.faltando === "empresa" && !empresa) {
    empresa = t.replace(/^(?:a\s+empresa\s+(?:é|e)\s+|empresa\s+)/i, "").trim().slice(0, 120);
  }

  // Uma única palavra/frase curta sem padrão → assume o que falta, senão nome
  if (!nome && !empresa && t.length >= 2 && t.length <= 80 && !/[?]/.test(t)) {
    if (estado.faltando === "empresa") empresa = t;
    else if (estado.faltando === "nome") nome = t;
    else if (!estado.pediu_faltante) {
      // primeira resposta ambígua: se tiver 2+ tokens, primeiro=nome resto=empresa
      const toks = t.split(/\s+/);
      if (toks.length >= 3) {
        nome = toks[0];
        empresa = toks.slice(1).join(" ");
      }
    }
  }

  if (nome) nome = nome.replace(/^(sou|eu sou)\s+/i, "").trim();
  return { nome: nome || null, empresa: empresa || null };
}

function matchRota(texto) {
  const t = norm(texto);
  const scores = {};
  for (const [rota, cfg] of Object.entries(ROTAS)) {
    let s = 0;
    for (const kw of cfg.keywords) {
      if (t.includes(norm(kw))) s += kw.length > 8 ? 2 : 1;
    }
    // atalhos numéricos / nomes de produto
    if (rota === "A" && (/\bpro\s*invest\b/.test(t) || t === "1" || t.includes("captacao"))) s += 3;
    if (rota === "B" && (/\bsec\b/.test(t) || t === "2" || t.includes("receita liquida"))) s += 3;
    if (rota === "C" && (/\bradar\b/.test(t) || t === "3" || t.includes("imposto"))) s += 2;
    if (rota === "D" && (/\bsig\b/.test(t) || t.includes("erp"))) s += 2;
    if (rota === "E" && (/\bsee\b/.test(t) || t.includes("plano"))) s += 2;
    if (rota === "F" && (/\badvisor\b/.test(t) || t.includes("consultor"))) s += 2;
    if (rota === "G" && (t.includes("sou cliente") || t.includes("ja sou"))) s += 3;
    scores[rota] = s;
  }
  let best = null;
  let bestScore = 0;
  for (const [rota, s] of Object.entries(scores)) {
    if (s > bestScore) {
      best = rota;
      bestScore = s;
    }
  }
  if (bestScore <= 0) return null;
  return best;
}

function temaProvavelLabel(rota) {
  const map = {
    A: "captação de investimento",
    B: "aumentar receita líquida",
    C: "reduzir imposto ou dívida",
    D: "sistema / gestão",
    E: "planos e como funciona",
    F: "parceria Advisor",
    G: "acompanhamento de conta",
  };
  return map[rota] || "o que a empresa precisa agora";
}

function detectarDividaVsImposto(texto) {
  const t = norm(texto);
  if (/(divida|passivo|pgfn|execucao|atrasad|parcelamento)/.test(t)) return "divida";
  if (/(imposto|mensal|corrente|tributo|icms|todo mes)/.test(t)) return "imposto";
  if (/divida|atras|passiv/.test(t)) return "divida";
  if (/imposto|pag(o|a)|corrente/.test(t)) return "imposto";
  return null;
}

function insistePreco(texto) {
  const t = norm(texto);
  return /(preco|valor|quanto custa|orcamento|tabela|pacote|me diga o|quero saber o custo|sem reuniao)/.test(t);
}

function foraPerfil(texto) {
  const t = norm(texto);
  return /(muito pequeno|nao se paga|fora de perfil|ainda nao|fatura pouco|pequena empresa|nao tenho porte)/.test(t);
}

// ---------- supabase / meta infra (inalterada em espírito) ----------

function secret() {
  return process.env.WEBHOOK_SECRET || process.env.VERIFY_TOKEN || "";
}

async function rpc(fn, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${fn}: ${t || r.status}`);
  return t ? JSON.parse(t) : null;
}

async function acharOuCriarConversa(waId) {
  return rpc("wa_achar_ou_criar_conversa", { p_secret: secret(), p_wa_id: waId });
}

async function salvarMsg(conversaId, de, texto, extras = {}) {
  const body = {
    p_secret: secret(),
    p_conversa_id: conversaId,
    p_de: de,
    p_texto: texto,
  };
  if (extras.tipo) body.p_tipo = extras.tipo;
  if (extras.media_url) body.p_media_url = extras.media_url;
  if (extras.mime_type) body.p_mime_type = extras.mime_type;
  if (extras.wa_media_id) body.p_wa_media_id = extras.wa_media_id;
  await rpc("wa_salvar_msg", body);
}

function normalizeAudioMime(mime) {
  const m = String(mime || "").toLowerCase().split(";")[0].trim();
  if (!m || m === "application/octet-stream") return "audio/ogg";
  if (m === "audio/opus") return "audio/ogg";
  return m;
}

function extFromMime(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("mp4") || m.includes("m4a")) return "m4a";
  if (m.includes("aac")) return "aac";
  if (m.includes("amr")) return "amr";
  if (m.includes("webm")) return "webm";
  if (m.includes("wav")) return "wav";
  if (m.includes("ogg") || m.includes("opus")) return "ogg";
  return "ogg";
}

function arquivoAudioParaForm(buffer, mimeType, basename = "audio") {
  const mime = normalizeAudioMime(mimeType);
  const ext = extFromMime(mime);
  const filename = `${basename}.${ext}`;
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (typeof File !== "undefined") {
    return { file: new File([bytes], filename, { type: mime }), filename, mime };
  }
  return { file: new Blob([bytes], { type: mime }), filename, mime };
}

async function baixarMediaWhatsApp(mediaId) {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token || !mediaId) throw new Error("media: token ou id ausente");
  const meta = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const metaTxt = await meta.text();
  if (!meta.ok) throw new Error(`media meta ${meta.status}: ${metaTxt}`);
  const info = JSON.parse(metaTxt);
  const url = info.url;
  const mime = normalizeAudioMime(info.mime_type || "audio/ogg");
  if (!url) throw new Error("media: url ausente na Meta");
  const bin = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: "follow",
  });
  if (!bin.ok) throw new Error(`media download ${bin.status}`);
  const buffer = Buffer.from(await bin.arrayBuffer());
  if (!buffer.length) throw new Error("media download: arquivo vazio");
  return { buffer, mime, sha256: info.sha256 || null };
}

async function uploadWhatsappMedia(path, buffer, contentType) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/whatsapp-media/${path}`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": contentType || "application/octet-stream",
      "x-upsert": "true",
    },
    body: buffer,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`storage upload: ${t || r.status}`);
  return `${SUPABASE_URL}/storage/v1/object/public/whatsapp-media/${path}`;
}

function formWhisper(buffer, mimeType, model) {
  const { file, filename, mime } = arquivoAudioParaForm(buffer, mimeType, "voice");
  const form = new FormData();
  if (typeof File !== "undefined" && file instanceof File) {
    form.append("file", file);
  } else {
    form.append("file", file, filename);
  }
  form.append("model", model);
  form.append("language", "pt");
  form.append("response_format", "json");
  return { form, filename, mime };
}

function classificarErroWhisper(status, body) {
  let code = null;
  let type = null;
  try {
    const err = body ? JSON.parse(body) : null;
    code = err?.error?.code || null;
    type = err?.error?.type || null;
  } catch { /* ignore */ }
  if (status === 401 || status === 403 || code === "invalid_api_key") return "auth";
  if (
    status === 429 ||
    code === "insufficient_quota" ||
    code === "credit_balance_exhausted" ||
    type === "insufficient_quota"
  ) {
    return "quota";
  }
  if (status === 400) return "format";
  return "http";
}

async function transcreverOpenAI(buffer, mimeType) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { text: null, error: "missing_key" };
  if (!buffer?.length) return { text: null, error: "empty" };
  try {
    const { form, filename, mime } = formWhisper(buffer, mimeType, "whisper-1");
    console.log("whisper openai request", { bytes: buffer.length, mime, filename });
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    const body = await r.text();
    if (!r.ok) {
      const error = classificarErroWhisper(r.status, body);
      console.error("whisper openai fail", r.status, { error, body: body?.slice?.(0, 400) || body });
      return { text: null, error };
    }
    const parsed = body ? JSON.parse(body) : null;
    const texto = (parsed?.text || "").trim();
    if (!texto) return { text: null, error: "empty" };
    return { text: texto, error: null, provider: "openai" };
  } catch (e) {
    console.error("whisper openai error", e);
    return { text: null, error: "network" };
  }
}

async function transcreverGroq(buffer, mimeType) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { text: null, error: "missing_key" };
  if (!buffer?.length) return { text: null, error: "empty" };
  try {
    const { form, filename, mime } = formWhisper(buffer, mimeType, "whisper-large-v3");
    console.log("whisper groq request", { bytes: buffer.length, mime, filename });
    const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    const body = await r.text();
    if (!r.ok) {
      const error = classificarErroWhisper(r.status, body);
      console.error("whisper groq fail", r.status, { error, body: body?.slice?.(0, 400) || body });
      return { text: null, error };
    }
    const parsed = body ? JSON.parse(body) : null;
    const texto = (parsed?.text || "").trim();
    if (!texto) return { text: null, error: "empty" };
    return { text: texto, error: null, provider: "groq" };
  } catch (e) {
    console.error("whisper groq error", e);
    return { text: null, error: "network" };
  }
}

async function transcreverAudio(buffer, mimeType) {
  const openai = await transcreverOpenAI(buffer, mimeType);
  if (openai.text) return openai;
  if (openai.error === "quota" || openai.error === "auth" || openai.error === "missing_key") {
    const groq = await transcreverGroq(buffer, mimeType);
    if (groq.text) return groq;
    if (groq.error && groq.error !== "missing_key") return groq;
  }
  return openai;
}

function extrairAudioMsg(msg) {
  if (!msg) return null;
  const tipo = msg.type;
  if (tipo === "audio" || tipo === "voice" || tipo === "ptt") {
    const payload = msg.audio || msg.voice || msg.ptt || null;
    if (!payload?.id) return null;
    return {
      mediaId: payload.id,
      mime: (payload.mime_type || "audio/ogg").split(";")[0].trim(),
      voice: Boolean(payload.voice) || tipo === "voice" || tipo === "ptt",
    };
  }
  return null;
}

function textoParaTTS(texto) {
  let t = String(texto || "")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~([^~]+)~/g, "$1")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "";
  if (t.length <= TTS_MAX_CHARS) return t;
  const corte = t.slice(0, TTS_MAX_CHARS);
  const ultimoEspaco = corte.lastIndexOf(" ");
  const base = ultimoEspaco > 400 ? corte.slice(0, ultimoEspaco) : corte;
  return `${base.trim()}…`;
}

async function gerarAudioTTS(texto) {
  const key = process.env.OPENAI_API_KEY;
  const input = textoParaTTS(texto);
  if (!key || !input) return null;
  try {
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        voice: TTS_VOICE,
        input,
        response_format: "mp3",
      }),
    });
    if (!r.ok) {
      const errBody = await r.text();
      console.error("tts fail", r.status, errBody);
      return null;
    }
    const buffer = Buffer.from(await r.arrayBuffer());
    if (!buffer.length) return null;
    return { buffer, mime: "audio/mpeg", ext: "mp3" };
  } catch (e) {
    console.error("tts error", e);
    return null;
  }
}

async function uploadMediaMeta(buffer, mimeType, filename) {
  const phoneId = process.env.PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  if (!phoneId || !token) throw new Error("media upload: credenciais ausentes");
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", mimeType || "audio/mpeg");
  const { file, filename: nome } = arquivoAudioParaForm(
    buffer,
    mimeType || "audio/mpeg",
    (filename || "reply").replace(/\.[^.]+$/, "") || "reply",
  );
  if (typeof File !== "undefined" && file instanceof File) {
    form.append("file", file);
  } else {
    form.append("file", file, filename || nome);
  }
  const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`meta media upload ${r.status}: ${body}`);
  const parsed = body ? JSON.parse(body) : null;
  const mediaId = parsed?.id || null;
  if (!mediaId) throw new Error(`meta media upload: id ausente (${body})`);
  return mediaId;
}

async function enviarWhatsAppAudio(para, mediaId) {
  const phoneId = process.env.PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  if (!phoneId || !token) {
    return { ok: false, erro: "credenciais ausentes" };
  }
  const destino = String(para || "").replace(/\D/g, "");
  if (!destino || !mediaId) return { ok: false, erro: "destino ou media_id inválido" };

  const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: destino,
      type: "audio",
      audio: { id: mediaId },
    }),
  });
  const body = await r.text();
  let parsed = null;
  try { parsed = body ? JSON.parse(body) : null; } catch { /* ignore */ }
  if (!r.ok) {
    console.error("meta audio send fail", r.status, body);
    return { ok: false, erro: body, destino };
  }
  const wamid = parsed?.messages?.[0]?.id || null;
  console.log("meta audio send ok", { destino, wamid, mediaId });
  return { ok: true, destino, wamid, mediaId };
}

async function enviarRespostaAudio(conversaId, waId, texto) {
  try {
    const tts = await gerarAudioTTS(texto);
    if (!tts) return null;
    const mediaId = await uploadMediaMeta(tts.buffer, tts.mime, `bot_${Date.now()}.${tts.ext}`);
    const envio = await enviarWhatsAppAudio(waId, mediaId);
    if (!envio.ok) return null;

    let mediaUrl = null;
    try {
      const path = `${conversaId}/bot_${Date.now()}.${tts.ext}`;
      mediaUrl = await uploadWhatsappMedia(path, tts.buffer, tts.mime);
    } catch (e) {
      console.error("tts storage upload", e);
    }
    return { mediaId, mediaUrl, mime: tts.mime };
  } catch (e) {
    console.error("enviarRespostaAudio", e);
    return null;
  }
}

async function atualizarConversa(id, patch) {
  await rpc("wa_atualizar_conversa", {
    p_secret: secret(),
    p_id: id,
    p_patch: patch,
  });
}

async function enviarWhatsApp(para, texto) {
  const phoneId = process.env.PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  if (!phoneId || !token) {
    console.error("WHATSAPP_TOKEN ou PHONE_NUMBER_ID ausente");
    return { ok: false, erro: "credenciais ausentes" };
  }
  const destino = String(para || "").replace(/\D/g, "");
  if (!destino) return { ok: false, erro: "destino inválido" };

  const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: destino,
      type: "text",
      text: { preview_url: false, body: texto },
    }),
  });
  const body = await r.text();
  let parsed = null;
  try { parsed = body ? JSON.parse(body) : null; } catch { /* ignore */ }
  if (!r.ok) {
    console.error("meta send fail", r.status, body);
    return { ok: false, erro: body, destino };
  }
  const wamid = parsed?.messages?.[0]?.id || null;
  const waId = parsed?.contacts?.[0]?.wa_id || destino;
  console.log("meta send ok", { destino, waId, wamid });
  return { ok: true, destino, waId, wamid };
}

async function responderCliente(conversaId, waId, texto) {
  const envio = await enviarWhatsApp(waId, texto);
  const audio = envio.ok ? await enviarRespostaAudio(conversaId, waId, texto) : null;
  if (audio?.mediaUrl) {
    await salvarMsg(conversaId, "bot", texto, {
      tipo: "audio",
      media_url: audio.mediaUrl,
      mime_type: audio.mime || "audio/mpeg",
      wa_media_id: audio.mediaId || null,
    });
  } else {
    await salvarMsg(conversaId, "bot", texto);
  }
  if (!envio.ok) {
    await salvarMsg(conversaId, "sistema", "Falha ao enviar no WhatsApp: verifique token e Phone Number ID.");
  }
  return envio;
}

async function enviarWhatsAppTemplate(para, templateName, languageCode, bodyParams) {
  const phoneId = process.env.PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  if (!phoneId || !token) return { ok: false, erro: "credenciais ausentes" };
  const destino = String(para || "").replace(/\D/g, "");
  if (!destino) return { ok: false, erro: "destino inválido" };

  const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: destino,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          {
            type: "body",
            parameters: bodyParams.map((text) => ({ type: "text", text: String(text) })),
          },
        ],
      },
    }),
  });
  const body = await r.text();
  let parsed = null;
  try { parsed = body ? JSON.parse(body) : null; } catch { /* ignore */ }
  if (!r.ok) {
    console.error("meta template fail", r.status, body);
    return { ok: false, erro: body, destino };
  }
  return {
    ok: true,
    destino,
    waId: parsed?.contacts?.[0]?.wa_id || destino,
    wamid: parsed?.messages?.[0]?.id || null,
  };
}

async function notificarEspecialista(conversa, contexto) {
  const info = comercialInfo();
  const nome = conversa.nome_cliente || contexto.nome || "Cliente";
  const empresa = conversa.empresa || contexto.empresa || "—";
  const waDigits = String(conversa.wa_id || "").replace(/\D/g, "");
  const telCliente = waDigits ? `+${waDigits}` : (conversa.wa_id || "—");
  const linkWa = waDigits ? `https://wa.me/${waDigits}` : "";
  const rota = contexto.rota || "—";
  const produto = contexto.produto || (ROTAS[rota]?.produto) || "Comercial";
  const respostas = contexto.respostas || {};
  const resumoResp = Object.entries(respostas)
    .map(([k, v]) => `• ${k}: ${v}`)
    .join("\n");
  const rotulo = `Rota ${rota} · ${produto}`;
  const params = ["FIC Capital", nome, telCliente, rotulo];

  let envio = await enviarWhatsAppTemplate(info.especialistaWa, "rotea_lead_alerta", "pt_BR", params);
  let via = "template:rotea_lead_alerta";
  if (!envio.ok) {
    envio = await enviarWhatsAppTemplate(info.especialistaWa, "rotea_novo_lead", "pt_BR", params);
    via = "template:rotea_novo_lead";
  }

  if (!envio.ok) {
    const paraQuem = info.especialistaNome ? `Olá, *${info.especialistaNome}*!` : "Olá!";
    const aviso =
      `${paraQuem}\n\n` +
      `🔔 *Novo lead — FIC Capital*\n\n` +
      `*Nome:* ${nome}\n` +
      `*Empresa:* ${empresa}\n` +
      `*WhatsApp:* ${telCliente}\n` +
      (linkWa ? `*Abrir:* ${linkWa}\n` : "") +
      `*Rota:* ${rota} · ${produto}\n` +
      (resumoResp ? `\n*Respostas:*\n${resumoResp}\n` : "") +
      `\nPor favor, fale com o cliente pelo WhatsApp.`;
    envio = await enviarWhatsApp(info.especialistaWa, aviso);
    via = "texto_livre";
  }

  if (envio.ok) {
    await salvarMsg(
      conversa.id,
      "sistema",
      `Comercial ${info.especialistaNome} +${envio.waId || info.especialistaWa} notificado · ${rotulo}` +
        ` · via ${via}` +
        (envio.wamid ? ` · ${envio.wamid}` : ""),
    );
  } else {
    await salvarMsg(
      conversa.id,
      "sistema",
      `Falha ao avisar comercial +${info.especialistaWa}: ${String(envio.erro || "erro").slice(0, 200)}`,
    );
  }
  return { envio, info, produto };
}

async function processarStatuses(statuses) {
  for (const st of statuses || []) {
    const wamid = st.id || st.message_id || null;
    const status = st.status || "";
    const err = st.errors?.[0];
    const erroTxt = err
      ? `${err.code || ""} ${err.title || ""} ${err.message || err.error_data?.details || ""}`.trim()
      : "";
    console.log("meta status", { wamid, status, recipient: st.recipient_id, erro: erroTxt || null });
    if (status === "failed" || status === "undelivered") {
      try {
        await rpc("wa_anotar_falha_wamid", {
          p_secret: secret(),
          p_wamid: wamid,
          p_status: status,
          p_erro: erroTxt || "falha de entrega",
        });
      } catch (e) {
        console.error("wa_anotar_falha_wamid", e);
      }
    }
  }
}

/** OpenAI leve só para tema_provável no Fallback / ambíguo. */
async function guessTemaOpenAI(texto) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Classifique a mensagem do lead FIC Capital. Responda JSON: {"rota":"A"|"B"|"C"|"D"|"E"|"F"|"G"|null,"tema":"frase curta em pt-BR"}. ' +
              "A=captação/PRO Invest, B=receita/SEC, C=imposto/RADAR, D=sistema/SIG, E=planos/SEE, F=Advisor, G=cliente ativo. Se incerto, rota null.",
          },
          { role: "user", content: String(texto || "").slice(0, 500) },
        ],
      }),
    });
    const body = await r.text();
    if (!r.ok) return null;
    const parsed = body ? JSON.parse(body) : null;
    const raw = parsed?.choices?.[0]?.message?.content || "";
    const data = JSON.parse(raw);
    const rota = data?.rota && ROTAS[data.rota] ? data.rota : null;
    const tema = typeof data?.tema === "string" ? data.tema.trim().slice(0, 80) : null;
    return { rota, tema };
  } catch (e) {
    console.error("guessTemaOpenAI", e);
    return null;
  }
}

// ---------- fluxo FIC Capital ----------

async function persistEstado(conversa, estado, extra = {}) {
  const patch = {
    bot_estado: estado,
    status: extra.status || conversa.status || "bot",
    ...extra,
  };
  delete patch.bot_estado; // set explicitly below
  await atualizarConversa(conversa.id, {
    ...patch,
    bot_estado: estado,
  });
  Object.assign(conversa, patch, { bot_estado: estado });
}

async function handoffHumano(conversa, estado, motivo = "handoff") {
  const info = comercialInfo();
  const vars = {
    nome: conversa.nome_cliente || estado.nome_parcial || "você",
    empresa: conversa.empresa || estado.empresa_parcial || "empresa",
    consultor: info.especialistaNome,
    produto: ROTAS[estado.rota]?.produto || estado.produto || "o seu caso",
  };

  const { envio } = await notificarEspecialista(
    { ...conversa, nome_cliente: vars.nome, empresa: vars.empresa },
    {
      rota: estado.rota || "H",
      produto: vars.produto,
      nome: vars.nome,
      empresa: vars.empresa,
      respostas: estado.respostas || {},
      motivo,
    },
  );

  const msgCliente = fill(
    "Vou te passar pro {{consultor}} agora — ele cuida de {{produto}} e conhece bem o seu segmento. Já mandei todo o contexto, você não precisa repetir nada.",
    vars,
  );
  await responderCliente(conversa.id, conversa.wa_id, msgCliente);

  estado.passo = "handoff";
  estado.handoff_em = new Date().toISOString();
  await persistEstado(conversa, estado, {
    etapa: 4,
    status: "fila",
    assunto: `FIC Capital · ${estado.rota || "H"} · ${vars.produto} · ${motivo}`,
    setor: "Comercial",
    nome_cliente: vars.nome !== "você" ? vars.nome : conversa.nome_cliente,
    empresa: vars.empresa !== "empresa" ? vars.empresa : conversa.empresa,
  });
  return envio;
}

async function enviarAberturaComercial(conversa, estado) {
  await responderCliente(conversa.id, conversa.wa_id, "Oi! Aqui é do comercial da FIC Capital.");
  if (!estado.lgpd_enviado) {
    await sleep(1500);
    await responderCliente(conversa.id, conversa.wa_id, LGPD);
    estado.lgpd_enviado = true;
  }
  await sleep(4000);
  await responderCliente(conversa.id, conversa.wa_id, pick(ABERTURA_NOME));
  estado.passo = "aguardando_nome";
  estado.faltando = "nome";
  estado.pediu_faltante = false;
  await persistEstado(conversa, estado, { etapa: 1, status: "bot" });
}

async function enviarForaHorario(conversa, estado) {
  const msg = fill(
    "Oi! Aqui é do comercial da FIC Capital. Já são {{hora}} por aqui — nosso atendimento vai até as 20h. Respondo com calma amanhã cedo.\n\nMas adianta uma coisa: é sobre captação, imposto ou receita? Assim eu já chego com a pessoa certa.",
    { hora: horaLabelSP() },
  );
  await responderCliente(conversa.id, conversa.wa_id, msg);
  if (!estado.lgpd_enviado) {
    await sleep(1200);
    await responderCliente(conversa.id, conversa.wa_id, LGPD);
    estado.lgpd_enviado = true;
  }
  estado.passo = "fora_horario";
  await persistEstado(conversa, estado, { etapa: 5, status: "bot" });
}

async function enviarFimSemana(conversa, estado) {
  const nome = conversa.nome_cliente || estado.nome_parcial || "";
  const msg = nome
    ? fill(
      "Oi, {{nome}}! Recebi sua mensagem. O time volta segunda de manhã e você é o primeiro da fila.\n\nSe quiser adiantar, me conta o que precisa que eu já deixo encaminhado.",
      { nome },
    )
    : "Oi! Recebi sua mensagem. O time volta segunda de manhã e você é o primeiro da fila.\n\nSe quiser adiantar, me conta o que precisa que eu já deixo encaminhado.";
  await responderCliente(conversa.id, conversa.wa_id, msg);
  if (!estado.lgpd_enviado) {
    await sleep(1200);
    await responderCliente(conversa.id, conversa.wa_id, LGPD);
    estado.lgpd_enviado = true;
  }
  estado.passo = "fim_semana";
  await persistEstado(conversa, estado, { etapa: 5, status: "bot" });
}

async function enviarDescoberta(conversa, estado) {
  const nome = conversa.nome_cliente;
  const empresa = conversa.empresa;
  // Saudação com nome já foi enviada na abertura (após o nome)
  await responderCliente(
    conversa.id,
    conversa.wa_id,
    "A FIC Capital trabalha com três frentes principais: captar investimento, aumentar receita líquida sem vender mais e reduzir imposto dentro da lei. Tudo ad exitum — a gente só ganha quando o resultado entra no seu caixa.",
  );
  await sleep(2000);
  await responderCliente(
    conversa.id,
    conversa.wa_id,
    fill(
      "Qual dos três está mais perto do que a {{empresa}} precisa hoje?\n\n(Se for outra coisa, escreve com suas palavras que eu entendo.)",
      { empresa },
    ),
  );
  estado.passo = "aguardando_intencao";
  estado.fallback_tentativas = 0;
  await persistEstado(conversa, estado, {
    etapa: 2,
    status: "bot",
    nome_cliente: nome,
    empresa,
  });
}

async function iniciarRota(conversa, estado, rota) {
  estado.rota = rota;
  estado.respostas = estado.respostas || {};
  estado.fallback_tentativas = 0;
  const nome = conversa.nome_cliente || "você";
  const empresa = conversa.empresa || "empresa";

  if (rota === "A") {
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Boa. É o PRO Invest: estruturar a captação com governança em padrão internacional — fundo multimercado, sócio estratégico ou parceria sobre nova receita, via SCP ou SPE.",
    );
    await sleep(4000);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      fill(
        "Deixa eu entender o tamanho antes de te passar pro time. Quanto a {{empresa}} faturou no último ano, mais ou menos?\n\nAté R$ 10M · R$ 10M a 30M · R$ 30M a 100M · R$ 100M a 300M · acima disso",
        { empresa },
      ),
    );
    estado.passo = "A.2";
  } else if (rota === "B") {
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      fill(
        "Essa é a frente que mais surpreende empresário, {{nome}}. O SEC Finances aumenta a receita líquida sem precisar vender uma unidade a mais — modulação mercantil, reenquadramento econômico e ajuste da estrutura societária.",
        { nome },
      ),
    );
    await sleep(4000);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Pra eu saber se faz sentido no seu caso: qual o faturamento anual aproximado?\n\nAté R$ 10M · R$ 10M a 30M · R$ 30M a 100M · acima de R$ 100M",
    );
    estado.passo = "B.2";
  } else if (rota === "C") {
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Certo. O RADAR Benefits trabalha os dois lados: reduzir imposto corrente por imunidades, isenções, subvenções e programas especiais — e também reduzir dívida ativa.",
    );
    await sleep(4000);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Me diz uma coisa: hoje o problema é mais o imposto que você paga todo mês ou a dívida que já está lá atrás?",
    );
    estado.passo = "C.2";
  } else if (rota === "D") {
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Faz sentido. O SIG é o sistema integral de gerenciamento: ERP, CRM e CFT no mesmo lugar, com implantação chave na mão e operação contínua depois.",
    );
    await sleep(4000);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Hoje vocês usam algum sistema ou está tudo em planilha?",
    );
    estado.passo = "D.2";
  } else if (rota === "E") {
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      fill(
        "Boa pergunta, {{nome}}. A jornada é organizada em três planos — BASIS, PRO e LEADER — conforme o estágio e o faturamento da empresa.",
        { nome },
      ),
    );
    await sleep(4000);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Só que qual deles serve pra você depende de dois números: faturamento anual e regime tributário. Consegue me passar?",
    );
    estado.passo = "E.2";
  } else if (rota === "F") {
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Que bom que você perguntou. O Programa Advisor licencia o seu escritório como Executivo Regional — você passa a operar os seis pilares da FIC Capital com funil por segmento, apoio institucional e participação nos resultados.",
    );
    await sleep(4000);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Antes de te mandar o material: você atua hoje como contador, advogado, consultor financeiro ou empresário?",
    );
    estado.passo = "F.2";
  } else if (rota === "G") {
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Ah, você já é da casa. Deixa eu te tirar da fila comercial então.",
    );
    await sleep(3000);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Me passa o CNPJ ou o nome da empresa e o que você precisa — encaminho direto pro responsável pela sua conta.",
    );
    estado.passo = "G.2";
  }

  await persistEstado(conversa, estado, {
    etapa: 3,
    status: "bot",
    assunto: `FIC Capital · rota ${rota}`,
  });
}

async function aposAgenda(conversa, estado, respostaAgenda) {
  estado.respostas = estado.respostas || {};
  estado.respostas.agenda_preferencia = String(respostaAgenda || "").slice(0, 200);
  const link = estado.rota === "F" ? linkAgendaAdvisor() : linkAgenda();
  await responderCliente(conversa.id, conversa.wa_id, link);
  await sleep(1500);
  await handoffHumano(conversa, estado, "agenda");
}

async function processarRota(conversa, estado, texto) {
  const passo = estado.passo;
  const nome = conversa.nome_cliente || "você";
  const empresa = conversa.empresa || "empresa";
  estado.respostas = estado.respostas || {};

  // ---- A ----
  if (passo === "A.2") {
    estado.respostas.faturamento = texto.slice(0, 200);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      fill(
        "Certo, {{nome}}. Nessa faixa a gente costuma trabalhar bem.\n\nE o recurso seria pra quê? Giro, expansão, compra de ativo ou reorganizar dívida?",
        { nome },
      ),
    );
    estado.passo = "A.3";
    await persistEstado(conversa, estado);
    return;
  }
  if (passo === "A.3") {
    estado.respostas.uso_recurso = texto.slice(0, 200);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Entendi. Última: vocês são Lucro Real, Presumido ou Simples?",
    );
    estado.passo = "A.4";
    await persistEstado(conversa, estado);
    return;
  }
  if (passo === "A.4") {
    estado.respostas.regime = texto.slice(0, 120);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Perfeito. Já tenho o suficiente pra abrir o diagnóstico gratuito — é a leitura jurídica, contábil e fiscal da operação, sem custo e sem compromisso.\n\nSão 30 minutos. Prefere ainda esta semana ou na que vem?",
    );
    estado.passo = "A.5";
    await persistEstado(conversa, estado);
    return;
  }
  if (passo === "A.5") {
    await aposAgenda(conversa, estado, texto);
    return;
  }

  // ---- B ----
  if (passo === "B.2") {
    estado.respostas.faturamento = texto.slice(0, 200);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "E o regime é Lucro Real, Presumido ou Simples?",
    );
    estado.passo = "B.3";
    await persistEstado(conversa, estado);
    return;
  }
  if (passo === "B.3") {
    estado.respostas.regime = texto.slice(0, 120);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Última: a empresa opera em quantos estados? Tem alguma operação fora do Brasil?",
    );
    estado.passo = "B.4";
    await persistEstado(conversa, estado);
    return;
  }
  if (passo === "B.4") {
    estado.respostas.estados_exterior = texto.slice(0, 200);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Ótimo. Com isso o time já monta a leitura preliminar.\n\nO caminho é o diagnóstico gratuito, 30 minutos — e em até 24h úteis você recebe o plano de ação com escopo e prazo.\n\nMelhor de manhã ou à tarde?",
    );
    estado.passo = "B.5";
    await persistEstado(conversa, estado);
    return;
  }
  if (passo === "B.5") {
    await aposAgenda(conversa, estado, texto);
    return;
  }

  // ---- C ----
  if (passo === "C.2") {
    const ramo = detectarDividaVsImposto(texto);
    estado.respostas.c_tipo = texto.slice(0, 200);
    if (ramo === "divida" || (!ramo && /divida|atras|passiv|pgfn|execuc/i.test(norm(texto)))) {
      estado.ramo_c = "divida";
      await responderCliente(
        conversa.id,
        conversa.wa_id,
        "Entendi. Essa dívida está em qual esfera — federal, estadual, municipal ou mais de uma?",
      );
      estado.passo = "C.3";
    } else if (ramo === "imposto" || !ramo) {
      // default / imposto corrente
      estado.ramo_c = ramo === "imposto" ? "imposto" : (ramo || "imposto");
      if (!ramo) {
        // ambíguo: pergunta de novo uma vez
        if (!estado.c2_retry) {
          estado.c2_retry = true;
          await responderCliente(
            conversa.id,
            conversa.wa_id,
            "Me diz só pra eu não errar: é mais o imposto do mês a mês ou a dívida que já ficou pra trás?",
          );
          await persistEstado(conversa, estado);
          return;
        }
        estado.ramo_c = "imposto";
      }
      await responderCliente(
        conversa.id,
        conversa.wa_id,
        "Entendi. Qual o faturamento anual e o regime tributário?",
      );
      estado.passo = "C.4";
    }
    await persistEstado(conversa, estado);
    return;
  }
  if (passo === "C.3") {
    estado.respostas.esfera = texto.slice(0, 120);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Certo. Valor aproximado do passivo consolidado?",
    );
    estado.passo = "C.3b";
    await persistEstado(conversa, estado);
    return;
  }
  if (passo === "C.3b") {
    estado.respostas.passivo = texto.slice(0, 120);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Já tem parcelamento ativo ou execução fiscal em andamento?",
    );
    estado.passo = "C.3c";
    await persistEstado(conversa, estado);
    return;
  }
  if (passo === "C.3c") {
    estado.respostas.parcelamento_execucao = texto.slice(0, 200);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      fill(
        "Perfeito, {{nome}}. Nossos protocolos são validados por ex-procuradores e ex-auditores — gente que já esteve do outro lado do balcão. Nesse tipo de tese isso pesa.\n\nVou abrir o diagnóstico gratuito pra você. Consegue 30 minutos esta semana?",
        { nome },
      ),
    );
    estado.passo = "C.5";
    await persistEstado(conversa, estado);
    return;
  }
  if (passo === "C.4") {
    estado.respostas.faturamento_regime = texto.slice(0, 200);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "E o segmento — indústria, agro, alimentício, farmacêutico, logística ou tecnologia?",
    );
    estado.passo = "C.4b";
    await persistEstado(conversa, estado);
    return;
  }
  if (passo === "C.4b") {
    estado.respostas.segmento = texto.slice(0, 120);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      fill(
        "Perfeito, {{nome}}. Nossos protocolos são validados por ex-procuradores e ex-auditores — gente que já esteve do outro lado do balcão. Nesse tipo de tese isso pesa.\n\nVou abrir o diagnóstico gratuito pra você. Consegue 30 minutos esta semana?",
        { nome },
      ),
    );
    estado.passo = "C.5";
    await persistEstado(conversa, estado);
    return;
  }
  if (passo === "C.5") {
    await aposAgenda(conversa, estado, texto);
    return;
  }

  // ---- D ----
  if (passo === "D.2") {
    estado.respostas.sistema_atual = texto.slice(0, 200);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "E quantas pessoas usariam? (1 a 10 · 11 a 50 · 51 a 200 · mais de 200)",
    );
    estado.passo = "D.3";
    await persistEstado(conversa, estado);
    return;
  }
  if (passo === "D.3") {
    estado.respostas.usuarios = texto.slice(0, 80);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      fill(
        "Certo. O time faz uma demonstração de 30 minutos já com o cenário da {{empresa}}.\n\nTe mando os horários?",
        { empresa },
      ),
    );
    estado.passo = "D.4";
    await persistEstado(conversa, estado);
    return;
  }
  if (passo === "D.4") {
    await aposAgenda(conversa, estado, texto);
    return;
  }

  // ---- E ----
  if (passo === "E.2") {
    estado.respostas.faturamento_regime = texto.slice(0, 200);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Perfeito. Nessa faixa o caminho natural é começar pelo diagnóstico, e aí o time já te indica o plano certo — evita você pagar por escopo que não precisa.\n\nSem custo. Quer que eu reserve 30 minutos?",
    );
    estado.passo = "E.3";
    await persistEstado(conversa, estado);
    return;
  }
  if (passo === "E.3") {
    if (insistePreco(texto) || /nao|só o preço|so o preco|sem reuniao|sem diagnostico/.test(norm(texto))) {
      await responderCliente(
        conversa.id,
        conversa.wa_id,
        "Te entendo, e vou ser direto: o grosso da nossa remuneração é ad exitum, incide sobre o resultado auferido e homologado. Não tem como eu te dar número sem ver a operação — seria chute, e chute nesse assunto sai caro pros dois lados.",
      );
      estado.passo = "E.4";
      estado.e_preco_insist = true;
      await persistEstado(conversa, estado);
      return;
    }
    await aposAgenda(conversa, estado, texto);
    return;
  }
  if (passo === "E.4") {
    if (insistePreco(texto) || foraPerfil(texto)) {
      await responderCliente(
        conversa.id,
        conversa.wa_id,
        fill(
          "{{nome}}, vou ser honesto com você: nessa faixa o nosso modelo ainda não se paga, e eu não quero te vender coisa errada. Guardo seu contato e te procuro quando a operação crescer — pode ser?",
          { nome },
        ),
      );
      estado.passo = "fora_perfil";
      await persistEstado(conversa, estado, {
        status: "bot",
        assunto: "FIC Capital · fora de perfil (SEE)",
      });
      return;
    }
    await aposAgenda(conversa, estado, texto);
    return;
  }

  // ---- F ----
  if (passo === "F.2") {
    estado.respostas.atuacao = texto.slice(0, 120);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "E já tem carteira de clientes empresariais rodando?",
    );
    estado.passo = "F.3";
    await persistEstado(conversa, estado);
    return;
  }
  if (passo === "F.3") {
    estado.respostas.carteira = texto.slice(0, 120);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Qual sua cidade e estado?",
    );
    estado.passo = "F.4";
    await persistEstado(conversa, estado);
    return;
  }
  if (passo === "F.4") {
    estado.respostas.cidade_estado = texto.slice(0, 120);
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      fill(
        "Bom perfil, {{nome}}. Vou te encaminhar pro time de credenciamento.\n\nEles fazem uma apresentação de 30 minutos com o modelo completo, condições e território disponível na sua região.\n\nAgenda aqui: {{link}}",
        { nome, link: linkAgendaAdvisor() },
      ),
    );
    estado.passo = "F.5";
    await persistEstado(conversa, estado);
    await sleep(2000);
    await handoffHumano(conversa, estado, "advisor");
    return;
  }

  // ---- G ----
  if (passo === "G.2") {
    estado.respostas.conta = texto.slice(0, 300);
    await handoffHumano(conversa, estado, "base_ativa");
    return;
  }

  // passo desconhecido na rota → handoff
  await handoffHumano(conversa, estado, "passo_invalido");
}

async function processarFallback(conversa, estado, texto) {
  const nome = conversa.nome_cliente || "você";
  const empresa = conversa.empresa || "empresa";
  const tentativas = (estado.fallback_tentativas || 0) + 1;
  estado.fallback_tentativas = tentativas;

  if (tentativas === 1) {
    let tema = estado.tema_provavel;
    let rotaGuess = matchRota(texto);
    if (!tema) {
      const ia = await guessTemaOpenAI(texto);
      if (ia?.tema) tema = ia.tema;
      if (ia?.rota) rotaGuess = ia.rota;
    }
    if (!tema && rotaGuess) tema = temaProvavelLabel(rotaGuess);
    if (!tema) tema = "o que a empresa precisa agora";
    estado.tema_provavel = tema;
    if (rotaGuess) estado.rota_sugerida = rotaGuess;

    await responderCliente(
      conversa.id,
      conversa.wa_id,
      fill(
        "Deixa eu ver se peguei certo, {{nome}} — você tá falando mais de {{tema_provavel}}, é isso?",
        { nome, tema_provavel: tema },
      ),
    );
    estado.passo = "H.1";
    await persistEstado(conversa, estado);
    return;
  }

  if (tentativas === 2 || estado.passo === "H.1") {
    // se confirmou tema e temos rota sugerida, segue
    const t = norm(texto);
    if ((/^(sim|isso|exato|pode|certo|uhum|aham)/.test(t) || t.includes("isso mesmo")) && estado.rota_sugerida) {
      await iniciarRota(conversa, estado, estado.rota_sugerida);
      return;
    }
    // se agora casou keyword, inicia
    const rota = matchRota(texto);
    if (rota) {
      await iniciarRota(conversa, estado, rota);
      return;
    }
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      fill(
        "Melhor eu não chutar. Me descreve em uma frase o que tá pegando aí na {{empresa}} que eu te ligo na pessoa certa.",
        { empresa },
      ),
    );
    estado.passo = "H.2";
    await persistEstado(conversa, estado);
    return;
  }

  // 3ª → handoff
  await responderCliente(
    conversa.id,
    conversa.wa_id,
    "Vou te passar pro consultor agora, é mais rápido. Um minuto.",
  );
  await sleep(1500);
  await handoffHumano(conversa, estado, "fallback_3");
}

async function processarIntencao(conversa, estado, texto) {
  let rota = matchRota(texto);
  if (!rota) {
    const ia = await guessTemaOpenAI(texto);
    if (ia?.rota) {
      rota = ia.rota;
    } else if (ia?.tema) {
      estado.tema_provavel = ia.tema;
    }
  }
  if (rota) {
    await iniciarRota(conversa, estado, rota);
    return;
  }
  await processarFallback(conversa, estado, texto);
}

async function processarMensagemBot(conversa, texto) {
  let estado = getEstado(conversa);
  const horario = statusHorario();

  // reinício
  if (ehReinicio(texto) && estado.passo && estado.passo !== "inicio") {
    estado = { lgpd_enviado: Boolean(estado.lgpd_enviado) };
    await atualizarConversa(conversa.id, {
      nome_cliente: null,
      empresa: null,
      assunto: null,
      setor: null,
      atendente_id: null,
      etapa: 0,
      status: "bot",
      bot_estado: estado,
    });
    conversa.nome_cliente = null;
    conversa.empresa = null;
    conversa.status = "bot";
    conversa.etapa = 0;
    conversa.bot_estado = estado;
    await salvarMsg(conversa.id, "sistema", "Fluxo FIC Capital reiniciado pelo cliente");
  }

  // humano já assumiu
  if (conversa.status !== "bot" && estado.passo === "handoff") {
    return;
  }
  if (conversa.status !== "bot" && conversa.etapa === 4) {
    return;
  }

  const passo = estado.passo || "inicio";

  // primeiro contato / reinício
  if (!passo || passo === "inicio" || conversa.etapa === 0) {
    if (horario === "fim_semana") {
      await enviarFimSemana(conversa, estado);
      return;
    }
    if (horario === "fora_horario") {
      await enviarForaHorario(conversa, estado);
      return;
    }
    await enviarAberturaComercial(conversa, estado);
    return;
  }

  // fora do horário / fim de semana — coleta tema e aguarda
  if (passo === "fora_horario" || passo === "fim_semana") {
    estado.respostas = estado.respostas || {};
    estado.respostas.fora_horario_msg = texto.slice(0, 400);
    const rota = matchRota(texto);
    if (rota) estado.rota = rota;
    const parsed = parseNomeEmpresa(texto, estado);
    if (parsed.nome) {
      estado.nome_parcial = parsed.nome;
      conversa.nome_cliente = parsed.nome;
    }
    if (parsed.empresa) {
      estado.empresa_parcial = parsed.empresa;
      conversa.empresa = parsed.empresa;
    }
    if (passo === "fim_semana") {
      await responderCliente(
        conversa.id,
        conversa.wa_id,
        fill(
          "Perfeito{{nome}}. Já deixei encaminhado — segunda de manhã você é prioridade.",
          { nome: conversa.nome_cliente ? `, ${conversa.nome_cliente}` : "" },
        ),
      );
    } else {
      await responderCliente(
        conversa.id,
        conversa.wa_id,
        "Combinado. Amanhã cedo eu retorno com a pessoa certa. Obrigado!",
      );
    }
    estado.passo = "aguardando_retorno_horario";
    await persistEstado(conversa, estado, {
      status: "bot",
      nome_cliente: conversa.nome_cliente || null,
      empresa: conversa.empresa || null,
      assunto: `FIC Capital · fora horário · ${rota || "tema livre"}`,
    });
    return;
  }

  if (passo === "aguardando_retorno_horario") {
    // se voltou no horário comercial, segue abertura/descoberta
    if (horario === "comercial") {
      if (conversa.nome_cliente && conversa.empresa) {
        await enviarDescoberta(conversa, estado);
        return;
      }
      if (conversa.nome_cliente) {
        await responderCliente(conversa.id, conversa.wa_id, pick(ABERTURA_EMPRESA));
        estado.passo = "aguardando_empresa";
        estado.faltando = "empresa";
        estado.pediu_faltante = false;
        await persistEstado(conversa, estado, {
          nome_cliente: conversa.nome_cliente,
          etapa: 1,
          status: "bot",
        });
        return;
      }
      await enviarAberturaComercial(conversa, estado);
      return;
    }
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Ainda fora do expediente (atendimento até as 20h) — assim que o time entrar, seguimos de onde paramos.",
    );
    return;
  }

  if (passo === "fora_perfil") {
    await responderCliente(
      conversa.id,
      conversa.wa_id,
      "Combinado. Quando fizer sentido, é só chamar aqui.",
    );
    return;
  }

  // nome (abertura pediu só o nome)
  if (passo === "aguardando_nome" || passo === "aguardando_nome_empresa") {
    const jaTemNome = Boolean(conversa.nome_cliente || estado.nome_parcial);
    const faltandoPadrao = estado.faltando || (jaTemNome ? "empresa" : "nome");
    const parsed = parseNomeEmpresa(texto, { ...estado, faltando: faltandoPadrao });
    let nome = parsed.nome || conversa.nome_cliente || estado.nome_parcial;
    let empresa = parsed.empresa || conversa.empresa || estado.empresa_parcial;

    if (nome) estado.nome_parcial = nome;
    if (empresa) estado.empresa_parcial = empresa;

    if (!nome) {
      await responderCliente(
        conversa.id,
        conversa.wa_id,
        "Me passa só seu nome, por favor — assim eu te direciono direito.",
      );
      estado.faltando = "nome";
      estado.pediu_faltante = true;
      estado.passo = "aguardando_nome";
      await persistEstado(conversa, estado, { empresa: empresa || null });
      return;
    }

    const acabouDeReceberNome = !jaTemNome;
    conversa.nome_cliente = nome;
    if (acabouDeReceberNome) {
      await responderCliente(conversa.id, conversa.wa_id, fill("Prazer, {{nome}}.", { nome }));
    }

    if (empresa) {
      conversa.empresa = empresa;
      estado.faltando = null;
      await persistEstado(conversa, estado, {
        nome_cliente: nome,
        empresa,
        etapa: 2,
      });
      if (acabouDeReceberNome) await sleep(2000);
      await enviarDescoberta(conversa, estado);
      return;
    }

    if (acabouDeReceberNome) await sleep(1500);
    await responderCliente(conversa.id, conversa.wa_id, pick(ABERTURA_EMPRESA));
    estado.passo = "aguardando_empresa";
    estado.faltando = "empresa";
    estado.pediu_faltante = false;
    await persistEstado(conversa, estado, { nome_cliente: nome, etapa: 1 });
    return;
  }

  // empresa (após saudação com nome)
  if (passo === "aguardando_empresa") {
    const parsed = parseNomeEmpresa(texto, { ...estado, faltando: "empresa" });
    let empresa = parsed.empresa || conversa.empresa || estado.empresa_parcial;
    if (parsed.nome && !conversa.nome_cliente) {
      estado.nome_parcial = parsed.nome;
      conversa.nome_cliente = parsed.nome;
    }

    if (!empresa) {
      await responderCliente(conversa.id, conversa.wa_id, "E de qual empresa?");
      estado.faltando = "empresa";
      estado.pediu_faltante = true;
      await persistEstado(conversa, estado);
      return;
    }

    conversa.empresa = empresa;
    estado.empresa_parcial = empresa;
    estado.faltando = null;
    await persistEstado(conversa, estado, {
      nome_cliente: conversa.nome_cliente || estado.nome_parcial || null,
      empresa,
      etapa: 2,
    });
    await enviarDescoberta(conversa, estado);
    return;
  }

  if (passo === "aguardando_intencao" || passo === "H.1" || passo === "H.2") {
    if (passo === "H.1" || passo === "H.2") {
      await processarFallback(conversa, estado, texto);
      return;
    }
    await processarIntencao(conversa, estado, texto);
    return;
  }

  // dentro de rota A–G
  if (passo && /^[A-G]/.test(passo)) {
    await processarRota(conversa, estado, texto);
    return;
  }

  // fallback genérico
  await processarFallback(conversa, estado, texto);
}

// ---------- handler ----------

export default async function handler(req, res) {
  if (req.method === "GET") {
    const modo = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (modo === "subscribe" && token === process.env.VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Token de verificação inválido");
  }

  if (req.method !== "POST") return res.status(405).end();

  try {
    const entry = req.body?.entry?.[0]?.changes?.[0]?.value;
    if (entry?.statuses?.length) {
      await processarStatuses(entry.statuses);
      return res.status(200).json({ ok: true, statuses: true });
    }
    const msg = entry?.messages?.[0];
    if (!msg) return res.status(200).json({ ok: true });

    const waId = msg.from;
    const audioInfo = extrairAudioMsg(msg);
    const isText = msg.type === "text";
    if (!isText && !audioInfo) return res.status(200).json({ ok: true });

    const conversa = await acharOuCriarConversa(waId);
    conversa.wa_id = conversa.wa_id || waId;
    let texto = "";

    if (audioInfo) {
      let mediaUrl = null;
      let mime = normalizeAudioMime(audioInfo.mime);
      let transcript = null;
      let whisperError = null;
      let whisperProvider = null;
      let buffer = null;

      try {
        const dl = await baixarMediaWhatsApp(audioInfo.mediaId);
        buffer = dl.buffer;
        mime = normalizeAudioMime(dl.mime || mime);
      } catch (e) {
        console.error("audio download", e);
        whisperError = "pipeline";
      }

      if (buffer) {
        try {
          const path = `${conversa.id}/${Date.now()}_${audioInfo.mediaId}.${extFromMime(mime)}`;
          const uploadMime = mime.startsWith("audio/") ? mime : "application/octet-stream";
          mediaUrl = await uploadWhatsappMedia(path, buffer, uploadMime);
          console.log("audio storage ok", { path, mediaUrl: Boolean(mediaUrl) });
        } catch (e) {
          console.error("audio storage", e);
        }
      }

      if (buffer) {
        try {
          const whisper = await transcreverAudio(buffer, mime);
          transcript = whisper.text;
          whisperError = whisper.error;
          whisperProvider = whisper.provider || null;
        } catch (e) {
          console.error("audio whisper", e);
          whisperError = whisperError || "pipeline";
        }
      }

      if (transcript) {
        texto = transcript;
        await salvarMsg(conversa.id, "cliente", transcript, {
          tipo: "audio",
          media_url: mediaUrl,
          mime_type: mime,
          wa_media_id: audioInfo.mediaId,
        });
      } else {
        const placeholder = mediaUrl ? "Áudio" : "[Áudio recebido]";
        await salvarMsg(conversa.id, "cliente", placeholder, {
          tipo: "audio",
          media_url: mediaUrl,
          mime_type: mime,
          wa_media_id: audioInfo.mediaId,
        });
        if (conversa.status === "bot") {
          const temStt = Boolean(process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY);
          let msgAudio =
            "Recebi seu áudio. Por enquanto, responda por texto para eu continuar o atendimento.";
          if (temStt) {
            if (whisperError === "quota") {
              msgAudio =
                "Recebi seu áudio e já está disponível para a equipe. Neste momento a transcrição automática está indisponível (cota da API). Pode digitar a mensagem para eu continuar?";
            } else if (whisperError === "auth" || whisperError === "http" || whisperError === "network") {
              msgAudio =
                "Recebi seu áudio, mas estou com uma instabilidade para ouvir agora. Pode digitar a mensagem ou tentar de novo em instantes?";
            } else {
              msgAudio =
                "Recebi seu áudio, mas não consegui entender. Pode digitar a mensagem?";
            }
          }
          await responderCliente(conversa.id, waId, msgAudio);
        }
        return res.status(200).json({
          ok: true,
          audio: true,
          media: Boolean(mediaUrl),
          transcript: false,
          whisperError: whisperError || "unknown",
          whisperProvider,
        });
      }
    } else {
      texto = msg.text?.body ?? "";
      await salvarMsg(conversa.id, "cliente", texto);
    }

    await processarMensagemBot({ ...conversa, wa_id: waId }, texto);

    return res.status(200).json({
      ok: true,
      audio: Boolean(audioInfo),
      transcript: Boolean(audioInfo && texto),
      funil: "fic_capital",
    });
  } catch (e) {
    console.error("webhook error", e);
    return res.status(200).json({ ok: true });
  }
}
