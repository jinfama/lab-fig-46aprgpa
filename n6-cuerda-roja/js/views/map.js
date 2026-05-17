// Choropleth map view — D3 + TopoJSON world-110m.
// Reads the active indicator from State and paints countries from the
// precomputed country_year_indicators.json bundle.

import { State } from '../state.js';
import { DataLoader } from '../data-loader.js?v=20260517-ui33';
import { getIndicator } from '../indicators.js?v=20260517-ui33';
import { escapeHtml, formatCategoryLabel } from '../labels.js';
import { metricValue, resolveMetric, supportsCropCategory } from '../metric.js?v=20260517-ui33';

const PALETTES = {
  workers_hours: ['#edf5f5', '#d7e8ea', '#b8d3d8', '#92b8c0', '#6798a2', '#3f717b', '#21454d'],
  wages:         ['#eef3ef', '#d8e5df', '#b4cdbf', '#88ad9c', '#628b7b', '#3e685f', '#20443f'],
  child_forced:  ['#f8efed', '#e8c7bd', '#d99a86', '#c56b52', '#a44c3c', '#733025', '#3e1712'],
  default:       ['#eef5f5', '#d7e5e6', '#b8ced2', '#8fadb5', '#668991', '#42636b', '#263f46'],
};
function paletteFor(ind) {
  if (!ind) return PALETTES.default;
  if (ind.warn) return PALETTES.child_forced;
  if (ind.id === 'monthly_wage' || ind.id === 'va_per_worker') return PALETTES.wages;
  if (ind.id === 'workers' || ind.id === 'hours_total' || ind.id === 'fp_hours_total') return PALETTES.workers_hours;
  return PALETTES.default;
}

function scaleFor(values, palette) {
  const ext = d3.extent(values);
  if (ext[0] === ext[1]) {
    const delta = Math.abs(ext[0] || 1) * 0.02 || 1;
    return d3.scaleQuantize().domain([ext[0] - delta, ext[1] + delta]).range(palette);
  }
  if (values.length >= palette.length * 3) {
    return d3.scaleQuantile().domain(values).range(palette);
  }
  return d3.scaleQuantize().domain(ext).range(palette);
}

let _svg, _g, _projection, _path, _topo, _countries;
let _aggregates = null;    // { "ISO3": { year: {field: value, ...}, ... }, ... }
let _isoMap     = null;    // { "724": "ESP", ... } M49 → ISO3
let _countryNames = null;  // { "ESP": "Spain" }
let _tooltip;
let _paintToken = 0;
let _currentData = null;
let _currentCountryNames = null;
let _currentScope = 'country';
let _regionByIso = null;
let _regionData = null;
let _regionCategoryData = null;
let _tradeFootprint = null;
let _regionFeatures = [];

function formatVal(v) {
  if (v == null || !isFinite(v)) return '—';
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + ' B';
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + ' M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + ' k';
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(2);
}

function getISO3(feature) {
  // Resolve M49 numeric ID via our mapping table.
  if (!_isoMap) return null;
  const raw = String(feature.id);
  return _isoMap[raw] || _isoMap[raw.replace(/^0+/, '')] || null;
}

function getGeometryISO3(geom) {
  if (!_isoMap || !geom) return null;
  const raw = String(geom.id);
  return _isoMap[raw] || _isoMap[raw.replace(/^0+/, '')] || null;
}

function topoCountryObject() {
  if (!_topo?.objects) return null;
  return _topo.objects.countries || _topo.objects[Object.keys(_topo.objects)[0]];
}

async function activeDataset(ind) {
  const category = supportsCropCategory(ind) ? State.get('cropCategoryFilter') : null;
  if (!category) {
    return { data: _aggregates, countryNames: _countryNames || {}, category: null };
  }
  const ds = await DataLoader.loadCategorySeries(category);
  return { data: ds.data || {}, countryNames: ds.country_names || _countryNames || {}, category };
}

async function activeTradeFootprintDataset() {
  const fp = await loadTradeFootprint();
  return { data: fp.data || {}, countryNames: fp.country_names || {}, category: null };
}

async function loadTradeFootprint() {
  if (_tradeFootprint) return _tradeFootprint;
  _tradeFootprint = await DataLoader.loadTradeFootprintFlows();
  return _tradeFootprint;
}

async function loadRegionByIso() {
  if (_regionByIso) return _regionByIso;
  const fp = await loadTradeFootprint();
  _regionByIso = fp.region_by_iso || {};
  return _regionByIso;
}

function indexRegionRows(rows, category = null) {
  const data = {};
  for (const row of rows || []) {
    if (category && row.category_labor !== category) continue;
    const region = row.region_un;
    if (!region) continue;
    if (!data[region]) data[region] = {};
    data[region][row.year] = row;
  }
  return data;
}

async function activeRegionDataset(metric) {
  if (metric.source === 'trade_footprint') {
    const fp = await loadTradeFootprint();
    return {
      data: fp.regions || {},
      world: fp.world || {},
      regionByIso: fp.region_by_iso || {},
      category: null,
    };
  }
  const ind = getIndicator(State.get('activeCategory'), State.get('activeIndicator'));
  const category = supportsCropCategory(ind) ? State.get('cropCategoryFilter') : null;
  if (category) {
    if (!_regionCategoryData) _regionCategoryData = await DataLoader.loadRegionsCategories();
    const data = indexRegionRows(_regionCategoryData.rows || [], category);
    return { data, world: data.World || {}, regionByIso: await loadRegionByIso(), category };
  }
  if (!_regionData) {
    const regions = await DataLoader.loadRegions();
    _regionData = indexRegionRows(regions.rows || []);
  }
  return { data: _regionData, world: _regionData.World || {}, regionByIso: await loadRegionByIso(), category: null };
}

function isAntarcticFeature(feature) {
  const name = feature?.properties?.name || feature?.properties?.NAME || '';
  return name === 'Antarctica' || name === 'Fr. S. Antarctic Lands';
}

function isAntarcticGeometry(geom) {
  const name = geom?.properties?.name || geom?.properties?.NAME || '';
  return name === 'Antarctica' || name === 'Fr. S. Antarctic Lands';
}

export async function initMapView() {
  _svg = d3.select('#map-svg');
  _g   = _svg.append('g');
  _tooltip = d3.select('#map-tooltip');

  // Parallel load: topology + aggregates + iso mapping.
  try {
    const [topo, agg, iso] = await Promise.all([
      DataLoader.loadWorldTopo(),
      DataLoader.loadCountryYearIndicators(),
      DataLoader.loadIsoMapping(),
    ]);
    _topo = topo;
    _aggregates = agg.data;
    _countryNames = agg.country_names || {};
    _isoMap = iso.mapping;
  } catch (e) {
    console.error('[map] failed to load core data', e);
    return;
  }

  const objects = _topo.objects;
  const key = objects.countries ? 'countries' : Object.keys(objects)[0];
  _countries = topojson.feature(_topo, objects[key]).features
    .filter(feature => !isAntarcticFeature(feature));

  resize();
  drawCountries();
  paint();

  State.subscribe('activeIndicator',   paint);
  State.subscribe('activeCategory',    paint);
  State.subscribe('functionalUnit',    paint);
  State.subscribe('productivityLaborInput', paint);
  State.subscribe('productivityDirection', paint);
  State.subscribe('footprintFlow',     paint);
  State.subscribe('currentYear',       paint);
  State.subscribe('yearRange',         paint);
  State.subscribe('cropCategoryFilter',paint);
  State.subscribe('selectedCountries', paintSelection);
  State.subscribe('selectedRegions',   paintSelection);
  State.subscribe('trendGeoScope',     paint);
  State.subscribe('language',          paint);
  window.addEventListener('resize', () => { resize(); drawCountries(); paint(); });
}

function resize() {
  const container = document.getElementById('map-container');
  const W = container.clientWidth;
  const H = container.clientHeight;
  _svg.attr('width', W).attr('height', H);
  const geo = _countries && _countries.length
    ? { type: 'FeatureCollection', features: _countries }
    : { type: 'Sphere' };
  _projection = d3.geoNaturalEarth1().fitExtent([[20, 24], [W - 20, H - 22]], geo);
  _path = d3.geoPath(_projection);
}

function drawCountries() {
  if (!_countries) return;
  _g.selectAll('path.country-path').remove();
  _g.selectAll('path.country-path')
    .data(_countries)
    .enter().append('path')
      .attr('class', 'country-path')
      .attr('d', _path)
      .attr('data-iso', d => getISO3(d) || '')
      .on('mouseenter', (event, d) => showTooltip(event, d))
      .on('mousemove',  (event)    => moveTooltip(event))
      .on('mouseleave', () => hideTooltip())
      .on('click', (event, d) => {
        const iso = getISO3(d);
        const scope = State.get('trendGeoScope') === 'world' ? 'country' : State.get('trendGeoScope');
        if (!iso || scope === 'world') return;
        if (scope === 'region') {
          const region = _regionByIso?.[iso];
          if (region) State.toggleRegion(region);
          return;
        }
        State.toggleCountry(iso);
      });
}

function valueFor(data, iso, metric, year) {
  if (!data) return null;
  const series = data[iso];
  if (!series) return null;
  const yr = series[year];
  if (!yr) return null;
  return metricValue(yr, metric);
}

function valuesForScale(data, metric) {
  const [from, to] = State.get('yearRange');
  const values = [];
  for (const iso in (data || {})) {
    const series = data[iso] || {};
    for (const y in series) {
      const year = +y;
      if (year < from || year > to) continue;
      const v = metricValue(series[y], metric);
      if (v != null && isFinite(v)) values.push(v);
    }
  }
  return values;
}

async function paint() {
  const token = ++_paintToken;
  const ind = getIndicator(State.get('activeCategory'), State.get('activeIndicator'));
  const metric = resolveMetric(ind, State.get('language'));
  if (!metric) return;
  // Indicators sourced from footprints/conditions live in other files for now.
  if (metric.source && !['regions', 'trade_footprint'].includes(metric.source)) {
    _g.selectAll('path.country-path').style('fill', 'var(--c-bg-h)');
    d3.select('#map-legend').html(
      `<div class="map-legend-title">${metric.labelText}</div>
       <div class="map-legend-note">Vista pr\u00f3xima: datos en otra fuente.</div>`
    );
    return;
  }

  const requestedScope = State.get('trendGeoScope');
  const scope = requestedScope === 'world' ? 'country' : requestedScope;
  let data;
  let countryNames;
  let category;
  if (scope === 'country') {
    const ds = metric.source === 'trade_footprint'
      ? await activeTradeFootprintDataset()
      : await activeDataset(ind);
    data = ds.data;
    countryNames = ds.countryNames;
    category = ds.category;
  } else {
    const ds = await activeRegionDataset(metric);
    _regionByIso = ds.regionByIso || _regionByIso || {};
    data = Object.fromEntries(Object.entries(ds.data || {}).filter(([key]) => key !== 'World'));
    countryNames = {};
    category = ds.category;
  }
  if (token !== _paintToken) return;
  _currentScope = scope;
  _currentData = data;
  _currentCountryNames = countryNames || _countryNames;
  const year = State.get('currentYear');
  const values = valuesForScale(data, metric);
  const palette = paletteFor(metric);
  if (!values.length) {
    clearRegionLayer();
    _g.selectAll('path.country-path').style('display', null);
    _g.selectAll('path.country-path').style('fill', '#DCE8E9');
    d3.select('#map-legend').html('');
    return;
  }
  const scale = scaleFor(values, palette);

  if (scope === 'region') {
    paintRegionMap(data, metric, year, values, palette, scale, category);
    return;
  }

  clearRegionLayer();
  _g.selectAll('path.country-path').style('display', null);
  _g.selectAll('path.country-path').style('fill', d => {
    const key = featureDataKey(d);
    if (!key) return '#DCE8E9';
    const v = valueFor(data, key, metric, year);
    return (v == null || !isFinite(v)) ? '#DCE8E9' : scale(v);
  });

  paintSelection();
  paintLegend(values, palette, metric, scale, category);
}

function clearRegionLayer() {
  _g.selectAll('path.region-path').remove();
  _g.selectAll('path.region-border').remove();
  _g.selectAll('path.region-outline').remove();
  _regionFeatures = [];
}

function buildRegionFeatures(data, metric, year) {
  const obj = topoCountryObject();
  const geoms = obj?.geometries || [];
  if (!obj || !geoms.length || !_regionByIso) return [];

  const regionGeometries = new Map();
  for (const geom of geoms) {
    if (isAntarcticGeometry(geom)) continue;
    const iso = getGeometryISO3(geom);
    const region = iso ? _regionByIso[iso] : null;
    if (!region || region === 'World') continue;
    if (!regionGeometries.has(region)) regionGeometries.set(region, []);
    regionGeometries.get(region).push(geom);
  }

  return [...regionGeometries.entries()]
    .filter(([region]) => data && data[region])
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([region, regionGeoms]) => ({
      type: 'Feature',
      geometry: topojson.merge(_topo, regionGeoms),
      properties: {
        region,
        value: valueFor(data, region, metric, year),
      },
    }));
}

function paintRegionMap(data, metric, year, values, palette, scale, category) {
  _g.selectAll('path.country-path').style('display', 'none');
  clearRegionLayer();

  _regionFeatures = buildRegionFeatures(data, metric, year);
  if (!_regionFeatures.length) {
    d3.select('#map-legend').html('');
    return;
  }

  _g.selectAll('path.region-path')
    .data(_regionFeatures, d => d.properties.region)
    .enter().append('path')
      .attr('class', 'region-path')
      .attr('d', _path)
      .style('fill', d => {
        const v = d.properties.value;
        return (v == null || !isFinite(v)) ? '#DCE8E9' : scale(v);
      })
      .on('mouseenter', (event, d) => showRegionTooltip(event, d, metric))
      .on('mousemove', (event) => moveTooltip(event))
      .on('mouseleave', () => hideTooltip())
      .on('click', (event, d) => State.toggleRegion(d.properties.region));

  const obj = topoCountryObject();
  const regionOf = geom => {
    const iso = getGeometryISO3(geom);
    return iso ? _regionByIso?.[iso] : null;
  };
  const regionBorder = topojson.mesh(_topo, obj, (a, b) => {
    if (!a || !b || a === b) return false;
    const ar = regionOf(a);
    const br = regionOf(b);
    return ar && br && ar !== br;
  });
  _g.append('path')
    .datum(regionBorder)
    .attr('class', 'region-border')
    .attr('d', _path)
    .attr('fill', 'none');

  const outline = topojson.mesh(_topo, obj, (a, b) => a === b);
  _g.append('path')
    .datum(outline)
    .attr('class', 'region-outline')
    .attr('d', _path)
    .attr('fill', 'none');

  paintSelection();
  paintLegend(values, palette, metric, scale, category);
}

function paintSelection() {
  const scope = State.get('trendGeoScope') === 'world' ? 'country' : State.get('trendGeoScope');
  const selectedCountries = State.get('selectedCountries');
  const selectedRegions = State.get('selectedRegions');
  const drawableIso = _countries
    ? _countries.map(getISO3).filter(Boolean)
    : [];
  const selectedSet = new Set(selectedCountries);
  const allCountriesSelected = drawableIso.length > 0 && drawableIso.every(iso => selectedSet.has(iso));
  _g.selectAll('path.country-path').classed('selected', d => {
    const iso = getISO3(d);
    if (!iso || scope === 'world') return false;
    if (scope === 'region') return selectedRegions.includes(_regionByIso?.[iso]);
    if (allCountriesSelected) return false;
    return selectedCountries.includes(iso);
  });
  _g.selectAll('path.region-path').classed('selected', d => {
    if (scope !== 'region') return false;
    const regions = _regionFeatures.map(f => f.properties.region);
    const allRegionsSelected = regions.length > 0 && regions.every(region => selectedRegions.includes(region));
    if (allRegionsSelected) return false;
    return selectedRegions.includes(d.properties.region);
  });
}

function featureDataKey(feature) {
  const iso = getISO3(feature);
  if (_currentScope === 'world') return 'World';
  if (_currentScope === 'region') return iso ? _regionByIso?.[iso] : null;
  return iso;
}

function paintLegend(values, palette, metric, scale, category) {
  const box = d3.select('#map-legend');
  if (!box.node()) return;
  const ext = d3.extent(values);
  const lang = State.get('language');
  const stops = palette.map(c => `<span class="map-legend-cell" style="background:${c};"></span>`).join('');
  box.html(`
    <div class="map-legend-title">${metric.labelText} <span style="opacity:0.62">(${metric.unit})</span></div>
    ${category ? `<div class="map-legend-filter">${escapeHtml(formatCategoryLabel(category, lang))}</div>` : ''}
    <div class="map-legend-bar">${stops}</div>
    <div class="map-legend-labels">
      <span>${formatVal(ext[0])}</span><span>${formatVal(ext[1])}</span>
    </div>
  `);
}

function showTooltip(event, d) {
  const iso = getISO3(d);
  const key = featureDataKey(d);
  const name = _currentScope === 'world'
    ? (State.get('language') === 'en' ? 'World' : 'Mundo')
    : _currentScope === 'region'
      ? (key || '')
      : ((_currentCountryNames && _currentCountryNames[iso]) || (_countryNames && _countryNames[iso]) || (d.properties && d.properties.name) || iso || '');
  const ind = getIndicator(State.get('activeCategory'), State.get('activeIndicator'));
  const metric = resolveMetric(ind, State.get('language'));
  let v = null;
  if (key && metric) v = valueFor(_currentData || _aggregates, key, metric, State.get('currentYear'));
  _tooltip.html(`<strong>${name}</strong>${metric ? metric.labelText : ''}: ${formatVal(v)}${metric ? ' ' + metric.unit : ''}`);
  _tooltip.classed('visible', true);
  moveTooltip(event);
}
function showRegionTooltip(event, d, metric) {
  const region = d.properties.region;
  const v = valueFor(_currentData, region, metric, State.get('currentYear'));
  _tooltip.html(`<strong>${region}</strong>${metric.labelText}: ${formatVal(v)} ${metric.unit}`);
  _tooltip.classed('visible', true);
  moveTooltip(event);
}
function moveTooltip(event) {
  const container = document.getElementById('map-container').getBoundingClientRect();
  const x = event.clientX - container.left + 12;
  const y = event.clientY - container.top + 12;
  _tooltip.style('left', `${x}px`).style('top', `${y}px`);
}
function hideTooltip() { _tooltip.classed('visible', false); }
