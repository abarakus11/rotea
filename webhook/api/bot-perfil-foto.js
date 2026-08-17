// ROTEA · /api/bot-perfil-foto — upload da foto do perfil WhatsApp via Resumable Upload (só Administrador)
// Meta exige profile_picture_handle gerado pelo Resumable Upload API (não o /media padrão).
const SUPABASE_URL = "https://wuuijbetsckjusnvdxts.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dWlqYmV0c2NranVzbnZkeHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjAwODAsImV4cCI6MjEwMTUzNjA4MH0.VzHyjS2goE1tX0udysdjnuXcfym39jPkJWc3j-xFYbA";
const GRAPH = "https://graph.facebook.com/v21.0";

export const config = {
  api: { bodyParser: { sizeLimit: "6mb" } },
};

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

async function exigirAdmin(req) {
  const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return { status: 401, erro: "não autenticado" };
  const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` },
  });
  if (!u.ok) return { status: 401, erro: "não autenticado" };
  const user = await u.json();
  const perfis = await (
    await fetch(`${SUPABASE_URL}/rest/v1/perfis?id=eq.${user.id}&select=perfil,ativo`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` },
    })
  ).json();
  const p = Array.isArray(perfis) ? perfis[0] : null;
  if (!p || p.ativo === false) return { status: 403, erro: "sem permissão" };
  if (p.perfil !== "Administrador") return { status: 403, erro: "apenas Administrador" };
  return { ok: true, user };
}

async function resolverAppId(token) {
  if (process.env.META_APP_ID) return process.env.META_APP_ID;
  if (process.env.WHATSAPP_APP_ID) return process.env.WHATSAPP_APP_ID;
  const r = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`,
  );
  const j = await r.json().catch(() => ({}));
  return j?.data?.app_id || null;
}

function parseBody(req) {
  const body = req.body || {};
  // JSON: { imagem_base64, mime_type?, file_name? }  — preferido no Vercel
  if (body.imagem_base64) {
    const b64 = String(body.imagem_base64).replace(/^data:[^;]+;base64,/, "");
    const buf = Buffer.from(b64, "base64");
    const mime = String(body.mime_type || "image/jpeg").toLowerCase();
    const name = String(body.file_name || "perfil.jpg");
    return { buf, mime, name };
  }
  return null;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const auth = await exigirAdmin(req);
    if (!auth.ok) return res.status(auth.status).json({ erro: auth.erro });

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.PHONE_NUMBER_ID;
    if (!token || !phoneId) {
      return res.status(503).json({
        erro: "API do WhatsApp não configurada — falta WHATSAPP_TOKEN ou PHONE_NUMBER_ID",
      });
    }

    const parsed = parseBody(req);
    if (!parsed || !parsed.buf?.length) {
      return res.status(400).json({
        erro: "envie imagem_base64 (JPEG/PNG) no JSON",
      });
    }
    const { buf, mime, name } = parsed;
    const mimeOk = ["image/jpeg", "image/jpg", "image/png"].includes(mime);
    if (!mimeOk) return res.status(400).json({ erro: "use JPEG ou PNG" });
    if (buf.length > 5 * 1024 * 1024) return res.status(400).json({ erro: "imagem maior que 5 MB" });

    const appId = await resolverAppId(token);
    if (!appId) {
      return res.status(503).json({
        erro: "não foi possível obter META_APP_ID — defina META_APP_ID no webhook ou use token válido",
      });
    }

    // 1) sessão de upload
    const sessUrl =
      `${GRAPH}/${appId}/uploads` +
      `?file_name=${encodeURIComponent(name)}` +
      `&file_length=${buf.length}` +
      `&file_type=${encodeURIComponent(mime === "image/jpg" ? "image/jpeg" : mime)}` +
      `&access_token=${encodeURIComponent(token)}`;
    const sessR = await fetch(sessUrl, { method: "POST" });
    const sessJ = await sessR.json().catch(() => ({}));
    if (!sessR.ok || !sessJ.id) {
      return res.status(502).json({
        erro: "falha ao criar sessão de upload na Meta",
        detalhe: sessJ?.error?.message || sessJ,
      });
    }

    // 2) envia bytes → handle
    const upR = await fetch(`${GRAPH}/${sessJ.id}`, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${token}`,
        file_offset: "0",
        "Content-Type": "application/octet-stream",
      },
      body: buf,
    });
    const upJ = await upR.json().catch(() => ({}));
    const handle = upJ.h;
    if (!upR.ok || !handle) {
      return res.status(502).json({
        erro: "falha ao enviar imagem para a Meta",
        detalhe: upJ?.error?.message || upJ,
      });
    }

    // 3) aplica no business profile
    const profR = await fetch(`${GRAPH}/${phoneId}/whatsapp_business_profile`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        profile_picture_handle: handle,
      }),
    });
    const profJ = await profR.json().catch(() => ({}));
    if (!profR.ok) {
      return res.status(502).json({
        erro: "falha ao definir foto no perfil WhatsApp",
        detalhe: profJ?.error?.message || profJ,
      });
    }

    return res.status(200).json({ ok: true, meta: profJ });
  } catch (e) {
    console.error("bot-perfil-foto error", e);
    return res.status(500).json({ erro: "erro interno" });
  }
}
