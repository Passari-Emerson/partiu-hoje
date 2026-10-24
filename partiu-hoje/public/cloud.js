/* Conta na nuvem (Supabase), escrita à mão, sem biblioteca externa.
   Só fala com 3 endereços do Supabase: /auth/v1 (login), /rest/v1 (tabelas) e /rest/v1/rpc (lista compartilhada).
   A chave que usamos aqui é a chave PÚBLICA (anon/publishable). Quem protege os dados é a regra de privacidade do banco. */
(function () {
  "use strict";
  const AUTH_KEY = "ph-auth";
  let CFG = null, SESSION = null, refreshing = null, signing = null, initP = null;
  const listeners = [];

  const store = {
    get() { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch (e) { return null; } },
    set(v) { try { v ? localStorage.setItem(AUTH_KEY, JSON.stringify(v)) : localStorage.removeItem(AUTH_KEY); } catch (e) {} },
  };
  const emit = () => listeners.forEach((f) => { try { f(SESSION); } catch (e) {} });

  function fail(message, extra) { return Object.assign(new Error(message), extra || {}); }

  function friendly(status, j, fallback) {
    const code = j && (j.error_code || j.code || j.error);
    const msg = String((j && (j.msg || j.message || j.error_description)) || "").toLowerCase();
    if (status === 429 || /rate limit|too many|over_email_send_rate_limit|over_request_rate_limit/.test(String(code) + msg))
      return "Muitas tentativas em pouco tempo. Espere alguns minutos e tente de novo.";
    if (/otp_expired|expired|invalid.*token|token.*invalid|otp/.test(String(code) + msg))
      return "Esse código não vale mais ou está errado. Peça um novo e digite os números do e-mail mais recente.";
    if (/invalid.*email|validation_failed|unable to validate email/.test(String(code) + msg))
      return "Esse e-mail não parece válido. Confira e tente de novo.";
    if (/anonymous_provider_disabled|anonymous sign-ins are disabled/.test(String(code) + msg))
      return "O acesso de visitante não está ativado no Supabase. Em Authentication > Sign In / Providers, ligue \"Allow anonymous sign-ins\" (veja o README).";
    if (/provider.*not enabled|unsupported provider/.test(msg))
      return "O login com Google ainda não foi ativado no Supabase. Veja o passo a passo no README.";
    if (/signups? not allowed|signup.*disabled/.test(msg))
      return "Novos cadastros estão desativados no Supabase.";
    return fallback || "Não consegui falar com o servidor da conta. Tente de novo em instantes.";
  }

  async function raw(path, opts) {
    if (!CFG || !CFG.cloud) throw fail("A conta na nuvem não está ativada neste app.", { code: "no_cloud" });
    const o = opts || {};
    const headers = Object.assign({ apikey: CFG.key, "Content-Type": "application/json" }, o.headers || {});
    let r;
    try {
      r = await fetch(CFG.url + path, { method: o.method || "GET", headers, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
    } catch (e) {
      throw fail("Sem conexão com a internet ou com o servidor.", { code: "network" });
    }
    let j = null;
    const t = await r.text();
    if (t) { try { j = JSON.parse(t); } catch (e) { j = null; } }
    return { r, j, status: r.status, ok: r.ok };
  }

  function saveSession(d) {
    if (!d || !d.access_token) return null;
    const now = Math.floor(Date.now() / 1000);
    SESSION = {
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: d.expires_at || now + (Number(d.expires_in) || 3600),
      user: d.user ? { id: d.user.id, email: d.user.email, anon: !!d.user.is_anonymous, name: (d.user.user_metadata && (d.user.user_metadata.full_name || d.user.user_metadata.name)) || "" } : (SESSION && SESSION.user) || null,
    };
    // Sem os dados do usuário, descobre quem é pelo token (campo "sub" do JWT).
    if (!SESSION.user || !SESSION.user.id) {
      try {
        const c = JSON.parse(atob(SESSION.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        SESSION.user = { id: c.sub, email: c.email || "", anon: !!c.is_anonymous, name: (c.user_metadata && (c.user_metadata.full_name || c.user_metadata.name)) || "" };
      } catch (e) { SESSION.user = null; }
    }
    store.set(SESSION);
    // Lembra que este aparelho já teve conta de verdade: depois de sair, não damos de novo os lugares de visitante.
    try { if (SESSION.user && !SESSION.user.anon) localStorage.setItem("ph-acct", "1"); } catch (e) {}
    return SESSION;
  }

  async function refresh() {
    if (!SESSION || !SESSION.refresh_token) return false;
    if (refreshing) return refreshing;
    refreshing = (async () => {
      try {
        const a = await raw("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: { refresh_token: SESSION.refresh_token } });
        if (a.ok && a.j && a.j.access_token) { saveSession(a.j); return true; }
        // Só desloga quando o servidor diz que o token não vale mais (e não por falta de internet).
        if (a.status === 400 || a.status === 401 || a.status === 403) { SESSION = null; store.set(null); emit(); }
        return false;
      } catch (e) { return false; } finally { refreshing = null; }
    })();
    return refreshing;
  }

  async function token() {
    if (!SESSION) return null;
    if (SESSION.expires_at - Math.floor(Date.now() / 1000) < 60) await refresh();
    return SESSION ? SESSION.access_token : null;
  }

  // Chamada autenticada às tabelas. Tenta uma vez de novo se o token estiver vencido.
  async function rest(path, opts, retried) {
    const tk = await token();
    if (!tk) throw fail("Você não está conectado.", { code: "no_session" });
    const o = opts || {};
    const a = await raw("/rest/v1/" + path, { method: o.method, body: o.body, headers: Object.assign({ Authorization: "Bearer " + tk }, o.headers || {}) });
    if (a.status === 401 && !retried) { if (await refresh()) return rest(path, opts, true); }
    if (!a.ok) {
      const hint = a.j && (a.j.message || a.j.hint) || "";
      let msg = "Não consegui salvar na nuvem agora.";
      if (/42703|PGRST204|column .* does not exist|Could not find the .* column/.test(JSON.stringify(a.j || {}))) msg = "O banco precisa ser atualizado. Rode de novo o arquivo supabase/setup.sql no Supabase (README).";
      else if (/relation .* does not exist|schema cache|PGRST205|42P01/.test(JSON.stringify(a.j || {}))) msg = "As tabelas do banco ainda não foram criadas. Rode o arquivo supabase/setup.sql no Supabase (README, passo do banco de dados).";
      else if (/PGRST202|42883|could not find the function/i.test(JSON.stringify(a.j || {}))) msg = "O banco ainda não tem os limites de uso. Rode de novo o arquivo supabase/setup.sql no Supabase.";
      else if (a.status === 401) msg = "Sua sessão venceu. Entre de novo.";
      throw fail(msg, { code: "rest", status: a.status, detail: String(hint).slice(0, 200) });
    }
    return a.j;
  }

  const Cloud = {
    cfg: null,
    // Só inicia uma vez; quem chamar de novo (ou chamar a API antes do fim) espera o mesmo resultado.
    init() { return initP || (initP = Cloud._init()); },
    async _init() {
      try {
        const r = await fetch("/api/config", { cache: "no-store" });
        CFG = await r.json();
      } catch (e) { CFG = { cloud: false, problem: "unreachable" }; }
      Cloud.cfg = CFG;
      // Voltando do Google ou do link do e-mail: os dados da sessão vêm no endereço, depois do "#".
      let authError = "";
      if (location.hash && /access_token=|error=|error_code=/.test(location.hash)) {
        const h = new URLSearchParams(location.hash.slice(1));
        if (h.get("access_token") && CFG.cloud) {
          saveSession({ access_token: h.get("access_token"), refresh_token: h.get("refresh_token"), expires_in: h.get("expires_in"), expires_at: Number(h.get("expires_at")) || 0 });
          // O token do endereço não traz o e-mail completo: busca os dados do usuário.
          try {
            const a = await raw("/auth/v1/user", { headers: { Authorization: "Bearer " + SESSION.access_token } });
            if (a.ok && a.j && a.j.id) saveSession(Object.assign({}, SESSION, { user: a.j }));
          } catch (e) {}
          Cloud.justSignedIn = true;
        } else if (h.get("error") || h.get("error_code")) {
          const d = (h.get("error_description") || "").replace(/\+/g, " ");
          authError = /expired|invalid/i.test(d + (h.get("error_code") || "")) ? "O link do e-mail venceu ou já foi usado. Peça um novo." : "Não consegui concluir o login. Tente de novo.";
        }
        try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
      }
      if (!SESSION) SESSION = store.get();
      if (SESSION && CFG.cloud) { if (SESSION.expires_at - Math.floor(Date.now() / 1000) < 60) await refresh(); }
      Cloud.authError = authError;
      return CFG;
    },
    enabled: () => !!(CFG && CFG.cloud),
    // Só devolve o usuário quando é uma conta de verdade (visitante anônimo não conta como "logado").
    user: () => (SESSION && SESSION.user && !SESSION.user.anon ? SESSION.user : null),
    isVisitor: () => !!(SESSION && SESSION.user && SESSION.user.anon),
    hasSession: () => !!SESSION,

    // Visitante: o Supabase cria um usuário anônimo para a pessoa usar o app sem conta (com limite de lugares).
    async ensureSession() {
      if (!CFG || !CFG.cloud) throw fail("A conta na nuvem não está ativada neste app.", { code: "no_cloud" });
      if (SESSION) return SESSION;
      let had = false;
      try { had = localStorage.getItem("ph-acct") === "1"; } catch (e) {}
      if (had) throw fail("Entre na sua conta para continuar.", { code: "login_required" });
      if (signing) return signing;
      signing = (async () => {
        try {
          const a = await raw("/auth/v1/signup", { method: "POST", body: { data: {} } });
          if (!a.ok || !a.j || !a.j.access_token) throw fail(friendly(a.status, a.j, "Não consegui iniciar uma sessão de visitante."), { code: /anonymous/i.test(JSON.stringify(a.j || {})) ? "anon_disabled" : "signup", status: a.status });
          saveSession(a.j); emit();
          return SESSION;
        } finally { signing = null; }
      })();
      return signing;
    },
    // Chamada às rotas do servidor do app (/api/...) levando o token de login, para o servidor conferir o limite.
    async apiFetch(path, opts) {
      if (!CFG) await Cloud.init();
      if (!CFG || !CFG.cloud) return fetch(path, opts);
      const call = async () => {
        if (!SESSION) await Cloud.ensureSession();
        let tk = await token();
        if (!tk) { await Cloud.ensureSession(); tk = SESSION && SESSION.access_token; }
        const o = Object.assign({}, opts || {});
        o.headers = Object.assign({}, o.headers || {}, { Authorization: "Bearer " + tk });
        return fetch(path, o);
      };
      let r;
      try { r = await call(); } catch (e) { if (e && e.code) throw e; throw fail("Sem conexão com o servidor do app. Confira a internet e tente de novo.", { code: "network" }); }
      if (r.status === 401) {
        try {
          if (SESSION) await refresh();
          r = await call();
        } catch (e) { if (e && e.code) throw e; }
      }
      return r;
    },
    // Quanto a pessoa já usou hoje e qual é o plano dela.
    async quota() {
      await Cloud.ensureSession();
      return rest("rpc/my_quota", { method: "POST", body: {} });
    },
    // Registra que um lugar foi mostrado (conta no limite do dia). Devolve {ok, reason, tier, used, cap}.
    async spend(kind, place) {
      await Cloud.ensureSession();
      return rest("rpc/spend", { method: "POST", body: { p_kind: kind, p_place: place || null } });
    },
    // Os planos e preços (públicos).
    async plans() {
      const a = await raw("/rest/v1/rpc/get_plans", { method: "POST", body: {}, headers: { Authorization: "Bearer " + (CFG && CFG.key) } });
      if (!a.ok || !Array.isArray(a.j)) throw fail("Não consegui carregar os planos agora.", { status: a.status });
      return a.j;
    },
    onChange(f) { listeners.push(f); },

    // Login com Google: o navegador vai até o Google e volta para este endereço.
    googleLogin() {
      if (!Cloud.enabled()) return;
      const back = location.origin + "/";
      location.assign(CFG.url + "/auth/v1/authorize?provider=google&redirect_to=" + encodeURIComponent(back));
    },
    // Envia um e-mail com um link e um código de 6 dígitos (se o modelo do e-mail tiver {{ .Token }}).
    async sendCode(email) {
      const e = String(email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) || e.length > 200) throw fail("Esse e-mail não parece válido. Confira e tente de novo.");
      const back = encodeURIComponent(location.origin + "/");
      const a = await raw("/auth/v1/otp?redirect_to=" + back, { method: "POST", body: { email: e, create_user: true } });
      if (!a.ok) throw fail(friendly(a.status, a.j, "Não consegui enviar o e-mail agora. Tente de novo em instantes."), { status: a.status });
      return true;
    },
    async verifyCode(email, code) {
      const c = String(code || "").replace(/\D/g, "");
      if (c.length < 6 || c.length > 10) throw fail("Digite o código numérico que chegou no e-mail.");
      const a = await raw("/auth/v1/verify", { method: "POST", body: { type: "email", email: String(email).trim().toLowerCase(), token: c } });
      if (!a.ok || !a.j || !a.j.access_token) throw fail(friendly(a.status, a.j, "Não consegui confirmar o código."), { status: a.status });
      saveSession(a.j);
      emit();
      return SESSION;
    },
    async signOut() {
      try {
        const tk = SESSION && SESSION.access_token;
        if (tk) await raw("/auth/v1/logout?scope=local", { method: "POST", headers: { Authorization: "Bearer " + tk } });
      } catch (e) {}
      SESSION = null; store.set(null); emit();
    },

    // ---- lista pessoal
    async pull() {
      const rows = await rest("entries?select=place_id,status,rating,note,trip,updated_at&order=updated_at.desc&limit=2000");
      return rows || [];
    },
    async push(items) {
      if (!items.length) return;
      const u = SESSION.user.id;
      for (let i = 0; i < items.length; i += 200) {
        const part = items.slice(i, i + 200).map((x) => ({
          user_id: u, place_id: x.id, status: x.status === "been" ? "been" : "want",
          rating: x.rating == null ? null : Math.max(0, Math.min(5, Math.round(x.rating * 2) / 2)),
          note: x.note ? String(x.note).slice(0, 500) : null,
          trip: /^[a-z0-9]{4,24}$/.test(x.trip || "") ? x.trip : null,
        }));
        await rest("entries?on_conflict=user_id,place_id", { method: "POST", body: part, headers: { Prefer: "resolution=merge-duplicates,return=minimal" } });
      }
    },
    async remove(ids) {
      for (let i = 0; i < ids.length; i += 50) {
        const part = ids.slice(i, i + 50).filter((x) => /^[A-Za-z0-9_-]{5,300}$/.test(x));
        if (part.length) await rest("entries?place_id=in.(" + part.join(",") + ")", { method: "DELETE", headers: { Prefer: "return=minimal" } });
      }
    },
    // Apaga a conta inteira (lista, perfil, link e login) pela função do banco, e encerra a sessão.
    async deleteAccount() {
      await rest("rpc/delete_my_account", { method: "POST", body: {} });
      try { localStorage.removeItem("ph-acct"); } catch (e) {}
      SESSION = null; store.set(null); emit();
    },

    // ---- compartilhamento
    async getProfile() {
      const rows = await rest("profiles?select=display_name,share_token,shared_at&limit=1");
      return (rows && rows[0]) || null;
    },
    // Viagens (modo viagem): nome, endereço digitado e raio. Ficam no perfil da pessoa.
    async getTrips() {
      const rows = await rest("profiles?select=trips,trips_t&limit=1");
      return (rows && rows[0]) || null;
    },
    async saveTrips(trips, t) {
      const clean = (trips || []).slice(0, 10).map((x) => ({ id: String(x.id), name: String(x.name || "").slice(0, 40), addr: String(x.addr || "").slice(0, 120), km: Math.max(1, Math.min(50, Math.round(Number(x.km) || 5))) }));
      await rest("profiles?on_conflict=user_id", { method: "POST", body: [{ user_id: SESSION.user.id, trips: clean, trips_t: Math.round(t) || Date.now() }], headers: { Prefer: "resolution=merge-duplicates,return=minimal" } });
    },
    async saveProfile(p) {
      const body = [{ user_id: SESSION.user.id, display_name: p.name ? String(p.name).trim().slice(0, 40) || null : null, share_token: p.token || null, shared_at: p.token ? new Date().toISOString() : null }];
      await rest("profiles?on_conflict=user_id", { method: "POST", body, headers: { Prefer: "resolution=merge-duplicates,return=minimal" } });
    },
    // Lê a lista de um amigo pelo código do link. Não precisa de login.
    async getShared(tokenStr) {
      if (!/^[a-z0-9]{12,32}$/.test(tokenStr || "")) return null;
      const a = await raw("/rest/v1/rpc/get_shared_list", { method: "POST", body: { p_token: tokenStr }, headers: { Authorization: "Bearer " + CFG.key } });
      if (!a.ok) {
        if (/get_shared_list|PGRST202|42883/.test(JSON.stringify(a.j || {}))) throw fail("O banco ainda não tem a função de compartilhamento. Rode o supabase/setup.sql.", { code: "rest" });
        throw fail("Não consegui abrir a lista agora. Tente de novo em instantes.", { code: "rest", status: a.status });
      }
      return a.j; // nulo quando o link não existe mais
    },
    newToken() {
      const abc = "abcdefghijklmnopqrstuvwxyz0123456789", b = new Uint8Array(24);
      crypto.getRandomValues(b);
      let t = ""; for (let i = 0; i < 24; i++) t += abc[b[i] % 36];
      return t;
    },
  };
  window.Cloud = Cloud;
})();
