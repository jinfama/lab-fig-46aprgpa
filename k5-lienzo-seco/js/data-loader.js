const cache = new Map();
let metadata = null;
let geo = null;

async function json(url){
  if(!cache.has(url)){
    cache.set(url, fetch(url).then(r => {
      if(!r.ok) throw new Error(`${url}: ${r.status}`);
      return r.json();
    }));
  }
  return cache.get(url);
}

async function init(){
  metadata = await json("data/metadata.json");
  return metadata;
}

async function getMetadata(){
  return metadata || init();
}

function rewindGeometry(geometry){
  if(!geometry) return geometry;
  if(geometry.type === "Polygon"){
    geometry.coordinates.forEach(ring => ring.reverse());
  } else if(geometry.type === "MultiPolygon"){
    geometry.coordinates.forEach(poly => poly.forEach(ring => ring.reverse()));
  }
  return geometry;
}

async function getGeo(){
  if(!geo){
    geo = await json("data/geo/spain-provinces.geojson");
    geo.features?.forEach(f => rewindGeometry(f.geometry));
  }
  return geo;
}

async function loadCategory(categoryId){
  const meta = await getMetadata();
  const category = meta.categories.find(c => c.id === categoryId) || meta.categories[0];
  const out = { category, national: null, map: null, global: null };
  if(category.nationalFile) out.national = await json(category.nationalFile);
  if(category.mapFile) out.map = await json(category.mapFile);
  if(category.globalFile) out.global = await json(category.globalFile);
  return out;
}

function yearIndex(years, year){
  const y = Number(year);
  let idx = years.indexOf(y);
  if(idx >= 0) return idx;
  idx = d3.bisectLeft(years, y);
  return Math.max(0, Math.min(years.length - 1, idx));
}

function valueAt(series, years, year){
  const idx = yearIndex(years, year);
  return series?.values?.[idx] ?? null;
}

function getSeriesForFilters(dataset, state, opts = {}){
  if(!dataset?.series) return [];
  const variable = opts.variable || state.variable || dataset.defaultVariable || dataset.variables?.[0];
  const tipo = opts.tipo ?? state.tipo;
  const tipo2 = opts.tipo2 ?? state.tipo2;
  return dataset.series.filter(s => {
    if(s.variable !== variable) return false;
    if(tipo && tipo !== "all" && s.tipo !== tipo) return false;
    if(tipo2 && tipo2 !== "all" && (s.tipo2 || "") !== tipo2) return false;
    return true;
  });
}

export default {
  init, getMetadata, getGeo, loadCategory,
  yearIndex, valueAt, getSeriesForFilters,
};
