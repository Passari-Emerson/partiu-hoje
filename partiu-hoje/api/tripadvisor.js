// Cruza um lugar do Google com o mesmo lugar no TripAdvisor e devolve a nota.
// A chave fica só no servidor. Sem a chave, responde 503 e o app segue só com o Google.
const BASE = "https://api.content.tripadvisor.com/api/v1/location";

const norm = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function similarity(a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const A = new Set(a.split(" ")), B = new Set(b.split(" "));
  let common = 0;
  A.forEach((w) => { if (B.has(w)) common++; });
  return common / Math.max(A.size, B.size);
}

module.exports = async (req, res) => {
  const key = process.env.TRIPADVISOR_API_KEY;
  if (!key) return res.status(503).json({ error: "Falta a variável TRIPADVISOR_API_KEY" });

  const { name, lat, lng, category } = req.query || {};
  const la = Number(lat), ln = Number(lng);
  const cat = category === "attractions" ? "attractions" : "restaurants";
  if (!name || String(name).length > 100 || !Number.isFinite(la) || !Number.isFinite(ln) ||
      Math.abs(la) > 90 || Math.abs(ln) > 180) {
    return res.status(400).json({ error: "Parâmetros inválidos" });
  }

  try {
    const sp = new URLSearchParams({
      key, searchQuery: String(name), category: cat,
      latLong: la + "," + ln, radius: "1", radiusUnit: "km", language: "pt",
    });
    const s = await fetch(BASE + "/search?" + sp, { headers: { accept: "application/json" } });
    if (!s.ok) return res.status(502).json({ error: "Falha no TripAdvisor" });
    const list = ((await s.json().catch(() => ({}))).data) || [];

    const best = list
      .map((x) => ({ x, score: similarity(x.name, name) }))
      .sort((a, b) => b.score - a.score)[0];
    if (!best || best.score < 0.6) {
      res.setHeader("Cache-Control", "private, max-age=600");
      return res.status(200).json({ match: null });
    }

    const dp = new URLSearchParams({ key, language: "pt", currency: "BRL" });
    const d = await fetch(BASE + "/" + encodeURIComponent(best.x.location_id) + "/details?" + dp,
      { headers: { accept: "application/json" } });
    if (!d.ok) return res.status(502).json({ error: "Falha no TripAdvisor" });
    const det = await d.json().catch(() => ({}));

    const rating = Number(det.rating);
    res.setHeader("Cache-Control", "private, max-age=600");
    return res.status(200).json({
      match: Number.isFinite(rating) && rating > 0 ? {
        id: String(best.x.location_id),
        name: det.name || best.x.name,
        rating,
        reviews: Number(det.num_reviews) || 0,
        url: det.web_url || null,
        price: det.price_level || null,
        ranking: (det.ranking_data && det.ranking_data.ranking_string) || null,
        cuisines: (det.cuisine || []).map((c) => c.localized_name || c.name).filter(Boolean),
      } : null,
    });
  } catch (e) {
    return res.status(502).json({ error: "Não foi possível falar com o TripAdvisor" });
  }
};
