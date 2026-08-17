// ROTEA · /api/bot-perfil — ler/atualizar perfil comercial do número WhatsApp (só Administrador)
const SUPABASE_URL = "https://wuuijbetsckjusnvdxts.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dWlqYmV0c2NranVzbnZkeHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjAwODAsImV4cCI6MjEwMTUzNjA4MH0.VzHyjS2goE1tX0udysdjnuXcfym39jPkJWc3j-xFYbA";
const GRAPH = "https://graph.facebook.com/v21.0";

const CAMPOS_PERFIL = "about,address,description,email,profile_picture_url,websites,vertical";
const CAMPOS_NUMERO = "verified_name,display_phone_number,name_status,quality_rating";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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

function waCreds() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.PHONE_NUMBER_ID;
  if (!token || !phoneId) return null;
  return { token, phoneId };
}

function limparTexto(v, max) {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s) return "";
  return s.slice(0, max);
}

function normalizarWebsites(raw) {
  if (raw == null) return undefined;
  const lista = Array.isArray(raw) ? raw : String(raw).split(/[\n,]+/);
  const urls = lista
    .map(u => String(u || "").trim())
    .filter(Boolean)
    .slice(0, 2)
    .map(u => (u.startsWith("http://") || u.startsWith("https://") ? u : `https://${u}`))
    .map(u => u.slice(0, 256));
  return urls;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  try {
    const auth = await exigirAdmin(req);
    if (!auth.ok) return res.status(auth.status).json({ erro: auth.erro });

    const creds = waCreds();
    if (!creds) {
      return res.status(503).json({
        erro: "API do WhatsApp não configurada — falta WHATSAPP_TOKEN ou PHONE_NUMBER_ID",
      });
    }
    const { token, phoneId } = creds;
    const authH = { Authorization: `Bearer ${token}` };

    if (req.method === "GET") {
      const [perfilR, numR] = await Promise.all([
        fetch(`${GRAPH}/${phoneId}/whatsapp_business_profile?fields=${CAMPOS_PERFIL}`, { headers: authH }),
        fetch(`${GRAPH}/${phoneId}?fields=${CAMPOS_NUMERO}`, { headers: authH }),
      ]);
      const perfilJ = await perfilR.json().catch(() => ({}));
      const numJ = await numR.json().catch(() => ({}));
      if (!perfilR.ok) {
        return res.status(502).json({
          erro: "falha ao ler perfil comercial na Meta",
          detalhe: perfilJ?.error?.message || perfilJ,
        });
      }
      const data = Array.isArray(perfilJ.data) ? perfilJ.data[0] : perfilJ;
      return res.status(200).json({
        ok: true,
        telefone: numJ.display_phone_number || null,
        verified_name: numJ.verified_name || null,
        name_status: numJ.name_status || null,
        quality_rating: numJ.quality_rating || null,
        nome_exibicao_somente_leitura: true,
        aviso_nome:
          "O nome de exibição (verified_name) não é alterado por este formulário. Peça mudança no Meta Business Manager; a Meta precisa aprovar.",
        perfil: {
          about: data?.about ?? "",
          address: data?.address ?? "",
          description: data?.description ?? "",
          email: data?.email ?? "",
          websites: Array.isArray(data?.websites) ? data.websites : [],
          vertical: data?.vertical ?? "",
          profile_picture_url: data?.profile_picture_url ?? null,
        },
      });
    }

    // POST — atualiza campos editáveis do business profile
    const body = req.body || {};
    const payload = { messaging_product: "whatsapp" };

    if ("about" in body) payload.about = limparTexto(body.about, 139);
    if ("address" in body) payload.address = limparTexto(body.address, 256);
    if ("description" in body) payload.description = limparTexto(body.description, 512);
    if ("email" in body) payload.email = limparTexto(body.email, 128);
    if ("vertical" in body) {
      const v = limparTexto(body.vertical, 64);
      if (v) payload.vertical = v;
    }
    if ("websites" in body) {
      const sites = normalizarWebsites(body.websites);
      if (sites) payload.websites = sites;
    }

    const editaveis = ["about", "address", "description", "email", "vertical", "websites"];
    const temCampo = editaveis.some(k => k in body);
    if (!temCampo) return res.status(400).json({ erro: "nenhum campo para atualizar" });

    const r = await fetch(`${GRAPH}/${phoneId}/whatsapp_business_profile`, {
      method: "POST",
      headers: { ...authH, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(502).json({
        erro: "falha ao atualizar perfil na Meta",
        detalhe: j?.error?.message || j,
      });
    }
    return res.status(200).json({ ok: true, meta: j });
  } catch (e) {
    console.error("bot-perfil error", e);
    return res.status(500).json({ erro: "erro interno" });
  }
}
