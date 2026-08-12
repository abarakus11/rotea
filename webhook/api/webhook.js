// ============================================================
// ROTEA · Webhook da API oficial do WhatsApp (Meta Cloud API)
// Número: +55 11 5304-9387
// Fluxo:
//   0 → boas-vindas (pede nome)
//   1 → nome (pede empresa)
//   2 → empresa (atalhos numéricos + IA conversacional)
//   3 → intenção (1/2/3 + IA sobre a empresa; encaminha especialista)
// Env: WHATSAPP_TOKEN, PHONE_NUMBER_ID, VERIFY_TOKEN, WEBHOOK_SECRET
// Opcional: OPENAI_API_KEY — Whisper + chat (gpt-4o-mini) + TTS nas respostas ao cliente
// ============================================================

const TTS_VOICE = "nova";
const TTS_MODEL = "tts-1";
const TTS_MAX_CHARS = 800;
const CHAT_MODEL = "gpt-4o-mini";

const SUPABASE_URL = "https://wuuijbetsckjusnvdxts.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dWlqYmV0c2NranVzbnZkeHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjAwODAsImV4cCI6MjEwMTUzNjA4MH0.VzHyjS2goE1tX0udysdjnuXcfym39jPkJWc3j-xFYbA";

const EMPRESAS = ["RWB", "LIV ECO HABITATS", "IPROTECTOR", "LEGALCERT", "SINATRA", "ANIMA", "SCAN ATIVOS"];

/**
 * Conteúdo por empresa — edite "sobre", "servicos" e "site".
 * Quando o cliente escolher a empresa, o bot envia essa apresentação
 * e depois o menu: contratar / atendente / site.
 */
const EMPRESAS_INFO = {
  RWB: {
    nome: "RWB",
    sobre:
      "A *RWB* é um grupo de investimento privado focado no aumento da eficiência produtiva, ampliando o acesso a infraestrutura, logística e tecnologia em favor de agricultores, pecuaristas, agroindústrias e proprietários de ativos ambientais.\n\nEntregamos até *6× mais receita por hectare* com governança de padrão internacional.",
    servicos: [
      "Investimento privado para eficiência produtiva no agro",
      "Acesso a infraestrutura, logística e tecnologia",
      "Soluções para agricultores, pecuaristas e agroindústrias",
      "Valorização de ativos ambientais",
      "Governança de padrão internacional",
    ],
    site: "https://www.rwbagriinvest.com.br/",
    especialistaWa: "556799797227",
    especialistaNome: "Roberto Hayashi",
    setor: "Comercial",
  },
  "LIV ECO HABITATS": {
    nome: "LIV ECO HABITATS",
    sobre:
      "A *LIV ECO HABITATS* faz parte do Grupo FIC.\n\n_(Aguardando texto oficial da empresa.)_",
    servicos: [
      "Serviço 1 — descrição breve",
      "Serviço 2 — descrição breve",
      "Serviço 3 — descrição breve",
    ],
    site: "https://www.grupo-fic.com.br",
    especialistaWa: "5514997790770",
    especialistaNome: "Hugo Legramandi",
    setor: "Comercial",
  },
  IPROTECTOR: {
    nome: "IPROTECTOR",
    sobre:
      "O *iProtector* é uma plataforma de tecnologia para agenciamento de *Proteção Pessoal*, *Patrimonial* e *Monitoramento Robótico* com *Treinamentos de Elite*.\n\nConectamos clientes, empresas de segurança, agentes protetores e fornecedores de tecnologias avançadas de gerenciamento de riscos.",
    servicos: [
      "Agenciamento de Proteção Pessoal",
      "Proteção Patrimonial",
      "Monitoramento Robótico",
      "Treinamentos de Elite",
      "Conexão com empresas de segurança, agentes e fornecedores de tecnologia",
    ],
    site: "https://www.iprotector.com.br/",
    especialistaWa: "5511943870655",
    especialistaNome: "Carlos Eber",
    setor: "Comercial",
  },
  LEGALCERT: {
    nome: "LEGALCERT",
    sobre:
      "A *LegalCert* é uma legaltech de gerenciamento de empresas essenciais para governança em padrão internacional.\n\nÉ direcionada à *captação de investimentos*, *aumento de receita* e *incentivos econômicos tributários*.",
    servicos: [
      "Gerenciamento de empresas essenciais",
      "Governança em padrão internacional",
      "Captação de investimentos",
      "Estratégias de aumento de receita",
      "Incentivos econômicos tributários",
    ],
    site: "https://www.legalcert.com.br/",
    especialistaWa: "551151946830",
    especialistaNome: "Giovanna Cabral",
    setor: "Comercial",
  },
  SINATRA: {
    nome: "SINATRA",
    sobre:
      "O *Sinatra* é um clube exclusivo para apreciadores da boa música, da cultura refinada e dos momentos únicos.\n\nCada ambiente é uma composição — gastronomia autoral, encontros memoráveis e um serviço que antecipa o desejo antes do pedido.",
    servicos: [
      "Experiências gastronômicas autorais",
      "Ambientes exclusivos com boa música e cultura refinada",
      "Encontros e eventos memoráveis",
      "Serviço personalizado de alto padrão",
      "Clube privativo para momentos únicos",
    ],
    site: "https://www.sinatraclub.com.br/",
    especialistaWa: "5511947930224",
    especialistaNome: "Danielle",
    setor: "Comercial",
  },
  ANIMA: {
    nome: "ANIMA",
    sobre:
      "*ANIMA — Family Martial Arts Club*\n\nUm clube familiar dedicado ao desenvolvimento físico, mental e emocional, por meio das artes marciais, da atividade física e das práticas de saúde integrativa.\n\n*Propósito:* fortalecer corpo, mente e caráter, promovendo disciplina, autoconfiança, saúde, longevidade e qualidade de vida para crianças, jovens e adultos.",
    servicos: [
      "Artes marciais para toda a família",
      "Atividade física e condicionamento",
      "Práticas de saúde integrativa",
      "Desenvolvimento de disciplina e autoconfiança",
      "Programas para crianças, jovens e adultos",
    ],
    site: "https://www.animawc.com.br/",
    especialistaWa: "5511943870655",
    especialistaNome: "Carlos Eber",
    setor: "Comercial",
  },
  "SCAN ATIVOS": {
    nome: "SCAN ATIVOS",
    sobre:
      "A *SCAN ATIVOS* permite negociar *ativos judiciais com liquidez e segurança*.\n\nPrecatórios, empresas, imóveis e garantias com *pagamento em escrow* e transferência formalizada sob acompanhamento jurídico da *LEGALCERT*.",
    servicos: [
      "Negociação de precatórios",
      "Negociação de empresas",
      "Negociação de imóveis",
      "Garantias com pagamento em escrow",
      "Transferência formalizada com acompanhamento jurídico da LEGALCERT",
    ],
    site: "https://www.scanativos.com.br/",
    especialistaWa: "551151070250",
    especialistaNome: "Caroline Lima",
    setor: "Comercial",
  },
};

const PERGUNTA_BOAS_VINDAS =
  "Olá! 👋 Bem-vindo(a) ao atendimento do Grupo FIC. Sou o assistente virtual. Para começar, qual o seu nome?";
const PERGUNTA_EMPRESA =
  "Sobre qual empresa você gostaria de falar?\n\n1⃣ RWB\n2⃣ LIV ECO HABITATS\n3⃣ IPROTECTOR\n4⃣ LEGALCERT\n5⃣ SINATRA\n6⃣ ANIMA\n7⃣ SCAN ATIVOS\n\nResponda com o nome ou o número da opção.";

function saudacaoAposNome(nome) {
  const primeiro = (nome || "").trim().split(/\s+/)[0] || "tudo bem";
  const capitalizado = primeiro.charAt(0).toUpperCase() + primeiro.slice(1);
  return (
    `Olá, *${capitalizado}*! 👋 Seja bem-vindo(a) ao *Grupo FIC*.\n\n` +
    `É um prazer falar com você. Estou aqui para te ajudar a conhecer nossas empresas e conectar com o time certo.`
  );
}

const MENU_INTENCAO =
  "Como você prefere seguir?\n\n" +
  "1⃣ Contratar serviços\n" +
  "2⃣ Falar com um atendente\n" +
  "3⃣ Outras dúvidas — consultar o site\n\n" +
  "Responda com o número da opção.";

function montarApresentacao(info) {
  const lista = info.servicos.map((s, i) => `${i + 1}. ${s}`).join("\n");
  return (
    `*${info.nome}*\n\n` +
    `${info.sobre}\n\n` +
    `*Serviços prestados:*\n${lista}`
  );
}

function detectarEmpresa(texto) {
  const t = texto.trim().toLowerCase();
  const porNumero = { "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5, "7": 6 };
  if (porNumero[t] !== undefined) return EMPRESAS[porNumero[t]];
  if (/\bscan\b/.test(t) || t.includes("scanativos") || t.includes("scan ativos")) return "SCAN ATIVOS";
  return EMPRESAS.find((e) => t.includes(e.toLowerCase())) ?? null;
}

/** 1=contratar | 2=atendente | 3=site | null */
function detectarIntencao(texto) {
  const t = texto.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (t === "1" || t.startsWith("1 ") || t.includes("contrat") || t.includes("servico")) return "contratar";
  if (t === "2" || t.startsWith("2 ") || t.includes("atendent") || t.includes("humano")) return "atendente";
  if (t === "3" || t.startsWith("3 ") || t.includes("site") || t.includes("duvida") || t.includes("consulta")) return "site";
  return null;
}

/** Saudação / pedido de reinício do fluxo do bot */
function ehReinicio(texto) {
  const t = texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[!?.]+$/g, "")
    .trim();
  return [
    "oi", "ola", "oie", "oii", "oiii", "oiee",
    "hey", "hello", "hi", "eai", "eae", "fala",
    "inicio", "reiniciar", "recomecar", "comecar",
    "bom dia", "boa tarde", "boa noite",
    "voltar ao inicio", "comecar de novo", "nova conversa",
  ].includes(t);
}

/** Volta ao menu de empresas (mantém o nome) */
function ehVoltarMenu(texto) {
  const t = texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[!?.]+$/g, "")
    .trim();
  return [
    "menu",
    "voltar",
    "retornar",
    "retornar menu",
    "retornar ao menu",
    "voltar menu",
    "voltar ao menu",
    "menu anterior",
    "outra empresa",
    "trocar empresa",
    "empresas",
  ].includes(t);
}

function contextoEmpresasParaIA() {
  return EMPRESAS.map((nome) => {
    const info = EMPRESAS_INFO[nome];
    return {
      nome: info.nome,
      sobre: String(info.sobre || "").replace(/\*/g, "").replace(/_/g, ""),
      servicos: info.servicos,
      site: info.site,
    };
  });
}

/**
 * Resposta conversacional com OpenAI (EMPRESAS_INFO + histórico).
 * Retorna { texto, acao, empresa } — acao: null | contratar | atendente | site | empresa
 */
async function assistenteConversacional({ conversa, textoUsuario, etapa }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const historico = await buscarUltimasMsgs(conversa.id, 12);
    const msgsHist = historico
      .filter((m) => m && (m.de === "cliente" || m.de === "bot") && m.texto)
      .map((m) => ({
        role: m.de === "cliente" ? "user" : "assistant",
        content: String(m.texto).slice(0, 600),
      }))
      .slice(-10);

    const empresaAtual = conversa.empresa && EMPRESAS_INFO[conversa.empresa]
      ? conversa.empresa
      : null;

    const system = [
      "Você é o assistente virtual do Grupo FIC no WhatsApp (pt-BR).",
      "Seja caloroso, claro e objetivo (2 a 5 frases curtas). Use *negrito* do WhatsApp com moderação.",
      "Baseie-se APENAS no catálogo de empresas abaixo. Não invente serviços, preços ou contatos.",
      "Nunca diga apenas que não entendeu. Se faltar clareza, responda o que puder e oriente com gentileza.",
      "Atalhos do cliente: digitar 1=contratar, 2=atendente, 3=site; 'retornar ao menu'; 'oi' reinicia (já tratados fora daqui).",
      "Se o cliente quiser contratar ou falar com humano, use acao correspondente (não invente telefone de especialista).",
      "Se identificar claramente uma empresa do catálogo, use acao=empresa e o nome EXATO do catálogo.",
      "Responda SOMENTE JSON válido, sem markdown:",
      '{"texto":"mensagem ao cliente","acao":null|"contratar"|"atendente"|"site"|"empresa","empresa":null|"NOME_EXATO"}',
      `Etapa atual: ${etapa}. Nome do cliente: ${conversa.nome_cliente || "ainda não informado"}.`,
      `Empresa em foco: ${empresaAtual || "nenhuma"}.`,
      `Catálogo: ${JSON.stringify(contextoEmpresasParaIA())}`,
    ].join("\n");

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          ...msgsHist,
          { role: "user", content: String(textoUsuario || "").slice(0, 1000) },
        ],
      }),
    });
    const body = await r.text();
    if (!r.ok) {
      console.error("chat fail", r.status, body);
      return null;
    }
    const parsed = body ? JSON.parse(body) : null;
    const raw = parsed?.choices?.[0]?.message?.content || "";
    let data = null;
    try { data = JSON.parse(raw); } catch { data = null; }
    if (!data || typeof data.texto !== "string" || !data.texto.trim()) return null;

    let acao = data.acao || null;
    if (acao && !["contratar", "atendente", "site", "empresa"].includes(acao)) acao = null;
    let empresa = data.empresa || null;
    if (empresa && !EMPRESAS_INFO[empresa]) {
      empresa = detectarEmpresa(String(empresa)) || null;
    }
    if (acao === "empresa" && !empresa) {
      empresa = detectarEmpresa(String(textoUsuario || "")) || null;
      if (!empresa) acao = null;
    }
    return { texto: data.texto.trim().slice(0, 1500), acao, empresa };
  } catch (e) {
    console.error("assistenteConversacional", e);
    return null;
  }
}

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
  // WhatsApp voice notes: audio/ogg; codecs=opus (ou audio/opus)
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

/** Monta File/Blob com nome+ext corretos para multipart (Whisper / Meta). */
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

/** Baixa mídia da Meta Cloud API (id → url → bytes). Auth Bearer nos dois passos. */
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
  // CDN da Meta exige Authorization; redeclarar headers evita perder Bearer em redirect.
  const bin = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: "follow",
  });
  if (!bin.ok) throw new Error(`media download ${bin.status}`);
  const buffer = Buffer.from(await bin.arrayBuffer());
  if (!buffer.length) throw new Error("media download: arquivo vazio");
  return { buffer, mime, sha256: info.sha256 || null };
}

/** Envia áudio ao bucket público whatsapp-media. */
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

/**
 * Whisper (opcional).
 * Retorna { text, error } — text preenchido em sucesso; error classifica falha
 * (missing_key | empty | quota | auth | format | http | network).
 */
async function transcreverAudio(buffer, mimeType) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { text: null, error: "missing_key" };
  if (!buffer?.length) return { text: null, error: "empty" };
  try {
    const { file, filename, mime } = arquivoAudioParaForm(buffer, mimeType, "voice");
    const form = new FormData();
    // File já carrega o filename; Blob precisa do 3º arg (Node serverless / undici).
    if (typeof File !== "undefined" && file instanceof File) {
      form.append("file", file);
    } else {
      form.append("file", file, filename);
    }
    form.append("model", "whisper-1");
    form.append("language", "pt");
    form.append("response_format", "json");
    console.log("whisper request", { bytes: buffer.length, mime, filename });
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    const body = await r.text();
    if (!r.ok) {
      let code = null;
      let type = null;
      try {
        const err = body ? JSON.parse(body) : null;
        code = err?.error?.code || null;
        type = err?.error?.type || null;
      } catch { /* ignore */ }
      console.error("whisper fail", r.status, { code, type, body: body?.slice?.(0, 400) || body });
      if (r.status === 401 || r.status === 403) return { text: null, error: "auth" };
      if (
        r.status === 429 ||
        code === "insufficient_quota" ||
        code === "credit_balance_exhausted" ||
        type === "insufficient_quota"
      ) {
        return { text: null, error: "quota" };
      }
      if (r.status === 400) return { text: null, error: "format" };
      return { text: null, error: "http" };
    }
    const parsed = body ? JSON.parse(body) : null;
    const texto = (parsed?.text || "").trim();
    if (!texto) return { text: null, error: "empty" };
    return { text: texto, error: null };
  } catch (e) {
    console.error("whisper error", e);
    return { text: null, error: "network" };
  }
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

/** Remove markdown WhatsApp e limita tamanho para TTS (texto completo ainda vai como mensagem). */
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

/** OpenAI TTS → bytes MP3. Null se sem chave / falha / texto vazio. */
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

/** Upload multipart para Meta Cloud API → media_id. */
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

/**
 * Gera TTS, sobe na Meta e envia áudio. Opcionalmente grava no Storage para o painel.
 * Falhas são engolidas — o texto já foi (ou será) enviado.
 */
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

/** Resposta ao cliente: texto + áudio TTS (falha de TTS não bloqueia o texto). */
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

async function buscarUltimasMsgs(conversaId, limite = 10) {
  try {
    const rows = await rpc("wa_ultimas_msgs", {
      p_secret: secret(),
      p_conversa_id: conversaId,
      p_limite: limite,
    });
    return Array.isArray(rows) ? rows.slice().reverse() : [];
  } catch (e) {
    console.error("wa_ultimas_msgs", e);
    return [];
  }
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

async function notificarEspecialista(conversa, info, intencao) {
  const nome = conversa.nome_cliente || "Cliente";
  const waDigits = String(conversa.wa_id || "").replace(/\D/g, "");
  const telCliente = waDigits ? `+${waDigits}` : (conversa.wa_id || "—");
  const linkWa = waDigits ? `https://wa.me/${waDigits}` : "";
  const rotulo =
    intencao === "contratar" ? "Quer CONTRATAR serviços" :
    intencao === "atendente" ? "Quer falar com um atendente" :
    "Contato geral";
  const params = [info.nome, nome, telCliente, rotulo];

  // 1) Templates UTILITY (funcionam sem janela de 24h, quando APPROVED)
  let envio = await enviarWhatsAppTemplate(info.especialistaWa, "rotea_lead_alerta", "pt_BR", params);
  let via = "template:rotea_lead_alerta";
  if (!envio.ok) {
    envio = await enviarWhatsAppTemplate(info.especialistaWa, "rotea_novo_lead", "pt_BR", params);
    via = "template:rotea_novo_lead";
  }

  // 2) Fallback: texto livre (só entrega bem se o especialista já falou com o número oficial nas últimas 24h)
  if (!envio.ok) {
    const paraQuem = info.especialistaNome ? `Olá, *${info.especialistaNome}*!` : "Olá!";
    const aviso =
      `${paraQuem}\n\n` +
      `🔔 *Novo atendimento — ${info.nome}*\n\n` +
      `*Nome:* ${nome}\n` +
      `*WhatsApp do cliente:* ${telCliente}\n` +
      (linkWa ? `*Abrir conversa:* ${linkWa}\n` : "") +
      `*Motivo:* ${rotulo}\n` +
      `*Empresa:* ${info.nome}\n\n` +
      `Por favor, fale com o cliente pelo WhatsApp.`;
    envio = await enviarWhatsApp(info.especialistaWa, aviso);
    via = "texto_livre";
  }

  if (envio.ok) {
    await salvarMsg(
      conversa.id,
      "sistema",
      `Especialista ${info.especialistaNome || ""} +${envio.waId || info.especialistaWa} notificado · ${rotulo}` +
        ` · via ${via}` +
        (envio.wamid ? ` · ${envio.wamid}` : "") +
        (via === "texto_livre"
          ? " · ⚠ template ainda pendente na Meta — se o especialista não abriu conversa com o número oficial, a entrega pode falhar"
          : ""),
    );
  } else {
    await salvarMsg(
      conversa.id,
      "sistema",
      `Falha ao avisar especialista +${info.especialistaWa}: ${String(envio.erro || "erro").slice(0, 200)}`,
    );
  }
  return envio;
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

async function encaminharParaEspecialista(conversa, info, intencao) {
  // Avisa SOMENTE o especialista — o cliente NÃO recebe o contato dele
  const envio = await notificarEspecialista(conversa, info, intencao);

  const msgCliente = envio.ok
    ? (
      intencao === "contratar"
        ? `Ótimo! Um especialista da *${info.nome}* já foi avisado e vai falar com você sobre a contratação. ⏳\n\nJá conhece o canal do podcast no YouTube? Se ainda não, vale a visita: https://www.youtube.com/@ficcionariospodcast\n\n_Se quiser voltar ao menu, digite: retornar ao menu_`
        : `Perfeito! Um atendente da *${info.nome}* já foi avisado e vai falar com você em breve. ⏳\n\nJá conhece o canal do podcast no YouTube? Se ainda não, vale a visita: https://www.youtube.com/@ficcionariospodcast\n\n_Se quiser voltar ao menu, digite: retornar ao menu_`
    )
    : `Registrei seu pedido da *${info.nome}*. Nossa equipe vai retornar em breve.\n\n_Digite: retornar ao menu_`;

  await responderCliente(conversa.id, conversa.wa_id, msgCliente);
  await atualizarConversa(conversa.id, {
    etapa: 4,
    empresa: info.nome,
    setor: info.setor,
    status: "fila",
    assunto: `${info.nome} · ${intencao}`,
  });
}

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
    let texto = "";

    if (audioInfo) {
      let mediaUrl = null;
      let mime = normalizeAudioMime(audioInfo.mime);
      let transcript = null;
      let whisperError = null;
      try {
        const { buffer, mime: mimeDl } = await baixarMediaWhatsApp(audioInfo.mediaId);
        mime = normalizeAudioMime(mimeDl || mime);
        const path = `${conversa.id}/${Date.now()}_${audioInfo.mediaId}.${extFromMime(mime)}`;
        const uploadMime = mime.startsWith("audio/") ? mime : "application/octet-stream";
        mediaUrl = await uploadWhatsappMedia(path, buffer, uploadMime);
        const whisper = await transcreverAudio(buffer, mime);
        transcript = whisper.text;
        whisperError = whisper.error;
      } catch (e) {
        console.error("audio pipeline", e);
        whisperError = whisperError || "pipeline";
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
        const placeholder = mediaUrl ? "[Áudio]" : "[Áudio recebido]";
        await salvarMsg(conversa.id, "cliente", placeholder, {
          tipo: "audio",
          media_url: mediaUrl,
          mime_type: mime,
          wa_media_id: audioInfo.mediaId,
        });
        // Sem transcrição: no fluxo do bot, pede texto para continuar
        if (conversa.status === "bot") {
          const temWhisper = Boolean(process.env.OPENAI_API_KEY);
          let msgAudio =
            "Recebi seu áudio 🎧. Por enquanto, responda por *texto* para eu continuar o atendimento.";
          if (temWhisper) {
            if (whisperError === "quota" || whisperError === "auth" || whisperError === "http" || whisperError === "network") {
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
        });
      }
    } else {
      texto = msg.text?.body ?? "";
      await salvarMsg(conversa.id, "cliente", texto);
    }

    // Sempre que mandar "oi" (ou saudação), reinicia o fluxo do bot
    if (ehReinicio(texto)) {
      await responderCliente(conversa.id, waId, PERGUNTA_BOAS_VINDAS);
      await atualizarConversa(conversa.id, {
        etapa: 1,
        status: "bot",
        empresa: null,
        assunto: null,
        setor: null,
        nome_cliente: null,
        atendente_id: null,
      });
      await salvarMsg(conversa.id, "sistema", "Fluxo do bot reiniciado pelo cliente");
      return res.status(200).json({ ok: true, reinicio: true, audio: Boolean(audioInfo) });
    }

    // "retornar ao menu" → volta para a escolha de empresas
    if (ehVoltarMenu(texto)) {
      const nome = conversa.nome_cliente;
      if (nome) {
        await responderCliente(
          conversa.id,
          waId,
          `Certo! Voltando ao menu de empresas.`,
        );
        await responderCliente(conversa.id, waId, PERGUNTA_EMPRESA);
        await atualizarConversa(conversa.id, {
          etapa: 2,
          status: "bot",
          empresa: null,
          assunto: null,
          setor: null,
          atendente_id: null,
        });
      } else {
        await responderCliente(conversa.id, waId, PERGUNTA_BOAS_VINDAS);
        await atualizarConversa(conversa.id, {
          etapa: 1,
          status: "bot",
          empresa: null,
          assunto: null,
          setor: null,
          atendente_id: null,
        });
      }
      await salvarMsg(conversa.id, "sistema", "Cliente retornou ao menu de empresas");
      return res.status(200).json({ ok: true, menu: true, audio: Boolean(audioInfo) });
    }

    // Em andamento/encerrado/fila o bot não conversa (exceto oi/menu acima)
    if (conversa.status !== "bot" && conversa.etapa !== 0) {
      return res.status(200).json({
        ok: true,
        audio: Boolean(audioInfo),
        transcript: Boolean(audioInfo && texto),
      });
    }

    if (conversa.etapa === 0) {
      await responderCliente(conversa.id, waId, PERGUNTA_BOAS_VINDAS);
      await atualizarConversa(conversa.id, { etapa: 1, status: "bot" });
    } else if (conversa.etapa === 1) {
      const nome = texto.trim().slice(0, 80);
      await responderCliente(conversa.id, waId, saudacaoAposNome(nome));
      await responderCliente(conversa.id, waId, PERGUNTA_EMPRESA);
      await atualizarConversa(conversa.id, { etapa: 2, nome_cliente: nome, status: "bot" });
    } else if (conversa.etapa === 2) {
      const empresa = detectarEmpresa(texto);
      const info = empresa ? EMPRESAS_INFO[empresa] : null;
      if (info) {
        await responderCliente(conversa.id, waId, montarApresentacao(info));
        await responderCliente(conversa.id, waId, MENU_INTENCAO);
        await atualizarConversa(conversa.id, { etapa: 3, empresa: info.nome, status: "bot" });
      } else {
        const ia = await assistenteConversacional({
          conversa: { ...conversa, wa_id: waId },
          textoUsuario: texto,
          etapa: 2,
        });
        if (ia?.acao === "empresa" && ia.empresa && EMPRESAS_INFO[ia.empresa]) {
          const escolhida = EMPRESAS_INFO[ia.empresa];
          if (ia.texto) await responderCliente(conversa.id, waId, ia.texto);
          await responderCliente(conversa.id, waId, montarApresentacao(escolhida));
          await responderCliente(conversa.id, waId, MENU_INTENCAO);
          await atualizarConversa(conversa.id, { etapa: 3, empresa: escolhida.nome, status: "bot" });
        } else {
          const textoIa = (ia?.texto || "").trim();
          if (textoIa) {
            await responderCliente(conversa.id, waId, textoIa);
            const guiaMenu =
              /\b[1-7]\b/.test(textoIa) ||
              /RWB|IPROTECTOR|LEGALCERT|SINATRA|ANIMA|SCAN|LIV ECO/i.test(textoIa);
            if (!guiaMenu) await responderCliente(conversa.id, waId, PERGUNTA_EMPRESA);
          } else {
            await responderCliente(
              conversa.id,
              waId,
              "Posso te ajudar a conhecer as empresas do Grupo FIC. Escolha uma opção ou me diga o que procura.\n\n" +
                PERGUNTA_EMPRESA,
            );
          }
        }
      }
    } else if (conversa.etapa === 3) {
      const info = EMPRESAS_INFO[conversa.empresa];
      if (!info) {
        await responderCliente(conversa.id, waId, PERGUNTA_EMPRESA);
        await atualizarConversa(conversa.id, { etapa: 2, empresa: null, status: "bot" });
      } else {
        let intencao = detectarIntencao(texto);
        let ia = null;
        if (!intencao) {
          ia = await assistenteConversacional({
            conversa: { ...conversa, wa_id: waId },
            textoUsuario: texto,
            etapa: 3,
          });
          if (ia?.acao === "contratar" || ia?.acao === "atendente" || ia?.acao === "site") {
            intencao = ia.acao;
          } else if (ia?.acao === "empresa" && ia.empresa && EMPRESAS_INFO[ia.empresa]) {
            const outra = EMPRESAS_INFO[ia.empresa];
            if (ia.texto) await responderCliente(conversa.id, waId, ia.texto);
            await responderCliente(conversa.id, waId, montarApresentacao(outra));
            await responderCliente(conversa.id, waId, MENU_INTENCAO);
            await atualizarConversa(conversa.id, { etapa: 3, empresa: outra.nome, status: "bot" });
            return res.status(200).json({
              ok: true,
              audio: Boolean(audioInfo),
              transcript: Boolean(audioInfo && texto),
              ia: true,
            });
          }
        }

        if (!intencao) {
          const msg =
            ia?.texto ||
            (
              `Sobre a *${info.nome}*, posso te contar os serviços ou te conectar com o time.\n\n` +
              MENU_INTENCAO
            );
          await responderCliente(conversa.id, waId, msg);
        } else if (intencao === "site") {
          const msgSite =
            `Para outras dúvidas, consulte o site da *${info.nome}*:\n${info.site}\n\n` +
            `Se preferir:\n*1* — contratar serviços\n*2* — falar com um atendente\n\nOu digite *retornar ao menu*.`;
          await responderCliente(conversa.id, waId, msgSite);
          await atualizarConversa(conversa.id, {
            assunto: `${info.nome} · consultou o site`,
            status: "bot",
          });
        } else {
          await encaminharParaEspecialista({ ...conversa, wa_id: waId }, info, intencao);
        }
      }
    } else if (conversa.status === "bot") {
      // Qualquer outra etapa com bot ativo: conversa livre + orientação
      const ia = await assistenteConversacional({
        conversa: { ...conversa, wa_id: waId },
        textoUsuario: texto,
        etapa: conversa.etapa,
      });
      if (ia?.acao === "empresa" && ia.empresa && EMPRESAS_INFO[ia.empresa]) {
        const escolhida = EMPRESAS_INFO[ia.empresa];
        if (ia.texto) await responderCliente(conversa.id, waId, ia.texto);
        await responderCliente(conversa.id, waId, montarApresentacao(escolhida));
        await responderCliente(conversa.id, waId, MENU_INTENCAO);
        await atualizarConversa(conversa.id, { etapa: 3, empresa: escolhida.nome, status: "bot" });
      } else if (
        (ia?.acao === "contratar" || ia?.acao === "atendente" || ia?.acao === "site") &&
        conversa.empresa &&
        EMPRESAS_INFO[conversa.empresa]
      ) {
        const info = EMPRESAS_INFO[conversa.empresa];
        if (ia.acao === "site") {
          await responderCliente(
            conversa.id,
            waId,
            (ia.texto ? `${ia.texto}\n\n` : "") +
              `Site da *${info.nome}*:\n${info.site}\n\n` +
              MENU_INTENCAO,
          );
        } else {
          if (ia.texto) await responderCliente(conversa.id, waId, ia.texto);
          await encaminharParaEspecialista({ ...conversa, wa_id: waId }, info, ia.acao);
        }
      } else {
        await responderCliente(
          conversa.id,
          waId,
          ia?.texto ||
            ("Posso ajudar com as empresas do Grupo FIC.\n\n" + PERGUNTA_EMPRESA),
        );
      }
    }

    return res.status(200).json({
      ok: true,
      audio: Boolean(audioInfo),
      transcript: Boolean(audioInfo && texto),
    });
  } catch (e) {
    console.error("webhook error", e);
    return res.status(200).json({ ok: true });
  }
}
