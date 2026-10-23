// Entrega ao navegador os dados PÚBLICOS do Supabase (endereço do projeto e chave "anon/publishable").
// Essa chave é pública por desenho: quem protege os dados é a regra de privacidade (RLS) do banco.
// Nunca coloque aqui a chave "service_role" / "secret".
const { cloudConfig } = require("./_quota");
const { cleanEnv } = require("./_google");

// Links de pagamento (criados no painel do provedor de pagamento). Opcionais.
function checkout() {
  const get = (n) => { const v = cleanEnv(n); return /^https:\/\/[^\s]{4,500}$/.test(v) ? v : null; };
  return {
    premium: { week: get("CHECKOUT_PREMIUM_WEEK"), month: get("CHECKOUT_PREMIUM_MONTH") },
    gold: { week: get("CHECKOUT_GOLD_WEEK"), month: get("CHECKOUT_GOLD_MONTH") },
  };
}

module.exports = (req, res) => {
  const c = cloudConfig();
  res.setHeader("Cache-Control", "public, max-age=60");
  // Trava de segurança: chave secreta nunca é entregue.
  if (!c.valid) return res.status(200).json({ cloud: false, problem: c.secret ? "secret_key" : (c.any ? "invalid" : "missing") });
  return res.status(200).json({ cloud: true, url: c.url, key: c.key, checkout: checkout() });
};
