const { getKey } = require("./_google");
const { gate } = require("./_quota");
// Entrega o endereço temporário de uma foto de um lugar, sem expor a chave do Google ao navegador.
// O navegador pede com o token de login (cabeçalho Authorization); o banco confere o limite de fotos.
// Resposta: {uri}. ctx=card (foto grande do deslizar) ou thumb (foto pequena da lista).
module.exports = async (req, res) => {
  const key = getKey();
  const q = req.query || {};
  const name = String(q.name || "");
  const ctx = q.ctx === "thumb" ? "thumb" : "card";
  const w = Math.min(1200, Math.max(120, Number(q.w) || 800));
  if (!key) return res.status(500).json({ error: "no_key", message: "Falta a chave do Google no servidor." });
  const m = /^places\/([\w-]{5,300})\/photos\/([\w-]{5,700})$/.exec(name);
  if (!m) return res.status(400).json({ error: "bad_request", message: "Foto inválida." });
  if (!(await gate(req, res, { kind: "photo", place: m[1], photo: m[2], ctx }))) return;
  try {
    const r = await fetch(
      "https://places.googleapis.com/v1/" + name + "/media?maxWidthPx=" + w + "&skipHttpRedirect=true",
      { headers: { "X-Goog-Api-Key": key } }
    );
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.photoUri) return res.status(502).json({ error: "google", message: "O Google não entregou a foto." });
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.status(200).json({ uri: j.photoUri });
  } catch (e) {
    return res.status(502).json({ error: "network", message: "Falha ao buscar a foto." });
  }
};
