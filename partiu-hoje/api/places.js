// Busca lugares reais no Google Places (API nova), dentro do raio escolhido (até 50 km).
const { googleSearch, sendError, noKey, getKey } = require("./_google");
const { gate } = require("./_quota");

const FIELDS = [
  "nextPageToken",
  "places.id", "places.displayName", "places.formattedAddress", "places.shortFormattedAddress",
  "places.location", "places.rating", "places.userRatingCount", "places.priceLevel",
  "places.primaryType", "places.types",
  "places.primaryTypeDisplayName", "places.editorialSummary", "places.photos",
  "places.businessStatus", "places.googleMapsUri", "places.currentOpeningHours",
  "places.allowsDogs", "places.outdoorSeating", "places.servesVegetarianFood",
  "places.goodForChildren", "places.menuForChildren", "places.accessibilityOptions",
  "places.goodForGroups", "places.liveMusic", "places.reservable",
].join(",");

module.exports = async (req, res) => {
  const key = getKey();
  if (!key) return noKey(res);

  const { q, lat, lng, radius, pageToken } = req.query || {};
  const la = Number(lat), ln = Number(lng);
  const ra = Math.min(50000, Math.max(500, Number(radius) || 5000));
  if (!q || String(q).length > 80 || !Number.isFinite(la) || !Number.isFinite(ln) ||
      Math.abs(la) > 90 || Math.abs(ln) > 180 || (pageToken && String(pageToken).length > 2000)) {
    return res.status(400).json({ error: "bad_request", message: "Parâmetros inválidos." });
  }

  if (!(await gate(req, res, { kind: "search" }))) return;

  // O Google só aceita um retângulo como limite rígido. O app refina para um círculo depois.
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
    const j = await googleSearch(key, body, FIELDS);
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.status(200).json({ places: j.places || [], nextPageToken: j.nextPageToken || null });
  } catch (e) {
    return sendError(res, e);
  }
};
