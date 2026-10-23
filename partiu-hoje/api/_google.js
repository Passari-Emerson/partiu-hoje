// Funções compartilhadas pelas rotas /api. O arquivo começa com "_" para a Vercel não
// publicá-lo como rota. A chave do Google fica só aqui, no servidor.

const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

// Traduz os erros mais comuns do Google em instruções que uma pessoa sem experiência consegue seguir.
function explain(status, googleStatus, message) {
  const m = String(message || "").toLowerCase();
  if (m.includes("billing")) {
    return "O faturamento do projeto no Google Cloud não está ativo. Ative em Faturamento e tente de novo.";
  }
  if (m.includes("has not been used") || m.includes("is disabled") || googleStatus === "SERVICE_DISABLED") {
    return "A Places API (New) não está ativada no seu projeto do Google Cloud. Em APIs e serviços > Biblioteca, ative a \"Places API (New)\" (não a versão antiga).";
  }
  if (m.includes("referer") || m.includes("referrer")) {
    return "A chave do Google está restrita a sites (referrer). Em Credenciais, troque para restrição só por API (Places API (New)).";
  }
  if (m.includes("ip address")) {
    return "A chave do Google está restrita por endereço IP. Em Credenciais, remova a restrição por IP e deixe só a restrição por API.";
  }
  if (m.includes("api key not valid") || m.includes("api_key_invalid") || m.includes("api key expired")) {
    return "O Google não aceitou a chave. Confira se a chave colada na Vercel (GOOGLE_MAPS_API_KEY) está completa, sem espaços, e faça um novo deploy.";
  }
  if (status === 429 || googleStatus === "RESOURCE_EXHAUSTED") {
    return "O limite de uso do Google foi atingido (cota diária ou mensal). Espere ou aumente a cota no Google Cloud.";
  }
  if (status === 403 || googleStatus === "PERMISSION_DENIED") {
    return "O Google recusou a chave. Confira se a Places API (New) está ativada, se o faturamento está ativo e se a chave só permite essa API.";
  }
  return "O Google não conseguiu responder agora. Tente de novo em instantes.";
}

// Lê uma variável de ambiente sem espaços e sem aspas coladas por engano.
function cleanEnv(name) {
  const v = process.env[name];
  if (!v) return "";
  return String(v).trim().replace(/^["']+|["']+$/g, "").trim();
}
const getKey = () => cleanEnv("GOOGLE_MAPS_API_KEY");

async function googleFail(r) {
  const j = await r.json().catch(() => ({}));
  const e = j && j.error ? j.error : {};
  const err = new Error(e.message || "Falha no Google");
  err.httpStatus = r.status;
  err.googleStatus = e.status;
  err.notFound = r.status === 404;
  err.hint = explain(r.status, e.status, e.message);
  return err;
}

// Busca os dados de um lugar pelo ID. Só pede os campos da faixa mais barata (fieldMask enxuto).
async function googleGet(key, placeId, fieldMask) {
  const r = await fetch("https://places.googleapis.com/v1/places/" + encodeURIComponent(placeId) + "?languageCode=pt-BR&regionCode=BR", {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": fieldMask },
  });
  if (!r.ok) throw await googleFail(r);
  return r.json();
}

async function googleSearch(key, body, fieldMask) {
  const r = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = j && j.error ? j.error : {};
    const err = new Error(e.message || "Falha no Google");
    err.httpStatus = r.status;
    err.googleStatus = e.status;
    err.hint = explain(r.status, e.status, e.message);
    throw err;
  }
  return j;
}

function sendError(res, err) {
  if (err && err.hint) {
    return res.status(502).json({
      error: "google",
      status: err.httpStatus || 502,
      message: err.hint,
      detail: String(err.message || "").slice(0, 300),
    });
  }
  return res.status(502).json({
    error: "network",
    message: "O servidor do app não conseguiu falar com o Google. Tente de novo em instantes.",
  });
}

const noKey = (res) =>
  res.status(500).json({
    error: "no_key",
    message: "Falta a variável GOOGLE_MAPS_API_KEY na Vercel. Em Settings > Environment Variables, adicione e faça um novo deploy.",
  });

module.exports = { googleSearch, googleGet, sendError, noKey, explain, cleanEnv, getKey };
