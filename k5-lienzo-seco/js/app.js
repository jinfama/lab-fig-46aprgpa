import State from "./state.js";
import DataLoader from "./data-loader.js";
import { renderTrend, renderMap, renderTable, colorFor } from "./views.js";

const els = {
  nav: document.getElementById("main-nav"),
  indSelector: document.getElementById("ind-selector"),
  workspace: document.getElementById("workspace"),
  tooltip: document.getElementById("tooltip"),
  home: document.getElementById("btn-home"),
  modal: document.getElementById("modal"),
  modalContent: document.getElementById("modal-content"),
};

let metadata = null;
let current = null;
let geo = null;
let playTimer = null;

const VIEW_LABELS = { trend: "Tendencia", map: "Mapa", table: "Tabla" };

const INDICATOR_DESC = {
  energia: "Consumo de energía primaria: cuántos petajulios o toneladas equivalentes de petróleo mueven la economía española, desagregado por fuentes modernas (petróleo, gas, electricidad) y tradicionales (leña, alimentos y forraje).",
  "emisiones-gei": "Gases de efecto invernadero (CO₂, CH₄, N₂O, F-gases) en CO₂ equivalente. Series largas reconstruidas desde mediados del siglo XIX.",
  "emisiones-co2": "CO₂ por combustibles y usos del suelo. La métrica más comparable internacionalmente y la base de los presupuestos de carbono.",
  materiales: "Flujos materiales aparentes: biomasa, combustibles fósiles, minerales metálicos y no metálicos.",
  "uso-suelo": "Grandes coberturas del territorio: cultivos, bosques, pastizales, otros usos. Mapa provincial.",
  cultivos: "Superficie cultivada y grupos de cultivos. Mapa provincial.",
  bosques: "Superficie forestal, categorías de monte (alto, bajo, abierto) y stock de carbono. Mapa provincial.",
  industria: "Energía, emisiones e intensidad por subsectores industriales.",
  global: "Series ambientales de España junto a agregados continentales y mundiales. Permite comparar la trayectoria española con el mundo en energía, materiales, emisiones y tierras.",
};

function escAttr(v){ return String(v ?? "").replace(/"/g, "&quot;"); }

function showError(err){
  els.workspace.innerHTML = `<div class="error">
    <strong>No se pudo cargar el atlas</strong>
    ${err && err.message ? `<div>${err.message}</div>` : ""}
    <div style="margin-top:10px;font-size:12px;color:var(--ink-soft)">
      Sirve la app vía http:// desde el padre <code>visores/</code>:<br>
      <code>cd C:\\Users\\jinfa\\OneDrive\\06_dev\\visores &amp;&amp; python -m http.server 8787</code><br>
      Abre <code>http://127.0.0.1:8787/web_cahe_v3/index.html</code>.
    </div>
  </div>`;
}

/* ---------- Icono provincial (SVG inline) ---------- */
const PROV_ICON = `<svg width="14" height="11" viewBox="0 0 14 11" fill="currentColor" aria-hidden="true">
  <path d="M1.5 2.5 L3 1 L9 1 L12 1.8 L12.8 3.5 L12.5 6 L10.5 7.5 L4.5 7.5 L2.2 6 Z" stroke="currentColor" stroke-width=".5" fill="currentColor" opacity=".5"/>
  <circle cx="2" cy="9.6" r=".7"/><circle cx="4" cy="9.6" r=".5"/><circle cx="5.5" cy="9.7" r=".4"/>
</svg>`;

/* ---------- Ind selector (tiles arriba dentro de un viz) ---------- */

function renderIndSelector(){
  const inViz = State.get("section") === "visualizacion" && State.get("subsection") === "viz";
  if(!inViz){ els.indSelector.style.display = "none"; return; }
  els.indSelector.style.display = "";
  const cats = metadata.categories;
  els.indSelector.innerHTML = `<div class="ind-tiles">${cats.map(cat => {
    const active = cat.id === State.get("categoryId");
    const isGlobal = cat.id === "global";
    const hasMap = !!cat.mapFile;
    return `<button class="ind-tile${active ? " active" : ""}${isGlobal ? " global" : ""}" data-category="${cat.id}">
      <span class="swatch" style="background:${active ? "" : cat.accent}"></span>
      <span class="name">${cat.label}</span>
      ${isGlobal
        ? `<span class="badge"><span style="font-size:9px">⌬</span> Global</span>`
        : (hasMap ? `<span class="badge">${PROV_ICON} Prov.</span>` : `<span class="badge">Nacional</span>`)}
    </button>`;
  }).join("")}</div>`;
  els.indSelector.querySelectorAll("[data-category]").forEach(btn => {
    btn.addEventListener("click", () => enterViz(btn.dataset.category));
  });
}

/* ---------- State helpers ---------- */

function defaultMapCombo(map){
  if(!map?.combos?.length) return null;
  return (map.combos.find(c => c.indicator === "Superficie" && c.category === "Total") ||
          map.combos.find(c => c.category === "Total") ||
          map.combos[0]).id;
}
function defaultPatchFor(data){
  const cat = data.category;
  const national = data.national;
  const global = data.global;
  const years = global?.years || national?.years || data.map?.years || [1860, 2021];
  return {
    categoryId: cat.id,
    year: years.at(-1),
    variable: national?.defaultVariable || national?.variables?.[0] || "Absoluto",
    tipoMulti: national?.tipos?.includes("Total") ? ["Total"] : (national?.tipos?.slice(0,1) || ["Total"]),
    stacked: false,
    mapComboId: defaultMapCombo(data.map),
    globalIndicator: global?.indicators?.includes("Energía") ? "Energía" : global?.indicators?.[0] || "Energía",
    globalVariable: global?.variables?.includes("Per cápita") ? "Per cápita" : global?.variables?.[0] || "Absoluto",
  };
}
function activeYears(){
  if(!current) return [1860, 2021];
  if(current.global) return current.global.years;
  const view = State.get("view");
  if(view === "map" && current.map) return current.map.years;
  return current.national?.years || current.map?.years || current.global?.years;
}
function clampYear(year){
  const years = activeYears();
  if(!years?.length) return year;
  if(year < years[0]) return years[0];
  if(year > years.at(-1)) return years.at(-1);
  return years.includes(year) ? year : years[DataLoader.yearIndex(years, year)];
}

/* ---------- Main router ---------- */

function renderMain(){
  renderIndSelector();
  const section = State.get("section");
  if(section === "visualizacion"){
    if(State.get("subsection") === "landing") renderVizLanding();
    else renderVizSection();
  } else if(section === "perspectivas") renderPerspectivasSection();
  else if(section === "datos") renderDatosSection();
  else if(section === "acerca") renderAcercaSection();
}

/* ---------- Landing: flip cards ---------- */

function renderVizLanding(){
  const cards = metadata.categories.map(cat => {
    const isGlobal = cat.id === "global";
    const hasMap = !!cat.mapFile;
    const badge = isGlobal ? "Comparativa global"
                : (hasMap ? "Provincial · Nacional" : "Nacional");
    const desc = INDICATOR_DESC[cat.id] || cat.description || "";
    return `<button class="flip-card${isGlobal ? " global" : ""}" data-enter="${cat.id}" type="button">
      <div class="flip-inner">
        <div class="flip-front">
          <div class="top">
            <span class="badge">${isGlobal ? "" : (hasMap ? PROV_ICON : "")} ${badge}</span>
          </div>
          <div class="name">${cat.label}</div>
          <span class="swatch" style="background:${cat.accent}"></span>
        </div>
        <div class="flip-back">
          <p>${desc}</p>
          <span class="open">Abrir visor <span class="arrow">→</span></span>
        </div>
      </div>
    </button>`;
  }).join("");
  els.workspace.innerHTML = `
    <div class="viz-landing">
      <div class="head">
        <div class="eyebrow">Visualización de datos</div>
        <h1>Indicadores ambientales</h1>
        <p>Series largas (1860 hasta hoy) de energía, emisiones, materiales, suelo, bosques y cultivos, además de la comparativa España vs mundo. Pasa el ratón por las tarjetas para leer; pincha para abrir el visor.</p>
      </div>
      <div class="flip-grid">${cards}</div>
    </div>`;
  els.workspace.querySelectorAll("[data-enter]").forEach(btn => {
    btn.addEventListener("click", () => enterViz(btn.dataset.enter));
  });
}

async function enterViz(categoryId){
  State.set("subsection", "viz");
  await selectCategory(categoryId);
}

/* ---------- Viz section ---------- */

function renderVizSection(){
  if(!current?.national && !current?.map && !current?.global){
    els.workspace.innerHTML = `<div class="loading"><span class="spinner"></span><strong>Cargando indicador</strong></div>`;
    return;
  }
  const cat = current.category;
  const national = current.national;
  const map = current.map;
  const global = current.global;
  const hasMap = !!map;
  const isGlobal = !!global;
  let view = State.get("view");
  const allViews = isGlobal ? ["trend","table"] : ["trend", ...(hasMap ? ["map"] : []), "table"];
  if(!allViews.includes(view)) view = "trend";
  if(view !== State.get("view")) State.set("view", view);

  const variables = (isGlobal ? global.variables : national?.variables) || ["Absoluto"];
  const variableState = isGlobal ? "globalVariable" : "variable";
  const currentVar = State.get(variableState);

  const tipos = national?.tipos || [];
  const tipoMulti = State.get("tipoMulti") || ["Total"];
  const stacked = State.get("stacked");
  const mapOptions = map?.combos?.map(c =>
    `<option value="${escAttr(c.id)}"${c.id === State.get("mapComboId") ? " selected" : ""}>${c.label}</option>`).join("") || "";

  els.workspace.innerHTML = `
    <div class="viz">
      <div class="indicator-head">
        <div class="meta">
          <h1>${cat.label}</h1>
          <p>${INDICATOR_DESC[cat.id] || cat.description || ""}</p>
        </div>
      </div>

      <div class="tab-row">
        <div class="view-tabs">
          ${allViews.map(v => `<button class="view-tab${v === view ? " active" : ""}" data-view="${v}">${VIEW_LABELS[v]}</button>`).join("")}
        </div>
        <button class="btn-method" id="btn-method"><span class="icon">M</span> Metodología</button>
      </div>

      <div class="filter-bar">
        ${variables.length > 1 ? `<div class="field"><label>Medida</label><select id="f-variable">${variables.map(v => `<option${v === currentVar ? " selected" : ""}>${v}</option>`).join("")}</select></div>` : ""}
        ${isGlobal ? `<div class="field"><label>Indicador</label><select id="g-indicator">${global.indicators.map(i => `<option${i === State.get("globalIndicator") ? " selected" : ""}>${i}</option>`).join("")}</select></div>` : ""}
        ${hasMap && view === "map" ? `<div class="field"><label>Combinación</label><select id="f-mapcombo">${mapOptions}</select></div>` : ""}
        ${(view === "trend" || view === "table") && !isGlobal && tipos.length ? `
          <div class="field"><label>Componentes</label>
            <div class="comp-chips" id="f-tipo-multi">
              ${tipos.map(t => `<button type="button" class="comp-chip${tipoMulti.includes(t) ? " active" : ""}" data-tipo="${escAttr(t)}"><span class="sw" style="background:${colorFor(t,0)}"></span>${t}</button>`).join("")}
            </div>
          </div>` : ""}
        ${(view === "trend") && !isGlobal && tipoMulti.length >= 2 ? `
          <button type="button" class="comp-chip${stacked ? " active" : ""}" id="f-stacked">${stacked ? "▮ Apilado" : "▦ Líneas"}</button>` : ""}
        <div class="spacer"></div>
      </div>

      <div class="canvas">
        <div class="chart-area-wrap" id="canvas-main" style="flex:1;display:flex;flex-direction:column;min-height:0"></div>
        <div class="viz-timeline">
          <button class="play-btn" id="play-btn" type="button" aria-label="Reproducir">
            <svg viewBox="0 0 24 24" id="play-icon"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
          </button>
          <div class="year-readout" id="year-readout">${State.get("year")}</div>
          <input class="year-slider" id="year-slider" type="range">
          <div class="year-range" id="year-range"></div>
        </div>
      </div>
    </div>`;

  bindVizControls();
  syncTimeline();
  drawCurrentView();
}

function bindVizControls(){
  els.workspace.querySelectorAll("[data-view]").forEach(btn => {
    btn.addEventListener("click", () => { State.set("view", btn.dataset.view); renderMain(); });
  });
  const fv = els.workspace.querySelector("#f-variable");
  if(fv) fv.addEventListener("change", e => {
    if(current?.global) State.set("globalVariable", e.target.value);
    else State.set("variable", e.target.value);
    renderMain();
  });
  const gi = els.workspace.querySelector("#g-indicator");
  if(gi) gi.addEventListener("change", e => { State.set("globalIndicator", e.target.value); renderMain(); });
  const mc = els.workspace.querySelector("#f-mapcombo");
  if(mc) mc.addEventListener("change", e => { State.set("mapComboId", e.target.value); renderMain(); });

  // Componentes multi-select
  els.workspace.querySelectorAll("[data-tipo]").forEach(chip => {
    chip.addEventListener("click", () => {
      const t = chip.dataset.tipo;
      const cur = new Set(State.get("tipoMulti"));
      if(cur.has(t)) cur.delete(t); else cur.add(t);
      if(cur.size === 0) cur.add("Total");
      State.set("tipoMulti", Array.from(cur));
      // Si se queda con <2 elementos no-Total, desactivar stacked
      if(Array.from(cur).filter(x => x !== "Total").length < 2) State.set("stacked", false);
      renderMain();
    });
  });
  const st = els.workspace.querySelector("#f-stacked");
  if(st) st.addEventListener("click", () => { State.set("stacked", !State.get("stacked")); renderMain(); });

  const bm = els.workspace.querySelector("#btn-method");
  if(bm) bm.addEventListener("click", openMethodModal);

  // Timeline (lives inside the viz now)
  const slider = els.workspace.querySelector("#year-slider");
  const readout = els.workspace.querySelector("#year-readout");
  const play = els.workspace.querySelector("#play-btn");
  if(slider) slider.addEventListener("input", e => {
    State.set("year", clampYear(Number(e.target.value)));
    if(readout) readout.textContent = State.get("year");
    updateYearOnly();
  });
  if(play){
    play.addEventListener("click", () => {
      const next = !State.get("playing");
      State.set("playing", next);
      play.classList.toggle("active", next);
      if(playTimer){ clearInterval(playTimer); playTimer = null; }
      if(!next) return;
      playTimer = setInterval(() => {
        const years = activeYears();
        const idx = DataLoader.yearIndex(years, State.get("year"));
        const nextYear = years[(idx + 1) % years.length];
        State.set("year", nextYear);
        const sl = els.workspace.querySelector("#year-slider");
        const ro = els.workspace.querySelector("#year-readout");
        if(sl) sl.value = nextYear;
        if(ro) ro.textContent = nextYear;
        updateYearOnly();
      }, 280);
    });
  }
}

function syncTimeline(){
  const years = activeYears();
  if(!years?.length) return;
  const year = clampYear(Number(State.get("year")));
  if(year !== State.get("year")) State.set("year", year);
  const slider = els.workspace.querySelector("#year-slider");
  const readout = els.workspace.querySelector("#year-readout");
  const range = els.workspace.querySelector("#year-range");
  const play = els.workspace.querySelector("#play-btn");
  if(slider){ slider.min = years[0]; slider.max = years.at(-1); slider.step = 1; slider.value = year; }
  if(readout) readout.textContent = year;
  if(range) range.textContent = `${years[0]}–${years.at(-1)}`;
  if(play) play.classList.toggle("active", State.get("playing"));
}

function drawCurrentView(){
  const view = State.get("view");
  const main = els.workspace.querySelector("#canvas-main");
  if(!main) return;
  const state = State.snapshot();
  requestAnimationFrame(() => {
    if(view === "map") renderMap(main, current, state, geo, els.tooltip);
    else if(view === "trend") renderTrend(main, current, state);
    else if(view === "table") renderTable(main, current, state);
  });
}
function updateYearOnly(){
  const main = els.workspace.querySelector("#canvas-main");
  if(main && typeof main.__updateYear === "function") main.__updateYear(State.get("year"));
  else drawCurrentView();
}

/* ---------- Methodology modal ---------- */

const METHOD_DOCS = {
  energia: "energia_metodologia.pdf",
  "emisiones-gei": "emisiones_metodologia.pdf",
  "emisiones-co2": "emisiones_metodologia.pdf",
  materiales: "materiales_metodologia.pdf",
  "uso-suelo": "uso_suelo_metodos_esp.docx",
  bosques: "bosques_metodologia.pdf",
  cultivos: "cultivos_metodos_esp.docx",
  industria: "agricultura_territorio_metodologia.pdf",
  global: "globales_metodologia.pdf",
};

function openMethodModal(){
  if(!current) return;
  const cat = current.category;
  const national = current.national;
  const map = current.map;
  const global = current.global;
  const doc = METHOD_DOCS[cat.id];
  const docLink = doc ? `../web_cahe/site/assets/docs/${doc}` : null;

  els.modalContent.innerHTML = `
    <span class="modal-eyebrow">Metodología</span>
    <h2>${cat.label}</h2>
    <p>${INDICATOR_DESC[cat.id] || cat.description || ""}</p>

    <h3>Cobertura</h3>
    <ul>
      ${national ? `<li>Serie nacional: <strong>${national.years[0]}–${national.years.at(-1)}</strong> (${national.series.length} series).</li>` : ""}
      ${map ? `<li>Datos provinciales: <strong>${map.years[0]}–${map.years.at(-1)}</strong> (${Object.keys(map.provinces || {}).length} provincias, ${map.combos.length} combinaciones).</li>` : ""}
      ${global ? `<li>Comparativa global: <strong>${global.years[0]}–${global.years.at(-1)}</strong> (${global.areas.length} áreas, ${global.indicators.length} indicadores).</li>` : ""}
      ${!map && !global ? `<li>Sin desagregación provincial.</li>` : ""}
    </ul>

    ${(national?.variables || global?.variables) ? `<h3>Variables disponibles</h3>
    <ul>${(national?.variables || global?.variables || []).map(v => `<li>${v}</li>`).join("")}</ul>` : ""}

    ${national?.tipos?.length ? `<h3>Componentes</h3>
    <ul>${national.tipos.map(t => `<li>${t}</li>`).join("")}</ul>` : ""}

    <h3>Fuentes de datos</h3>
    <ul>
      ${national ? `<li><code>${national.sourceFile || "—"}</code></li>` : ""}
      ${map ? `<li><code>${map.sourceFile || "—"}</code></li>` : ""}
      ${global ? `<li><code>${global.sourceFile || "—"}</code></li>` : ""}
    </ul>

    ${docLink ? `<div class="cta-row">
      <a class="cta" href="${docLink}" target="_blank" rel="noopener">Descargar metodología completa <span class="arrow">↗</span></a>
    </div>` : ""}

    <p style="margin-top:12px;font-style:italic;color:var(--ink-mute);font-size:12px">
      Reconstrucción y metodología originales del proyecto CAHE. Cita y referencias en el documento descargable.
    </p>`;
  els.modal.classList.add("open");
}
function closeMethodModal(){ els.modal.classList.remove("open"); }

/* ---------- Perspectivas ---------- */

const PERSPECTIVAS = [
  { slug: "emisiones-historicas", title: "Emisiones históricas de España",
    summary: "Trayectoria de las emisiones de gases de efecto invernadero desde el siglo XIX, fuentes y deudas de carbono.", cat: "Emisiones" },
  { slug: "emisiones-balance-historico", title: "El balance histórico de emisiones",
    summary: "Quién emite más y desde cuándo. Cuotas y comparativas internacionales con perspectiva de largo plazo.", cat: "Emisiones" },
  { slug: "desacoplamiento-mito-realidad", title: "Desacoplamiento: ¿mito o realidad?",
    summary: "Lectura crítica del concepto de desacoplamiento entre crecimiento e impacto ambiental — qué dicen los datos.", cat: "Análisis" },
  { slug: "crecimiento-y-eficiencia", title: "Crecimiento y eficiencia",
    summary: "La aparente paradoja de Jevons: cómo conviven la mejora técnica y el aumento absoluto de consumo.", cat: "Análisis" },
  { slug: "huella-acumulada-espana", title: "La huella acumulada de España",
    summary: "Stocks y flujos: lo que España ha extraído, emitido y movido a lo largo de su historia industrial.", cat: "Materiales" },
  { slug: "materiales-espana-construye", title: "España se construye",
    summary: "Boom de la construcción y materiales: una mirada al ciclo extractivo del país.", cat: "Materiales" },
  { slug: "transicion-forestal", title: "La transición forestal",
    summary: "De los siglos de deforestación al regreso del bosque: cómo y por qué cambia la cobertura forestal.", cat: "Bosques" },
];

function renderPerspectivasSection(){
  const cards = PERSPECTIVAS.map(p => `
    <a class="card" href="../web_cahe/site/perspectivas/${p.slug}.html" target="_blank" rel="noopener">
      <span class="card-eyebrow">${p.cat}</span>
      <h3>${p.title}</h3>
      <p>${p.summary}</p>
      <div class="card-foot"><span>Artículo</span><span class="arrow">→</span></div>
    </a>`).join("");
  els.workspace.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div class="eyebrow">Perspectivas</div>
        <h1>Textos, análisis y debates</h1>
        <p>Lecturas largas sobre los datos del atlas: emisiones, materiales, bosques, desacoplamiento. Cada texto enlaza a la edición original publicada en cahe.es.</p>
      </div>
      <div class="card-grid">${cards}</div>
    </div>`;
}

/* ---------- Datos ---------- */

const DATOS_FILES = [
  { file: "cahe_datos_integrados.xlsx", label: "Dataset integrado", desc: "Excel completo: emisiones, energía, materiales, suelo, bosques, cultivos. Series largas 1860–2021." },
  { file: "cahe_datos_emisiones_gei.xlsx", label: "Emisiones GEI", desc: "Series históricas en CO₂ equivalente, por fuente y sector." },
  { file: "cahe_datos_emisiones_co2.xlsx", label: "Emisiones de CO₂", desc: "CO₂ por combustibles y usos del suelo." },
  { file: "cahe_datos_energía.xlsx", label: "Consumo de energía", desc: "Fuentes modernas y tradicionales, intensidad, per cápita." },
  { file: "cahe_datos_materiales.xlsx", label: "Flujos materiales", desc: "Biomasa, minerales, fósiles y agregados." },
  { file: "cahe_datos_uso_suelo.xlsx", label: "Usos del suelo", desc: "Grandes coberturas y usos territoriales." },
  { file: "cahe_datos_bosques.xlsx", label: "Bosques", desc: "Superficie forestal, categorías de monte y stock de carbono." },
  { file: "cahe_datos_cultivos.xlsx", label: "Cultivos", desc: "Superficie cultivada y grupos de cultivos." },
];
const METODOS = [
  { file: "emisiones_metodologia.pdf", label: "Emisiones — metodología" },
  { file: "energia_metodologia.pdf", label: "Energía — metodología" },
  { file: "materiales_metodologia.pdf", label: "Materiales — metodología" },
  { file: "uso_suelo_metodos_esp.docx", label: "Uso del suelo — métodos" },
  { file: "bosques_metodologia.pdf", label: "Bosques — metodología" },
  { file: "cultivos_metodos_esp.docx", label: "Cultivos — métodos" },
  { file: "agricultura_territorio_metodologia.pdf", label: "Agricultura y territorio" },
  { file: "globales_metodologia.pdf", label: "Comparativa global — metodología" },
];

function renderDatosSection(){
  const datos = DATOS_FILES.map(d => `
    <div class="data-row">
      <div><div class="label">${d.label}</div><div class="desc">${d.desc}</div></div>
      <div class="desc">XLSX · publicado en cahe.es</div>
      <a class="link" href="../web_cahe/site/assets/docs/${d.file}" target="_blank" rel="noopener">Descargar</a>
    </div>`).join("");
  const metodos = METODOS.map(d => `
    <div class="data-row">
      <div><div class="label">${d.label}</div></div>
      <div class="desc">PDF / DOCX</div>
      <a class="link" href="../web_cahe/site/assets/docs/${d.file}" target="_blank" rel="noopener">Abrir</a>
    </div>`).join("");

  els.workspace.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div class="eyebrow">Datos &amp; depósitos</div>
        <h1>Descargas, Excel y Zenodos</h1>
        <p>Las series del atlas están disponibles en formato Excel y depositadas en repositorios abiertos. Cada dataset incluye su metodología y referencias.</p>
      </div>
      <section class="section-block">
        <h2>Datasets</h2>
        <div class="sub">Series largas listas para usar. Citables vía Zenodo (en preparación).</div>
        <div class="data-list">${datos}</div>
      </section>
      <section class="section-block">
        <h2>Metodologías</h2>
        <div class="sub">Documentos técnicos que explican fuentes, supuestos y reconstrucciones.</div>
        <div class="data-list">${metodos}</div>
      </section>
      <section class="section-block">
        <h2>Depósitos Zenodo</h2>
        <div class="sub">Cuando se publique cada dataset en Zenodo, su DOI aparecerá aquí. De momento las descargas son directas vía cahe.es.</div>
        <div class="card-grid" style="margin-top:8px">
          <a class="card" href="https://zenodo.org/communities/cahe" target="_blank" rel="noopener">
            <span class="card-eyebrow">Comunidad</span>
            <h3>CAHE en Zenodo</h3>
            <p>Comunidad pendiente de creación. Recogerá los DOIs de cada dataset histórico junto con su versión de metodología.</p>
            <div class="card-foot"><span>zenodo.org/communities/cahe</span><span class="arrow">→</span></div>
          </a>
        </div>
      </section>
    </div>`;
}

/* ---------- Acerca (replicado de v1 con estética nueva) ---------- */

const V1_IMG = "../web_cahe/site/assets/img";

const TEAM = [
  { name: "Juan Infante Amate", aff: "Universidad de Granada", photo: "infante_foto.jpg",
    links: [
      { href: `${V1_IMG}/infante_CV.pdf`, title: "CV", icon: "cv-1.png" },
      { href: "https://scholar.google.com/citations?user=s89YchgAAAAJ&hl=es", title: "Google Scholar", icon: "google-scholar-1.png" },
      { href: "https://www.researchgate.net/profile/Juan-Infante-Amate", title: "ResearchGate", icon: "ResearchGate_icon_SVG.svg.png" },
      { href: "https://www.ugr.es/personal/juan-infante-amate", title: "Web", icon: "web.png" },
    ]},
  { name: "Iñaki Iriarte Goñi", aff: "Universidad de Zaragoza", photo: "iriarte_foto-1.jpg",
    links: [
      { href: "https://scholar.google.es/citations?user=C0tX2hQAAAAJ&hl=es", title: "Google Scholar", icon: "google-scholar-1.png" },
      { href: "https://www.researchgate.net/profile/Inaki-Iriarte-Goni", title: "ResearchGate", icon: "ResearchGate_icon_SVG.svg.png" },
      { href: "https://economia_aplicada.unizar.es/personal/jose-ignacio-iriarte-goni", title: "Web", icon: "web.png" },
    ]},
  { name: "Eduardo Aguilera", aff: "CSIC", photo: "aguilera_foto-1.jpg",
    links: [
      { href: "https://scholar.google.com/citations?hl=es&user=3c01eqQAAAAJ", title: "Google Scholar", icon: "google-scholar-1.png" },
      { href: "https://www.researchgate.net/profile/Eduardo-Aguilera", title: "ResearchGate", icon: "ResearchGate_icon_SVG.svg.png" },
      { href: "https://www.cchs.csic.es/es/personal/eduardo-manuel-aguilera-fernandez", title: "Web", icon: "web.png" },
    ]},
];

function renderAcercaSection(){
  const teamCards = TEAM.map(t => `
    <div class="team-card">
      <img class="photo" src="${V1_IMG}/${t.photo}" alt="${t.name}" onerror="this.style.display='none'">
      <div class="body">
        <div class="name">${t.name}</div>
        <div class="aff">${t.aff}</div>
        <div class="links">
          ${t.links.map(l => `<a href="${l.href}" target="_blank" rel="noopener" title="${l.title}"><img src="${V1_IMG}/${l.icon}" alt="${l.title}"></a>`).join("")}
        </div>
      </div>
    </div>`).join("");

  els.workspace.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div class="eyebrow">Acerca</div>
        <h1>El proyecto CAHE</h1>
        <p>Contabilidad Ambiental Histórica de España. Un atlas de series largas sobre uso de recursos, impactos ambientales y desarrollo económico desde 1860.</p>
      </div>

      <div class="acordion" id="acordion">
        <div class="acordion-item">
          <button class="acordion-head open" data-toggle><span>La CAHE</span><span class="ico"></span></button>
          <div class="acordion-body open">
            <div class="prose">
              <p>La Contabilidad Ambiental Histórica de España (CAHE) es un proyecto de investigación que reconstruye series estadísticas de largo plazo sobre el uso de recursos naturales, los impactos ambientales y el desarrollo económico en España. El objetivo es extender en el tiempo las cuentas ambientales —integradas hoy en las principales agencias estadísticas pero limitadas a períodos recientes— para ofrecer una perspectiva histórica amplia.</p>
              <p>Las series responden a un doble propósito. En primer lugar, contribuir a incorporar la variable ambiental en la narrativa del desarrollo económico moderno: como ha argumentado Dipesh Chakrabarty, comprender la intersección entre historia humana e historia del planeta es hoy una tarea intelectual ineludible. En segundo lugar, ofrecer series históricas suficientemente profundas para que la mirada de largo plazo pueda informar mejor el diseño de la política ambiental contemporánea.</p>
              <p>Las series cubren indicadores sobre consumo de energía, flujos de materiales, usos del suelo, superficie forestal y de cultivos, y emisiones de gases de efecto invernadero, entre otros. Abarcan desde mediados del siglo XIX hasta la actualidad y se presentan a distintas escalas: nacional, regional y provincial.</p>
              <p>Los resultados aquí presentados son estimaciones basadas en fuentes históricas y métodos de reconstrucción cuantitativa. Las fuentes originales pueden contener errores no detectados y, en algunos casos, ciertos vacíos se han completado con métodos aproximados. No obstante, como ha señalado <a href="https://histecon.fas.harvard.edu/energyhistory/British_energy_multipliers_Warde_Nov_2016.pdf" target="_blank" rel="noopener">Paul Warde</a>, en este tipo de trabajos la exactitud absoluta no solo es inalcanzable sino innecesaria: el objetivo es obtener trayectorias suficientemente robustas para documentar los principales cambios temporales y espaciales del impacto ambiental.</p>
              <p>Este proyecto es fruto de más de una década de investigación por un equipo interdisciplinar. En esta web compartimos los datos abiertos, herramientas de visualización interactiva y breves análisis divulgativos.</p>
            </div>
          </div>
        </div>

        <div class="acordion-item">
          <button class="acordion-head" data-toggle><span>Equipo</span><span class="ico"></span></button>
          <div class="acordion-body">
            <div class="team-grid">${teamCards}</div>
          </div>
        </div>

        <div class="acordion-item">
          <button class="acordion-head" data-toggle><span>Financiación</span><span class="ico"></span></button>
          <div class="acordion-body">
            <div class="prose">
              <p>Esta web ha sido desarrollada en el marco del proyecto <strong>DESIMPACTA</strong> (PID2021-123220NB-I00), financiado por la Agencia Estatal de Investigación (AEI) y el Fondo Europeo de Desarrollo Regional (FEDER). IPs: Juan Infante-Amate e Iñaki Iriarte Goñi.</p>
              <p>La elaboración de las series históricas se apoya en este proyecto, así como en la colaboración en otros proyectos:</p>
              <ul>
                <li><strong>HEDEC</strong> (2024–2027) — <em>Historical perspectives on economic development and environmental change, 19th–21st centuries</em>. Proyecto coordinado, AEI.
                  <ul>
                    <li>Subproyecto 1: <em>History, economy and the environment: Natural resources, institutions and technology</em>. IP: Iñaki Iriarte Goñi, Universidad de Zaragoza.</li>
                    <li>Subproyecto 2: <em>ECOATLANTIC — Economic Development, International Trade, and the Environment on Both Sides of the Atlantic, 1800–2020</em>. IP: Juan Infante-Amate, Universidad de Granada.</li>
                  </ul>
                </li>
                <li><strong>Fundación Ramón Areces</strong> (2020–2023) — <em>El impacto del crecimiento económico moderno en el cambio climático (España, 1860–2020)</em>. XIX Concurso Nacional de Investigación en Economía. IP: Juan Infante-Amate.</li>
                <li><strong>Becas Leonardo, Fundación BBVA</strong> (2019–2021) — <em>La huella material del desarrollo económico en España (1860–2015)</em>. IP: Juan Infante-Amate.</li>
              </ul>
            </div>
            <div class="logo-strip" style="margin-top:14px">
              <img src="${V1_IMG}/MICIUFEDERAEI.jpg" alt="Ministerio · FEDER · AEI" onerror="this.style.display='none'">
              <img src="${V1_IMG}/logo-areces.jpg" alt="Fundación Ramón Areces" onerror="this.style.display='none'">
              <img src="${V1_IMG}/logo-bbva.jpg" alt="Fundación BBVA" onerror="this.style.display='none'">
            </div>
            <p style="margin-top:10px;font-size:12px;font-style:italic;color:var(--ink-mute)">Las entidades financiadoras no se hacen responsables de las opiniones expresadas en esta publicación.</p>
          </div>
        </div>

        <div class="acordion-item">
          <button class="acordion-head" data-toggle><span>Instituciones</span><span class="ico"></span></button>
          <div class="acordion-body">
            <div class="logo-strip">
              <img src="${V1_IMG}/logo-ugr.png" alt="Universidad de Granada" onerror="this.style.display='none'">
              <img src="${V1_IMG}/logo-unizar.png" alt="Universidad de Zaragoza" onerror="this.style.display='none'">
              <img src="${V1_IMG}/logo-csic.jpg" alt="CSIC" onerror="this.style.display='none'">
            </div>
          </div>
        </div>

        <div class="acordion-item">
          <button class="acordion-head" data-toggle><span>Cita y versiones</span><span class="ico"></span></button>
          <div class="acordion-body">
            <div class="prose">
              <p><strong>Cómo citar:</strong><br>
              Infante-Amate, J., Iriarte Goñi, I., Aguilera, E. <em>Contabilidad Ambiental Histórica de España (CAHE)</em>. Atlas en línea, 2026.</p>
              <p><strong>Versiones del visor:</strong></p>
              <ul>
                <li><a href="../web_cahe/site/index.html" target="_blank" rel="noopener">v1 (cahe.es)</a> — tarjetas y HTMLs autocontenidos por indicador.</li>
                <li><a href="../web_cahe_v2/index.html" target="_blank" rel="noopener">v2 (beta modular)</a> — atlas estático.</li>
                <li>v3 (este) — visor unificado, panel único por indicador.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  // Bind acordion
  els.workspace.querySelectorAll("[data-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      const head = btn;
      const body = head.nextElementSibling;
      const open = head.classList.contains("open");
      els.workspace.querySelectorAll(".acordion-head").forEach(h => h.classList.remove("open"));
      els.workspace.querySelectorAll(".acordion-body").forEach(b => b.classList.remove("open"));
      if(!open){ head.classList.add("open"); body.classList.add("open"); }
    });
  });
}

/* ---------- Category load ---------- */

async function selectCategory(categoryId){
  els.workspace.innerHTML = `<div class="loading"><span class="spinner"></span><strong>Cargando indicador</strong></div>`;
  current = await DataLoader.loadCategory(categoryId);
  State.patch(defaultPatchFor(current));
  State.set("view", current.map ? "trend" : (current.global ? "trend" : "trend"));
  renderMain();
}

/* ---------- Nav ---------- */

function bindNav(){
  els.nav.querySelectorAll("[data-section]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const section = btn.dataset.section;
      els.nav.querySelectorAll("[data-section]").forEach(b => b.classList.toggle("active", b.dataset.section === section));
      State.set("section", section);
      if(section === "visualizacion"){
        State.set("subsection", "landing");
        window.location.hash = "visualizacion";
      } else {
        window.location.hash = section;
      }
      renderMain();
    });
  });
}
function bindHome(){
  els.home.addEventListener("click", () => {
    if(window.parent !== window){
      window.parent.postMessage({ type: "cahe-back" }, "*");
    } else {
      window.location.href = "index.html";
    }
  });
}
function bindModal(){
  document.querySelectorAll("[data-modal-close]").forEach(el => el.addEventListener("click", closeMethodModal));
  window.addEventListener("keydown", e => { if(e.key === "Escape") closeMethodModal(); });
}

/* ---------- Init ---------- */

async function init(){
  try {
    if(typeof d3 === "undefined") throw new Error("D3.js no se ha cargado.");
    if(location.protocol === "file:") throw new Error("Sirve la página vía http://.");
    metadata = await DataLoader.init();
    geo = await DataLoader.getGeo();
    bindNav();
    bindHome();
    bindModal();
    let initialSection = "visualizacion";
    let initialSub = "landing";
    let initialCat = null;
    const hash = window.location.hash.replace("#","");
    if(["perspectivas","datos","acerca"].includes(hash)) initialSection = hash;
    else if(metadata.categories.find(c => c.id === hash)){
      initialSection = "visualizacion"; initialSub = "viz"; initialCat = hash;
    }
    State.patch({ section: initialSection, subsection: initialSub });
    els.nav.querySelectorAll("[data-section]").forEach(b => b.classList.toggle("active", b.dataset.section === initialSection));
    if(initialCat) await enterViz(initialCat);
    else renderMain();
  } catch(err){
    console.error("[CAHE]", err);
    showError(err);
  }
}
init();
