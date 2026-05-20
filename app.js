const $ = (sel) => document.querySelector(sel);

// base
const elQ = $("#q");
const elItems = $("#items");
const elCount = $("#count");
const elStatus = $("#status");

const btnClear = $("#btnClear");
const btnCopy = $("#btnCopy");
const btnShare = $("#btnShare");

// (opcional no seu HTML)
const tabLouvores = $("#tabLouvores");
const tabCifras = $("#tabCifras");
const appTitle = $("#appTitle");

// ====== SUPORTE a 2 layouts ======
// Layout NOVO (telas)
const screenList = $("#screenList");
const screenDetail = $("#screenDetail");
const btnBack = $("#btnBack");

// Layout ANTIGO (grid viewer)
const oldEmpty = $("#empty");
const oldDetail = $("#detail");

// Elementos de detalhe (novo ou antigo)
const elDTitle = $("#dTitle") || $("#detail #dTitle");
const elDMeta  = $("#dMeta")  || $("#detail #dMeta");
const elDLyrics = $("#dLyrics");

// Acessibilidade (se não existir no HTML, ignora)
const btnAminus = $("#btnAminus");
const btnAplus  = $("#btnAplus");
const FONT_MIN = 14, FONT_MAX = 22, FONT_STEP = 2;

let fontSize = Number(localStorage.getItem("fontSize") || "16");
if(!Number.isFinite(fontSize)) fontSize = 16;
fontSize = Math.max(FONT_MIN, Math.min(FONT_MAX, fontSize));
applyFontSize();

function applyFontSize(){
  document.documentElement.style.setProperty("--lyrics-size", `${fontSize}px`);
  try{ localStorage.setItem("fontSize", String(fontSize)); }catch{}
  if(btnAminus) btnAminus.disabled = fontSize <= FONT_MIN;
  if(btnAplus)  btnAplus.disabled  = fontSize >= FONT_MAX;
}

let mode = "louvores"; // "louvores" | "cifras"
let items = [];
let filtered = [];
let selectedId = null;

function normalize(s){
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function getSearchText(it){
  if(mode === "louvores"){
    return `${it.number || ""} ${it.title || ""}\n${it.lyrics || ""}`;
  }
  return `${it.title || ""} ${it.artist || ""} ${it.key || ""} capo ${it.capo || ""}\n${it.content || ""}`;
}

function snippet(text, q){
  const t = (text || "").replace(/\s+/g, " ").trim();
  if(!t) return "";
  if(!q) return t.slice(0, 90) + (t.length > 90 ? "…" : "");
  const idx = normalize(t).indexOf(normalize(q));
  if(idx === -1) return t.slice(0, 90) + (t.length > 90 ? "…" : "");
  const start = Math.max(0, idx - 35);
  const end = Math.min(t.length, idx + 55);
  let s = t.slice(start, end);
  if(start > 0) s = "…" + s;
  if(end < t.length) s = s + "…";
  return s;
}

// abre/fecha detalhe: se tiver layout novo usa fullscreen; senão usa viewer antigo
function openDetail(){
  if(screenDetail && screenList){
    document.body.classList.add("detail-open");
    screenDetail.classList.remove("hidden");
    screenList.classList.add("hidden");
  } else {
    // layout antigo: mostra article#detail e esconde div#empty
    oldEmpty?.classList.add("hidden");
    oldDetail?.classList.remove("hidden");
  }
}

function closeDetail(){
  if(screenDetail && screenList){
    document.body.classList.remove("detail-open");
    screenDetail.classList.add("hidden");
    screenList.classList.remove("hidden");
  } else {
    // layout antigo
    oldDetail?.classList.add("hidden");
    oldEmpty?.classList.remove("hidden");
  }
}

function renderList(){
  elItems.innerHTML = "";
  elCount.textContent = String(filtered.length);

  const q = elQ.value.trim();

  for(const it of filtered){
    const li = document.createElement("li");
    const id = Number(it.id);
    if(id === selectedId) li.classList.add("active");

    const title = document.createElement("div");
    title.className = "t";

    if(mode === "louvores"){
      title.textContent = `${it.number} - ${it.title}`;
    }else{
      const meta = [
        it.key ? `Tom ${it.key}` : null,
        it.capo ? `Capo ${it.capo}` : null
      ].filter(Boolean).join(" • ");
      title.textContent = meta ? `${it.title} • ${meta}` : it.title;
    }

    const sub = document.createElement("div");
    sub.className = "s";
    sub.textContent = snippet(mode === "louvores" ? it.lyrics : it.content, q);

    li.appendChild(title);
    li.appendChild(sub);
    li.addEventListener("click", () => select(id, true));
    elItems.appendChild(li);
  }
}

function select(id, shouldOpen=false){
  id = Number(id);
  selectedId = id;

  const it = items.find(x => Number(x.id) === id);
  if(!it) return;

  // Se esses elementos não existirem no seu HTML, vai dar null.
  // Então garantimos que existe antes de setar:
  if(elDTitle){
    elDTitle.textContent = mode === "louvores"
      ? `${it.number} - ${it.title}`
      : (it.title || "Sem título");
  }

  if(elDMeta){
    elDMeta.textContent = mode === "louvores"
      ? `${(it.lyrics || "").split(/\n+/).filter(Boolean).length} linhas`
      : [
          it.artist ? it.artist : null,
          it.key ? `Tom ${it.key}` : null,
          it.shape ? `Forma ${it.shape}` : null,
          it.capo ? `Capotraste ${it.capo}` : null
        ].filter(Boolean).join(" • ");
  }

  if(elDLyrics){
    elDLyrics.textContent = mode === "louvores" ? (it.lyrics || "") : (it.content || "");
  }

  try{ localStorage.setItem(`lastId:${mode}`, String(id)); }catch{}
  renderList();

  if(shouldOpen) openDetail();
}

function applyFilter(){
  const q = elQ.value.trim();
  if(!q){
    filtered = items;
  }else{
    const nq = normalize(q);
    filtered = items.filter(it => normalize(getSearchText(it)).includes(nq));
  }

  if(selectedId !== null && !filtered.some(x => Number(x.id) === selectedId)){
    selectedId = null;
  }
  renderList();
}

async function loadMode(newMode){
  mode = newMode;

  tabLouvores?.classList.toggle("active", mode === "louvores");
  tabCifras?.classList.toggle("active", mode === "cifras");
  if(appTitle) appTitle.textContent = mode === "louvores" ? "Louvores" : "Cifras";

  closeDetail();
  selectedId = null;

  const file = mode === "louvores" ? "./louvores.json" : "./cifras.json";
  const res = await fetch(file, { cache: "no-cache" });

  const text = await res.text();
  if(!text.trim()){
    console.error(`Arquivo ${file} veio vazio/404`);
    items = [];
    filtered = [];
    applyFilter();
    return;
  }

  let data;
  try{
    data = JSON.parse(text);
  }catch(e){
    console.error(`JSON inválido em ${file}:`, e.message);
    console.error("FINAL:", text.slice(-200));
    items = [];
    filtered = [];
    applyFilter();
    return;
  }

  items = Array.isArray(data) ? data.map(x => ({...x, id: Number(x.id)})) : [];
  filtered = items;
  applyFilter();

  const last = Number(localStorage.getItem(`lastId:${mode}`) || "");
  if(Number.isFinite(last) && last > 0) select(last, false);
}

// eventos
tabLouvores?.addEventListener("click", () => loadMode("louvores"));
tabCifras?.addEventListener("click", () => loadMode("cifras"));

btnBack?.addEventListener("click", () => closeDetail());

btnClear?.addEventListener("click", () => {
  elQ.value = "";
  applyFilter();
});
elQ?.addEventListener("input", () => applyFilter());

btnAminus?.addEventListener("click", () => {
  fontSize = Math.max(FONT_MIN, fontSize - FONT_STEP);
  applyFontSize();
});
btnAplus?.addEventListener("click", () => {
  fontSize = Math.min(FONT_MAX, fontSize + FONT_STEP);
  applyFontSize();
});

btnCopy?.addEventListener("click", async () => {
  const it = items.find(x => Number(x.id) === selectedId);
  if(!it) return;

  const text = (mode === "louvores")
    ? `${it.number} - ${it.title}\n\n${it.lyrics || ""}`
    : `${it.title}${it.key ? " (Tom " + it.key + ")" : ""}\n\n${it.content || ""}`;

  try{
    await navigator.clipboard.writeText(text);
    elStatus.textContent = "Copiado ✔";
    setTimeout(() => elStatus.textContent = "", 1200);
  }catch{}
});

btnShare?.addEventListener("click", async () => {
  const it = items.find(x => Number(x.id) === selectedId);
  if(!it) return;

  const text = (mode === "louvores")
    ? `${it.number} - ${it.title}\n\n${it.lyrics || ""}`
    : `${it.title}${it.key ? " (Tom " + it.key + ")" : ""}\n\n${it.content || ""}`;

  if(navigator.share){
    try{ await navigator.share({ title: it.title || "Item", text }); }catch{}
  }
});

// DURANTE DEV LOCAL, NÃO registre SW (evita cache e erros)
if ("serviceWorker" in navigator && location.hostname !== "127.0.0.1" && location.hostname !== "localhost") {
  window.addEventListener("load", async () => {
    try{
      const reg = await navigator.serviceWorker.register("./sw.js");
      reg.update?.();
    }catch{}
  });
}

loadMode("louvores");
