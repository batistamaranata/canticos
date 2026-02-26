const $ = (sel) => document.querySelector(sel);

const elQ = $("#q");
const elItems = $("#items");
const elCount = $("#count");
const elDTitle = $("#dTitle");
const elDMeta = $("#dMeta");
const elDLyrics = $("#dLyrics");
const btnClear = $("#btnClear");
const btnCopy = $("#btnCopy");
const btnShare = $("#btnShare");
const elStatus = $("#status");

const screenList = $("#screenList");
const screenDetail = $("#screenDetail");
const btnBack = $("#btnBack");

const btnAminus = $("#btnAminus");
const btnAplus  = $("#btnAplus");


let hymns = [];
let filtered = [];
let selectedId = null;


// acessibilidade: tamanho da letra (limites)
const FONT_MIN = 14;   // mínimo confortável
const FONT_MAX = 22;   // máximo "não exagerado" (bom p/ acessibilidade sem estourar layout)
const FONT_STEP = 2;

let fontSize = Number(localStorage.getItem("fontSize") || "16");
if(!Number.isFinite(fontSize)) fontSize = 16;
fontSize = Math.max(FONT_MIN, Math.min(FONT_MAX, fontSize));

function applyFontSize(){
  document.documentElement.style.setProperty("--lyrics-size", `${fontSize}px`);
  try{ localStorage.setItem("fontSize", String(fontSize)); }catch{}
  if(btnAminus) btnAminus.disabled = fontSize <= FONT_MIN;
  if(btnAplus)  btnAplus.disabled  = fontSize >= FONT_MAX;
}
applyFontSize();




function normalize(s){
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
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

function openDetail(){
  screenDetail.classList.remove("hidden");
  screenDetail.setAttribute("aria-hidden", "false");
  screenList.classList.add("hidden");

  // Voltar do Android (e também do navegador) fecha o detalhe
  history.pushState({ view: "detail" }, "");

  // sobe para o topo
  screenDetail.scrollTo({ top: 0 });
}

function closeDetail(){
  document.body.classList.remove("detail-open");
  screenDetail.classList.add("hidden");
  screenList.classList.remove("hidden");
  // NÃO focar automaticamente para não abrir o teclado no mobile
}

function renderList(){
  elItems.innerHTML = "";
  elCount.textContent = String(filtered.length);

  const q = elQ.value.trim();

  for(const h of filtered){
    const li = document.createElement("li");

    const id = Number(h.id); // garante number
    li.dataset.id = String(id);

    if(id === selectedId) li.classList.add("active");

    const title = document.createElement("div");
    title.className = "t";
    title.textContent = `${h.number} - ${h.title}`;

    const sub = document.createElement("div");
    sub.className = "s";
    sub.textContent = snippet(h.lyrics, q);

    li.appendChild(title);
    li.appendChild(sub);

    li.addEventListener("click", () => select(id, true));
    elItems.appendChild(li);
  }
}

function select(id, shouldOpen = false){
  id = Number(id);
  selectedId = id;

  const h = hymns.find(x => Number(x.id) === id);
  if(!h) return;

  elDTitle.textContent = `${h.number} - ${h.title}`;
  elDMeta.textContent = `${(h.lyrics || "").split(/\n+/).filter(Boolean).length} linhas`;
  elDLyrics.textContent = h.lyrics || "";

  try{ localStorage.setItem("lastId", String(id)); }catch{}

  renderList();

  if(shouldOpen) openDetail();
}

function applyFilter(){
  const q = elQ.value.trim();

  if(!q){
    filtered = hymns;
  }else{
    const nq = normalize(q);
    filtered = hymns.filter(h => {
      const t = normalize(h.title);
      const l = normalize(h.lyrics);
      const n = normalize(h.number);
      return t.includes(nq) || l.includes(nq) || n.includes(nq);
    });
  }

  // se selecionado não estiver no filtro, desmarca
  if(selectedId !== null && !filtered.some(x => Number(x.id) === selectedId)){
    selectedId = null;
  }

  renderList();
}

async function load(){
  const res = await fetch("./louvores.json", { cache: "no-cache" });
  const data = await res.json();

  hymns = Array.isArray(data)
    ? data.map(h => ({ ...h, id: Number(h.id) }))
    : [];

  filtered = hymns;
  applyFilter();

  const last = Number(localStorage.getItem("lastId") || "");
  if(Number.isFinite(last) && last > 0){
    select(last, false); // não abre automático
  }
}

btnBack?.addEventListener("click", () => {
  // se estamos no "state detail", voltar também resolve
  if(history.state?.view === "detail") history.back();
  else closeDetail();
});

// Botão voltar do Android / navegador
window.addEventListener("popstate", () => {
  // se o detalhe está aberto, fecha
  if(!screenDetail.classList.contains("hidden")) closeDetail();
});

btnClear?.addEventListener("click", () => {
  elQ.value = "";
  try{ elQ.focus(); }catch{}
  applyFilter();
});

elQ?.addEventListener("input", () => applyFilter());

btnCopy?.addEventListener("click", async () => {
  const h = hymns.find(x => Number(x.id) === selectedId);
  if(!h) return;

  const text = `${h.number} - ${h.title}\n\n${h.lyrics || ""}`;

  try{
    await navigator.clipboard.writeText(text);
    elStatus.textContent = "Copiado ✔";
    setTimeout(() => elStatus.textContent = "", 1200);
  }catch{
    elStatus.textContent = "Não foi possível copiar";
    setTimeout(() => elStatus.textContent = "", 1200);
  }
});

btnShare?.addEventListener("click", async () => {
  const h = hymns.find(x => Number(x.id) === selectedId);
  if(!h) return;

  const text = `${h.number} - ${h.title}\n\n${h.lyrics || ""}`;

  if(navigator.share){
    try{
      await navigator.share({ title: h.title, text });
    }catch{}
  }else{
    try{ await navigator.clipboard.writeText(text); }catch{}
    elStatus.textContent = "Sem Share API: copiei ✔";
    setTimeout(() => elStatus.textContent = "", 1400);
  }
});

btnAminus?.addEventListener("click", () => {
  fontSize = Math.max(FONT_MIN, fontSize - FONT_STEP);
  applyFontSize();
});

btnAplus?.addEventListener("click", () => {
  fontSize = Math.min(FONT_MAX, fontSize + FONT_STEP);
  applyFontSize();
});




// Service worker
if("serviceWorker" in navigator){
  window.addEventListener("load", async () => {
    try{
      const reg = await navigator.serviceWorker.register("./sw.js");
      reg.update?.();
    }catch{}
  });
}

load();
