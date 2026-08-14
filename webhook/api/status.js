// ROTEA · /api/status — diagnóstico das credenciais (sem expor segredos)
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const token = process.env.WHATSAPP_TOKEN || "";
  const phoneId = process.env.PHONE_NUMBER_ID || "";
  const verify = process.env.VERIFY_TOKEN || "";
  const secret = process.env.WEBHOOK_SECRET || "";

  let meta = null;
  if (token && phoneId) {
    try {
      const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}?fields=id,display_phone_number,verified_name`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      meta = r.ok
        ? { ok: true, display: j.display_phone_number, nome: j.verified_name, id: j.id }
        : { ok: false, erro: j.error?.message || "falha ao consultar número" };
    } catch (e) {
      meta = { ok: false, erro: String(e) };
    }
  }

  return res.status(200).json({
    ok: true,
    funil: "fic_capital",
    whatsapp_token: Boolean(token),
    phone_number_id: Boolean(phoneId),
    verify_token: Boolean(verify),
    webhook_secret: Boolean(secret),
    openai: Boolean(process.env.OPENAI_API_KEY),
    link_agenda: Boolean(process.env.LINK_AGENDA),
    link_agenda_advisor: Boolean(process.env.LINK_AGENDA_ADVISOR),
    fic_comercial_wa: Boolean(process.env.FIC_COMERCIAL_WA),
    numero_exibido: "1153049387",
    webhook_url: "https://rotea-webhook.vercel.app/api/webhook",
    meta,
  });
}
