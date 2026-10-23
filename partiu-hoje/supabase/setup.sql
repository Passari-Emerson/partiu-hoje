-- Partiu Hoje? - estrutura do banco de dados (Supabase / Postgres)
--
-- Como usar: no Supabase, abra "SQL Editor", clique em "New query", cole este arquivo inteiro e clique em "Run".
-- Pode rodar de novo quando atualizar o app: ele não apaga dados.
--
-- O que ele cria:
--   entries   a lista de cada pessoa (quero ir / já fui, nota, anotação). Só guarda o ID do lugar no Google,
--             nunca nome, foto ou nota do Google (os termos do Google Maps não permitem guardar esse conteúdo).
--   profiles  o nome que aparece para quem recebe o link e o código do link de compartilhamento.
-- Privacidade: cada pessoa só enxerga e altera as próprias linhas (Row Level Security).
-- Quem recebe um link só consegue ler a lista pela função get_shared_list, que devolve apenas
-- nome, ID do lugar, status e nota. Anotações e e-mail nunca saem daqui.

-- ---------------------------------------------------------------- tabelas

create table if not exists public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 40),
  share_token  text unique check (share_token is null or share_token ~ '^[a-z0-9]{12,32}$'),
  shared_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.entries (
  user_id    uuid not null references auth.users (id) on delete cascade,
  place_id   text not null check (char_length(place_id) between 5 and 300 and place_id ~ '^[A-Za-z0-9_-]+$'),
  status     text not null default 'want' check (status in ('want', 'been')),
  rating     numeric(2, 1) check (rating is null or (rating >= 0 and rating <= 5)),
  note       text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create index if not exists entries_user_updated_idx on public.entries (user_id, updated_at desc);

-- ---------------------------------------------------------------- data de atualização automática

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists entries_touch on public.entries;
create trigger entries_touch before update on public.entries
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- privacidade (Row Level Security)

alter table public.profiles enable row level security;
alter table public.entries  enable row level security;

-- Sem login (anon) não há acesso nenhum às tabelas.
revoke all on public.profiles from anon;
revoke all on public.entries  from anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.entries  to authenticated;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy profiles_delete_own on public.profiles for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists entries_select_own on public.entries;
drop policy if exists entries_insert_own on public.entries;
drop policy if exists entries_update_own on public.entries;
drop policy if exists entries_delete_own on public.entries;
create policy entries_select_own on public.entries for select to authenticated
  using (user_id = (select auth.uid()));
create policy entries_insert_own on public.entries for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy entries_update_own on public.entries for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy entries_delete_own on public.entries for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- ler uma lista compartilhada

-- Qualquer pessoa com o código do link (inclusive sem login) pode chamar esta função.
-- Ela só devolve: nome, data, e para cada lugar o ID, o status e a nota. Nada mais.
create or replace function public.get_shared_list(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_name text;
  v_at   timestamptz;
begin
  if p_token is null or p_token !~ '^[a-z0-9]{12,32}$' then
    return null;
  end if;

  select p.user_id, p.display_name, p.shared_at
    into v_user, v_name, v_at
    from public.profiles p
   where p.share_token = p_token;

  if v_user is null then
    return null;
  end if;

  return jsonb_build_object(
    'name', coalesce(v_name, 'Um amigo'),
    'shared_at', v_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('place_id', e.place_id, 'status', e.status, 'rating', e.rating)
                       order by e.updated_at desc)
        from (select place_id, status, rating, updated_at
                from public.entries
               where user_id = v_user
               order by updated_at desc
               limit 300) e
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_shared_list(text) from public;
grant execute on function public.get_shared_list(text) to anon, authenticated;

-- ---------------------------------------------------------------- excluir a própria conta

-- Permite que a pessoa logada apague a própria conta. A lista e o perfil somem junto (cascata).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;

-- ================================================================ PLANOS E LIMITES DE USO
-- Cada busca, foto e consulta ao Google custa dinheiro. Estes limites são contados AQUI, no banco,
-- e conferidos pelo servidor do app antes de falar com o Google. Não dá para burlar limpando o celular.
-- Visitante (sem conta): 10 lugares no total. Grátis (com conta): 20 por dia. Premium: 60. Premium Gold: 120.
-- O dia vira à meia-noite no horário de Brasília.

-- ---------------------------------------------------------------- tabela de planos (você pode editar os números)
-- Para mudar um limite ou preço, abra "Table Editor > plans" no Supabase e edite a linha. Rodar este arquivo de novo NÃO apaga a sua edição.
--   cards     lugares mostrados por dia (visitante: no total)
--   lookups   lugares da lista (ou da lista de um amigo) carregados por dia
--   searches  buscas ao Google por dia
--   photos    fotos que a pessoa pode ver em cada card
create table if not exists public.plans (
  tier        text primary key check (tier in ('anon', 'free', 'premium', 'gold')),
  label       text not null,
  cards       int not null check (cards >= 0),
  lookups     int not null check (lookups >= 0),
  searches    int not null check (searches >= 0),
  photos      int not null check (photos >= 1),
  price_week  numeric(6, 2),
  price_month numeric(6, 2)
);
insert into public.plans (tier, label, cards, lookups, searches, photos, price_week, price_month) values
  ('anon',    'Visitante',     10,  20,  12, 2, null, null),
  ('free',    'Grátis',        20,  15,  24, 2, null, null),
  ('premium', 'Premium',       60,  30,  60, 3, 5.00, 15.00),
  ('gold',    'Premium Gold', 120,  60, 120, 5, 10.00, 30.00)
on conflict (tier) do nothing;

-- ---------------------------------------------------------------- quem pagou
create table if not exists public.subscriptions (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  tier       text not null check (tier in ('premium', 'gold')),
  expires_at timestamptz not null,
  source     text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- consumo
create table if not exists public.usage_daily (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null,
  searches int not null default 0,
  primary key (user_id, day)
);
create table if not exists public.views (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null,
  place_id text not null check (char_length(place_id) between 5 and 300 and place_id ~ '^[A-Za-z0-9_-]+$'),
  kind     text not null check (kind in ('card', 'lookup')),
  photos   text[] not null default '{}',
  primary key (user_id, day, place_id, kind)
);

alter table public.plans         enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_daily   enable row level security;
alter table public.views         enable row level security;
revoke all on public.plans, public.subscriptions, public.usage_daily, public.views from anon, authenticated;
-- A pessoa só pode ler a própria assinatura. Ninguém escreve por aqui: só pelo painel do Supabase ou por um servidor de pagamento.
grant select on public.subscriptions to authenticated;
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- funções internas
create or replace function public._today()
returns date language sql stable
as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

-- Qual plano vale agora para esta pessoa. Login anônimo (visitante) é identificado pelo próprio token.
create or replace function public._tier(p_uid uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare v text;
begin
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    return 'anon';
  end if;
  select s.tier into v from public.subscriptions s where s.user_id = p_uid and s.expires_at > now();
  return coalesce(v, 'free');
end;
$$;

-- ---------------------------------------------------------------- gastar uma unidade do limite
-- p_kind: 'search' (uma busca ao Google), 'card' (um lugar mostrado no deslizar), 'lookup' (um lugar da lista ou
-- da lista de um amigo) ou 'photo' (uma foto; p_ctx 'card' ou 'thumb' e p_photo com o código da foto).
-- Ver o mesmo lugar de novo no mesmo dia não gasta de novo. Devolve {ok, reason, tier, used, cap}.
create or replace function public.spend(p_kind text, p_place text default null, p_photo text default null, p_ctx text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_day    date := public._today();
  v_tier   text;
  pl       public.plans%rowtype;
  v_kind   text;
  v_cap    int;
  v_used   int;
  v_seen   boolean;
  v_photos text[];
  v_pcap   int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'no_session');
  end if;
  if p_kind is null or p_kind not in ('search', 'card', 'lookup', 'photo') then
    return jsonb_build_object('ok', false, 'reason', 'bad_request');
  end if;
  if p_kind <> 'search' and (p_place is null or char_length(p_place) not between 5 and 300 or p_place !~ '^[A-Za-z0-9_-]+$') then
    return jsonb_build_object('ok', false, 'reason', 'bad_request');
  end if;
  if p_kind = 'photo' and (p_photo is null or char_length(p_photo) not between 5 and 700 or p_photo !~ '^[A-Za-z0-9_-]+$' or p_ctx is null or p_ctx not in ('card', 'thumb')) then
    return jsonb_build_object('ok', false, 'reason', 'bad_request');
  end if;

  -- Uma chamada por vez para a mesma pessoa, para duas abas não passarem do limite juntas.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  v_tier := public._tier(v_uid);
  select * into pl from public.plans where tier = v_tier;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_plan', 'tier', v_tier);
  end if;

  delete from public.views       where user_id = v_uid and day < v_day - 30;
  delete from public.usage_daily where user_id = v_uid and day < v_day - 30;

  if p_kind = 'search' then
    if pl.searches > 0 then
      insert into public.usage_daily as u (user_id, day, searches) values (v_uid, v_day, 1)
        on conflict (user_id, day) do update set searches = u.searches + 1 where u.searches < pl.searches
        returning u.searches into v_used;
    end if;
    if v_used is null then
      select coalesce(max(searches), 0) into v_used from public.usage_daily where user_id = v_uid and day = v_day;
      return jsonb_build_object('ok', false, 'reason', 'searches', 'tier', v_tier, 'used', v_used, 'cap', pl.searches);
    end if;
    return jsonb_build_object('ok', true, 'tier', v_tier, 'used', v_used, 'cap', pl.searches);
  end if;

  v_kind := case when p_kind = 'photo' and p_ctx = 'thumb' then 'lookup' when p_kind = 'photo' then 'card' else p_kind end;
  v_cap  := case when v_kind = 'card' then pl.cards else pl.lookups end;

  if v_kind = 'card' and v_tier = 'anon' then
    select count(*) into v_used from public.views where user_id = v_uid and kind = 'card';
  else
    select count(*) into v_used from public.views where user_id = v_uid and day = v_day and kind = v_kind;
  end if;
  select exists (select 1 from public.views where user_id = v_uid and day = v_day and place_id = p_place and kind = v_kind) into v_seen;

  if not v_seen then
    if v_used >= v_cap then
      return jsonb_build_object('ok', false, 'reason', case when v_kind = 'card' then 'cards' else 'lookups' end,
                                'tier', v_tier, 'used', v_used, 'cap', v_cap);
    end if;
    insert into public.views (user_id, day, place_id, kind) values (v_uid, v_day, p_place, v_kind);
    v_used := v_used + 1;
  end if;

  if p_kind = 'photo' then
    select photos into v_photos from public.views where user_id = v_uid and day = v_day and place_id = p_place and kind = v_kind;
    v_pcap := case when v_kind = 'lookup' then 1 else pl.photos end;
    if not (p_photo = any (coalesce(v_photos, '{}'))) then
      if coalesce(cardinality(v_photos), 0) >= v_pcap then
        return jsonb_build_object('ok', false, 'reason', 'photos', 'tier', v_tier, 'used', v_used, 'cap', v_cap, 'photos', v_pcap);
      end if;
      update public.views set photos = array_append(photos, p_photo)
       where user_id = v_uid and day = v_day and place_id = p_place and kind = v_kind;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'tier', v_tier, 'used', v_used, 'cap', v_cap);
end;
$$;

-- Como está o uso da pessoa agora (para mostrar o contador na tela).
create or replace function public.my_quota()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_day  date := public._today();
  v_tier text;
  pl     public.plans%rowtype;
  v_exp  timestamptz;
  c int; l int; s int;
begin
  if v_uid is null then return null; end if;
  v_tier := public._tier(v_uid);
  select * into pl from public.plans where tier = v_tier;
  if v_tier = 'anon' then
    select count(*) into c from public.views where user_id = v_uid and kind = 'card';
  else
    select count(*) into c from public.views where user_id = v_uid and day = v_day and kind = 'card';
  end if;
  select count(*) into l from public.views where user_id = v_uid and day = v_day and kind = 'lookup';
  select coalesce(max(searches), 0) into s from public.usage_daily where user_id = v_uid and day = v_day;
  select expires_at into v_exp from public.subscriptions where user_id = v_uid and expires_at > now();
  return jsonb_build_object(
    'tier', v_tier, 'label', pl.label, 'day', v_day, 'anon', v_tier = 'anon', 'expires_at', v_exp, 'photos', pl.photos,
    'cards',    jsonb_build_object('used', c, 'cap', pl.cards),
    'lookups',  jsonb_build_object('used', l, 'cap', pl.lookups),
    'searches', jsonb_build_object('used', s, 'cap', pl.searches));
end;
$$;

-- Os planos e preços para a tela de assinatura (qualquer pessoa pode ver).
create or replace function public.get_plans()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('tier', tier, 'label', label, 'cards', cards, 'lookups', lookups,
           'searches', searches, 'photos', photos, 'price_week', price_week, 'price_month', price_month)
           order by case tier when 'anon' then 0 when 'free' then 1 when 'premium' then 2 else 3 end), '[]'::jsonb)
  from public.plans
$$;

-- ---------------------------------------------------------------- dar ou tirar um plano (só você, pelo SQL Editor)
-- Exemplos:   select public.admin_grant_plan('amigo@email.com', 'premium', 7);    -- 7 dias de Premium
--             select public.admin_grant_plan('amigo@email.com', 'gold', 30);      -- 30 dias de Gold
--             select public.admin_grant_plan('amigo@email.com', 'free', 0);       -- volta para o grátis
-- Se a pessoa já tem o plano, os dias são somados ao que resta.
create or replace function public.admin_grant_plan(p_email text, p_tier text, p_days int)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_exp timestamptz;
begin
  if p_tier not in ('free', 'premium', 'gold') then
    raise exception 'plano deve ser free, premium ou gold';
  end if;
  select id into v_uid from auth.users where lower(email) = lower(p_email) limit 1;
  if v_uid is null then
    raise exception 'não achei nenhuma conta com o e-mail %', p_email;
  end if;
  if p_tier = 'free' then
    delete from public.subscriptions where user_id = v_uid;
    return null;
  end if;
  if p_days is null or p_days < 1 or p_days > 3660 then
    raise exception 'dias deve ficar entre 1 e 3660';
  end if;
  insert into public.subscriptions as s (user_id, tier, expires_at, source)
    values (v_uid, p_tier, now() + make_interval(days => p_days), 'manual')
    on conflict (user_id) do update
      set tier = excluded.tier,
          expires_at = greatest(s.expires_at, now()) + make_interval(days => p_days),
          updated_at = now()
    returning expires_at into v_exp;
  return v_exp;
end;
$$;

-- ---------------------------------------------------------------- quem pode chamar o quê
revoke all on function public._today()                          from public, anon, authenticated;
revoke all on function public._tier(uuid)                       from public, anon, authenticated;
revoke all on function public.spend(text, text, text, text)     from public, anon;
revoke all on function public.my_quota()                        from public, anon;
revoke all on function public.get_plans()                       from public;
revoke all on function public.admin_grant_plan(text, text, int) from public, anon, authenticated;
grant execute on function public.spend(text, text, text, text)  to authenticated;
grant execute on function public.my_quota()                     to authenticated;
grant execute on function public.get_plans()                    to anon, authenticated;
