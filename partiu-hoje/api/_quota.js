// Limite de uso por pessoa. Cada busca, foto e consulta ao Google custa dinheiro, então o servidor confere o
// limite no banco (Supabase) ANTES de falar com o Google. O navegador manda o token de login da pessoa e o
// banco decide. Só a chave pública do Supabase é usada aqui.
const { cleanEnv } = require("./_google");

// Lê as variáveis do Supabase. Se estiverem ausentes ou erradas, o app roda sem conta e sem limites (modo local).
function cloudConfig() {
  const url = cleanEnv("SUPABASE_URL").replace(/\/+$/, "");
  const key = cleanEnv("SUPABASE_ANON_KEY") || cleanEnv("SUPABASE_PUBLISHABLE_KEY");
  let secret = /^sb_secret_/.test(key);
  if (!secret && key.split(".").length === 3) {
    try { secret = /"role"\s*:\s*"service_role"/.test(Buffer.from(key.split(".")[1], "base64url").toString("utf8")); } catch (e) { secret = false; }
  }
  const valid = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url) && !!key && !secret;
  return { url, key, valid, secret, any: !!(url || key) };
}

function bearer(req) {
  const h = (req.headers && (req.headers.authorization || req.headers.Authorization)) || "";
  const m = /^Bearer\s+([\w.~+/=-]+)$/i.exec(String(h));
  return m ? m[1] : "";
}

const MSG = {
  cards: "Você chegou ao limite de lugares de hoje.",
  lookups: "Você chegou ao limite de consultas à sua lista por hoje.",
  searches: "Você chegou ao limite de buscas de hoje.",
  photos: "Você já viu todas as fotos deste lugar que o seu plano permite.",
};

// Gasta uma unidade do limite. Devolve {kind:"open"} (sem Supabase configurado), {kind:"ok"}, {kind:"limit", ...} ou {kind:"error", status, body}.
async function spendRaw(req, args) {
  const c = cloudConfig();
  if (!c.any) return { kind: "open" };
  if (!c.valid) return { kind: "error", status: 503, body: { error: "quota_setup", message: "As variáveis do Supabase estão incompletas ou erradas. Abra /api/health para ver o que falta." } };
  const token = bearer(req);
  if (!token) return { kind: "error", status: 401, body: { error: "no_session", message: "Sessão não iniciada. Recarregue o app." } };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 7000);
  let r, j = null;
  try {
    r = await fetch(c.url + "/rest/v1/rpc/spend", {
      method: "POST",
      headers: { apikey: c.key, Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ p_kind: args.kind, p_place: args.place || null, p_photo: args.photo || null, p_ctx: args.ctx || null }),
      signal: ctl.signal,
    });
    j = await r.json().catch(() => null);
  } catch (e) {
    return { kind: "error", status: 503, body: { error: "quota_unavailable", message: "Não consegui conferir o seu limite agora. Tente de novo em instantes." } };
  } finally { clearTimeout(timer); }
  if (r.status === 401) return { kind: "error", status: 401, body: { error: "session_expired", message: "Sua sessão venceu. Recarregue o app." } };
  if (r.status === 404 || (j && (j.code === "PGRST202" || j.code === "42883"))) {
    return { kind: "error", status: 503, body: { error: "quota_setup", message: "O banco ainda não tem os limites de uso. Rode de novo o arquivo supabase/setup.sql no Supabase." } };
  }
  if (!r.ok || !j || typeof j !== "object") {
    return { kind: "error", status: 503, body: { error: "quota_unavailable", message: "Não consegui conferir o seu limite agora. Tente de novo em instantes." } };
  }
  if (j.ok === true) return { kind: "ok", tier: j.tier, used: j.used, cap: j.cap };
  if (j.reason === "no_session") return { kind: "error", status: 401, body: { error: "no_session", message: "Sessão não iniciada. Recarregue o app." } };
  if (j.reason === "bad_request") return { kind: "error", status: 400, body: { error: "bad_request", message: "Pedido inválido." } };
  if (j.reason === "no_plan") return { kind: "error", status: 503, body: { error: "quota_setup", message: "O banco não tem os planos. Rode de novo o arquivo supabase/setup.sql." } };
  return { kind: "limit", reason: j.reason, tier: j.tier, used: j.used, cap: j.cap };
}

const limitBody = (x) => ({ error: "limit", reason: x.reason, tier: x.tier, used: x.used, cap: x.cap, message: MSG[x.reason] || "Limite de uso atingido." });

// Versão para as rotas: se não puder seguir, já responde ao navegador e devolve false.
async function gate(req, res, args) {
  const x = await spendRaw(req, args);
  if (x.kind === "open" || x.kind === "ok") return true;
  res.setHeader("Cache-Control", "no-store");
  if (x.kind === "limit") { res.status(402).json(limitBody(x)); return false; }
  res.status(x.status).json(x.body);
  return false;
}

module.exports = { cloudConfig, spendRaw, gate, limitBody, bearer };
