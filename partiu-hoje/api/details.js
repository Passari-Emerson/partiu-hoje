// Dados atuais de uma lista de lugares, a partir dos IDs guardados (o app só guarda o ID, como o Google exige).
// Cada lugar gasta uma unidade do limite diário de consultas da pessoa; os que passarem do limite voltam como {limited:true}.
const { googleGet, sendError, noKey, getKey } = require("./_google");
const { spendRaw, limitBody } = require("./_quota");

// Campos da faixa mais barata do Google (sem nota, sem horários).
const FIELDS = "id,displayName,formattedAddress,shortFormattedAddress,location,photos,primaryType,primaryTypeDisplayName,googleMapsUri,businessStatus";

module.exports = async (req, res) => {
  const key = getKey();
  if (!key) return noKey(res);
  const ids = String((req.query && req.query.ids) || "").split(",").map((s) => s.trim()).filter(Boolean);
  const uniq = [...new Set(ids)];
  if (!uniq.length || uniq.length > 12 || uniq.some((id) => !/^[A-Za-z0-9_-]{5,300}$/.test(id))) {
    return res.status(400).json({ error: "bad_request", message: "Lista de lugares inválida (máximo 12 por vez)." });
  }
  res.setHeader("Cache-Control", "no-store");
  const spent = await Promise.all(uniq.map((id) => spendRaw(req, { kind: "lookup", place: id })));
  const bad = spent.find((x) => x.kind === "error");
  if (bad) return res.status(bad.status).json(bad.body);
  const allowed = uniq.filter((_, i) => spent[i].kind !== "limit");
  const lim = spent.find((x) => x.kind === "limit");
  try {
    const got = await Promise.all(allowed.map(async (id) => {
      try {
        return await googleGet(key, id, FIELDS);
      } catch (e) {
        if (e.notFound) return { id, gone: true };
        throw e;
      }
    }));
    const byId = new Map(got.map((p) => [p.id, p]));
    const out = uniq.map((id, i) => (spent[i].kind === "limit" ? { id, limited: true } : byId.get(id) || { id, gone: true }));
    res.setHeader("Cache-Control", "private, max-age=600");
    return res.status(200).json({ places: out, limit: lim ? limitBody(lim) : null });
  } catch (e) {
    return sendError(res, e);
  }
};
