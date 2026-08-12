// ROTEA · /api/enviar — resposta do atendente para o cliente do WhatsApp
const SUPABASE_URL = "https://wuuijbetsckjusnvdxts.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dWlqYmV0c2NranVzbnZkeHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjAwODAsImV4cCI6MjEwMTUzNjA4MH0.VzHyjS2goE1tX0udysdjnuXcfym39jPkJWc3j-xFYbA";

const RESPOSTAS_CLIENTE = [
  "Ah, perfeito! Pode me explicar melhor como funciona?",
  "Entendi, faz sentido. E quanto ficaria o valor?",
  "Hmm, achei justo. Vocês têm alguma condição especial este mês?",
  "Ótimo! Consegue me enviar os detalhes por e-mail também?",
  "Perfeito, meu e-mail é contato@cliente-teste.com.br 😊",
  "Muito obrigado pelo atendimento, era isso mesmo que eu precisava!",
];
const RESPOSTAS_FINAIS = ["👍", "Certo!", "Combinado, obrigado!", "Show!"];

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

    const { conversa_id, texto } = req.body || {};
    if (!conversa_id || !texto) return res.status(400).json({ erro: "dados incompletos" });

    const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!srk) return res.status(500).json({ erro: "SUPABASE_SERVICE_ROLE_KEY não configurada na Vercel" });
    const sbh = { apikey: srk, Authorization: `Bearer ${srk}`, "Content-Type": "application/json" };

    const convs = await (await fetch(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${conversa_id}&select=*`, { headers: sbh })).json();
    const conversa = convs?.[0];
    if (!conversa) return res.status(404).json({ erro: "conversa não encontrada" });

    await fetch(`${SUPABASE_URL}/rest/v1/mensagens`, {
      method: "POST", headers: sbh,
      body: JSON.stringify({ conversa_id, de: "atendente", texto }),
    });

    let enviado = false, aviso = null;
    const ehSimulada = String(conversa.wa_id || "").startsWith("sim_");
    if (ehSimulada) {
      // Cliente simulado responde de volta, seguindo um roteiro natural
      if (conversa.status !== "encerrado") {
        const doAtendente = await (await fetch(
          `${SUPABASE_URL}/rest/v1/mensagens?conversa_id=eq.${conversa_id}&de=eq.atendente&select=id`,
          { headers: sbh },
        )).json();
        const n = Array.isArray(doAtendente) ? doAtendente.length : 1;
        const resposta = n <= RESPOSTAS_CLIENTE.length
          ? RESPOSTAS_CLIENTE[n - 1]
          : RESPOSTAS_FINAIS[Math.floor(Math.random() * RESPOSTAS_FINAIS.length)];
        await new Promise(r => setTimeout(r, 1200 + Math.floor(Math.random() * 1500)));
        await fetch(`${SUPABASE_URL}/rest/v1/mensagens`, {
          method: "POST", headers: sbh,
          body: JSON.stringify({ conversa_id, de: "cliente", texto: resposta }),
        });
      }
    } else if (process.env.WHATSAPP_TOKEN && process.env.PHONE_NUMBER_ID) {
      const r = await fetch(`https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: conversa.wa_id, type: "text", text: { body: texto } }),
      });
      enviado = r.ok;
      if (!r.ok) aviso = "falha no envio via Meta — verifique token e número";
    } else {
      aviso = "API do WhatsApp ainda não ativada — mensagem registrada apenas na plataforma";
    }

    return res.status(200).json({ ok: true, enviado, aviso });
  } catch (e) {
    console.error("enviar error", e);
    return res.status(500).json({ erro: "erro interno" });
  }
}
