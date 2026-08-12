// ============================================================
// ROTEA · Webhook da API oficial do WhatsApp (Meta Cloud API)
// Número: +55 11 5304-9387
// Fluxo: boas-vindas → nome → empresa → assunto → roteamento
// Env (Vercel → rotea-webhook):
//   WHATSAPP_TOKEN, PHONE_NUMBER_ID, VERIFY_TOKEN, WEBHOOK_SECRET
// ============================================================

const SUPABASE_URL = "https://wuuijbetsckjusnvdxts.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dWlqYmV0c2NranVzbnZkeHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjAwODAsImV4cCI6MjEwMTUzNjA4MH0.VzHyjS2goE1tX0udysdjnuXcfym39jPkJWc3j-xFYbA";

const EMPRESAS = ["RWB", "LIV ECO HABITATS", "IPROTECTOR", "LEGALCERT", "SINATRA", "ANIMA"];

const PERGUNTA_BOAS_VINDAS =
  "Olá! 👋 Bem-vindo(a) ao atendimento do Grupo FIC. Sou o assistente virtual. Para começar, qual o seu nome?";
const PERGUNTA_EMPRESA =
  "Sobre qual empresa você gostaria de falar?\n\n1⃣ RWB\n2⃣ LIV ECO HABITATS\n3⃣ IPROTECTOR\n4⃣ LEGALCERT\n5⃣ SINATRA\n6⃣ ANIMA\n\nResponda com o nome ou o número da opção.";
const PERGUNTA_ASSUNTO = (nome) =>
  `Certo, ${nome}! Em poucas palavras, como podemos ajudar você hoje?`;
const MSG_FILA = (setor) =>
  `Perfeito! Encaminhei você para a nossa equipe de *${setor}*. Um atendente vai falar com você em instantes. ⏳`;

const REGRAS = [
  { destino: "Comercial", kws: ["comprar", "preço", "preco", "orçamento", "orcamento", "plano", "proposta", "contratar", "investir", "valor"] },
  { destino: "Tecnologia/Suporte", kws: ["erro", "bug", "não funciona", "nao funciona", "travando", "senha", "acesso", "app", "sistema"] },
  { destino: "Jurídico", kws: ["contrato", "cláusula", "clausula", "processo", "rescisão", "rescisao", "jurídico", "juridico", "advogado"] },
];
const SETOR_PADRAO = "Atendimento";

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

async function salvarMsg(conversaId, de, texto) {
  await rpc("wa_salvar_msg", {
    p_secret: secret(),
    p_conversa_id: conversaId,
    p_de: de,
    p_texto: texto,
  });
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
  const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: para,
      type: "text",
      text: { body: texto },
    }),
  });
  const body = await r.text();
  if (!r.ok) {
    console.error("meta send fail", r.status, body);
    return { ok: false, erro: body };
  }
  return { ok: true };
}

function detectarEmpresa(texto) {
  const t = texto.trim().toLowerCase();
  const porNumero = { "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5 };
  if (porNumero[t] !== undefined) return EMPRESAS[porNumero[t]];
  return EMPRESAS.find((e) => t.includes(e.toLowerCase())) ?? null;
}

function rotear(assunto) {
  const t = assunto.toLowerCase();
  for (const r of REGRAS) if (r.kws.some((k) => t.includes(k))) return r.destino;
  return SETOR_PADRAO;
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
    const msg = entry?.messages?.[0];
    if (!msg || msg.type !== "text") return res.status(200).json({ ok: true });

    const waId = msg.from;
    const texto = msg.text?.body ?? "";

    const conversa = await acharOuCriarConversa(waId);
    await salvarMsg(conversa.id, "cliente", texto);

    if (conversa.status === "andamento" || conversa.status === "encerrado") {
      return res.status(200).json({ ok: true });
    }

    if (conversa.etapa === 0) {
      await enviarWhatsApp(waId, PERGUNTA_BOAS_VINDAS);
      await salvarMsg(conversa.id, "bot", PERGUNTA_BOAS_VINDAS);
      await atualizarConversa(conversa.id, { etapa: 1, status: "bot" });
    } else if (conversa.etapa === 1) {
      const nome = texto.trim().slice(0, 80);
      await enviarWhatsApp(waId, PERGUNTA_EMPRESA);
      await salvarMsg(conversa.id, "bot", PERGUNTA_EMPRESA);
      await atualizarConversa(conversa.id, { etapa: 2, nome_cliente: nome });
    } else if (conversa.etapa === 2) {
      const empresa = detectarEmpresa(texto);
      if (!empresa) {
        const aviso = "Não identifiquei a empresa. " + PERGUNTA_EMPRESA;
        await enviarWhatsApp(waId, aviso);
        await salvarMsg(conversa.id, "bot", aviso);
      } else {
        const p = PERGUNTA_ASSUNTO((conversa.nome_cliente || "").split(" ")[0] || "tudo bem");
        await enviarWhatsApp(waId, p);
        await salvarMsg(conversa.id, "bot", p);
        await atualizarConversa(conversa.id, { etapa: 3, empresa });
      }
    } else if (conversa.etapa === 3) {
      const setor = rotear(texto);
      const confirma = MSG_FILA(setor);
      await enviarWhatsApp(waId, confirma);
      await salvarMsg(conversa.id, "bot", confirma);
      await salvarMsg(conversa.id, "sistema", `Regra aplicada · empresa ${conversa.empresa} · encaminhado para fila ${setor}`);
      await atualizarConversa(conversa.id, { etapa: 4, assunto: texto.slice(0, 300), setor, status: "fila" });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("webhook error", e);
    return res.status(200).json({ ok: true });
  }
}
