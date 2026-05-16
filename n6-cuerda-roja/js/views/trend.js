// Trend view — line chart of selected countries' indicator over time.

import { State } from '../state.js';
import { DataLoader } from '../data-loader.js';
import { getIndicator } from '../indicators.js';

const COLORS = ['#6B4226', '#D4A032', '#1B3A5C', '#8B2500', '#4A6B3A', '#D4713A', '#693F8C', '#2D7B7C'];
const INK = '#1A120B';
const MUTE = '#9A8A7A';
const RULE = '#C9BDA8';

let _svg;
let _aggregates = null;
let _countryNames = null;

export async function initTrendView() {
  _svg = d3.select('#trend-svg');
  try {
    const agg = await DataLoader.loadCountryYearIndicators();
    _aggregates = agg.data;
    _countryNames = agg.country_names || {};
  } catch (e) {
    console.warn('[trend] failed to load aggregates', e);
  }
  refresh();
  State.subscribe('activeCategory',   refresh);
  State.subscribe('activeIndicator',  refresh);
  State.subscribe('selectedCountries',refresh);
  State.subscribe('yearRange',        refresh);
  State.subscribe('language',         refresh);
  window.addEventListener('resize',   refresh);
}

function refresh() {
  const sel = State.get('selectedCountries');
  const ind = getIndicator(State.get('activeCategory'), State.get('activeIndicator'));
  const empty = document.getElementById('trend-empty');

  _svg.selectAll('*').remove();
  if (!ind || !sel.length || !_aggregates) {
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';

  const allSeries = sel.map(iso => {
    const series = _aggregates[iso] || {};
    const points = Object.keys(series)
      .map(y => ({ year: +y, value: series[y][ind.field] }))
      .filter(p => p.value != null && isFinite(p.value))
      .sort((a, b) => a.year - b.year);
    return { iso, country: _countryNames[iso] || iso, points };
  }).filter(s => s.points.length);

  if (!allSeries.length) {
    if (empty) {
      empty.style.display = 'flex';
      empty.textContent = 'No hay datos para los países seleccionados en este indicador.';
    }
    return;
  }
  drawChart(allSeries, ind);
}

function drawChart(allSeries, ind) {
  const container = document.getElementById('trend-svg').parentElement;
  const W = container.clientWidth;
  const H = container.clientHeight;
  const m = { top: 28, right: 60, bottom: 36, left: 70 };

  _svg.attr('width', W).attr('height', H);
  const root = _svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;

  const [yFrom, yTo] = State.get('yearRange');
  const allPoints = allSeries.flatMap(s => s.points).filter(p => p.year >= yFrom && p.year <= yTo);
  if (!allPoints.length) return;

  const x = d3.scaleLinear().domain([yFrom, yTo]).range([0, iw]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(allPoints, d => d.value) || 1]).nice()
    .range([ih, 0]);

  root.append('g').attr('transform', `translate(0,${ih})`)
    .call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(8))
    .call(g => g.selectAll('text').attr('fill', MUTE).style('font-size', '11px'))
    .call(g => g.selectAll('line, path').attr('stroke', RULE));
  root.append('g')
    .call(d3.axisLeft(y).ticks(5).tickFormat(v => formatTick(v)))
    .call(g => g.selectAll('text').attr('fill', INK).style('font-size', '11px'))
    .call(g => g.selectAll('line, path').attr('stroke', RULE));

  root.append('text').attr('x', 0).attr('y', -10).attr('fill', INK)
    .style('font-size', '12px').style('font-weight', '600')
    .text(`${ind.label[State.get('language')]} (${ind.unit})`);

  if (yFrom <= 1989 && yTo >= 1990) {
    const xb = x(1989.5);
    root.append('line').attr('x1', xb).attr('x2', xb).attr('y1', 0).attr('y2', ih)
      .attr('stroke', MUTE).attr('stroke-dasharray', '3 4').attr('stroke-width', 1);
    root.append('text').attr('x', xb + 4).attr('y', 12)
      .attr('fill', MUTE).style('font-size', '10px').style('font-style', 'italic')
      .text('1989/90');
  }

  const line = d3.line().defined(d => d.value != null).x(d => x(d.year)).y(d => y(d.value));
  allSeries.forEach((s, i) => {
    const c = COLORS[i % COLORS.length];
    const pts = s.points.filter(p => p.year >= yFrom && p.year <= yTo);
    root.append('path').datum(pts)
      .attr('fill', 'none').attr('stroke', c).attr('stroke-width', 2).attr('d', line);
    const last = pts.slice(-1)[0];
    if (last) {
      root.append('text')
        .attr('x', x(last.year) + 4).attr('y', y(last.value) + 4)
        .attr('fill', c).style('font-size', '11px').style('font-weight', '600')
        .text(s.iso);
    }
  });
}

function formatTick(v) {
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(0) + 'B';
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(0) + 'M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(0) + 'k';
  return d3.format(',.2~f')(v);
}
