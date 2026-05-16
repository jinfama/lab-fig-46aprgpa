// Table view — minimal sortable table of selected countries' rows at currentYear.

import { State } from '../state.js';
import { DataLoader } from '../data-loader.js';
import { getIndicator } from '../indicators.js';

export function initTableView() {
  refresh();
  State.subscribe('activeCategory',  refresh);
  State.subscribe('activeIndicator', refresh);
  State.subscribe('currentYear',     refresh);
  State.subscribe('selectedCountries', refresh);
  State.subscribe('language',        refresh);
}

async function refresh() {
  const container = document.getElementById('table-container');
  if (!container) return;
  const sel = State.get('selectedCountries');
  const ind = getIndicator(State.get('activeCategory'), State.get('activeIndicator'));
  const year = State.get('currentYear');

  if (!sel.length) {
    container.innerHTML = `<div style="color:var(--c-text-3); padding: 32px 0;">
      Selecciona uno o más países en el panel derecho para ver sus datos en tabla.</div>`;
    return;
  }
  if (!ind) return;

  const all = await Promise.all(sel.map(async iso => {
    try {
      const data = await DataLoader.loadCountryCategories(iso);
      return (data.rows || []).filter(r => r.year === year);
    } catch (_) { return []; }
  }));
  const rows = all.flat();
  if (!rows.length) {
    container.innerHTML = `<div style="color:var(--c-text-3); padding: 32px 0;">Sin datos para ${year}.</div>`;
    return;
  }
  rows.sort((a, b) => (b[ind.field] || 0) - (a[ind.field] || 0));

  container.innerHTML = `
    <table>
      <thead><tr>
        <th>País</th><th>ISO3</th><th>Categoría</th>
        <th style="text-align:right;">${ind.label[State.get('language')]} (${ind.unit})</th>
        <th style="text-align:right;">Workers</th>
        <th style="text-align:right;">Horas total</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => `<tr>
          <td>${r.country || ''}</td>
          <td>${r.iso3 || ''}</td>
          <td>${r.category_labor || ''}</td>
          <td style="text-align:right; font-variant-numeric:tabular-nums;">${fmt(r[ind.field])}</td>
          <td style="text-align:right; font-variant-numeric:tabular-nums;">${fmt(r.workers)}</td>
          <td style="text-align:right; font-variant-numeric:tabular-nums;">${fmt(r.hours_total)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  `;
}

function fmt(v) {
  if (v == null || !isFinite(v)) return '—';
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + 'k';
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(2);
}
