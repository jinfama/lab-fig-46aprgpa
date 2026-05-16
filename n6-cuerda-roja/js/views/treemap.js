// Treemap view — composition by crop category for the (first) selected country.

import { State } from '../state.js';
import { DataLoader } from '../data-loader.js';
import { getIndicator } from '../indicators.js';

const PALETTE = ['#6B4226','#D4A032','#1B3A5C','#8B2500','#4A6B3A','#D4713A','#693F8C','#2D7B7C','#A87E2C','#5C2D1F'];

export function initTreemapView() {
  refresh();
  State.subscribe('activeCategory',   refresh);
  State.subscribe('activeIndicator',  refresh);
  State.subscribe('currentYear',      refresh);
  State.subscribe('selectedCountries',refresh);
  State.subscribe('language',         refresh);
  window.addEventListener('resize',   refresh);
}

async function refresh() {
  const header = document.getElementById('treemap-header');
  const chart  = document.getElementById('treemap-chart');
  if (!chart) return;
  const sel = State.get('selectedCountries');
  const ind = getIndicator(State.get('activeCategory'), State.get('activeIndicator'));
  if (!ind || !sel.length) {
    chart.innerHTML = '';
    if (header) header.textContent = 'Selecciona un país para ver la composición por categoría';
    return;
  }
  const iso = sel[0];
  const year = State.get('currentYear');
  if (header) header.textContent = `Composición de ${ind.label[State.get('language')]} en ${iso} (${year})`;

  let data;
  try {
    data = await DataLoader.loadCountryCategories(iso);
  } catch (_) {
    chart.innerHTML = '<div style="padding:24px;color:var(--c-text-3)">Sin datos para este país.</div>';
    return;
  }
  const rows = (data.rows || []).filter(r => r.year === year && r[ind.field] != null && isFinite(r[ind.field]) && r[ind.field] > 0);
  if (!rows.length) {
    chart.innerHTML = '<div style="padding:24px;color:var(--c-text-3)">Sin datos en este año.</div>';
    return;
  }

  const items = rows.map(r => ({ name: r.category_labor, value: r[ind.field] }))
                    .sort((a, b) => b.value - a.value);

  const W = chart.clientWidth;
  const H = chart.clientHeight || 400;
  chart.innerHTML = '';
  const svg = d3.select(chart).append('svg').attr('width', W).attr('height', H);

  const root = d3.hierarchy({ children: items }).sum(d => d.value || 0);
  d3.treemap().size([W, H]).paddingInner(2)(root);

  svg.selectAll('g').data(root.leaves()).enter().append('g')
    .attr('transform', d => `translate(${d.x0},${d.y0})`)
    .each(function (d, i) {
      const g = d3.select(this);
      const w = d.x1 - d.x0;
      const h = d.y1 - d.y0;
      g.append('rect').attr('width', w).attr('height', h)
        .attr('fill', PALETTE[i % PALETTE.length]).attr('opacity', 0.92);
      if (w > 60 && h > 28) {
        g.append('text').attr('x', 6).attr('y', 16)
          .attr('fill', '#fff').style('font-size', '11px').style('font-weight', 600)
          .text(d.data.name);
        g.append('text').attr('x', 6).attr('y', 30)
          .attr('fill', 'rgba(255,255,255,0.78)').style('font-size', '10px')
          .text(d3.format(',.2~s')(d.data.value));
      }
    });
}
