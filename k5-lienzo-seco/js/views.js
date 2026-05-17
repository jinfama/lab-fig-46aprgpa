import DataLoader from "./data-loader.js";

/* ---------- Colores ---------- */
const TIPO_COLORS = {
  "Total": "#1c1f24", "Petróleo": "#c93324", "Gas": "#e6892b", "Electricidad": "#e0c032",
  "Carbón": "#3a4147", "Leña": "#8b5a3c", "Alimentos y forraje": "#a07a3a",
  "Hidráulica y eólica": "#3a6d8a", "Hidráulica": "#3a6d8a", "Eólica": "#5e8aab", "Solar": "#c79a3b",
  "CO2": "#a44c2c", "CO₂": "#a44c2c", "CH4": "#c8763f", "CH₄": "#c8763f",
  "N2O": "#e0a44a", "N₂O": "#e0a44a", "F-gases": "#6f7a3d",
  "Biomasa": "#4f8a64", "Combustibles fósiles": "#3a4147",
  "Minerales no metálicos": "#a07a3a", "Metales": "#5e6871",
  "Monte alto": "#2c5d3e", "Monte bajo": "#4f8a64", "Monte abierto": "#7eab86",
  "Cereales": "#c79a3b", "Leguminosas": "#6f7a3d", "Frutales": "#a44c2c",
  "Hortalizas": "#4f8a64", "Industriales": "#5e6871", "Forrajes": "#8b5a3c",
  "Cultivos": "#c79a3b", "Bosques": "#4f8a64", "Pastizales": "#7eab86",
  "Otros": "#a07a3a", "Erial": "#a07a3a", "Superficie": "#1c1f24",
  "España": "#c93324", "Mundo": "#3a6d8a",
};
const FALLBACK_PALETTE = ["#c93324","#3a6d8a","#6f7a3d","#c79a3b","#8b5a3c","#4f8a64","#a44c2c","#5e6871","#2c5d3e","#e6892b"];

export function colorFor(key, fallbackIdx = 0){
  if(TIPO_COLORS[key]) return TIPO_COLORS[key];
  if(!key) return FALLBACK_PALETTE[fallbackIdx % FALLBACK_PALETTE.length];
  let h = 0;
  for(let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0xffffffff;
  return FALLBACK_PALETTE[Math.abs(h) % FALLBACK_PALETTE.length];
}

/* ---------- Helpers ---------- */
function sizeOf(node){
  const box = node.getBoundingClientRect();
  return { width: Math.max(280, box.width || 600), height: Math.max(220, box.height || 360) };
}
function clear(node){ node.innerHTML = ""; }
function compact(t, max = 30){ const v = String(t || ""); return v.length > max ? v.slice(0, max - 1) + "…" : v; }
function fmt(value, unit = ""){
  if(value == null || !Number.isFinite(value)) return "s/d";
  const abs = Math.abs(value);
  let out;
  if(abs >= 1e9) out = d3.format(".2s")(value).replace("G","B");
  else if(abs >= 1e6) out = d3.format(".3s")(value);
  else if(abs >= 1000) out = d3.format(",.0f")(value);
  else if(abs >= 10) out = d3.format(",.1f")(value);
  else out = d3.format(",.2f")(value);
  return unit ? `${out} ${unit}` : out;
}
function pct(value){ if(value == null || !Number.isFinite(value)) return "—"; return d3.format("+.1%")(value); }
function empty(container, text){
  clear(container);
  const node = document.createElement("div"); node.className = "empty"; node.textContent = text;
  container.appendChild(node);
}
function chartShell(container){
  clear(container);
  const area = document.createElement("div"); area.className = "chart-area";
  const legend = document.createElement("div"); legend.className = "chart-legend";
  container.appendChild(area); container.appendChild(legend);
  return { area, legend };
}
function buildLegend(legendEl, rows){
  if(!rows.length){ legendEl.style.display = "none"; return; }
  legendEl.style.display = "";
  legendEl.innerHTML = rows.map(r =>
    `<span class="legend-row"><span class="legend-swatch" style="background:${r.color}"></span>${compact(r.label, 28)}</span>`
  ).join("");
}

/* ============================================================
   Tendencia (líneas, ahora con clipPath progresivo y ejes etiquetados)
   ============================================================ */

export function renderTrend(container, data, state){
  const dataset = data.global ? data.global : data.national;
  if(!dataset){ empty(container, "Sin serie."); return; }
  let series = [], unit = "";

  if(data.global){
    series = dataset.series.filter(s =>
      s.indicator === state.globalIndicator && s.variable === state.globalVariable);
    unit = series[0]?.variableUnit || "";
    drawLineChart(container, dataset.years, series, { year: state.year, unit });
    return;
  }
  const variable = state.variable || dataset.defaultVariable;
  const all = dataset.series.filter(s => s.variable === variable);
  const wanted = state.tipoMulti && state.tipoMulti.length ? state.tipoMulti : ["Total"];
  const byTipo = new Map();
  all.forEach(s => { if(!byTipo.has(s.tipo)) byTipo.set(s.tipo, s); });
  series = wanted.map(t => byTipo.get(t)).filter(Boolean);
  if(!series.length) series = all.slice(0, 1);
  unit = series[0]?.variableUnit || series[0]?.unit || "";

  if(state.stacked && series.length >= 2){
    drawStackedArea(container, dataset.years, series, { year: state.year, unit });
  } else {
    drawLineChart(container, dataset.years, series, { year: state.year, unit });
  }
}

function drawLineChart(container, years, series, opts = {}){
  const { area, legend } = chartShell(container);
  if(!series.length){ empty(area, "Sin datos."); return; }
  const { width, height } = sizeOf(area);
  const margin = { top: 22, right: 56, bottom: 32, left: 70 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const svg = d3.select(area).append("svg")
    .attr("class","chart-svg").attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio","none");

  const values = series.flatMap(s => s.values.filter(v => v != null && Number.isFinite(v)));
  const extent = d3.extent(values);
  if(extent[0] == null){ empty(area, "Sin datos numéricos."); return; }
  const x = d3.scaleLinear().domain(d3.extent(years)).range([0, innerW]);
  const yMin = extent[0] < 0 ? extent[0] : 0;
  const y = d3.scaleLinear().domain([yMin, extent[1] || 1]).nice().range([innerH, 0]);

  const clipId = "clip-" + Math.random().toString(36).slice(2, 9);
  svg.append("defs").append("clipPath").attr("id", clipId)
    .append("rect").attr("x", 0).attr("y", -10).attr("width", innerW).attr("height", innerH + 20);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  g.append("g").attr("class","grid")
    .call(d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat(""))
    .call(sel => sel.select(".domain").remove());
  g.append("g").attr("class","axis").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format("d")));
  g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(6).tickFormat(d => fmt(d)));

  if(opts.unit){
    g.append("text").attr("class","axis-label").attr("x", -8).attr("y", -8).attr("text-anchor","start").text(opts.unit);
  }
  g.append("text").attr("class","axis-label")
    .attr("x", innerW + 6).attr("y", innerH + 4).attr("text-anchor","start")
    .attr("dominant-baseline","middle").text("n = " + years.at(-1));

  const linesG = g.append("g").attr("clip-path", `url(#${clipId})`);
  const line = d3.line()
    .defined(d => d.value != null && Number.isFinite(d.value))
    .x(d => x(d.year)).y(d => y(d.value));
  const seriesWithColor = series.map((s, idx) => ({
    ...s, _color: colorFor(s.tipo || s.area || s.variableUnit, idx),
  }));
  seriesWithColor.forEach(s => {
    const pts = years.map((year, i) => ({ year, value: s.values[i] }));
    linesG.append("path").datum(pts)
      .attr("fill","none").attr("stroke", s._color)
      .attr("stroke-width", 2.2).attr("opacity", .95).attr("d", line);
  });

  const ix = DataLoader.yearIndex(years, opts.year);
  const cx0 = x(years[ix]);
  const rect = svg.select(`#${clipId} rect`);
  rect.attr("width", cx0);

  const marker = g.append("g").attr("class","year-marker");
  marker.append("line")
    .attr("x1", cx0).attr("x2", cx0).attr("y1", 0).attr("y2", innerH)
    .attr("stroke","#1c1f24").attr("stroke-width", 1).attr("stroke-dasharray","3 4").attr("opacity", .45);
  seriesWithColor.forEach(s => {
    const v = s.values[ix];
    if(v != null){
      marker.append("circle")
        .attr("cx", cx0).attr("cy", y(v)).attr("r", 3.2)
        .attr("fill", s._color).attr("stroke","#fbf8f1").attr("stroke-width", 1.4);
    }
  });
  const yearLabel = g.append("text").attr("class","year-active-label")
    .attr("x", innerW - 4).attr("y", -4).attr("text-anchor","end").text(years[ix]);

  container.__updateYear = function(year){
    const idx = DataLoader.yearIndex(years, year);
    const cx = x(years[idx]);
    rect.attr("width", cx);
    marker.selectAll("line").attr("x1", cx).attr("x2", cx);
    marker.selectAll("circle").remove();
    seriesWithColor.forEach(s => {
      const v = s.values[idx];
      if(v != null){
        marker.append("circle")
          .attr("cx", cx).attr("cy", y(v)).attr("r", 3.2)
          .attr("fill", s._color).attr("stroke","#fbf8f1").attr("stroke-width", 1.4);
      }
    });
    yearLabel.text(years[idx]);
  };

  if(seriesWithColor.length > 1){
    buildLegend(legend, seriesWithColor.map(s => ({
      label: [s.tipo, s.tipo2].filter(Boolean).join(" · ") || s.area || s.variableUnit,
      color: s._color,
    })));
  } else { buildLegend(legend, []); }
}

function drawStackedArea(container, years, series, opts = {}){
  const { area, legend } = chartShell(container);
  if(!series.length){ empty(area, "Sin datos."); return; }
  const { width, height } = sizeOf(area);
  const margin = { top: 22, right: 56, bottom: 32, left: 70 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const svg = d3.select(area).append("svg")
    .attr("class","chart-svg").attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio","none");

  const keys = series.map(s => s.id);
  const colorByKey = {};
  series.forEach((s, i) => { colorByKey[s.id] = colorFor(s.tipo, i); });
  const rows = years.map((year, i) => {
    const row = { year };
    series.forEach(s => { row[s.id] = s.values[i] || 0; });
    return row;
  });
  const stack = d3.stack().keys(keys)(rows);
  const x = d3.scaleLinear().domain(d3.extent(years)).range([0, innerW]);
  const yMax = d3.max(stack, layer => d3.max(layer, d => d[1])) || 1;
  const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

  const clipId = "clip-" + Math.random().toString(36).slice(2, 9);
  svg.append("defs").append("clipPath").attr("id", clipId)
    .append("rect").attr("x", 0).attr("y", -10).attr("width", innerW).attr("height", innerH + 20);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  g.append("g").attr("class","grid").call(d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat(""))
    .call(sel => sel.select(".domain").remove());
  g.append("g").attr("class","axis").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format("d")));
  g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(6).tickFormat(d => fmt(d)));

  if(opts.unit){
    g.append("text").attr("class","axis-label").attr("x", -8).attr("y", -8).attr("text-anchor","start").text(opts.unit);
  }
  g.append("text").attr("class","axis-label")
    .attr("x", innerW + 6).attr("y", innerH + 4).attr("text-anchor","start")
    .attr("dominant-baseline","middle").text("n = " + years.at(-1));

  const areaGen = d3.area().x(d => x(d.data.year)).y0(d => y(d[0])).y1(d => y(d[1]));
  const stackG = g.append("g").attr("clip-path", `url(#${clipId})`);
  stackG.selectAll("path.layer").data(stack).join("path")
    .attr("class","layer").attr("fill", d => colorByKey[d.key])
    .attr("opacity", .92).attr("d", areaGen);

  const ix = DataLoader.yearIndex(years, opts.year);
  const cx0 = x(years[ix]);
  const rect = svg.select(`#${clipId} rect`);
  rect.attr("width", cx0);

  const marker = g.append("g").attr("class","year-marker");
  marker.append("line")
    .attr("x1", cx0).attr("x2", cx0).attr("y1", 0).attr("y2", innerH)
    .attr("stroke","#1c1f24").attr("stroke-width", 1).attr("stroke-dasharray","3 4").attr("opacity", .5);

  const yearLabel = g.append("text").attr("class","year-active-label")
    .attr("x", innerW - 4).attr("y", -4).attr("text-anchor","end").text(years[ix]);

  container.__updateYear = function(year){
    const idx = DataLoader.yearIndex(years, year);
    const cx = x(years[idx]);
    rect.attr("width", cx);
    marker.selectAll("line").attr("x1", cx).attr("x2", cx);
    yearLabel.text(years[idx]);
  };
  buildLegend(legend, series.map(s => ({ label: s.tipo, color: colorByKey[s.id] })));
}

/* ---------- Tabla ---------- */

export function renderTable(container, data, state){
  const wrap = document.createElement("div");
  wrap.style.cssText = "height:100%;overflow:auto;padding:8px 14px";
  clear(container); container.appendChild(wrap);
  const dataset = data.global || data.national;
  if(!dataset){ empty(wrap, "Sin datos."); return; }
  const years = dataset.years;
  let series = [];
  if(data.global){
    series = dataset.series.filter(s => s.indicator === state.globalIndicator && s.variable === state.globalVariable);
  } else {
    const wanted = (state.tipoMulti && state.tipoMulti.length) ? state.tipoMulti : null;
    series = dataset.series.filter(s => s.variable === (state.variable || dataset.defaultVariable))
      .filter(s => !wanted || wanted.includes(s.tipo)).slice(0, 24);
  }
  const step = Math.max(1, Math.ceil(years.length / 12));
  const cols = years.filter((_, i) => i % step === 0 || i === years.length - 1);
  wrap.innerHTML = `<table class="data-table">
    <thead><tr><th>Serie</th>${cols.map(y => `<th>${y}</th>`).join("")}</tr></thead>
    <tbody>${series.map(s => {
      const label = data.global ? `${s.area} · ${s.variableUnit || ""}`
        : [s.tipo, s.tipo2, s.variableUnit].filter(Boolean).join(" · ");
      return `<tr><td>${compact(label, 44)}</td>${cols.map(year => `<td>${fmt(s.values[DataLoader.yearIndex(years, year)])}</td>`).join("")}</tr>`;
    }).join("")}</tbody></table>`;
}

/* ---------- Mapa ---------- */

function colorRamp(){
  return d3.interpolateRgbBasis(["#f1eadb","#dcc9a5","#a08846","#5a6e2b","#2f4720"]);
}
export function renderMap(container, data, state, geo, tooltip){
  const { area, legend } = chartShell(container);
  if(!data.map){ empty(area, "Sin dato provincial."); legend.style.display="none"; return; }
  if(!geo){ empty(area, "Cargando geografía…"); legend.style.display="none"; return; }

  const combo = data.map.combos.find(c => c.id === state.mapComboId) || data.map.combos[0];
  const year = Number(state.year);
  const allValues = [];
  for(const arr of Object.values(combo.values)){
    for(const v of arr) if(v != null && Number.isFinite(v)) allValues.push(v);
  }
  const extent = d3.extent(allValues);
  const color = d3.scaleSequential(colorRamp())
    .domain(extent[0] === extent[1] ? [0, extent[1] || 1] : extent);
  const idx = DataLoader.yearIndex(data.map.years, year);
  const values = new Map();
  for(const [iso, arr] of Object.entries(combo.values)) values.set(iso, arr[idx]);

  const { width, height } = sizeOf(area);
  const svg = d3.select(area).append("svg")
    .attr("class","map-svg").attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio","xMidYMid meet");

  const isCanary = f => ["ES-GC","ES-TF"].includes(f.properties.iso_3166_2);
  const main = { type:"FeatureCollection", features: geo.features.filter(f => !isCanary(f)) };
  const canary = { type:"FeatureCollection", features: geo.features.filter(isCanary) };
  const mainProj = d3.geoMercator().fitExtent([[22, 22],[width - 22, height - 22]], main);
  const mainPath = d3.geoPath(mainProj);

  function fillFor(feature){
    const iso = feature.properties.iso_3166_2;
    const v = values.get(iso);
    return v == null ? "#ece6d6" : color(v);
  }
  function bindHover(sel){
    sel.on("mouseenter", (event, feature) => {
      const iso = feature.properties.iso_3166_2;
      const name = data.map.provinces[iso]?.name || feature.properties.name;
      const v = values.get(iso);
      tooltip.classList.add("visible");
      tooltip.innerHTML = `<div class="t-title">${name}</div>
        <div class="t-row"><span class="t-label">${combo.indicator} · ${combo.category}</span><span class="t-val">${fmt(v, combo.unit)}</span></div>
        <div class="t-row"><span class="t-label">Año</span><span class="t-val">${year}</span></div>`;
    }).on("mousemove", event => {
      tooltip.style.left = (event.clientX + 14) + "px";
      tooltip.style.top = (event.clientY + 14) + "px";
    }).on("mouseleave", () => { tooltip.classList.remove("visible"); });
  }

  const mainPaths = svg.append("g").selectAll("path").data(main.features).join("path")
    .attr("class","map-province").attr("d", mainPath).attr("fill", fillFor).call(bindHover);

  let canaryPaths = null;
  if(canary.features.length){
    const cw = Math.min(220, width * 0.18), ch = Math.min(80, height * 0.14);
    const cx = width - cw - 14, cy = 14;
    const inset = svg.append("g").attr("transform", `translate(${cx},${cy})`);
    inset.append("rect").attr("width", cw).attr("height", ch)
      .attr("fill","rgba(255,255,255,.85)").attr("stroke","#d6cdbc").attr("stroke-width", 1);
    inset.append("text").attr("x", 6).attr("y", 11)
      .attr("font-family","Inter,sans-serif").attr("font-size","8")
      .attr("font-weight","700").attr("letter-spacing","1px")
      .attr("fill","#8a8c8f").text("CANARIAS");
    const cProj = d3.geoMercator().fitExtent([[6, 18],[cw - 6, ch - 6]], canary);
    const cPath = d3.geoPath(cProj);
    canaryPaths = inset.append("g").selectAll("path").data(canary.features).join("path")
      .attr("class","map-province").attr("d", cPath).attr("fill", fillFor).call(bindHover);
  }

  container.__updateYear = function(year){
    const idx2 = DataLoader.yearIndex(data.map.years, year);
    const newValues = new Map();
    for(const [iso, arr] of Object.entries(combo.values)) newValues.set(iso, arr[idx2]);
    mainPaths.attr("fill", f => {
      const v = newValues.get(f.properties.iso_3166_2);
      return v == null ? "#ece6d6" : color(v);
    });
    if(canaryPaths){
      canaryPaths.attr("fill", f => {
        const v = newValues.get(f.properties.iso_3166_2);
        return v == null ? "#ece6d6" : color(v);
      });
    }
    for(const [k, v] of newValues) values.set(k, v);
  };

  const N = 14;
  const ramp = Array.from({length: N}, (_, i) => {
    const t = i / (N - 1);
    const v = extent[0] + (extent[1] - extent[0]) * t;
    return `<span style="display:block;flex:1;height:12px;background:${color(v)}"></span>`;
  }).join("");
  legend.style.display = "";
  legend.innerHTML = `
    <div style="display:flex;flex-direction:column;width:100%;gap:4px;font-family:var(--ff-sans)">
      <div style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-mute);font-weight:700">
        ${combo.indicator} · ${combo.category}${combo.unit ? ` (${combo.unit})` : ""}
      </div>
      <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--ink-soft);font-variant-numeric:tabular-nums">
        <span>${fmt(extent[0])}</span>
        <div style="flex:1;display:flex;border:1px solid var(--rule)">${ramp}</div>
        <span>${fmt(extent[1])}</span>
      </div>
    </div>`;
}

/* ============================================================
   Carga de CSV de v1 (lazy, cached) — para Tapio/LMDI/Scatter
   ============================================================ */

const csvCache = new Map();
async function loadCsv(url){
  if(!csvCache.has(url)){
    csvCache.set(url, d3.csv(url, d3.autoType).catch(err => { console.error(err); return []; }));
  }
  return csvCache.get(url);
}

/* ============================================================
   Tapio — análisis de desacoplamiento
   ============================================================ */

export async function renderTapio(container, state){
  clear(container);
  const wrap = document.createElement("div");
  wrap.style.cssText = "flex:1;display:flex;flex-direction:column;min-height:0";
  container.appendChild(wrap);
  const { area, legend } = chartShell(wrap);
  area.innerHTML = `<div class="loading"><span class="spinner"></span><strong>Cargando análisis Tapio</strong></div>`;
  const rows = await loadCsv("../web_cahe/web_graficas/data_raw/web_todos_analysis_csv.csv");
  if(!rows.length){ empty(area, "No se pudo cargar el CSV de v1."); return; }

  const indicator = state.tapioIndicator || "Emisiones GEI";
  const areaPick = state.tapioArea || "España";
  const window_ = state.tapioWindow || 5;

  // Filtra España (o el área que toque) y variable Absoluto
  const series = rows.filter(r => r.area === areaPick && r.variable === "Absoluto")
    .sort((a, b) => a.year - b.year);
  if(!series.length){ empty(area, `Sin datos para ${areaPick}.`); return; }

  // Computa growth rates con ventana móvil
  const pts = [];
  for(let i = window_; i < series.length; i++){
    const a = series[i - window_], b = series[i];
    const gdp0 = a.PIB, gdp1 = b.PIB;
    const i0 = a[indicator], i1 = b[indicator];
    if(gdp0 == null || gdp1 == null || i0 == null || i1 == null || gdp0 <= 0 || i0 <= 0) continue;
    const gGdp = Math.pow(gdp1 / gdp0, 1/window_) - 1;
    const gInd = Math.pow(i1 / i0, 1/window_) - 1;
    pts.push({ year: b.year, gGdp, gInd, gdp1, i1 });
  }

  // Render scatter
  clear(area);
  const { width, height } = sizeOf(area);
  const margin = { top: 28, right: 30, bottom: 38, left: 60 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const svg = d3.select(area).append("svg")
    .attr("class","chart-svg").attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio","none");
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const xExt = d3.extent(pts, d => d.gGdp);
  const yExt = d3.extent(pts, d => d.gInd);
  const xMax = Math.max(Math.abs(xExt[0]), Math.abs(xExt[1]), 0.05);
  const yMax = Math.max(Math.abs(yExt[0]), Math.abs(yExt[1]), 0.05);
  const x = d3.scaleLinear().domain([-xMax, xMax]).nice().range([0, innerW]);
  const y = d3.scaleLinear().domain([-yMax, yMax]).nice().range([innerH, 0]);

  // Quadrants (background tint)
  g.append("rect").attr("x", x(0)).attr("y", 0).attr("width", innerW - x(0)).attr("height", y(0))
    .attr("fill","#c93324").attr("opacity",.06);
  g.append("rect").attr("x", x(0)).attr("y", y(0)).attr("width", innerW - x(0)).attr("height", innerH - y(0))
    .attr("fill","#4f8a64").attr("opacity",.10);
  g.append("rect").attr("x", 0).attr("y", 0).attr("width", x(0)).attr("height", y(0))
    .attr("fill","#3a4147").attr("opacity",.06);
  g.append("rect").attr("x", 0).attr("y", y(0)).attr("width", x(0)).attr("height", innerH - y(0))
    .attr("fill","#c79a3b").attr("opacity",.06);

  // Diagonal de "coupling" — y = x (cuando el indicador crece igual que el GDP)
  g.append("line").attr("x1", x(-xMax)).attr("y1", y(-xMax)).attr("x2", x(xMax)).attr("y2", y(xMax))
    .attr("stroke","#1c1f24").attr("stroke-width", .8).attr("stroke-dasharray","2 4").attr("opacity", .35);

  // Quadrant labels
  g.append("text").attr("class","quad-label").attr("x", innerW - 6).attr("y", 12).attr("text-anchor","end").text("Coupling expansivo");
  g.append("text").attr("class","quad-label").attr("x", innerW - 6).attr("y", innerH - 6).attr("text-anchor","end").text("Strong decoupling");
  g.append("text").attr("class","quad-label").attr("x", 6).attr("y", 12).attr("text-anchor","start").text("Coupling recesivo");
  g.append("text").attr("class","quad-label").attr("x", 6).attr("y", innerH - 6).attr("text-anchor","start").text("Recessive decoupling");

  // Ejes en 0
  g.append("line").attr("x1", 0).attr("y1", y(0)).attr("x2", innerW).attr("y2", y(0))
    .attr("stroke","#8a8c8f").attr("stroke-width", 1);
  g.append("line").attr("x1", x(0)).attr("y1", 0).attr("x2", x(0)).attr("y2", innerH)
    .attr("stroke","#8a8c8f").attr("stroke-width", 1);

  // Axis ticks
  g.append("g").attr("class","axis").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("+.1%")));
  g.append("g").attr("class","axis")
    .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("+.1%")));

  g.append("text").attr("class","axis-label").attr("x", -8).attr("y", -8).attr("text-anchor","start")
    .text(`Δ ${indicator}`);
  g.append("text").attr("class","axis-label").attr("x", innerW + 4).attr("y", y(0) + 14).attr("text-anchor","end")
    .text("Δ PIB →");

  // Puntos coloreados por década
  const colYear = d3.scaleSequential(d3.interpolateRgbBasis(["#3a6d8a","#c79a3b","#c93324"]))
    .domain(d3.extent(pts, d => d.year));
  g.selectAll("circle.dot").data(pts).join("circle")
    .attr("class","tapio-dot").attr("cx", d => x(d.gGdp)).attr("cy", d => y(d.gInd))
    .attr("r", 4.5).attr("fill", d => colYear(d.year))
    .attr("stroke","#fbf8f1").attr("stroke-width", .8).attr("opacity", .85);

  // Línea conectora ordenada por año
  const line = d3.line().x(d => x(d.gGdp)).y(d => y(d.gInd));
  g.append("path").datum(pts).attr("d", line)
    .attr("fill","none").attr("stroke","#1c1f24").attr("stroke-width", .6).attr("opacity", .15);

  legend.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;font-size:11px;color:var(--ink-soft)">
      <span><strong style="color:var(--ink)">Indicador:</strong> ${indicator}</span>
      <span><strong style="color:var(--ink)">Área:</strong> ${areaPick}</span>
      <span><strong style="color:var(--ink)">Ventana:</strong> ${window_} años</span>
      <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:50px;height:8px;background:linear-gradient(90deg,#3a6d8a,#c79a3b,#c93324);display:inline-block"></span><span>${d3.min(pts, d => d.year)} → ${d3.max(pts, d => d.year)}</span></span>
    </div>`;
}

/* ============================================================
   LMDI / IPAT — descomposición Kaya
   I = Pop × (GDP/Pop) × (I/GDP)
   ΔI = ΔI_pop + ΔI_aff + ΔI_int (LMDI aditiva)
   ============================================================ */

export async function renderLMDI(container, state){
  clear(container);
  const wrap = document.createElement("div");
  wrap.style.cssText = "flex:1;display:flex;flex-direction:column;min-height:0";
  container.appendChild(wrap);
  const { area, legend } = chartShell(wrap);
  area.innerHTML = `<div class="loading"><span class="spinner"></span><strong>Cargando descomposición LMDI</strong></div>`;
  const rows = await loadCsv("../web_cahe/web_graficas/data_raw/web_todos_analysis_csv.csv");
  if(!rows.length){ empty(area, "No se pudo cargar el CSV."); return; }

  const indicator = state.lmdiIndicator || "Emisiones GEI";
  const areaPick = state.lmdiArea || "España";
  const series = rows.filter(r => r.area === areaPick && r.variable === "Absoluto")
    .sort((a, b) => a.year - b.year);
  if(!series.length){ empty(area, `Sin datos para ${areaPick}.`); return; }

  // Decadal periods
  const minY = series[0].year, maxY = series.at(-1).year;
  const periods = [];
  for(let y0 = Math.ceil(minY / 10) * 10; y0 + 10 <= maxY; y0 += 10){
    periods.push({ y0, y1: y0 + 10 });
  }

  // LMDI aditiva por periodo: ΔI = L(I1,I0) × ln(factor)
  // L(a,b) = (a-b)/ln(a/b) si a≠b, sino a
  function L(a, b){
    if(a == null || b == null || a <= 0 || b <= 0) return 0;
    if(a === b) return a;
    return (a - b) / Math.log(a / b);
  }

  const decomp = periods.map(p => {
    const a = series.find(r => r.year === p.y0);
    const b = series.find(r => r.year === p.y1);
    if(!a || !b) return null;
    const I0 = a[indicator], I1 = b[indicator];
    const P0 = a["Población"], P1 = b["Población"];
    const G0 = a.PIB, G1 = b.PIB;
    if([I0,I1,P0,P1,G0,G1].some(v => v == null || v <= 0)) return null;
    const Lw = L(I1, I0);
    const dPop = Lw * Math.log(P1 / P0);
    const dAff = Lw * Math.log((G1 / P1) / (G0 / P0));
    const dInt = Lw * Math.log((I1 / G1) / (I0 / G0));
    return { period: `${p.y0}–${p.y1}`, dPop, dAff, dInt, dTot: I1 - I0 };
  }).filter(Boolean);

  if(!decomp.length){ empty(area, "Sin descomposición."); return; }

  clear(area);
  const { width, height } = sizeOf(area);
  const margin = { top: 22, right: 30, bottom: 50, left: 70 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const svg = d3.select(area).append("svg")
    .attr("class","chart-svg").attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio","none");
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(decomp.map(d => d.period)).range([0, innerW]).padding(.25);
  const factorKeys = ["dPop","dAff","dInt"];
  const factorLabels = { dPop: "Población", dAff: "Afluencia (PIB/Pop)", dInt: "Intensidad (I/PIB)" };
  const factorColors = { dPop: "#3a6d8a", dAff: "#c79a3b", dInt: "#c93324" };

  // Para el stacked: separar positivos y negativos
  const allValues = decomp.flatMap(d => factorKeys.map(k => d[k]));
  const yMax = d3.max(allValues), yMin = d3.min(allValues);
  // Stack acumulando positivos arriba y negativos abajo
  const stacks = decomp.map(d => {
    let posY = 0, negY = 0;
    const bars = factorKeys.map(k => {
      const v = d[k];
      let y0, y1;
      if(v >= 0){ y0 = posY; y1 = posY + v; posY = y1; }
      else { y1 = negY; y0 = negY + v; negY = y0; }
      return { key: k, value: v, y0, y1, period: d.period };
    });
    return bars;
  });

  const yExt0 = d3.min(stacks.flat(), d => d.y0);
  const yExt1 = d3.max(stacks.flat(), d => d.y1);
  const y = d3.scaleLinear().domain([Math.min(yExt0, 0), Math.max(yExt1, 0)]).nice().range([innerH, 0]);

  g.append("g").attr("class","grid")
    .call(d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat(""))
    .call(sel => sel.select(".domain").remove());
  g.append("g").attr("class","axis").attr("transform", `translate(0,${y(0)})`)
    .call(d3.axisBottom(x))
    .selectAll("text").attr("transform","rotate(-30)").style("text-anchor","end");
  g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(6).tickFormat(d => fmt(d)));

  g.append("text").attr("class","axis-label").attr("x", -8).attr("y", -8).attr("text-anchor","start")
    .text(`Δ ${indicator}`);

  stacks.forEach((bars, i) => {
    const px = x(decomp[i].period);
    bars.forEach(b => {
      g.append("rect").attr("class","lmdi-bar")
        .attr("x", px).attr("width", x.bandwidth())
        .attr("y", y(b.y1)).attr("height", Math.abs(y(b.y0) - y(b.y1)))
        .attr("fill", factorColors[b.key]).attr("opacity", .92);
    });
    // Punto del total neto
    g.append("circle").attr("cx", px + x.bandwidth() / 2).attr("cy", y(decomp[i].dTot))
      .attr("r", 4).attr("fill", "#1c1f24").attr("stroke","#fbf8f1").attr("stroke-width", 1.2);
  });

  // Línea horizontal en 0
  g.append("line").attr("x1", 0).attr("x2", innerW).attr("y1", y(0)).attr("y2", y(0))
    .attr("stroke","#1c1f24").attr("stroke-width", 1).attr("opacity", .7);

  buildLegend(legend, [
    { label: factorLabels.dPop, color: factorColors.dPop },
    { label: factorLabels.dAff, color: factorColors.dAff },
    { label: factorLabels.dInt, color: factorColors.dInt },
    { label: "Δ Total neto", color: "#1c1f24" },
  ]);
}

/* ============================================================
   Scatter — bivariado entre dos indicadores (todas áreas)
   ============================================================ */

export async function renderScatter(container, state){
  clear(container);
  const wrap = document.createElement("div");
  wrap.style.cssText = "flex:1;display:flex;flex-direction:column;min-height:0";
  container.appendChild(wrap);
  const { area, legend } = chartShell(wrap);
  area.innerHTML = `<div class="loading"><span class="spinner"></span><strong>Cargando scatter</strong></div>`;
  const rows = await loadCsv("../web_cahe/web_graficas/data_raw/web_todos_analysis_csv.csv");
  if(!rows.length){ empty(area, "No se pudo cargar el CSV."); return; }

  const xKey = state.scatterX || "PIB";
  const yKey = state.scatterY || "Emisiones GEI";
  const year = Number(state.year);

  // Filtra variable Per cápita si existe, si no Absoluto
  const variable = "Per cápita";
  let pts = rows.filter(r => r.variable === variable && r.year === year)
    .map(r => ({ area: r.area, x: r[xKey], y: r[yKey] }))
    .filter(d => d.x != null && d.y != null && d.x > 0 && d.y > 0);
  if(!pts.length){
    pts = rows.filter(r => r.variable === "Absoluto" && r.year === year)
      .map(r => ({ area: r.area, x: r[xKey], y: r[yKey] }))
      .filter(d => d.x != null && d.y != null && d.x > 0 && d.y > 0);
  }
  if(!pts.length){ empty(area, `Sin datos para ${year}.`); return; }

  clear(area);
  const { width, height } = sizeOf(area);
  const margin = { top: 22, right: 30, bottom: 38, left: 70 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const svg = d3.select(area).append("svg")
    .attr("class","chart-svg").attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio","none");
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLog().domain(d3.extent(pts, d => d.x)).range([0, innerW]).nice();
  const y = d3.scaleLog().domain(d3.extent(pts, d => d.y)).range([innerH, 0]).nice();

  g.append("g").attr("class","grid")
    .call(d3.axisLeft(y).ticks(6, "~s").tickSize(-innerW).tickFormat(""))
    .call(sel => sel.select(".domain").remove());
  g.append("g").attr("class","axis").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(6, "~s"));
  g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(6, "~s"));

  g.append("text").attr("class","axis-label").attr("x", -8).attr("y", -8).attr("text-anchor","start").text(yKey);
  g.append("text").attr("class","axis-label").attr("x", innerW + 4).attr("y", innerH + 6).attr("text-anchor","end").text(xKey + " →");

  g.selectAll("circle.dot").data(pts).join("circle")
    .attr("cx", d => x(d.x)).attr("cy", d => y(d.y))
    .attr("r", d => d.area === "España" ? 7 : 4.5)
    .attr("fill", d => d.area === "España" ? "#c93324" : "#3a6d8a")
    .attr("stroke","#fbf8f1").attr("stroke-width", d => d.area === "España" ? 2 : .8)
    .attr("opacity", d => d.area === "España" ? 1 : .55);

  g.selectAll("text.label").data(pts).join("text")
    .attr("x", d => x(d.x) + (d.area === "España" ? 10 : 7))
    .attr("y", d => y(d.y) + 4)
    .attr("font-family","Inter,sans-serif").attr("font-size", d => d.area === "España" ? 12 : 9)
    .attr("font-weight", d => d.area === "España" ? 700 : 500)
    .attr("fill", d => d.area === "España" ? "#1c1f24" : "#4a4e57")
    .text(d => d.area);

  g.append("text").attr("class","year-active-label")
    .attr("x", innerW - 4).attr("y", -4).attr("text-anchor","end").text(year);

  buildLegend(legend, [
    { label: "España", color: "#c93324" },
    { label: "Otras áreas", color: "#3a6d8a" },
  ]);
}

/* ============================================================
   Comparativa — Ratio España/Mundo a lo largo del tiempo
   ============================================================ */

export function renderComparativa(container, data, state){
  if(!data.global){ empty(container, "Sin global."); return; }
  const dataset = data.global;
  const indicator = state.globalIndicator || "Energía";
  const variable = state.globalVariable || "Per cápita";
  const sE = dataset.series.find(s => s.area === "España" && s.indicator === indicator && s.variable === variable);
  const sW = dataset.series.find(s => s.area === "Mundo" && s.indicator === indicator && s.variable === variable);
  if(!sE || !sW){ empty(container, "Sin España vs Mundo para esta selección."); return; }
  const years = dataset.years;
  const ratios = years.map((y, i) => {
    const e = sE.values[i], w = sW.values[i];
    return (e != null && w != null && w > 0) ? e / w : null;
  });
  // Construye una "serie" sintética
  const ratioSeries = [{ area: "España / Mundo", values: ratios, variableUnit: "ratio" }];
  drawLineChart(container, years, ratioSeries, { year: state.year, unit: "ratio" });
}
