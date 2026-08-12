// ROTEA · /api/simular — cria uma conversa real de teste no banco
const SUPABASE_URL = "https://wuuijbetsckjusnvdxts.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dWlqYmV0c2NranVzbnZkeHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjAwODAsImV4cCI6MjEwMTUzNjA4MH0.VzHyjS2goE1tX0udysdjnuXcfym39jPkJWc3j-xFYbA";

const LEADS = [
  { nome: "Beatriz Camargo", empresa: "LEGALCERT", assunto: "Quero contratar o plano anual, qual o preço?", setor: "Comercial" },
  { nome: "Otávio Ramos", empresa: "IPROTECTOR", assunto: "Está dando erro de acesso na minha conta", setor: "Tecnologia/Suporte" },
  { nome: "Vanessa Duarte", empresa: "RWB", assunto: "Preciso discutir a rescisão do contrato", setor: "Jurídico" },
  { nome: "Henrique Sales", empresa: "ANIMA", assunto: "Tenho uma dúvida sobre a fatura deste mês", setor: "Atendimento" },
  { nome: "Priscila Ramos", empresa: "LIV ECO HABITATS", assunto: "Quero uma proposta para investir no projeto", setor: "Comercial" },
  { nome: "Douglas Ferreira", empresa: "SINATRA", assunto: "O sistema está travando no pagamento", setor: "Tecnologia/Suporte" },
];

const PERGUNTA_BOAS_VINDAS = "Olá! 👋 Bem-vindo(a) ao atendimento do Grupo FIC. Sou o assistente virtual. Para começar, qual o seu nome?";
const PERGUNTA_EMPRESA = "Sobre qual empresa você gostaria de falar?\n\n1⃣ RWB\n2⃣ LIV ECO HABITATS\n3⃣ IPROTECTOR\n4⃣ LEGALCERT\n5⃣ SINATRA\n6⃣ ANIMA";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();
  try {
    const jwt = (req.headers.authorization || "").replace("Bearer ", "");
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` },
    });
    if (!u.ok) return res.status(401).json({ erro: "não autenticado" });

    const sbh = {
      apikey: ANON_KEY,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };

    const lead = LEADS[Math.floor(Math.random() * LEADS.length)];
    const waId = `sim_${Date.now().toString(36)}`;
    const telefoneFake = `+55 11 9${String(Math.floor(10000000 + Math.random() * 89999999))}`;

    const criadas = await (await fetch(`${SUPABASE_URL}/rest/v1/conversas`, {
      method: "POST", headers: sbh,
      body: JSON.stringify({
        wa_id: waId, nome_cliente: lead.nome, empresa: lead.empresa,
        assunto: lead.assunto, setor: lead.setor, status: "fila", etapa: 4,
        origem: `Simulação · ${telefoneFake}`, etiquetas: [lead.empresa, "Teste"],
      }),
    })).json();
    const conversa = criadas?.[0];
    if (!conversa) return res.status(500).json({ erro: "falha ao criar conversa", detalhe: criadas });

    const msgs = [
      ["bot", PERGUNTA_BOAS_VINDAS],
      ["cliente", lead.nome],
      ["bot", PERGUNTA_EMPRESA],
      ["cliente", lead.empresa],
      ["bot", `Certo, ${lead.nome.split(" ")[0]}! Em poucas palavras, como podemos ajudar você hoje?`],
      ["cliente", lead.assunto],
      ["bot", `Perfeito! Encaminhei você para a nossa equipe de *${lead.setor}*. Um atendente vai falar com você em instantes. ⏳`],
      ["sistema", `Regra aplicada · empresa ${lead.empresa} · encaminhado para fila ${lead.setor} · conversa de teste`],
    ];
    for (const [de, texto] of msgs) {
      await fetch(`${SUPABASE_URL}/rest/v1/mensagens`, {
        method: "POST", headers: sbh,
        body: JSON.stringify({ conversa_id: conversa.id, de, texto }),
      });
    }

    return res.status(200).json({ ok: true, conversa_id: conversa.id });
  } catch (e) {
    console.error("simular error", e);
    return res.status(500).json({ erro: "erro interno" });
  }
}
