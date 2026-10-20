// Diagnóstico para quem não programa: abra /api/health no endereço do app.
// Mostra se a chave existe e se o Google respondeu. Nunca mostra a chave.
const { googleSearch } = require("./_google");

module.exports = async (req, res) => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  res.setHeader("Cache-Control", "no-store");
  if (!key) {
    return res.status(200).json({
      ok: false,
      chave_do_google: "não encontrada",
      o_que_fazer: "Na Vercel, abra Settings > Environment Variables, adicione GOOGLE_MAPS_API_KEY com a sua chave e faça um novo deploy (Deployments > ... > Redeploy).",
    });
  }
  try {
    const j = await googleSearch(
      key,
      { textQuery: "restaurante em Porto Alegre", languageCode: "pt-BR", regionCode: "BR", pageSize: 1 },
      "places.id,places.displayName"
    );
    const p = (j.places || [])[0];
    return res.status(200).json({
      ok: true,
      chave_do_google: "encontrada",
      google: "respondeu normalmente",
      lugar_de_teste: p && p.displayName ? p.displayName.text : "(nenhum resultado)",
    });
  } catch (e) {
    return res.status(200).json({
      ok: false,
      chave_do_google: "encontrada",
      google: "recusou ou falhou",
      o_que_fazer: e.hint || "Tente de novo em instantes.",
      detalhe_tecnico: String(e.message || "").slice(0, 300),
    });
  }
};
