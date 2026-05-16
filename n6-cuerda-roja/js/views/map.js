// Choropleth map view — D3 + TopoJSON world-110m.
// Reads the active indicator from State and paints countries from the
// precomputed country_year_indicators.json bundle.

import { State } from '../state.js';
import { DataLoader } from '../data-loader.js';
import { getCategory, getIndicator } from '../indicators.js';

const PALETTES = {
  workers_hours: ['#fbf3e3', '#f0d9a9', '#e6b977', '#d99244', '#b5621f', '#7e3a17', '#4d2010'],
  wages:         ['#f0f4e8', '#cfe0b4', '#9dbf7b', '#6c9b4e', '#48772f', '#2d5a1f', '#1b3d12'],
  child_forced:  ['#fef0eb', '#f7c3b1', '#e88a72', '#d35138', '#a82a1d', '#76160e', '#3f0703'],
  default:       ['#fbf3e3', '#e6c9a0', '#cda065', '#a37238', '#724a1f', '#48280e', '#291305'],
};
function paletteFor(ind) {
  if (!ind) return PALETTES.default;
  if (ind.warn) return PALETTES.child_forced;
  if (ind.id === 'monthly_wage' || ind.id === 'va_per_worker') return PALETTES.wages;
  if (ind.id === 'workers' || ind.id === 'hours_total' || ind.id === 'fp_hours_total') return PALETTES.workers_hours;
  return PALETTES.default;
}

let _svg, _g, _projection, _path, _topo, _countries;
let _aggregates = null;    // { "ISO3": { year: {field: value, ...}, ... }, ... }
let _isoMap     = null;    // { "724": "ESP", ... } M49 → ISO3
let _countryNames = null;  // { "ESP": "Spain" }
let _tooltip;

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
  return _isoMap[String(feature.id)] || null;
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
  _countries = topojson.feature(_topo, objects[key]).features;

  resize();
  drawCountries();
  paint();

  State.subscribe('activeIndicator',   paint);
  State.subscribe('activeCategory',    paint);
  State.subscribe('currentYear',       paint);
  State.subscribe('selectedCountries', paintSelection);
  State.subscribe('language',          paint);
  window.addEventListener('resize', () => { resize(); drawCountries(); paint(); });
}

function resize() {
  const container = document.getElementById('map-container');
  const W = container.clientWidth;
  const H = container.clientHeight;
  _svg.attr('width', W).attr('height', H);
  _projection = d3.geoNaturalEarth1().fitExtent([[20, 30], [W - 20, H - 20]], { type: 'Sphere' });
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
        if (iso) State.toggleCountry(iso);
      });
}

function valueFor(iso, field, year) {
  if (!_aggregates) return null;
  const series = _aggregates[iso];
  if (!series) return null;
  const yr = series[year];
  if (!yr) return null;
  const v = yr[field];
  return v == null ? null : v;
}

function paint() {
  const ind = getIndicator(State.get('activeCategory'), State.get('activeIndicator'));
  if (!ind) return;
  // Indicators sourced from footprints/conditions live in other files for now.
  if (ind.source && ind.source !== 'regions') {
    _g.selectAll('path.country-path').attr('fill', 'var(--c-bg-h)');
    d3.select('#map-legend').html(
      `<div style="font-size:11px; color:var(--c-text-3);">
        ${ind.label[State.get('language')]} — vista próxima (datos en otra fuente)</div>`
    );
    return;
  }

  const year = State.get('currentYear');
  const values = [];
  for (const iso in _aggregates) {
    const v = valueFor(iso, ind.field, year);
    if (v != null && isFinite(v)) values.push(v);
  }
  const palette = paletteFor(ind);
  if (!values.length) {
    _g.selectAll('path.country-path').attr('fill', '#e5dccc');
    d3.select('#map-legend').html('');
    return;
  }
  const ext = d3.extent(values);
  const scale = d3.scaleQuantize().domain(ext).range(palette);

  _g.selectAll('path.country-path').attr('fill', d => {
    const iso = getISO3(d);
    if (!iso) return '#e5dccc';
    const v = valueFor(iso, ind.field, year);
    return (v == null || !isFinite(v)) ? '#e5dccc' : scale(v);
  });

  paintSelection();
  paintLegend(ext, palette, ind);
}

function paintSelection() {
  const sel = State.get('selectedCountries');
  _g.selectAll('path.country-path').classed('selected', d => sel.includes(getISO3(d)));
}

function paintLegend(ext, palette, ind) {
  const box = d3.select('#map-legend');
  if (!box.node()) return;
  const stops = palette.map(c => `<span style="display:inline-block;width:18px;height:10px;background:${c};"></span>`).join('');
  box.html(`
    <div style="font-weight:600; margin-bottom:4px;">${ind.label[State.get('language')]} <span style="opacity:0.6">(${ind.unit})</span></div>
    <div>${stops}</div>
    <div style="display:flex; justify-content:space-between; margin-top:2px; font-size:10px;">
      <span>${formatVal(ext[0])}</span><span>${formatVal(ext[1])}</span>
    </div>
  `);
}

function showTooltip(event, d) {
  const iso = getISO3(d);
  const name = (_countryNames && _countryNames[iso]) || (d.properties && d.properties.name) || iso || '';
  const ind = getIndicator(State.get('activeCategory'), State.get('activeIndicator'));
  let v = null;
  if (iso && ind) v = valueFor(iso, ind.field, State.get('currentYear'));
  _tooltip.html(`<strong>${name}</strong>${ind ? ind.label[State.get('language')] : ''}: ${formatVal(v)}${ind ? ' ' + ind.unit : ''}`);
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
