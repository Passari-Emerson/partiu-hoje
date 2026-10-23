/* ---------- Categorias: nome na tela, grupo, ícone, o que pesquisar no Google ---------- */
const CATS=[
["italiana","Comer","plate",["restaurante italiano","cantina massas"]],
["brasileira","Comer","plate",["restaurante comida brasileira","restaurante comida caseira"]],
["churrasco","Comer","steak",["churrascaria"]],
["pizza","Comer","pizza",["pizzaria"]],
["japonesa","Comer","bowl",["restaurante japonês","sushi"]],
["chinesa","Comer","bowl",["restaurante chinês"]],
["oriental","Comer","bowl",["restaurante oriental asiático"]],
["tailandesa","Comer","bowl",["restaurante tailandês"]],
["coreana","Comer","bowl",["restaurante coreano"]],
["árabe","Comer","steak",["restaurante árabe"]],
["mexicana","Comer","taco",["restaurante mexicano"]],
["frutos do mar","Comer","fish",["restaurante frutos do mar peixes"]],
["hambúrguer","Comer","burger",["hamburgueria"]],
["vegana","Comer","leaf",["restaurante vegano vegetariano"]],
["contemporânea","Comer","plate",["restaurante contemporâneo"]],
["cafés","Beber e café","coffee",["cafeteria café"]],
["padarias","Beber e café","bread",["padaria confeitaria"]],
["bares","Beber e café","beer",["bar","boteco"]],
["cerveja preta","Beber e café","beer",["cervejaria cerveja preta stout","bar cerveja artesanal stout porter"]],
["cerveja artesanal","Beber e café","beer",["cervejaria artesanal","bar de cerveja artesanal"]],
["drinks","Beber e café","cocktail",["bar de drinks coquetelaria"]],
["sorvete e sobremesas","Beber e café","icecream",["sorveteria gelateria","confeitaria doces sobremesas"]],
["música ao vivo","Passear","music",["bar com música ao vivo"]],
["natureza","Passear","mountain",["parques trilhas mirantes"]],
["feiras","Passear","market",["feira gastronômica feira de rua"]],
["oficinas","Passear","hat",["oficina workshop culinária"]]];
const CAT={};CATS.forEach(c=>{CAT[c[0]]={id:c[0],g:c[1],ic:c[2],q:c[3]}});
const GROUPS=["Comer","Beber e café","Passear"];
const GCLASS={"Comer":"comer","Beber e café":"beber","Passear":"passear"};
const PASSEIO=new Set(["natureza","feiras","oficinas"]);
const typeOf=l=>PASSEIO.has(l)?"passeio":"comer";
const ALIAS={"oriental":["japonesa","chinesa","coreana","tailandesa"],"bares":["drinks","cerveja artesanal"],"cerveja artesanal":["cerveja preta"]};
const expandLikes=a=>{const s=new Set(a);a.forEach(x=>(ALIAS[x]||[]).forEach(y=>s.add(y)));return s};
/* Só valores que o Google informa de verdade. "Sustentável", "local" e "romântico" não existem nos dados dele. */
const VALUES=["pet friendly","ao ar livre","família","acessível","para grupos","música ao vivo","aceita reserva"];
const DIETS=["vegetariano","vegano","sem glúten","sem lactose"];
const FOOD_SET=new Set(["food","cafe","bar","pub","bakery","coffee_shop","ice_cream_shop","dessert_shop","dessert_restaurant","confectionery","brewery","wine_bar","sandwich_shop","meal_takeaway","meal_delivery","restaurant"]);
const isFood=gt=>{for(const t of gt){if(FOOD_SET.has(t)||t.endsWith("_restaurant"))return true}return false};
const DEFAULT_LIKES=["brasileira","pizza","bares","cafés","japonesa","italiana","hambúrguer","churrasco"];
/* Tipos que o Google atribui a cada lugar. Se o tipo do lugar bate com a categoria, o app trata como confirmado. */
const TYPE_OK={
"italiana":["italian_restaurant"],"brasileira":["brazilian_restaurant"],"churrasco":["steak_house","barbecue_restaurant"],"pizza":["pizza_restaurant"],
"japonesa":["japanese_restaurant","sushi_restaurant"],"chinesa":["chinese_restaurant"],
"oriental":["asian_restaurant","chinese_restaurant","japanese_restaurant","korean_restaurant","thai_restaurant","sushi_restaurant"],
"tailandesa":["thai_restaurant"],"coreana":["korean_restaurant"],"árabe":["middle_eastern_restaurant","lebanese_restaurant"],
"mexicana":["mexican_restaurant"],"frutos do mar":["seafood_restaurant"],"hambúrguer":["hamburger_restaurant"],
"vegana":["vegan_restaurant","vegetarian_restaurant"],
"cafés":["cafe","coffee_shop"],"padarias":["bakery"],"bares":["bar","pub","wine_bar"],
"cerveja preta":["brewery","pub","bar"],"cerveja artesanal":["brewery"],"drinks":["bar"],
"sorvete e sobremesas":["ice_cream_shop","dessert_shop","dessert_restaurant"],
"natureza":["park","hiking_area","tourist_attraction"],"feiras":["farmers_market","market"]};
const MAX_JOBS=10,MAX_PAGES=3,MAX_MORE_CALLS=12,START_JOBS=4;
const PRICE={PRICE_LEVEL_FREE:1,PRICE_LEVEL_INEXPENSIVE:1,PRICE_LEVEL_MODERATE:2,PRICE_LEVEL_EXPENSIVE:3,PRICE_LEVEL_VERY_EXPENSIVE:4};

/* ---------- Estado ---------- */
const KEY="partiu-hoje-v2";
const blank=()=>({onboarded:false,prefs:{likes:[],values:[],diet:[],maxPrice:4,maxDist:10},liked:[],passed:[],w:{},hist:[],tab:"descobrir",manual:null,
  entries:{},synced:{},dirty:{},del:{},cloudUser:null,bannerOff:false});
let S=blank();
try{const r=localStorage.getItem(KEY);if(r){S=Object.assign(blank(),JSON.parse(r));S.prefs=Object.assign(blank().prefs,S.prefs)}}catch(e){}
/* Migração da versão anterior: curtidas viram itens "quero ir" da lista. Nome e foto não ficam mais guardados no aparelho (só o ID). */
(function(){
  delete S.saved;
  S.liked=S.liked.filter(id=>/^[A-Za-z0-9_-]{5,300}$/.test(id));
  S.liked.forEach((id,i)=>{if(!S.entries[id])S.entries[id]={status:"want",rating:null,note:"",t:Date.now()-(S.liked.length-i)*1000}});
  Object.keys(S.entries).forEach(id=>{if(!S.liked.includes(id))S.liked.push(id)});
})();
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>Number(n).toFixed(1).replace(".",",");
const km=d=>d<10?d.toFixed(1).replace(".",",")+" km":Math.round(d)+" km";
const brl=n=>"R"+"$".repeat(n);
const hue=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))%360;return h};
const hav=(a,b,c,d)=>{const r=x=>x*Math.PI/180,dl=r(c-a),dn=r(d-b);const h=Math.sin(dl/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2;return 2*6371*Math.asin(Math.sqrt(h))};
/* ---------- Fotos: o servidor confere o limite e devolve o endereço temporário da imagem ---------- */
const PHC=new Map();
async function getPhoto(name,ctx){
  const big=name+"|L",small=name+"|S";
  if(PHC.has(big))return PHC.get(big);
  if(ctx==="thumb"&&PHC.has(small))return PHC.get(small);
  const key=ctx==="thumb"?small:big,w=ctx==="thumb"?300:900;
  const pr=(async()=>{
    const r=await Cloud.apiFetch("/api/photo?name="+encodeURIComponent(name)+"&w="+w+"&ctx="+ctx);
    let j=null;try{j=await r.json()}catch(e){}
    if(r.status===402){const e=new Error("limit");e.limit=j;throw e}
    if(!r.ok||!j||!j.uri){const e=new Error("photo");e.status=r.status;throw e}
    return j.uri
  })();
  PHC.set(key,pr);pr.catch(()=>PHC.delete(key));
  return pr
}
function hydratePhotos(){
  document.querySelectorAll("img[data-ph]:not([data-done])").forEach(async img=>{
    img.dataset.done="1";
    try{const uri=await getPhoto(img.dataset.ph,img.dataset.ctx||"thumb");if(img.isConnected){img.src=uri;img.style.display=""}}
    catch(e){img.style.display="none";if(e&&e.limit)onLimit(e.limit);else if(e&&e.code==="login_required")setPaywall("login")}
  })
}
const icon=(id,cls)=>`<svg class="ic${cls?" "+cls:""}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const catIcon=l=>(CAT[l]&&CAT[l].ic)||"plate";

let P=[],PM=new Map(),JOBS=[],POS=null,FRONT=null;
/* Limite de uso: Q = quanto a pessoa já usou hoje e qual é o plano (vem do banco). PAYWALL = tela de "chegou ao limite". */
let Q=null,PAYWALL=null,PLANS=null,PL=null;const VIEWED=new Set(),LIM=new Set();let REG=null;
let STATUS="idle",ERR=null,LOADING=false,loadingMore=false,MORE_CALLS=0,DIRTY=false,LOADED_KM=0,LOC_OPEN=false,GPS_MSG="",FILTER="";
const byId=id=>PM.get(id);

/* ---------- Pontuação (match com a sua preferência) ---------- */
function score(p){
  const pr=S.prefs;let s=50;const why=[];
  const want=expandLikes(pr.likes);
  const lk=p.likes.filter(x=>want.has(x));
  const confirmed=p.ver.filter(x=>want.has(x));
  if(confirmed.length){s+=22+Math.min(6,(confirmed.length-1)*3);why.push("O Google classifica como "+p.kind.toLowerCase()+", que combina com seu gosto por "+confirmed[0])}
  else if(lk.some(x=>!TYPE_OK[x])){s+=18;why.push("Combina com seu gosto por "+lk.find(x=>!TYPE_OK[x]))}
  else if(lk.length){s+=10;why.push("Apareceu na busca por "+lk[0])}
  const vm=p.tags.filter(x=>pr.values.includes(x));
  if(vm.length){s+=Math.min(18,vm.length*7);why.push("Valores em comum: "+vm.slice(0,3).join(", "))}
  if(p.price){if(p.price<=pr.maxPrice){s+=6;if(pr.maxPrice<4)why.push("Dentro do seu orçamento ("+brl(p.price)+")")}else s-=15}
  s+=(1-Math.min(1,p.dist/Math.max(1,pr.maxDist)))*8;
  if(p.dist<=3)why.push("Pertinho: "+km(p.dist));
  s+=(p.rating-4)*12;if(p.n<30)s-=4;if(p.n>=500)s+=3;
  if(pr.diet.length){if(p.veg&&pr.diet.includes("vegetariano"))s+=8;else if(!p.veg)s-=4}
  let l=0;p.likes.concat(p.tags).forEach(t=>{l+=S.w[t]||0});
  if(Math.abs(l)>.5){s+=Math.max(-15,Math.min(15,l));if(l>0)why.push("Parecido com o que você curtiu")}
  return{s:Math.max(5,Math.min(99,Math.round(s))),why:why.slice(0,3)}
}
function queue(){
  const done=new Set(S.liked.concat(S.passed));
  const f=FILTER?expandLikes([FILTER]):null;
  const out=P.filter(p=>!done.has(p.id)&&p.dist<=S.prefs.maxDist&&(!f||p.likes.some(x=>f.has(x))))
    .map(p=>({p,...score(p)})).sort((a,b)=>b.s-a.s);
  // O card que já está na tela fica na frente, mesmo que novos resultados do Google reordenem a fila.
  // Assim ele não é trocado antes de a pessoa decidir e cada lugar conta uma vez só no limite do dia.
  if(FRONT){const i=out.findIndex(o=>o.p.id===FRONT);if(i>0)out.unshift(out.splice(i,1)[0])}
  FRONT=out.length?out[0].p.id:null;
  return out
}

/* ---------- Localização ---------- */
const askGPS=()=>new Promise(res=>{
  if(!navigator.geolocation){GPS_MSG="Este navegador não tem acesso à localização.";return res(null)}
  navigator.geolocation.getCurrentPosition(
    p=>res({lat:p.coords.latitude,lng:p.coords.longitude,label:"Perto de você"}),
    e=>{GPS_MSG=e&&e.code===1?"A permissão de localização foi negada. Permita no navegador ou digite uma cidade.":"Não consegui pegar a sua localização agora. Digite uma cidade.";res(null)},
    {timeout:10000,maximumAge:300000});
});
async function getLocation(){
  if(S.manual){POS=S.manual;return POS}
  const g=await askGPS();
  if(g){POS=g;return g}
  return null
}

/* ---------- Busca de lugares reais (Google Places, via /api) ---------- */
async function api(path){
  let r;
  try{r=await Cloud.apiFetch(path)}catch(e){
    if(e&&e.code==="login_required"){setPaywall("login");throw{message:e.message,handled:true}}
    throw{message:(e&&e.code&&e.code!=="network"&&e.message)||"Sem conexão com o servidor do app. Confira a internet e tente de novo."}}
  let j=null;try{j=await r.json()}catch(e){}
  if(r.status===402&&j&&j.error==="limit"){onLimit(j);throw{message:j.message,limit:j,handled:true}}
  if(!r.ok||!j){throw{message:(j&&j.message)||"O servidor do app não respondeu como esperado (código "+r.status+"). Abra o diagnóstico para ver o que falta."}}
  return j
}
function mapPlace(r,like){
  if(!r||!r.id||r.rating==null||!POS)return null;
  if(r.businessStatus&&r.businessStatus!=="OPERATIONAL")return null;
  const loc=r.location||{};if(loc.latitude==null)return null;
  const tags=[];
  if(r.allowsDogs)tags.push("pet friendly");
  if(r.outdoorSeating)tags.push("ao ar livre");
  if(r.goodForChildren||r.menuForChildren)tags.push("família");
  if(r.accessibilityOptions&&r.accessibilityOptions.wheelchairAccessibleEntrance)tags.push("acessível");
  if(r.goodForGroups)tags.push("para grupos");
  if(r.liveMusic)tags.push("música ao vivo");
  if(r.reservable)tags.push("aceita reserva");
  const gt=new Set([r.primaryType].concat(r.types||[]).filter(Boolean));
  if(typeOf(like)==="comer"&&!isFood(gt))return null;
  const ver=Object.keys(TYPE_OK).filter(c=>TYPE_OK[c].some(t=>gt.has(t)));
  const likes=[like];const wantSet=expandLikes(S.prefs.likes);
  ver.forEach(c=>{if(wantSet.has(c)&&!likes.includes(c))likes.push(c)});
  const photos=(r.photos||[]).slice(0,5).map(x=>({n:x.name,a:(x.authorAttributions&&x.authorAttributions[0]&&x.authorAttributions[0].displayName)||""}));
  const oh=r.currentOpeningHours;
  return{id:String(r.id),type:typeOf(like),name:(r.displayName&&r.displayName.text)||"Sem nome",
    kind:(r.primaryTypeDisplayName&&r.primaryTypeDisplayName.text)||"Local",likes,ver,
    price:PRICE[r.priceLevel]||null,dist:hav(POS.lat,POS.lng,loc.latitude,loc.longitude),lat:loc.latitude,lng:loc.longitude,
    tags,veg:!!r.servesVegetarianFood,rating:r.rating,n:r.userRatingCount||0,
    addr:r.shortFormattedAddress||r.formattedAddress||"",sum:(r.editorialSummary&&r.editorialSummary.text)||"",
    photos,uri:r.googleMapsUri&&/^https:\/\//.test(r.googleMapsUri)?r.googleMapsUri:null,
    open:oh&&typeof oh.openNow==="boolean"?oh.openNow:null,h:hue(r.id),_i:0}
}
function buildJobs(){
  const sel=S.prefs.likes.filter(l=>CAT[l]);
  const likes=sel.length?sel:DEFAULT_LIKES;
  const per=likes.length<=3?2:1;
  const jobs=[];
  likes.forEach(l=>CAT[l].q.slice(0,per).forEach(q=>jobs.push({q,like:l,token:null,done:false,pages:0,started:false})));
  return jobs.slice(0,MAX_JOBS)
}
async function fetchPage(j){
  const radius=Math.round(Math.min(50,Math.max(1,S.prefs.maxDist))*1000);
  const u="/api/places?q="+encodeURIComponent(j.q)+"&lat="+POS.lat+"&lng="+POS.lng+"&radius="+radius+(j.token?"&pageToken="+encodeURIComponent(j.token):"");
  j.started=true;
  const d=await api(u);
  j.pages++;j.token=d.nextPageToken||null;if(!j.token||j.pages>=MAX_PAGES)j.done=true;
  return(d.places||[]).map(x=>mapPlace(x,j.like)).filter(Boolean)
}
function merge(list){
  list.forEach(p=>{const e=PM.get(p.id);
    if(e){p.likes.forEach(l=>{if(!e.likes.includes(l))e.likes.push(l)})}
    else{PM.set(p.id,p);P.push(p)}})
}
async function loadAll(){
  if(LOADING)return;
  LOADING=true;STATUS="loading";ERR=null;LOC_OPEN=false;render();
  try{
    const loc=await getLocation();
    if(!loc){STATUS="needloc";LOADING=false;render();return}
    P=[];PM=new Map();MORE_CALLS=0;
    JOBS=buildJobs();
    // Começa com poucas categorias (cada busca ao Google custa); as outras entram quando os cards acabam.
    const rs=await Promise.allSettled(JOBS.slice(0,START_JOBS).map(fetchPage));
    const ok=rs.filter(r=>r.status==="fulfilled");
    if(!ok.length)throw rs[0].reason;
    ok.forEach(r=>merge(r.value));
    STATUS="ready";DIRTY=false;LOADED_KM=S.prefs.maxDist;
    if(!Q&&Cloud.enabled())refreshQuota().then(()=>{if(S.tab==="descobrir"&&!sheetOpen())render()})
  }catch(e){
    if(e&&e.handled){STATUS="ready"}
    else{STATUS="error";ERR=e&&e.message?e:{message:"Algo deu errado na busca."}}
  }
  LOADING=false;render()
}
async function loadMore(){
  if(loadingMore||STATUS!=="ready"||MORE_CALLS>=MAX_MORE_CALLS||PAYWALL)return;
  const f=FILTER?expandLikes([FILTER]):null,match=j=>!f||f.has(j.like);
  const fresh=JOBS.filter(j=>!j.started&&!j.done&&match(j));
  const more=JOBS.filter(j=>j.started&&!j.done&&j.token&&match(j));
  const todo=fresh.concat(more).slice(0,3);
  if(!todo.length)return;
  loadingMore=true;MORE_CALLS+=todo.length;
  const rs=await Promise.allSettled(todo.map(fetchPage));
  rs.forEach((r,i)=>{if(r.status==="fulfilled")merge(r.value);else if(!(r.reason&&r.reason.limit)){todo[i].done=true}});
  loadingMore=false;
  if(S.tab==="descobrir"&&!document.querySelector(".card.front.drag"))render()
}
const canMore=()=>{const f=FILTER?expandLikes([FILTER]):null;return !PAYWALL&&MORE_CALLS<MAX_MORE_CALLS&&JOBS.some(j=>!j.done&&(j.token||!j.started)&&(!f||f.has(j.like)))};

/* ---------- Telas ---------- */
const topbar=()=>`<div class="top"><div class="brand">Partiu Hoje<span class="q">?</span></div>${POS?`<button class="locbtn" data-act="loc" aria-label="Mudar o local da busca">${icon("pin")}<span>${esc(POS.label)} · ${S.prefs.maxDist} km</span></button>`:""}</div>`;
function tiles(){
  return GROUPS.map(g=>`<div class="group"><span class="label">${g}</span><div class="tiles">${CATS.filter(c=>c[1]===g).map(c=>
    `<button class="tile ${GCLASS[g]}" data-grp="likes" data-v="${esc(c[0])}" aria-pressed="${S.prefs.likes.includes(c[0])}"><span class="w">${icon(c[2])}</span>${esc(c[0])}${icon("check","ck")}</button>`).join("")}</div></div>`).join("")
}
const chips=(list,sel,grp)=>`<div class="chips">${list.map(x=>`<button class="chip" data-grp="${grp}" data-v="${esc(x)}" aria-pressed="${sel.includes(x)}">${esc(x)}</button>`).join("")}</div>`;
function radiusSlider(id){
  return`<div class="group"><label class="label" for="${id}">Raio de busca: <span class="rangeval rv">${S.prefs.maxDist} km</span></label><input type="range" id="${id}" data-radius min="1" max="50" value="${S.prefs.maxDist}"><span class="credit">Dos lugares perto de você, até 50 km.</span></div>`
}
function prefsForm(){
  const pr=S.prefs;
  return`${tiles()}
  <div class="group"><span class="label">Valores</span>${chips(VALUES,pr.values,"values")}</div>
  <div class="group"><span class="label">Restrições alimentares</span>${chips(DIETS,pr.diet,"diet")}</div>
  <div class="group"><span class="label">Orçamento máximo</span><div class="chips">${[[1,"R$"],[2,"R$$"],[3,"R$$$"],[4,"Sem limite"]].map(([n,t])=>`<button class="chip" data-grp="price" data-v="${n}" aria-pressed="${pr.maxPrice===n}">${t}</button>`).join("")}</div></div>
  ${radiusSlider("dist")}`
}
function viewOnboarding(){
  return`<div class="top"><div class="brand">Partiu Hoje<span class="q">?</span></div></div>
  <div class="ob"><h1>Partiu hoje? Deslize até achar o lugar.</h1><p>Escolha o que você curte. O app procura lugares reais no Google perto de você, com fotos e avaliações, e mostra primeiro os que combinam com o seu gosto.</p></div>
  <div class="panel">${prefsForm()}<button class="btn big" data-act="start">${icon("pin")} Buscar lugares perto de mim</button>${Cloud.enabled()&&!Cloud.user()?'<button class="btn ghost" data-act="login">Já tenho conta · Entrar</button>':""}<p class="credit">Usamos sua localização só para buscar lugares próximos. Lugares, fotos e avaliações: Google Maps.</p></div>`
}
function locPanel(needs){
  return`<div class="panel"><div class="group"><h2 style="font-size:22px">${needs?"Precisamos saber onde você está":"Onde buscar"}</h2>
  <p class="sub">${needs?esc(GPS_MSG||"Não consegui pegar a sua localização."):"Use o GPS do celular ou digite uma cidade ou bairro, e escolha o raio de busca."}</p>
  ${radiusSlider("r2")}
  <button class="btn" data-act="gps">${icon("pin")} Usar minha localização</button>
  <div class="row"><input class="field" id="city" placeholder="Ex.: Porto Alegre, Ibirubá, Gramado" maxlength="60" autocomplete="off" aria-label="Cidade ou bairro"><button class="btn ghost" data-act="city">Buscar</button></div>
  <p class="sub" id="locmsg" aria-live="polite"></p></div></div>`
}
function skeleton(title,sub){
  return`<div class="skel" role="status"><div class="a">${icon("pin")}</div><div class="b"><h2>${title}</h2><p class="sub">${sub}</p></div></div>`
}
/* Só o card da frente carrega foto (cada foto custa uma chamada ao Google). O plano limita quantas fotos cada lugar mostra. */
const photoList=p=>p.photos.slice(0,Q?Q.photos:5);
const photoIdx=(p,l)=>Math.min(p._i||0,Math.max(0,l.length-1));
function heroHTML(p,depth){
  const l=photoList(p),i=photoIdx(p,l),ph=l[i];
  const segs=l.length>1?`<div class="segs">${l.map((_,k)=>`<i class="${k===i?"on":""}"></i>`).join("")}</div>`:"";
  return`<div class="art">${icon(catIcon(p.likes[0]))}</div>${ph&&depth===0?`<img class="ph" data-ph="${esc(ph.n)}" data-ctx="card" alt="" decoding="async" draggable="false" style="display:none">`:""}<div class="shade"></div>${segs}`
}
function cardHTML(o,depth){
  const p=o.p;
  const meta=[esc(p.kind),p.price?brl(p.price):"",km(p.dist)].filter(Boolean).join(" · ");
  const openPill=p.open===true?'<span class="pill open">Aberto agora</span>':p.open===false?'<span class="pill closed">Fechado agora</span>':"";
  const pl=photoList(p),ph=pl[photoIdx(p,pl)];
  const dietNote=S.prefs.diet.length&&!(p.veg&&S.prefs.diet.every(d=>d==="vegetariano"))?'<p class="note">Confirme suas restrições alimentares direto com o local.</p>':"";
  return`<article class="card${depth===0?" front":""}" data-depth="${depth}" data-id="${esc(p.id)}" style="--h:${p.h}" ${depth===0?'tabindex="0" aria-label="'+esc(p.name)+'. Deslize para a direita para curtir ou para a esquerda para passar."':'aria-hidden="true"'}>
  <div class="hero">${heroHTML(p,depth)}<div class="tags-top">${openPill}</div>
    <div class="match" aria-label="${o.s}% de match"><b>${o.s}</b><small>% match</small></div>
    <div class="ttl"><h2>${esc(p.name)}</h2><div class="meta">${meta}</div></div>
    ${depth===0?'<span class="stamp like">CURTI</span><span class="stamp nope">PASSO</span>':""}</div>
  <div class="body">
    <div class="rate"><span class="st"><i>★</i> ${fmt(p.rating)}</span><span class="n">${p.n.toLocaleString("pt-BR")} avaliações no Google</span>
      <a class="maps" href="${esc(p.uri||mapsFallback(p))}" target="_blank" rel="noopener">${icon("map")} Abrir no mapa</a></div>
    ${p.addr?`<p class="addr">${esc(p.addr)}</p>`:""}
    ${p.sum?`<p class="sum">${esc(p.sum)}</p>`:""}
    <div class="why"><b>Por que combina</b><ul>${o.why.length?o.why.map(w=>`<li>${esc(w)}</li>`).join(""):"<li>Bem avaliado perto de você</li>"}</ul></div>
    ${p.tags.length?`<div class="tags">${p.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div>`:""}
    ${dietNote}
    <p class="credit" data-credit>${ph&&ph.a?"Foto: "+esc(ph.a)+" · ":""}Dados: Google Maps</p>
  </div></article>`
}
const mapsFallback=p=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent((p.name||"")+" "+(p.addr||""))+(p.id?"&query_place_id="+encodeURIComponent(p.id):"");
function viewDeck(){
  const head=topbar();
  if(STATUS==="loading")return head+skeleton("Procurando lugares reais perto de você…","Estamos consultando o Google Maps. Leva alguns segundos.");
  if(STATUS==="needloc"||LOC_OPEN)return head+locPanel(STATUS==="needloc");
  if(STATUS==="error")return head+`<div class="notice err" role="alert"><h2>Não consegui buscar lugares reais</h2><p>${esc(ERR&&ERR.message)}</p><div class="chips"><button class="btn" data-act="retry">Tentar de novo</button><a class="btn ghost" href="/api/health" target="_blank" rel="noopener">Ver diagnóstico</a></div><p class="credit">Para não enganar você, o app nunca mostra lugares de exemplo.</p></div>`;
  if(STATUS!=="ready")return head+skeleton("Preparando…","");
  if(PAYWALL)return head+qbarHTML()+paywallHTML();
  const filters=`<div class="fscroll"><button class="fchip" data-act="filter" data-v="" aria-pressed="${FILTER===""}">Todas</button>${S.prefs.likes.map(l=>`<button class="fchip" data-act="filter" data-v="${esc(l)}" aria-pressed="${FILTER===l}">${icon(catIcon(l))}${esc(l)}</button>`).join("")}</div>`;
  const q=queue();
  let body;
  if(q.length){
    body=`<div class="deck" id="deck">${q.slice(0,3).map((o,i)=>cardHTML(o,i)).reverse().join("")}</div>
    <div class="actions"><button class="round undo" data-act="undo" aria-label="Desfazer" ${S.hist.length?"":"disabled"}>${icon("undo")}</button>
    <button class="round no" data-act="no" aria-label="Passar">${icon("x")}</button>
    <button class="round been" data-act="been" aria-label="Já fui neste lugar">${icon("check")}<small>Já fui</small></button>
    <button class="round yes" data-act="yes" aria-label="Quero ir (curtir)">${icon("heart")}</button></div>
    <p class="credit" style="text-align:center">${P.filter(p=>p.dist<=S.prefs.maxDist).length} lugares reais em ${S.prefs.maxDist} km. Toque na foto para ver mais. Dados: Google Maps.</p>`
  }else if(loadingMore||canMore()){
    body=skeleton("Buscando mais lugares…","Procurando além dos primeiros resultados.")
  }else{
    body=`<div class="notice"><h2>Acabaram as opções</h2><p>Você viu tudo que o Google trouxe para esses filtros neste raio. Aumente o raio (vai até 50 km), escolha outras categorias ou mude o local.</p><div class="chips"><button class="btn" data-tab="perfil">Ajustar categorias</button><button class="btn ghost" data-act="loc">Mudar local</button></div></div>`
  }
  return head+qbarHTML()+filters+body
}
/* ---------- Limite de uso, aviso e planos ---------- */
const planOf=t=>(PLANS||[]).find(x=>x.tier===t);
function qbarHTML(){
  if(!Cloud.enabled()||!Q)return"";
  const c=Q.cards,pct=Math.min(100,Math.round(c.used/Math.max(1,c.cap)*100)),low=c.cap-c.used<=3;
  const txt=Q.anon?c.used+" de "+c.cap+" lugares grátis":c.used+" de "+c.cap+" lugares hoje";
  return`<div class="qbar${low?" low":""}" id="qbar"><div class="qin"><div class="qtxt"><b>${txt}</b><span class="qtier">${esc(Q.label)}</span></div><div class="qtrack" role="progressbar" aria-label="${txt}" aria-valuemin="0" aria-valuemax="${c.cap}" aria-valuenow="${c.used}"><i style="width:${pct}%"></i></div></div><button class="btn ghost small" data-act="plans">Planos</button></div>`
}
function updatePill(){const e=$("#qbar");if(e&&Q)e.outerHTML=qbarHTML()}
function setPaywall(reason,info){
  PAYWALL={reason,tier:(info&&info.tier)||(Q&&Q.tier)||"free"};
  if(Q&&info&&info.cap&&Q[reason]){Q[reason].used=info.used;Q[reason].cap=info.cap}
  if(S.tab==="descobrir"&&!sheetOpen())render()
}
function onLimit(lim){
  if(!lim)return;
  if(lim.reason==="cards"||lim.reason==="searches")setPaywall(lim.reason,lim);
  else if(lim.reason==="photos")toast("Seu plano mostra até "+(Q&&Q.photos||lim.photos||2)+" fotos por lugar")
}
function paywallHTML(){
  const P=PAYWALL,t=P.tier,cap=Q?Q.cards.cap:(P.cap||0),free=planOf("free"),gold=planOf("gold");
  let h,p,b;
  const plansBtn=`<button class="btn big" data-act="plans">Ver planos</button>`,listBtn=`<button class="btn ghost" data-tab="matches">Ver minha lista</button>`;
  if(P.reason==="login"){
    h="Entre para continuar";p="Faça login para continuar usando o Partiu Hoje?. A sua lista fica salva na nuvem.";b=`<button class="btn big" data-act="login">Entrar</button>`
  }else if(P.reason==="searches"){
    h="Muitas buscas por hoje";p="Você chegou ao limite de buscas do seu plano. Ele zera à meia-noite (horário de Brasília)."+(t==="gold"?"":" Para buscar mais agora, veja os planos.");b=(t==="gold"?"":plansBtn)+listBtn
  }else if(t==="anon"){
    h="Gostou? Crie sua conta grátis";p=`Você já viu os ${cap} lugares de visitante. Com a conta grátis${free?" são "+free.cards+" lugares por dia":" você vê mais lugares todo dia"}, e a sua lista fica salva na nuvem.`;b=`<button class="btn big" data-act="login">Criar conta grátis</button><button class="btn ghost" data-act="plans">Ver planos</button>`
  }else if(t==="free"){
    h=`Você viu os ${cap} lugares de hoje`;p="O contador volta a zero à meia-noite (horário de Brasília). Para continuar deslizando agora, escolha um plano.";b=plansBtn+listBtn
  }else if(t==="premium"){
    h="Limite do Premium atingido hoje";p=`Você viu os ${cap} lugares de hoje. O contador zera à meia-noite.${gold?" O Premium Gold libera "+gold.cards+" por dia.":""}`;b=plansBtn+listBtn
  }else{
    h=`Você usou os ${cap} lugares de hoje`;p="Volta amanhã: o contador zera à meia-noite (horário de Brasília). Enquanto isso, a sua lista continua aí.";b=listBtn
  }
  return`<div class="notice paywall" role="status"><div class="pwicon">${icon("heart")}</div><h2>${h}</h2><p>${p}</p><div class="pwbtns">${b}</div></div>`
}
async function loadPlans(){try{PLANS=await Cloud.plans()}catch(e){}}
const money=n=>"R$ "+Number(n).toFixed(2).replace(".",",");
async function openPlans(){
  PL={per:"month",err:""};
  openSheet(plansHTML());
  if(!PLANS){await loadPlans();if(!PLANS&&PL)PL.err="Não consegui carregar os planos agora. Tente de novo em instantes."}
  if(PL)paintSheet(plansHTML())
}
function plansHTML(){
  const head='<div class="grab"></div><h2 id="sh-t">Planos</h2>';
  if(!Cloud.enabled())return head+'<p class="sub">Os planos precisam da conta na nuvem, que ainda não está ativada neste app.</p><button class="btn" data-act="sheet-close">Entendi</button>';
  if(!PLANS)return head+(PL.err?`<p class="msg" role="alert">${esc(PL.err)}</p>`:'<p class="sub" role="status">Carregando…</p>')+'<button class="btn ghost" data-act="sheet-close">Fechar</button>';
  const per=PL.per,cur=Q&&Q.tier,co=(Cloud.cfg&&Cloud.cfg.checkout)||{};
  const anyLink=["premium","gold"].some(t=>co[t]&&(co[t].week||co[t].month));
  const seg=`<div class="seg" role="group" aria-label="Pagar por">${[["week","Por semana"],["month","Por mês"]].map(([v,t])=>`<button class="segb" data-act="pl-per" data-v="${v}" aria-pressed="${per===v}">${t}</button>`).join("")}</div>`;
  const exp=Q&&Q.expires_at?new Date(Q.expires_at).toLocaleDateString("pt-BR"):"";
  const cards=PLANS.filter(x=>x.tier!=="anon").map(x=>{
    const price=x.tier==="free"?"Grátis":money(per==="week"?x.price_week:x.price_month)+`<small> / ${per==="week"?"semana":"mês"}</small>`;
    const feats=[`${x.cards} lugares por dia`,`${x.photos} fotos por lugar`,`${x.lookups} lugares da lista por dia`];
    let btn="";
    if(x.tier==="free")btn=cur==="free"||cur==="anon"?`<span class="curplan">${cur==="anon"?"Visitante":"Seu plano atual"}</span>`:"";
    else if(cur===x.tier)btn=`<span class="curplan">Seu plano atual${exp?" · até "+exp:""}</span>`;
    else if(co[x.tier]&&co[x.tier][per])btn=`<button class="btn${x.tier==="gold"?"":" ghost"}" data-act="pl-buy" data-tier="${x.tier}">Assinar ${esc(x.label)}</button>`;
    else btn=`<button class="btn ghost" disabled>Em breve</button>`;
    return`<div class="plan ${x.tier}${cur===x.tier?" on":""}"><div class="ptop"><h3>${esc(x.label)}</h3><div class="pprice">${price}</div></div><ul>${feats.map(f=>`<li>${icon("check")}${f}</li>`).join("")}</ul>${btn}</div>`
  }).join("");
  return`${head}<p class="sub">O contador de lugares zera todo dia à meia-noite (horário de Brasília).</p>${seg}<div class="plans">${cards}</div>${anyLink?'<p class="credit">Depois do pagamento, o plano é liberado na sua conta. Use o mesmo e-mail do login.</p>':'<p class="credit">O pagamento ainda não está ligado neste app.</p>'}<button class="btn ghost" data-act="sheet-close">Fechar</button>`
}
function buyPlan(tier){
  const co=(Cloud.cfg&&Cloud.cfg.checkout)||{},link=co[tier]&&co[tier][PL?PL.per:"month"];
  if(!link)return;
  const u=Cloud.user();
  if(!u){closeSheet();openLogin("plans");return}
  try{const url=new URL(link);url.searchParams.set("client_reference_id",u.id);if(u.email)url.searchParams.set("prefilled_email",u.email);window.open(url.toString(),"_blank","noopener")}
  catch(e){toast("Link de pagamento inválido")}
}
const blockedNow=()=>!!PAYWALL&&(PAYWALL.reason==="login"?!Cloud.user():Q?Q[PAYWALL.reason]&&Q[PAYWALL.reason].used>=Q[PAYWALL.reason].cap:true);
// Atualiza o contador e o plano. Devolve true se algo importante mudou na tela.
async function refreshQuota(){
  if(!Cloud.enabled()){Q=null;return false}
  let changed=false;
  try{
    const q=await Cloud.quota();
    if(q&&q.tier){
      const day=Q&&Q.day!==q.day,tier=Q&&Q.tier!==q.tier;
      if(day)VIEWED.clear();
      if(day||tier){LIM.clear();changed=true}
      Q=q;
      if(PAYWALL&&!blockedNow()){PAYWALL=null;changed=true}
    }
  }catch(e){if(e&&e.code==="login_required"&&!PAYWALL){setPaywall("login")}}
  updatePill();
  if(!PAYWALL&&STATUS==="ready"&&!P.length&&S.onboarded&&!LOADING&&changed)loadAll();
  return changed
}
// O card que acabou de aparecer conta no limite do dia; só depois a foto é pedida.
async function touchFront(){
  if(!Cloud.enabled()){hydratePhotos();return}
  if(PAYWALL)return;
  const q=queue();if(!q.length)return;
  const id=q[0].p.id;
  if(VIEWED.has(id)){hydratePhotos();return}
  if(REG===id)return;
  REG=id;
  try{
    const r=await Cloud.spend("card",id);
    if(REG===id)REG=null;
    if(r&&r.ok){VIEWED.add(id);if(Q){Q.cards.used=Math.max(Q.cards.used,r.used);Q.cards.cap=r.cap}updatePill();hydratePhotos()}
    else if(r&&r.reason==="cards")setPaywall("cards",r);
    else hydratePhotos()
  }catch(e){
    if(REG===id)REG=null;
    if(e&&e.code==="login_required"){setPaywall("login");return}
    hydratePhotos() // sem rede para o contador: o servidor ainda confere o limite ao entregar a foto
  }
}
/* ---------- Lista: dados atuais dos lugares (só o ID fica guardado) ---------- */
const DET=new Map(),DET_BUSY=new Set();let DET_ERR="";
try{JSON.parse(sessionStorage.getItem("ph-det")||"[]").forEach(x=>DET.set(x.id,x))}catch(e){}
function info(id){
  const p=PM.get(id);
  if(p)return{id,name:p.name,kind:p.kind,photo:p.photos[0]?p.photos[0].n:null,uri:p.uri,addr:p.addr,lat:p.lat,lng:p.lng,likes:p.likes};
  const d=DET.get(id);if(!d)return LIM.has(id)?{id,limited:true}:null;
  if(d.gone)return{id,gone:true};
  const loc=d.location||{};
  return{id,name:(d.displayName&&d.displayName.text)||"Lugar",kind:(d.primaryTypeDisplayName&&d.primaryTypeDisplayName.text)||"Local",
    photo:d.photos&&d.photos[0]?d.photos[0].name:null,uri:d.googleMapsUri&&/^https:\/\//.test(d.googleMapsUri)?d.googleMapsUri:null,
    addr:d.shortFormattedAddress||d.formattedAddress||"",lat:loc.latitude,lng:loc.longitude,likes:[],closed:d.businessStatus&&d.businessStatus!=="OPERATIONAL"}
}
async function ensureDetails(ids){
  const need=ids.filter(id=>!PM.has(id)&&!DET.has(id)&&!DET_BUSY.has(id)&&!LIM.has(id));
  if(!need.length||DET_ERR)return;
  need.forEach(id=>DET_BUSY.add(id));
  for(let i=0;i<need.length;i+=12){
    const chunk=need.slice(i,i+12);let failed=false;
    try{const d=await api("/api/details?ids="+chunk.map(encodeURIComponent).join(","));(d.places||[]).forEach(p=>{if(p&&p.limited)LIM.add(p.id);else if(p&&p.id)DET.set(p.id,p)})}
    catch(e){failed=true;if(!(e&&e.handled))DET_ERR=(e&&e.message)||"Não consegui carregar os lugares."}
    chunk.forEach(id=>{DET_BUSY.delete(id);if(!failed&&!DET_ERR&&!DET.has(id)&&!LIM.has(id))DET.set(id,{id,gone:true})})
  }
  try{sessionStorage.setItem("ph-det",JSON.stringify([...DET.values()].slice(-400)))}catch(e){}
  if(!document.querySelector(".card.front.drag")&&(FR||S.tab==="matches"))render()
}
const starsHTML=(r,inter)=>{
  let h=`<span class="stars" role="img" aria-label="${r==null?"Sem nota":fmt(r)+" de 5 estrelas"}">`;
  for(let i=1;i<=5;i++){
    const f=r==null?0:Math.max(0,Math.min(1,r-(i-1)));
    h+=`<span class="star">★<span class="sf" style="width:${f*100}%">★</span>${inter?`<button type="button" class="sh l" data-star="${i-.5}" aria-label="${fmt(i-.5)} estrelas"></button><button type="button" class="sh r" data-star="${i}" aria-label="${i} estrelas"></button>`:""}</span>`
  }
  return h+"</span>"
};
const thumbHTML=(inf,id)=>`<div class="thumb" style="--h:${hue(id)}">${icon(catIcon(inf&&inf.likes&&inf.likes[0]))}${inf&&inf.photo&&!inf.limited?`<img data-ph="${esc(inf.photo)}" data-ctx="thumb" alt="" style="display:none">`:""}</div>`;
const limitNoticeHTML=()=>LIM.size?`<div class="notice" role="status"><h3>Limite de consultas de hoje</h3><p class="sub">Alguns lugares aparecem só amanhã${Q&&Q.anon?". Com uma conta grátis, mais lugares carregam por dia":", ou agora com um plano"}.</p><div>${Q&&Q.anon?'<button class="btn small" data-act="login">Criar conta grátis</button>':'<button class="btn small" data-act="plans">Ver planos</button>'}</div></div>`:"";
const mapLink=inf=>inf&&!inf.gone&&!inf.limited?`<a class="maps" href="${esc(inf.uri||mapsFallback(inf))}" target="_blank" rel="noopener">${icon("map")} Mapa</a>`:"";
const detErrHTML=()=>DET_ERR?`<div class="notice err" role="alert"><h2>Não consegui carregar os lugares</h2><p>${esc(DET_ERR)}</p><div><button class="btn" data-act="detretry">Tentar de novo</button></div></div>`:"";

let LFILTER="all",LSHOW=20;
const sortedEntries=()=>Object.keys(S.entries).map(id=>Object.assign({id},S.entries[id])).sort((a,b)=>b.t-a.t);
function listItem(e){
  const inf=info(e.id);
  const dist=POS&&inf&&inf.lat!=null?hav(POS.lat,POS.lng,inf.lat,inf.lng):null;
  const status=e.status==="been"?`<div class="st2"><span class="chip-s been">${icon("check")} Já fui</span>${e.rating!=null?`${starsHTML(e.rating)}<b class="rv2">${fmt(e.rating)}</b>`:'<span class="sub">sem nota</span>'}</div>`:`<div class="st2"><span class="chip-s want">${icon("heart")} Quero ir</span></div>`;
  const body=!inf?`<h3 class="skeltxt">Carregando…</h3>`:inf.limited?`<h3>Disponível amanhã</h3><div class="m">Você chegou ao limite de consultas de hoje.</div>`:inf.gone?`<h3>Lugar indisponível</h3><div class="m">O Google não encontrou mais este lugar.</div>`:
    `<h3>${esc(inf.name)}</h3><div class="m">${esc(inf.kind)}${dist!=null?" · "+km(dist):""}${inf.closed?" · fechado definitivamente":""}</div>`;
  return`<div class="item">${thumbHTML(inf,e.id)}<div class="t">${body}${status}${e.note?`<p class="notep">${esc(e.note)}</p>`:""}
  <div class="go"><button class="btn small${e.status==="want"?"":" ghost"}" data-act="edit" data-id="${esc(e.id)}">${e.status==="want"?"Já fui":"Editar"}</button>${mapLink(inf)}</div></div></div>`
}
function viewMatches(){
  const all=sortedEntries();
  const nw=all.filter(e=>e.status==="want").length,nb=all.length-nw;
  const f=all.filter(e=>LFILTER==="all"||e.status===LFILTER);
  const vis=f.slice(0,LSHOW);
  const seg=[["all","Todos",all.length],["want","Quero ir",nw],["been","Já fui",nb]].map(([v,t,n])=>`<button class="segb" data-act="lfilter" data-v="${v}" aria-pressed="${LFILTER===v}">${t} <span class="cnt">${n}</span></button>`).join("");
  const banner=!Cloud.user()&&Cloud.enabled()&&all.length&&!S.bannerOff?`<div class="banner"><div><b>Salve sua lista na nuvem</b><p class="sub">Entre para não perder seus lugares ao trocar de celular e para poder compartilhar com amigos.</p></div><div class="chips"><button class="btn small" data-act="login">Entrar</button><button class="btn ghost small" data-act="bannerx">Agora não</button></div></div>`:"";
  let body;
  if(!all.length)body=`<div class="notice"><h2>Sua lista está vazia</h2><p>Curta lugares na aba Descobrir para guardar aqui. Depois você marca onde já foi, dá uma nota de 0 a 5 e escreve uma anotação.</p><div><button class="btn" data-tab="descobrir">Começar a deslizar</button></div></div>`;
  else if(!f.length)body=`<div class="notice"><p>Nenhum lugar nessa seleção.</p></div>`;
  else body=`<div class="list">${vis.map(listItem).join("")}</div>${f.length>vis.length?`<button class="btn ghost" data-act="lmore">Mostrar mais (${f.length-vis.length})</button>`:""}<p class="credit">Dados e fotos: Google Maps. Só o código de cada lugar fica guardado; nome e foto são buscados de novo no Google.</p>`;
  return`<div class="top"><h1 style="font-size:28px">Minha lista</h1><button class="btn small" data-act="share">${icon("share")} Compartilhar</button></div>${banner}${all.length?`<div class="seg" role="group" aria-label="Filtrar lista">${seg}</div>`:""}${detErrHTML()}${limitNoticeHTML()}${body}`
}
const planLine=()=>Q&&Cloud.enabled()?`<p class="sub">Plano: <b>${esc(Q.label)}</b>${Q.expires_at?" até "+new Date(Q.expires_at).toLocaleDateString("pt-BR"):""} · ${Q.cards.used} de ${Q.cards.cap} lugares ${Q.anon?"grátis":"hoje"}.</p><div class="chips"><button class="btn small ghost" data-act="plans">Ver planos</button></div>`:"";
function accountPanel(){
  const u=Cloud.user();
  if(!Cloud.enabled()){
    const p=Cloud.cfg&&Cloud.cfg.problem;
    return`<div class="panel"><div class="group"><span class="label">Conta</span><p class="sub">${p==="secret_key"?"Atenção: foi colada a chave SECRETA do Supabase. Use a chave pública (anon / publishable) e faça um novo deploy.":p==="invalid"?"As variáveis do Supabase estão incompletas ou erradas. Abra /api/health para ver o que falta.":"A conta na nuvem ainda não está ativada neste app. Sua lista fica salva só neste aparelho."}</p></div></div>`
  }
  if(!u)return`<div class="panel"><div class="group"><span class="label">Conta</span><h2 style="font-size:22px">Salve sua lista na nuvem</h2><p class="sub">Entre para manter sua lista ao trocar de celular e para compartilhar com amigos. É grátis.</p><button class="btn big" data-act="login">Entrar ou criar conta</button>${planLine()}</div></div>`;
  return`<div class="panel"><div class="group"><span class="label">Conta</span><p><b>${esc(u.email||"Conectado")}</b></p><p class="sub" id="syncline" aria-live="polite">${esc(Sync.text())}</p>${planLine()}
  <div class="chips"><button class="btn small" data-act="share">${icon("share")} Compartilhar minha lista</button><button class="btn ghost small" data-act="syncnow">Sincronizar agora</button></div>
  <div class="chips"><button class="btn ghost small" data-act="signout">Sair</button><button class="btn ghost small danger" data-act="delacct">Excluir minha conta</button></div></div></div>`
}
function viewProfile(){
  return`<div class="top"><h1 style="font-size:28px">Seu perfil</h1></div>${accountPanel()}<div class="panel">${prefsForm()}
  <button class="btn big" data-act="apply">${DIRTY?"Aplicar e buscar de novo":"Buscar de novo"}</button>
  <div class="group"><span class="label">Aprendizado</span><p class="sub">Cada curtida e cada "passo" muda a ordem dos próximos cards. Você já avaliou ${S.liked.length+S.passed.length} lugares. Sua lista não é apagada por aqui.</p>
  <button class="btn ghost" data-act="reset">Zerar aprendizado e recusados</button></div>
  <p class="credit"><a href="/privacidade.html" target="_blank" rel="noopener">Privacidade e seus dados</a></p></div>`
}
function render(){
  const app=$("#app");
  if(FR){$("#tabs").hidden=true;app.innerHTML=viewFriend();hydratePhotos();return}
  $("#tabs").hidden=!S.onboarded;
  app.innerHTML=!S.onboarded?viewOnboarding():({descobrir:viewDeck,matches:viewMatches,perfil:viewProfile})[S.tab]();
  document.querySelectorAll(".tab").forEach(b=>b.setAttribute("aria-current",b.dataset.tab===S.tab?"page":"false"));
  $("#mcount").textContent=S.liked.length?"Lista ("+S.liked.length+")":"Lista";
  if(S.onboarded&&S.tab==="matches")ensureDetails(sortedEntries().filter(e=>LFILTER==="all"||e.status===LFILTER).slice(0,LSHOW).map(e=>e.id));
  if(S.onboarded&&S.tab==="descobrir"&&STATUS==="ready"){bindSwipe();touchFront();if(queue().length<8)loadMore()}
  else hydratePhotos()
}
function toast(t){const e=$("#toast");e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,1800)}
function keepScroll(fn){const y=window.scrollY;fn();window.scrollTo(0,y)}

/* ---------- Ações ---------- */
/* ---------- Lista pessoal (quero ir / já fui / nota / anotação) ---------- */
function setEntry(id,patch){
  const e=S.entries[id]||{status:"want",rating:null,note:"",t:0};
  Object.assign(e,patch,{t:Date.now()});S.entries[id]=e;
  if(!S.liked.includes(id))S.liked.push(id);
  S.dirty[id]=1;delete S.del[id];save();Sync.schedule()
}
function dropEntry(id){
  delete S.entries[id];S.liked=S.liked.filter(x=>x!==id);S.hist=S.hist.filter(h=>h.id!==id);delete S.dirty[id];
  if(S.synced[id])S.del[id]=Date.now();
  save();Sync.schedule()
}
function decide(id,like,been){
  const p=byId(id);if(!p)return;
  if(like){setEntry(id,been?{status:"been"}:{status:"want"})}else S.passed.push(id);
  p.likes.concat(p.tags||[]).forEach(t=>{S.w[t]=(S.w[t]||0)+(like?3:-2)});
  S.hist.push({id,like});save();
  if(like&&!been)toast("Salvo na sua lista");
  render();
  if(like&&been)openEdit(id,true)
}
function undo(){
  const h=S.hist.pop();if(!h)return;
  if(h.like)dropEntry(h.id);else{const i=S.passed.lastIndexOf(h.id);if(i>-1)S.passed.splice(i,1)}
  const p=byId(h.id);
  if(p)p.likes.concat(p.tags||[]).forEach(t=>{S.w[t]=(S.w[t]||0)-(h.like?3:-2)});
  if(p)FRONT=h.id;
  save();render()
}
function fly(dir,been){
  const c=document.querySelector(".card.front");if(!c||c.dataset.busy)return;
  c.dataset.busy="1";c.classList.remove("drag");
  c.style.transform=`translate(${dir*520}px,40px) rotate(${dir*24}deg)`;
  const id=c.dataset.id;
  setTimeout(()=>decide(id,dir>0,been),220)
}
function flipPhoto(c,clientX){
  const p=PM.get(c.dataset.id);if(!p)return;const l=photoList(p);if(l.length<2)return;
  const r=c.getBoundingClientRect();const left=(clientX-r.left)<r.width*.4;
  p._i=(photoIdx(p,l)+(left?-1:1)+l.length)%l.length;
  const ph=l[p._i];
  const img=c.querySelector("img.ph");
  if(img){img.removeAttribute("data-done");img.dataset.ph=ph.n;img.dataset.ctx="card";hydratePhotos()}
  c.querySelectorAll(".segs i").forEach((s,i)=>s.classList.toggle("on",i===p._i));
  const cr=c.querySelector("[data-credit]");if(cr)cr.textContent=(ph.a?"Foto: "+ph.a+" · ":"")+"Dados: Google Maps"
}
function bindSwipe(){
  const c=document.querySelector(".card.front");if(!c)return;
  const ln=c.querySelector(".stamp.like"),nn=c.querySelector(".stamp.nope"),hero=c.querySelector(".hero");
  let x0=0,y0=0,dx=0,on=false,t0=0,moved=false;
  c.addEventListener("pointerdown",e=>{if(e.target.closest("a,button"))return;on=true;moved=false;x0=e.clientX;y0=e.clientY;t0=Date.now();c.classList.add("drag");try{c.setPointerCapture(e.pointerId)}catch(_){}});
  c.addEventListener("pointermove",e=>{if(!on)return;dx=e.clientX-x0;const dy=(e.clientY-y0)*.25;
    if(Math.abs(dx)>8||Math.abs(e.clientY-y0)>8)moved=true;
    c.style.transform=`translate(${dx}px,${dy}px) rotate(${dx/18}deg)`;
    ln.style.opacity=Math.max(0,Math.min(1,dx/110));nn.style.opacity=Math.max(0,Math.min(1,-dx/110))});
  const end=e=>{if(!on)return;on=false;c.classList.remove("drag");
    if(Math.abs(dx)>110){fly(dx>0?1:-1)}
    else{c.style.transform="";ln.style.opacity=0;nn.style.opacity=0;
      const hr=hero.getBoundingClientRect();
      if(!moved&&Date.now()-t0<450&&e.type==="pointerup"&&e.clientY>=hr.top&&e.clientY<=hr.bottom)flipPhoto(c,e.clientX)}
    dx=0};
  c.addEventListener("pointerup",end);c.addEventListener("pointercancel",end)
}
const toggle=(arr,v)=>{const i=arr.indexOf(v);i>-1?arr.splice(i,1):arr.push(v)};
async function setCity(){
  const el=$("#city"),msg=$("#locmsg");const q=el?el.value.trim():"";
  if(q.length<2){if(msg)msg.textContent="Digite o nome de uma cidade ou bairro.";return}
  if(msg)msg.textContent="Procurando…";
  try{
    const j=await api("/api/geocode?q="+encodeURIComponent(q));
    if(!j.found){if(msg)msg.textContent="Não encontrei esse lugar. Tente incluir o estado, por exemplo: Ibirubá RS.";return}
    S.manual={lat:j.lat,lng:j.lng,label:j.label};save();LOC_OPEN=false;loadAll()
  }catch(e){if(msg)msg.textContent=e.message}
}
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-tab],[data-act],[data-grp],[data-star]");if(!t)return;
  if(t.dataset.star!==undefined){if(ED){ED.rating=+t.dataset.star;refreshEdit()}return}
  if(t.dataset.tab){const to=t.dataset.tab;S.tab=to;save();render();window.scrollTo(0,0);if(to==="descobrir"&&DIRTY&&!LOADING)loadAll();return}
  if(t.dataset.grp){
    const g=t.dataset.grp,v=t.dataset.v;
    if(g==="likes"||g==="values"||g==="diet"){toggle(S.prefs[g],v);if(g==="likes"||g==="diet"){DIRTY=true;if(g==="likes"&&FILTER&&!S.prefs.likes.includes(FILTER))FILTER=""}}
    else if(g==="price")S.prefs.maxPrice=+v;
    save();keepScroll(render);return}
  const a=t.dataset.act;
  if(a==="start"){S.onboarded=true;S.tab="descobrir";save();window.scrollTo(0,0);loadAll()}
  else if(a==="apply"){S.tab="descobrir";save();window.scrollTo(0,0);loadAll()}
  else if(a==="retry"){loadAll()}
  else if(a==="yes")fly(1);
  else if(a==="been")fly(1,true);
  else if(a==="no")fly(-1);
  else if(a==="undo")undo();
  else if(a==="filter"){FILTER=t.dataset.v||"";render()}
  else if(a==="loc"){LOC_OPEN=!LOC_OPEN;render();if(LOC_OPEN){const c=$("#city");if(c)c.focus()}}
  else if(a==="gps"){S.manual=null;save();LOC_OPEN=false;loadAll()}
  else if(a==="city")setCity();
  else if(a==="reset"){S.passed=[];S.w={};S.hist=[];save();render();toast("Aprendizado zerado")}
  else if(!sheetAction(a,t))uiAction(a,t)
});
document.addEventListener("input",e=>{
  if(e.target.matches&&e.target.matches("input[data-radius]")){
    document.querySelectorAll(".rv").forEach(x=>x.textContent=e.target.value+(x.tagName==="B"?" km":" km"))
  }
});
document.addEventListener("change",e=>{
  if(!(e.target.matches&&e.target.matches("input[data-radius]")))return;
  const v=+e.target.value;S.prefs.maxDist=v;save();
  if(S.tab==="descobrir"&&STATUS==="ready"){
    if(v>LOADED_KM&&!LOADING)loadAll();else render()
  }else{if(v>LOADED_KM)DIRTY=true}
});
document.addEventListener("keydown",e=>{
  if(e.target&&e.target.id==="city"&&e.key==="Enter"){e.preventDefault();setCity();return}
  if(!S.onboarded||S.tab!=="descobrir"||STATUS!=="ready"||sheetOpen()||(e.target&&(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA")))return;
  if(e.key==="ArrowRight")fly(1);else if(e.key==="ArrowLeft")fly(-1)
});

/* ---------- Janelas (bottom sheets) ---------- */
let LASTFOCUS=null;
function openSheet(html){
  LASTFOCUS=document.activeElement;
  $("#sheet-root").innerHTML=`<div class="ov" data-act="sheet-close"></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-t" tabindex="-1">${html}</div>`;
  document.body.classList.add("noscroll");
  setTimeout(()=>{const s=$("#sheet-root .sheet");const f=s&&(s.querySelector("input,textarea")||s);if(f)f.focus({preventScroll:true})},40)
}
function paintSheet(html){const s=$("#sheet-root .sheet");if(s)s.innerHTML=html}
function closeSheet(){
  $("#sheet-root").innerHTML="";document.body.classList.remove("noscroll");ED=null;LG=null;SH=null;PL=null;
  if(LASTFOCUS&&document.contains(LASTFOCUS)&&LASTFOCUS.focus)try{LASTFOCUS.focus({preventScroll:true})}catch(e){}
}
const sheetOpen=()=>!!$("#sheet-root .sheet");

/* ---------- Editar um lugar da lista ---------- */
let ED=null;
function openEdit(id){
  const e=S.entries[id];if(!e)return;
  ED={id,status:e.status,rating:e.rating,note:e.note||""};
  openSheet(editHTML());
  ensureDetails([id])
}
const ratingText=r=>r==null?"Sem nota":fmt(r)+" de 5";
function editHTML(){
  const inf=info(ED.id);
  return`<div class="grab"></div><h2 id="sh-t">${inf&&inf.name?esc(inf.name):"Este lugar"}</h2>
  <div class="seg" role="group" aria-label="Situação">${[["want","Quero ir"],["been","Já fui"]].map(([v,t])=>`<button class="segb" data-act="e-status" data-v="${v}" aria-pressed="${ED.status===v}">${t}</button>`).join("")}</div>
  <div class="group" id="e-rate" ${ED.status==="been"?"":"hidden"}><span class="label">Sua nota (0 a 5)</span>
    <div class="stepper"><button class="btn ghost small" data-act="e-step" data-v="-0.5" aria-label="Diminuir meia estrela">−</button><div id="e-stars">${starsHTML(ED.rating,true)}</div><button class="btn ghost small" data-act="e-step" data-v="0.5" aria-label="Aumentar meia estrela">+</button></div>
    <div class="row2"><b id="e-val" class="rangeval">${ratingText(ED.rating)}</b><button class="btn ghost small" data-act="e-clear">Sem nota</button></div></div>
  <div class="group"><label class="label" for="e-note">Anotação (só você vê)</label><textarea id="e-note" class="field" maxlength="500" rows="3" placeholder="Ex.: pedir o risoto, ir cedo, ótimo para grupos">${esc(ED.note)}</textarea></div>
  <button class="btn big" data-act="e-save">Salvar</button>
  <div class="btnrow"><button class="btn ghost danger" data-act="e-del">Remover da lista</button><button class="btn ghost" data-act="sheet-close">Cancelar</button></div>`
}
function refreshEdit(){
  if(!ED)return;
  document.querySelectorAll('#sheet-root [data-act="e-status"]').forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.v===ED.status)));
  const r=$("#e-rate");if(r)r.hidden=ED.status!=="been";
  const s=$("#e-stars");if(s)s.innerHTML=starsHTML(ED.rating,true);
  const v=$("#e-val");if(v)v.textContent=ratingText(ED.rating)
}

/* ---------- Entrar (Google ou código por e-mail) ---------- */
let LG=null;
function openLogin(after){
  if(!Cloud.enabled()){toast("A conta ainda não está ativada neste app");return}
  LG={email:"",sent:false,after:after||null,busy:false,msg:""};
  openSheet(loginHTML())
}
function loginHTML(){
  const m=LG.msg?`<p class="msg" role="alert">${esc(LG.msg)}</p>`:"";
  if(!LG.sent)return`<div class="grab"></div><h2 id="sh-t">Entrar no Partiu Hoje?</h2>
  <p class="sub">Guardamos só o código dos lugares, seu status, sua nota e suas anotações. <a href="/privacidade.html" target="_blank" rel="noopener">Privacidade</a></p>
  <button class="btn big gbtn" data-act="g-google"><span class="gmark">G</span> Entrar com Google</button>
  <p class="or"><span>ou receba um código por e-mail</span></p>
  <div class="group"><label class="label" for="lg-email">Seu e-mail</label><input class="field" id="lg-email" type="email" inputmode="email" autocomplete="email" maxlength="200" placeholder="voce@exemplo.com" value="${esc(LG.email)}">
  <button class="btn" data-act="g-send" ${LG.busy?"disabled":""}>${LG.busy?"Enviando…":"Enviar código"}</button>${m}</div>
  <button class="btn ghost" data-act="sheet-close">Agora não</button>`;
  return`<div class="grab"></div><h2 id="sh-t">Confira seu e-mail</h2>
  <p class="sub">Enviamos uma mensagem para <b>${esc(LG.email)}</b>. Digite o código de números que veio nela. Se aparecer só um link, abra-o neste mesmo celular.</p>
  <div class="group"><label class="label" for="lg-code">Código do e-mail</label><input class="field code" id="lg-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="000000">
  <button class="btn" data-act="g-verify" ${LG.busy?"disabled":""}>${LG.busy?"Entrando…":"Entrar"}</button>${m}</div>
  <div class="chips"><button class="btn ghost small" data-act="g-resend">Enviar de novo</button><button class="btn ghost small" data-act="g-back">Trocar e-mail</button></div>
  <p class="credit">Não chegou? Olhe a caixa de spam. O envio de e-mails tem limite por hora.</p>`
}
async function loginAction(a){
  if(a==="g-google"){if(LG&&LG.after)try{sessionStorage.setItem("ph-after",LG.after)}catch(e){}Cloud.googleLogin();return}
  if(a==="g-back"){LG.sent=false;LG.msg="";paintSheet(loginHTML());return}
  if(a==="g-send"||a==="g-resend"){
    const el=$("#lg-email");if(el)LG.email=el.value.trim();
    LG.busy=true;LG.msg="";paintSheet(loginHTML());
    try{await Cloud.sendCode(LG.email);LG.sent=true;LG.busy=false;paintSheet(loginHTML());if(a==="g-resend"){toast("E-mail enviado de novo");}}
    catch(e){LG.busy=false;LG.msg=e.message;paintSheet(loginHTML())}
    const f=$("#lg-code")||$("#lg-email");if(f)f.focus();return
  }
  if(a==="g-verify"){
    const el=$("#lg-code");const code=el?el.value:"";
    LG.busy=true;LG.msg="";paintSheet(loginHTML());
    try{await Cloud.verifyCode(LG.email,code);const after=LG.after;closeSheet();await afterLogin(after)}
    catch(e){LG.busy=false;LG.msg=e.message;paintSheet(loginHTML());const f=$("#lg-code");if(f)f.focus()}
  }
}
async function afterLogin(after){
  toast("Conectado");render();
  await Sync.run();await refreshQuota();render();
  if(after==="share")openShare();else if(after==="plans")openPlans()
}

/* ---------- Compartilhar ---------- */
let SH=null;
const shareLink=t=>location.origin+"/?lista="+t;
async function openShare(){
  if(!Cloud.enabled()){openSheet(`<div class="grab"></div><h2 id="sh-t">Compartilhar</h2><p class="sub">A conta na nuvem ainda não está ativada neste app, então não dá para criar o link. Veja o README, passo "Conta e compartilhamento".</p><button class="btn" data-act="sheet-close">Entendi</button>`);return}
  if(!Cloud.user()){openLogin("share");return}
  SH={p:null,msg:"",busy:false,name:""};
  openSheet(shareHTML());
  try{await Sync.run();SH.p=(await Cloud.getProfile())||{};SH.name=SH.p.display_name||((Cloud.user().name||"").split(" ")[0])||""}
  catch(e){SH.p={};SH.msg=e.message}
  if(SH)paintSheet(shareHTML())
}
function shareHTML(){
  const m=SH.msg?`<p class="msg" role="alert">${esc(SH.msg)}</p>`:"";
  if(!SH.p)return`<div class="grab"></div><h2 id="sh-t">Compartilhar minha lista</h2><p class="sub" role="status">Preparando…</p>`;
  const tok=SH.p.share_token;
  const rules=`<p class="sub">Quem tiver o link vê os seus lugares, se você já foi e a sua nota. <b>Anotações, e-mail e conta não são compartilhados.</b> Você pode desligar o link quando quiser.</p>`;
  const name=`<div class="group"><label class="label" for="s-name">Seu nome (aparece para quem abrir)</label><input class="field" id="s-name" maxlength="40" autocomplete="given-name" placeholder="Ex.: Ana" value="${esc(SH.name)}"></div>`;
  if(!tok)return`<div class="grab"></div><h2 id="sh-t">Compartilhar minha lista</h2>${rules}${name}<button class="btn big" data-act="s-create" ${SH.busy?"disabled":""}>${SH.busy?"Criando…":"Criar link"}</button>${m}<button class="btn ghost" data-act="sheet-close">Fechar</button>`;
  const link=shareLink(tok),text="Olha a minha lista de lugares no Partiu Hoje? "+link;
  return`<div class="grab"></div><h2 id="sh-t">Seu link está ativo</h2>${rules}${name}
  <div class="group"><label class="label" for="s-link">Link</label><input class="field" id="s-link" readonly value="${esc(link)}" onfocus="this.select()"></div>
  <div class="chips"><a class="btn" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">${icon("chat")} WhatsApp</a><button class="btn ghost" data-act="s-copy">${icon("copy")} Copiar</button>${navigator.share?`<button class="btn ghost" data-act="s-native">${icon("share")} Outros apps</button>`:""}</div>${m}
  <div class="chips"><button class="btn ghost small" data-act="s-name">Salvar nome</button><button class="btn ghost small" data-act="s-regen">Gerar novo link</button><button class="btn ghost small danger" data-act="s-stop">Parar de compartilhar</button></div>
  <button class="btn ghost" data-act="sheet-close">Fechar</button>`
}
async function shareAct(a){
  if(!SH)return;
  const nm=$("#s-name");if(nm)SH.name=nm.value.trim();
  const tok=SH.p&&SH.p.share_token;
  const run=async fn=>{SH.busy=true;SH.msg="";paintSheet(shareHTML());try{await fn()}catch(e){SH.msg=e.message}if(SH){SH.busy=false;paintSheet(shareHTML())}};
  if(a==="s-create"||a==="s-regen")return run(async()=>{await Sync.run();const t=Cloud.newToken();await Cloud.saveProfile({name:SH.name,token:t});SH.p={display_name:SH.name,share_token:t}});
  if(a==="s-stop")return run(async()=>{await Cloud.saveProfile({name:SH.name,token:null});SH.p={display_name:SH.name,share_token:null};toast("Link desativado")});
  if(a==="s-name")return run(async()=>{await Cloud.saveProfile({name:SH.name,token:tok});SH.p.display_name=SH.name;toast("Nome salvo")});
  if(a==="s-copy"&&tok){
    const link=shareLink(tok);
    try{await navigator.clipboard.writeText(link);toast("Link copiado")}catch(e){const i=$("#s-link");if(i){i.focus();i.select();try{document.execCommand("copy");toast("Link copiado")}catch(_){toast("Segure o link para copiar")}}}
  }
  if(a==="s-native"&&tok){try{await navigator.share({title:"Partiu Hoje?",text:"Olha a minha lista de lugares no Partiu Hoje?",url:shareLink(tok)})}catch(e){}}
}

/* ---------- Confirmações ---------- */
function confirmSheet(title,text,yesAct,yesLabel){
  openSheet(`<div class="grab"></div><h2 id="sh-t">${esc(title)}</h2><p class="sub">${esc(text)}</p><p class="msg" id="cf-msg" role="alert" hidden></p><div class="chips"><button class="btn danger-solid" data-act="${yesAct}">${esc(yesLabel)}</button><button class="btn ghost" data-act="sheet-close">Cancelar</button></div>`)
}
async function doSignOut(){
  try{await Sync.run()}catch(e){}
  await Cloud.signOut();
  // A lista está na nuvem; neste aparelho ela é removida para não ficar na tela de outra pessoa.
  S.entries={};S.liked=[];S.synced={};S.dirty={};S.del={};S.cloudUser=null;save();Sync.state="idle";
  Q=null;PAYWALL=null;VIEWED.clear();LIM.clear();PHC.clear();
  closeSheet();render();toast("Você saiu");
  refreshQuota().then(()=>render())
}
async function doDeleteAccount(){
  try{await Cloud.deleteAccount()}catch(e){const m=$("#cf-msg");if(m){m.hidden=false;m.textContent=e.message.includes("function")||/delete_my_account/.test(e.detail||"")?"Rode de novo o supabase/setup.sql para ativar a exclusão de conta.":e.message}return}
  S.entries={};S.liked=[];S.synced={};S.dirty={};S.del={};S.cloudUser=null;save();Sync.state="idle";
  Q=null;PAYWALL=null;VIEWED.clear();LIM.clear();PHC.clear();
  closeSheet();render();toast("Conta excluída")
}

/* ---------- Despachante das ações das janelas ---------- */
function sheetAction(a,t){
  if(a==="sheet-close"){closeSheet();return true}
  if(a==="e-status"){if(ED){ED.status=t.dataset.v;refreshEdit()}return true}
  if(a==="e-step"){if(ED){const r=ED.rating==null?(+t.dataset.v>0?0.5:0):Math.max(0,Math.min(5,ED.rating+ +t.dataset.v));ED.rating=r;refreshEdit()}return true}
  if(a==="e-clear"){if(ED){ED.rating=null;refreshEdit()}return true}
  if(a==="e-save"){if(ED){const n=$("#e-note");const note=(n?n.value:ED.note).trim().slice(0,500);
    setEntry(ED.id,{status:ED.status,rating:ED.status==="been"?ED.rating:null,note});closeSheet();render();toast("Salvo")}return true}
  if(a==="e-del"){if(ED){const id=ED.id;closeSheet();dropEntry(id);render();toast("Removido da lista")}return true}
  if(a==="g-google"||a==="g-send"||a==="g-resend"||a==="g-verify"||a==="g-back"){loginAction(a);return true}
  if(a.startsWith("s-")){shareAct(a);return true}
  if(a==="out-yes"){doSignOut();return true}
  if(a==="del-yes"){doDeleteAccount();return true}
  return false
}
function uiAction(a,t){
  if(a==="edit")openEdit(t.dataset.id);
  else if(a==="lfilter"){LFILTER=t.dataset.v;LSHOW=20;render()}
  else if(a==="lmore"){LSHOW+=20;render()}
  else if(a==="share")openShare();
  else if(a==="login")openLogin();
  else if(a==="bannerx"){S.bannerOff=true;save();render()}
  else if(a==="signout")confirmSheet("Sair da conta?","Sua lista continua salva na nuvem. Neste aparelho ela será removida e volta quando você entrar de novo.","out-yes","Sair");
  else if(a==="delacct")confirmSheet("Excluir sua conta?","Isso apaga para sempre a sua conta, a sua lista na nuvem e o seu link de compartilhamento. Não dá para desfazer.","del-yes","Excluir tudo");
  else if(a==="syncnow"){Sync.run().then(()=>render())}
  else if(a==="detretry"){DET_ERR="";render()}
  else if(a==="fclose")closeFriend();
  else if(a==="fadd"){setEntry(t.dataset.id,{status:"want"});toast("Adicionado à sua lista");render()}
  else if(a==="fmore"){FRSHOW[t.dataset.sec]+=12;render()}
  else if(a==="fstart"){closeFriend(true)}
  else if(a==="plans")openPlans();
  else if(a==="pl-per"){if(PL){PL.per=t.dataset.v;paintSheet(plansHTML())}}
  else if(a==="pl-buy")buyPlan(t.dataset.tier);
}

/* ---------- Sincronização com a nuvem ---------- */
const Sync={state:"idle",err:"",timer:null,running:false,again:false,last:0,
  pending(){return Object.keys(S.dirty).length+Object.keys(S.del).length},
  text(){
    if(!Cloud.user())return"";
    if(Sync.state==="syncing")return"Sincronizando…";
    if(Sync.state==="error")return"Não sincronizado ("+Sync.err+"). Vamos tentar de novo.";
    if(Sync.pending())return"Alterações aguardando envio…";
    return Sync.last?"Tudo salvo na nuvem":"Conectado"
  },
  ui(){const e=$("#syncline");if(e)e.textContent=Sync.text()},
  schedule(){
    if(!Cloud.enabled()||!Cloud.user())return;
    clearTimeout(Sync.timer);Sync.timer=setTimeout(()=>Sync.run(),900);Sync.ui()
  },
  async run(){
    const u=Cloud.user();
    if(!Cloud.enabled()||!u)return;
    if(Sync.running){Sync.again=true;return}
    Sync.running=true;Sync.state="syncing";Sync.err="";clearTimeout(Sync.timer);Sync.ui();
    try{
      if(S.cloudUser!==u.id){S.cloudUser=u.id;S.synced={};S.del={};Object.keys(S.entries).forEach(id=>{S.dirty[id]=1})}
      const rows=await Cloud.pull();
      const remote=new Map(rows.map(r=>[r.place_id,r]));
      // 1) o que foi removido aqui e continua lá com data mais antiga: apagar na nuvem
      const toDel=Object.keys(S.del).filter(id=>{const r=remote.get(id);return r&&(Date.parse(r.updated_at)||0)<=S.del[id]});
      const gone=new Set(toDel);
      // 2) trazer o que é novo ou mais recente na nuvem
      for(const r of rows){
        const id=r.place_id;if(gone.has(id))continue;
        const rt=Date.parse(r.updated_at)||0,loc=S.entries[id];
        delete S.del[id];
        if(!loc||!S.dirty[id]||rt>loc.t){
          S.entries[id]={status:r.status==="been"?"been":"want",rating:r.rating==null?null:Number(r.rating),note:r.note||"",t:rt};
          if(!S.liked.includes(id))S.liked.push(id);delete S.dirty[id]
        }
        S.synced[id]=1
      }
      // 3) o que só existe aqui: ou foi apagado em outro aparelho, ou ainda não foi enviado
      Object.keys(S.entries).forEach(id=>{
        if(remote.has(id))return;
        if(S.synced[id]&&!S.dirty[id]){delete S.entries[id];delete S.synced[id];S.liked=S.liked.filter(x=>x!==id)}
        else S.dirty[id]=1
      });
      if(toDel.length)await Cloud.remove(toDel);
      Object.keys(S.del).forEach(id=>{if(!remote.has(id)||gone.has(id)){delete S.del[id];delete S.synced[id]}});
      // 4) enviar o que mudou aqui
      const ids=Object.keys(S.dirty).filter(id=>S.entries[id]);
      const sent=ids.map(id=>({id,t:S.entries[id].t,status:S.entries[id].status,rating:S.entries[id].rating,note:S.entries[id].note}));
      await Cloud.push(sent);
      sent.forEach(x=>{S.synced[x.id]=1;if(S.entries[x.id]&&S.entries[x.id].t===x.t)delete S.dirty[x.id]});
      Object.keys(S.dirty).forEach(id=>{if(!S.entries[id])delete S.dirty[id]});
      Sync.state="idle";Sync.last=Date.now();save()
    }catch(e){
      Sync.state="error";Sync.err=(e&&e.message)||"erro";save();
      if(!e||e.code!=="no_session")Sync.timer=setTimeout(()=>Sync.run(),30000)
    }
    Sync.running=false;Sync.ui();
    if(Sync.again){Sync.again=false;return Sync.run()}
    if(!FR&&S.tab!=="descobrir"&&!sheetOpen())render()
  }
};
window.addEventListener("online",()=>Sync.schedule());
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&Cloud.user())Sync.run()});
Cloud.onChange(()=>{if(!Cloud.user()){Sync.state="idle"}});
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible"&&Cloud.enabled()&&Cloud.hasSession()&&Q)
    refreshQuota().then(ch=>{if(ch&&!sheetOpen()&&!document.querySelector(".card.front.drag"))render()})
});

/* ---------- Lista de um amigo (link ?lista=código) ---------- */
let FR=null;const FRSHOW={common:8,sugg:8,rest:8};
(function(){
  try{const t=new URLSearchParams(location.search).get("lista");if(t&&/^[a-z0-9]{12,32}$/.test(t))FR={token:t,status:"loading",data:null,err:""}}catch(e){}
})();
async function loadFriend(){
  if(!FR)return;
  try{
    if(!Cloud.enabled())FR.status="nocloud";
    else{const d=await Cloud.getShared(FR.token);if(!d)FR.status="gone";else{FR.data=d;FR.status="ready"}}
  }catch(e){FR.status="error";FR.err=e.message}
  render()
}
function closeFriend(toStart){
  FR=null;try{history.replaceState(null,"",location.pathname)}catch(e){}
  if(toStart&&!S.onboarded){S.tab="descobrir"}
  else if(S.onboarded)S.tab="matches";
  render();window.scrollTo(0,0);
  if(S.onboarded&&STATUS==="idle"&&!LOADING)loadAll()
}
function friendItem(i,sec){
  const id=i.place_id,inf=info(id),mine=S.entries[id];
  const dist=POS&&inf&&inf.lat!=null?hav(POS.lat,POS.lng,inf.lat,inf.lng):null;
  const who=esc(FR.data.name);
  const fs=i.status==="been"?`<span class="chip-s been">${icon("check")} ${who} foi${i.rating!=null?" · ★ "+fmt(i.rating):""}</span>`:`<span class="chip-s want">${icon("heart")} ${who} quer ir</span>`;
  const ms=mine?`<span class="chip-s mine">${mine.status==="been"?"Você foi"+(mine.rating!=null?" · ★ "+fmt(mine.rating):""):"Você quer ir"}</span>`:"";
  const body=!inf?`<h3 class="skeltxt">Carregando…</h3>`:inf.limited?`<h3>Disponível amanhã</h3><div class="m">Limite de consultas de hoje.</div>`:inf.gone?`<h3>Lugar indisponível</h3><div class="m">O Google não encontrou mais este lugar.</div>`:`<h3>${esc(inf.name)}</h3><div class="m">${esc(inf.kind)}${dist!=null?" · "+km(dist):""}</div>`;
  const act=mine?"":`<button class="btn small" data-act="fadd" data-id="${esc(id)}">${icon("heart")} Quero ir</button>`;
  return`<div class="item">${thumbHTML(inf,id)}<div class="t">${body}<div class="st2">${fs}${ms}</div><div class="go">${act}${mapLink(inf)}</div></div></div>`
}
function viewFriend(){
  const top=`<div class="top"><div class="brand">Partiu Hoje<span class="q">?</span></div><button class="btn ghost small" data-act="fclose">${S.onboarded?"Ir para o app":"Fechar"}</button></div>`;
  if(FR.status==="loading")return top+skeleton("Abrindo a lista…","Buscando a lista que seu amigo compartilhou.");
  if(FR.status==="gone")return top+`<div class="notice"><h2>Esse link não está mais ativo</h2><p>A pessoa pode ter parado de compartilhar ou criado um link novo. Peça o link atualizado.</p><div><button class="btn" data-act="fclose">Abrir o app</button></div></div>`;
  if(FR.status==="nocloud")return top+`<div class="notice err"><h2>Compartilhamento não ativado</h2><p>Este app ainda não tem a conta na nuvem configurada, por isso não consigo abrir listas de amigos.</p></div>`;
  if(FR.status==="error")return top+`<div class="notice err" role="alert"><h2>Não consegui abrir a lista</h2><p>${esc(FR.err)}</p><div><button class="btn" data-act="retry-f" onclick="FR.status='loading';render();loadFriend()">Tentar de novo</button></div></div>`;
  const d=FR.data,items=d.items||[],who=esc(d.name);
  const common=items.filter(i=>S.entries[i.place_id]);
  const sugg=items.filter(i=>!S.entries[i.place_id]&&i.status==="been"&&i.rating!=null&&i.rating>=4).sort((a,b)=>b.rating-a.rating);
  const sset=new Set(sugg.map(i=>i.place_id));
  const rest=items.filter(i=>!S.entries[i.place_id]&&!sset.has(i.place_id));
  const sec=(key,title,sub,list)=>{
    if(!list.length)return"";
    const vis=list.slice(0,FRSHOW[key]);
    return`<section class="fsec"><div><h2 style="font-size:22px">${title} <span class="cnt">${list.length}</span></h2><p class="sub">${sub}</p></div><div class="list">${vis.map(i=>friendItem(i,key)).join("")}</div>${list.length>vis.length?`<button class="btn ghost" data-act="fmore" data-sec="${key}">Mostrar mais (${list.length-vis.length})</button>`:""}</section>`
  };
  const visIds=[].concat(common.slice(0,FRSHOW.common),sugg.slice(0,FRSHOW.sugg),rest.slice(0,FRSHOW.rest)).map(i=>i.place_id);
  setTimeout(()=>ensureDetails(visIds),0);
  const mineCount=Object.keys(S.entries).length;
  const hero=`<div class="ob"><h1 style="font-size:28px">Lista de ${who}</h1><p>${items.length} ${items.length===1?"lugar":"lugares"}${mineCount?` · ${common.length} em comum com você`:""}.</p></div>`;
  const cta=!mineCount?`<div class="notice"><h2>Quer ver o que vocês têm em comum?</h2><p>Monte a sua lista curtindo lugares no app. Depois volte neste link e mostramos o que coincide.</p><div><button class="btn" data-act="fstart">Montar minha lista</button></div></div>`:"";
  if(!items.length)return top+hero+`<div class="notice"><p>${who} ainda não tem lugares na lista.</p></div>`;
  return top+hero+detErrHTML()+limitNoticeHTML()+cta+sec("common","Vocês dois têm","Lugares que estão nas duas listas.",common)+sec("sugg","Sugestões de "+who,"Lugares que "+who+" foi e deu nota 4 ou mais.",sugg)+sec("rest","Também na lista de "+who,"O resto da lista.",rest)+`<p class="credit">Dados e fotos: Google Maps.</p>`
}

/* ---------- Teclado e início ---------- */
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&sheetOpen()){closeSheet();return}
  if(e.key==="Enter"&&e.target){
    if(e.target.id==="lg-email"){e.preventDefault();loginAction("g-send");return}
    if(e.target.id==="lg-code"){e.preventDefault();loginAction("g-verify");return}
  }
});
(async function boot(){
  render();
  await Cloud.init();
  if(Cloud.authError)toast(Cloud.authError);
  if(Cloud.enabled()){loadPlans();if(S.onboarded||FR||Cloud.hasSession())await refreshQuota()}
  if(FR)loadFriend();else if(S.onboarded)loadAll();
  if(Cloud.user()){
    const after=(()=>{try{const v=sessionStorage.getItem("ph-after");sessionStorage.removeItem("ph-after");return v}catch(e){return null}})();
    if(Cloud.justSignedIn&&!FR){await afterLogin(after)}else{await Sync.run();if(!FR&&!sheetOpen())render()}
  }else render()
})();
