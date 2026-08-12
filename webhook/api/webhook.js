// ============================================================
// ROTEA · Webhook da API oficial do WhatsApp (Meta Cloud API)
// Número: +55 11 5304-9387
// Fluxo:
//   0 → boas-vindas (pede nome)
//   1 → nome (pede empresa)
//   2 → empresa (envia sobre + serviços + menu de intenção)
//   3 → intenção (contratar / atendente / site)
// Env: WHATSAPP_TOKEN, PHONE_NUMBER_ID, VERIFY_TOKEN, WEBHOOK_SECRET
// ============================================================

const SUPABASE_URL = "https://wuuijbetsckjusnvdxts.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dWlqYmV0c2NranVzbnZkeHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjAwODAsImV4cCI6MjEwMTUzNjA4MH0.VzHyjS2goE1tX0udysdjnuXcfym39jPkJWc3j-xFYbA";

const EMPRESAS = ["RWB", "LIV ECO HABITATS", "IPROTECTOR", "LEGALCERT", "SINATRA", "ANIMA"];

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
    setor: "Comercial",
  },
};

const PERGUNTA_BOAS_VINDAS =
  "Olá! 👋 Bem-vindo(a) ao atendimento do Grupo FIC. Sou o assistente virtual. Para começar, qual o seu nome?";
const PERGUNTA_EMPRESA =
  "Sobre qual empresa você gostaria de falar?\n\n1⃣ RWB\n2⃣ LIV ECO HABITATS\n3⃣ IPROTECTOR\n4⃣ LEGALCERT\n5⃣ SINATRA\n6⃣ ANIMA\n\nResponda com o nome ou o número da opção.";

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
  const porNumero = { "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5 };
  if (porNumero[t] !== undefined) return EMPRESAS[porNumero[t]];
  return EMPRESAS.find((e) => t.includes(e.toLowerCase())) ?? null;
}

/** 1=contratar | 2=atendente | 3=site | null */
function detectarIntencao(texto) {
  const t = texto.trim().toLowerCase();
  if (t === "1" || t.includes("contrat")) return "contratar";
  if (t === "2" || t.includes("atendent") || t.includes("humano") || t.includes("falar")) return "atendente";
  if (t === "3" || t.includes("site") || t.includes("dúvida") || t.includes("duvida") || t.includes("consulta")) return "site";
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

async function responderCliente(conversaId, waId, texto) {
  const envio = await enviarWhatsApp(waId, texto);
  await salvarMsg(conversaId, "bot", texto);
  if (!envio.ok) {
    await salvarMsg(conversaId, "sistema", "Falha ao enviar no WhatsApp: verifique token e Phone Number ID.");
  }
  return envio;
}

async function notificarEspecialista(conversa, info, intencao) {
  const nome = conversa.nome_cliente || "Cliente";
  const telCliente = conversa.wa_id?.startsWith("55") ? `+${conversa.wa_id}` : conversa.wa_id;
  const rotulo =
    intencao === "contratar" ? "Quer contratar serviços" :
    intencao === "atendente" ? "Quer falar com atendente" :
    "Contato geral";

  const aviso =
    `🔔 *Novo lead ${info.nome}*\n\n` +
    `Nome: ${nome}\n` +
    `WhatsApp: ${telCliente}\n` +
    `Empresa: ${info.nome}\n` +
    `Intenção: ${rotulo}\n\n` +
    `Entre em contato com o cliente pelo WhatsApp.`;

  const envio = await enviarWhatsApp(info.especialistaWa, aviso);
  if (envio.ok) {
    await salvarMsg(conversa.id, "sistema", `Lead ${info.nome} (${rotulo}) notificado para +${info.especialistaWa}`);
  } else {
    await salvarMsg(conversa.id, "sistema", `Falha ao notificar especialista +${info.especialistaWa}. Lead ficou na fila.`);
  }
}

async function encaminharParaEspecialista(conversa, info, intencao) {
  const msgCliente =
    intencao === "contratar"
      ? `Ótimo! Um especialista da *${info.nome}* vai entrar em contato para falar sobre contratação. ⏳`
      : `Perfeito! Um atendente da *${info.nome}* vai falar com você em breve. ⏳`;

  await responderCliente(conversa.id, conversa.wa_id, msgCliente);
  await notificarEspecialista(conversa, info, intencao);
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
    const msg = entry?.messages?.[0];
    if (!msg || msg.type !== "text") return res.status(200).json({ ok: true });

    const waId = msg.from;
    const texto = msg.text?.body ?? "";

    const conversa = await acharOuCriarConversa(waId);
    await salvarMsg(conversa.id, "cliente", texto);

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
      return res.status(200).json({ ok: true, reinicio: true });
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
      return res.status(200).json({ ok: true, menu: true });
    }

    if (conversa.status === "andamento" || conversa.status === "encerrado") {
      return res.status(200).json({ ok: true });
    }

    if (conversa.etapa === 0) {
      await responderCliente(conversa.id, waId, PERGUNTA_BOAS_VINDAS);
      await atualizarConversa(conversa.id, { etapa: 1, status: "bot" });
    } else if (conversa.etapa === 1) {
      const nome = texto.trim().slice(0, 80);
      await responderCliente(conversa.id, waId, saudacaoAposNome(nome));
      await responderCliente(conversa.id, waId, PERGUNTA_EMPRESA);
      await atualizarConversa(conversa.id, { etapa: 2, nome_cliente: nome });
    } else if (conversa.etapa === 2) {
      const empresa = detectarEmpresa(texto);
      const info = empresa ? EMPRESAS_INFO[empresa] : null;
      if (!info) {
        await responderCliente(conversa.id, waId, "Não identifiquei a empresa. " + PERGUNTA_EMPRESA);
      } else {
        // 1) apresentação da empresa + serviços
        await responderCliente(conversa.id, waId, montarApresentacao(info));
        // 2) menu de intenção
        await responderCliente(conversa.id, waId, MENU_INTENCAO);
        await atualizarConversa(conversa.id, { etapa: 3, empresa: info.nome, status: "bot" });
      }
    } else if (conversa.etapa === 3) {
      const info = EMPRESAS_INFO[conversa.empresa];
      if (!info) {
        await responderCliente(conversa.id, waId, PERGUNTA_EMPRESA);
        await atualizarConversa(conversa.id, { etapa: 2, empresa: null });
      } else {
        const intencao = detectarIntencao(texto);
        if (!intencao) {
          await responderCliente(conversa.id, waId, "Não entendi. " + MENU_INTENCAO);
        } else if (intencao === "site") {
          const msgSite =
            `Sem problemas! Para outras dúvidas, consulte o site da *${info.nome}*:\n${info.site}\n\n` +
            `Se preferir, digite *2* para falar com um atendente.`;
          await responderCliente(conversa.id, waId, msgSite);
          await atualizarConversa(conversa.id, {
            assunto: `${info.nome} · consultou o site`,
          });
          // permanece na etapa 3 para poder pedir atendente depois
        } else {
          await encaminharParaEspecialista({ ...conversa, wa_id: waId }, info, intencao);
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("webhook error", e);
    return res.status(200).json({ ok: true });
  }
}
