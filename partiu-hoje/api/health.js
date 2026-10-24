// Diagnóstico para quem não programa: abra /api/health no endereço do app.
// Mostra se a chave existe e se o Google respondeu. Nunca mostra a chave.
const { googleSearch, getKey, cleanEnv } = require("./_google");
const { cloudConfig } = require("./_quota");

module.exports = async (req, res) => {
  const key = getKey();
  res.setHeader("Cache-Control", "no-store");
  const url = cleanEnv("SUPABASE_URL"), akey = cleanEnv("SUPABASE_ANON_KEY") || cleanEnv("SUPABASE_PUBLISHABLE_KEY");
  const conta = !url && !akey ? "não configurada (o app funciona só neste aparelho)"
    : !url ? "falta SUPABASE_URL" : !akey ? "falta SUPABASE_ANON_KEY"
    : /sb_secret_/.test(akey) ? "ERRO: você colou a chave SECRETA; use a chave pública (anon / publishable)"
    : !/^(?:https?:\/\/)?[a-z0-9-]+\.supabase\.(co|in)(?:[\/?#].*)?$/i.test(url) ? "ERRO: SUPABASE_URL não parece um endereço do Supabase. Use só algo como https://abcdefgh.supabase.co"
    : !/^(sb_publishable_[\w-]{4,}|eyJ[\w-]+\.[\w-]+\.[\w-]+)$/.test(akey) ? "ERRO: SUPABASE_ANON_KEY não parece a chave pública (começa com sb_publishable_ ou eyJ). Copie de novo, inteira, sem espaços"
    : "configurada";
  // Confere se o banco já tem os planos e limites (a função get_plans é pública).
  let limites = "desligados (sem conta na nuvem, o uso não tem limite)";
  const c = cloudConfig();
  if (c.valid) {
    try {
      const r = await fetch(c.url + "/rest/v1/rpc/get_plans", { method: "POST", headers: { apikey: c.key, Authorization: "Bearer " + c.key, "Content-Type": "application/json" }, body: "{}" });
      const j = await r.json().catch(() => null);
      limites = r.ok && Array.isArray(j) && j.length
        ? "ativos (" + j.map((x) => x.label + ": " + x.cards + " lugares por dia").join("; ") + ")"
        : "ERRO: o banco não tem os planos. Rode de novo o arquivo supabase/setup.sql no Supabase";
    } catch (e) { limites = "não consegui falar com o Supabase agora"; }
  }
  const pagamento = ["PREMIUM_WEEK", "PREMIUM_MONTH", "GOLD_WEEK", "GOLD_MONTH"].filter((n) => cleanEnv("CHECKOUT_" + n)).length;
  const json = res.json.bind(res);
  res.json = (o) => json(Object.assign({}, o, { conta_na_nuvem: conta, limites_de_uso: limites, links_de_pagamento: pagamento + " de 4 configurados" }));
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
