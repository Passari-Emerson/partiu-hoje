// Busca lugares no Google Places (API nova). A chave fica só no servidor.
const FIELDS = [
  "nextPageToken",
  "places.id", "places.displayName", "places.formattedAddress", "places.location",
  "places.rating", "places.userRatingCount", "places.priceLevel",
  "places.primaryTypeDisplayName", "places.editorialSummary", "places.photos",
  "places.allowsDogs", "places.outdoorSeating", "places.servesVegetarianFood",
  "places.goodForChildren", "places.menuForChildren", "places.accessibilityOptions",
].join(",");

module.exports = async (req, res) => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return res.status(500).json({ error: "Falta a variável GOOGLE_MAPS_API_KEY" });

  const { q, lat, lng, radius, pageToken } = req.query || {};
  const la = Number(lat), ln = Number(lng);
  const ra = Math.min(50000, Math.max(500, Number(radius) || 5000));
  if (!q || String(q).length > 80 || !Number.isFinite(la) || !Number.isFinite(ln) ||
      Math.abs(la) > 90 || Math.abs(ln) > 180 || (pageToken && String(pageToken).length > 2000)) {
    return res.status(400).json({ error: "Parâmetros inválidos" });
  }

  // Caixa ao redor do usuário: o Google só aceita retângulo como limite rígido.
  const dLat = ra / 111320;
  const dLng = ra / (111320 * Math.max(0.1, Math.cos((la * Math.PI) / 180)));
  const body = {
    textQuery: String(q),
    languageCode: "pt-BR",
    regionCode: "BR",
    pageSize: 20,
    locationRestriction: {
      rectangle: {
        low: { latitude: la - dLat, longitude: ln - dLng },
        high: { latitude: la + dLat, longitude: ln + dLng },
      },
    },
  };
  if (pageToken) body.pageToken = String(pageToken);

  try {
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": FIELDS,
      },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(502).json({ error: "Falha no Google Places", detail: j.error && j.error.message });
    }
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.status(200).json({ places: j.places || [], nextPageToken: j.nextPageToken || null });
  } catch (e) {
    return res.status(502).json({ error: "Não foi possível falar com o Google" });
  }
};
