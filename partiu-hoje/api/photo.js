// Entrega a foto de um lugar sem expor a chave do Google ao navegador.
module.exports = async (req, res) => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const q = req.query || {};
  const name = String(q.name || "");
  const w = Math.min(1200, Math.max(120, Number(q.w) || 800));
  if (!key) return res.status(500).end();
  if (!/^places\/[\w-]+\/photos\/[\w-]+$/.test(name)) return res.status(400).end();
  try {
    const r = await fetch(
      "https://places.googleapis.com/v1/" + name + "/media?maxWidthPx=" + w + "&skipHttpRedirect=true",
      { headers: { "X-Goog-Api-Key": key } }
    );
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.photoUri) return res.status(502).end();
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("Location", j.photoUri);
    return res.status(302).end();
  } catch (e) {
    return res.status(502).end();
  }
};
