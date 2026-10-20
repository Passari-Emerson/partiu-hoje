// Transforma o nome de uma cidade ou bairro em coordenadas, usando a própria Places API.
const { googleSearch, sendError, noKey } = require("./_google");

module.exports = async (req, res) => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return noKey(res);
  const q = String((req.query && req.query.q) || "").trim();
  if (q.length < 2 || q.length > 80) {
    return res.status(400).json({ error: "bad_request", message: "Digite o nome de uma cidade ou bairro." });
  }
  try {
    const j = await googleSearch(
      key,
      { textQuery: q, languageCode: "pt-BR", regionCode: "BR", pageSize: 1 },
      "places.location,places.displayName,places.formattedAddress"
    );
    const p = (j.places || [])[0];
    if (!p || !p.location) return res.status(200).json({ found: false });
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.status(200).json({
      found: true,
      lat: p.location.latitude,
      lng: p.location.longitude,
      label: (p.displayName && p.displayName.text) || p.formattedAddress || q,
    });
  } catch (e) {
    return sendError(res, e);
  }
};
