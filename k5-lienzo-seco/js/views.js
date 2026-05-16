import DataLoader from "./data-loader.js";

/* ---------- Colores semánticos por tipo ---------- */

const TIPO_COLORS = {
  "Total": "#1e2832",
  "Petróleo": "#c93324",
  "Gas": "#e6892b",
  "Electricidad": "#e0c032",
  "Carbón": "#3a4147",
  "Leña": "#8b5a3c",
  "Alimentos y forraje": "#a07a3a",
  "Hidráulica y eólica": "#3a6d8a",
  "Hidráulica": "#3a6d8a",
  "Eólica": "#5e8aab",
  "Solar": "#c79a3b",
  "CO2": "#a44c2c", "CO₂": "#a44c2c",
  "CH4": "#c8763f", "CH₄": "#c8763f",
  "N2O": "#e0a44a", "N₂O": "#e0a44a",
  "F-gases": "#6f7a3d",
  "Biomasa": "#4f8a64",
  "Combustibles fósiles": "#3a4147",
  "Minerales no metálicos": "#a07a3a",
  "Metales": "#5e6871",
  "Minerales metálicos": "#5e6871",
  "Monte alto": "#2c5d3e",
  "Monte bajo": "#4f8a64",
  "Monte abierto": "#7eab86",
  "Cereales": "#c79a3b",
  "Leguminosas": "#6f7a3d",
  "Frutales": "#a44c2c",
  "Hortalizas": "#4f8a64",
  "Industriales": "#5e6871",
  "Forrajes": "#8b5a3c",
  "Cultivos": "#c79a3b",
  "Bosques": "#4f8a64",
  "Pastizales": "#7eab86",
  "Otros": "#a07a3a",
  "Erial": "#a07a3a",
  "Superficie": "#1e2832",
};

const FALLBACK_PALETTE = [
  "#c93324", "#3a6d8a", "#6f7a3d", "#c79a3b", "#8b5a3c",
  "#4f8a64", "#a44c2c", "#5e6871", "#2c5d3e", "#e6892b",
];

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
  return {
    width: Math.max(280, box.width || 600),
    height: Math.max(220, box.height || 360),
  };
}
function clear(node){ node.innerHTML = ""; }
function compact(text, max = 30){
  const v = String(text || "");
  return v.length > max ? v.slice(0, max - 1) + "…" : v;
}
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

/* ---------- Tendencia (líneas o apilado) ---------- */
/* state.tipoMulti = array de tipos seleccionados
   state.stacked = booleano */

export function renderTrend(container, data, state){
  const dataset = data.global ? data.global : data.national;
  if(!dataset){ empty(container, "Sin serie nacional."); return; }
  const variable = data.global ? state.globalVariable : (state.variable || dataset.defaultVariable);
  let series = [];

  if(data.global){
    series = dataset.series.filter(s =>
      s.indicator === state.globalIndicator && s.variable === state.globalVariable);
    drawLineChart(container, dataset.years, series, { year: state.year, stacked: false });
    return;
  }

  // Series filtradas por variable
  const all = dataset.series.filter(s => s.variable === variable)
    .filter(s => state.tipo2 === "all" || !state.tipo2 || (s.tipo2 || "") === (state.tipo2 || ""));
  // Una serie por tipo seleccionado
  const wanted = state.tipoMulti && state.tipoMulti.length ? state.tipoMulti : ["Total"];
  const byTipo = new Map();
  all.forEach(s => { if(!byTipo.has(s.tipo)) byTipo.set(s.tipo, s); });
  series = wanted.map(t => byTipo.get(t)).filter(Boolean);
  if(!series.length) series = all.slice(0, 1);

  if(state.stacked && series.length >= 2){
    drawStackedArea(container, dataset.years, series, { year: state.year });
  } else {
    drawLineChart(container, dataset.years, series, { year: state.year, stacked: false });
  }
}

function drawLineChart(container, years, series, opts = {}){
  const { area, legend } = chartShell(container);
  if(!series.length){ empty(area, "Sin datos para la selección."); return; }
  const { width, height } = sizeOf(area);
  const margin = { top: 14, right: 22, bottom: 28, left: 60 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const svg = d3.select(area).append("svg")
    .attr("class","chart-svg").attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio","none");
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const values = series.flatMap(s => s.values.filter(v => v != null && Number.isFinite(v)));
  const extent = d3.extent(values);
  if(extent[0] == null){ empty(area, "Sin datos numéricos."); return; }
  const x = d3.scaleLinear().domain(d3.extent(years)).range([0, innerW]);
  const yMin = extent[0] < 0 ? extent[0] : 0;
  const y = d3.scaleLinear().domain([yMin, extent[1] || 1]).nice().range([innerH, 0]);

  g.append("g").attr("class","grid")
    .call(d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat(""))
    .call(sel => sel.select(".domain").remove());
  g.append("g").attr("class","axis").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format("d")));
  g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(6).tickFormat(d => fmt(d)));

  const line = d3.line()
    .defined(d => d.value != null && Number.isFinite(d.value))
    .x(d => x(d.year)).y(d => y(d.value));
  const ix = DataLoader.yearIndex(years, opts.year);
  const seriesWithColor = series.map((s, idx) => ({
    ...s, _color: colorFor(s.tipo || s.area || s.variableUnit, idx),
  }));
  seriesWithColor.forEach((s, idx) => {
    const points = years.map((year, i) => ({ year, value: s.values[i] }));
    g.append("path").datum(points)
      .attr("fill","none").attr("stroke", s._color)
      .attr("stroke-width", 2)
      .attr("opacity", .95).attr("d", line);
  });
  const marker = g.append("g").attr("class","year-marker");
  marker.append("line")
    .attr("x1", x(years[ix])).attr("x2", x(years[ix]))
    .attr("y1", 0).attr("y2", innerH)
    .attr("stroke","#1e2832").attr("stroke-width", 1)
    .attr("stroke-dasharray","3 4").attr("opacity", .4);
  seriesWithColor.forEach(s => {
    const v = s.values[ix];
    if(v != null){
      marker.append("circle")
        .attr("cx", x(years[ix])).attr("cy", y(v)).attr("r", 3)
        .attr("fill", s._color).attr("stroke","#fbf8f1").attr("stroke-width", 1.4);
    }
  });
  container.__updateYear = function(year){
    const idx = DataLoader.yearIndex(years, year);
    const cx = x(years[idx]);
    marker.selectAll("line").attr("x1", cx).attr("x2", cx);
    marker.selectAll("circle").remove();
    seriesWithColor.forEach(s => {
      const v = s.values[idx];
      if(v != null){
        marker.append("circle")
          .attr("cx", cx).attr("cy", y(v)).attr("r", 3)
          .attr("fill", s._color).attr("stroke","#fbf8f1").attr("stroke-width", 1.4);
      }
    });
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
  const margin = { top: 14, right: 22, bottom: 28, left: 60 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const svg = d3.select(area).append("svg")
    .attr("class","chart-svg").attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio","none");
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

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
  g.append("g").attr("class","grid").call(d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat(""))
    .call(sel => sel.select(".domain").remove());
  g.append("g").attr("class","axis").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format("d")));
  g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(6).tickFormat(d => fmt(d)));
  const areaGen = d3.area()
    .x(d => x(d.data.year)).y0(d => y(d[0])).y1(d => y(d[1]));
  g.selectAll("path.layer").data(stack).join("path")
    .attr("class","layer").attr("fill", d => colorByKey[d.key])
    .attr("opacity", .92).attr("d", areaGen);
  const ix = DataLoader.yearIndex(years, opts.year);
  const marker = g.append("g").attr("class","year-marker");
  marker.append("line")
    .attr("x1", x(years[ix])).attr("x2", x(years[ix]))
    .attr("y1", 0).attr("y2", innerH)
    .attr("stroke","#1e2832").attr("stroke-width", 1)
    .attr("stroke-dasharray","3 4").attr("opacity", .45);
  container.__updateYear = function(year){
    const idx = DataLoader.yearIndex(years, year);
    const cx = x(years[idx]);
    marker.selectAll("line").attr("x1", cx).attr("x2", cx);
  };
  buildLegend(legend, series.map(s => ({ label: s.tipo, color: colorByKey[s.id] })));
}

/* ---------- Table ---------- */

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
      .filter(s => !wanted || wanted.includes(s.tipo))
      .filter(s => state.tipo2 === "all" || !state.tipo2 || (s.tipo2 || "") === (state.tipo2 || ""));
    series = series.slice(0, 24);
  }
  const step = Math.max(1, Math.ceil(years.length / 12));
  const cols = years.filter((_, i) => i % step === 0 || i === years.length - 1);
  wrap.innerHTML = `<table class="data-table">
    <thead><tr><th>Serie</th>${cols.map(y => `<th>${y}</th>`).join("")}</tr></thead>
    <tbody>${series.map(s => {
      const label = data.global
        ? `${s.area} · ${s.variableUnit || ""}`
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
  if(!data.map){ empty(area, "Sin dato provincial para este indicador."); legend.style.display="none"; return; }
  if(!geo){ empty(area, "Cargando geografía…"); legend.style.display="none"; return; }

  const combo = data.map.combos.find(c => c.id === state.mapComboId) || data.map.combos[0];
  const year = Number(state.year);

  // Dominio fijo: todos los años
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
  // Mainland: deja espacio arriba a la derecha para el inset de Canarias
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
    .attr("class","map-province").attr("d", mainPath)
    .attr("fill", fillFor).call(bindHover);

  // Canarias inset — arriba a la derecha (lejos de la leyenda inferior)
  let canaryPaths = null;
  if(canary.features.length){
    const cw = Math.min(220, width * 0.18), ch = Math.min(80, height * 0.14);
    const cx = width - cw - 14, cy = 14;
    const inset = svg.append("g").attr("transform", `translate(${cx},${cy})`);
    inset.append("rect").attr("width", cw).attr("height", ch)
      .attr("fill","rgba(255,255,255,.85)").attr("stroke","#dcd4be").attr("stroke-width", 1);
    inset.append("text").attr("x", 6).attr("y", 11)
      .attr("font-family","Inter,sans-serif").attr("font-size","8")
      .attr("font-weight","700").attr("letter-spacing","1px")
      .attr("fill","#7d8694").text("CANARIAS");
    const cProj = d3.geoMercator().fitExtent([[6, 18],[cw - 6, ch - 6]], canary);
    const cPath = d3.geoPath(cProj);
    canaryPaths = inset.append("g").selectAll("path").data(canary.features).join("path")
      .attr("class","map-province").attr("d", cPath)
      .attr("fill", fillFor).call(bindHover);
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

  // Leyenda como tira horizontal en chart-legend (debajo del SVG, fuera del mapa)
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
