// Right panel: Opciones, Categorías de cultivo, Países.

import { State } from './state.js';
import { DataLoader } from './data-loader.js';

export async function initRightPanel() {
  renderOptions();
  await renderTerritories();
  // Crop categories list depends on whatever's loaded; render once we have it.
  await renderCropCategories();

  State.subscribe('language',         renderOptions);
  State.subscribe('selectedCountries',renderTerritoriesHighlight);
}

function renderOptions() {
  const body = document.getElementById('rp-options-body');
  if (!body) return;
  const lang = State.get('language');
  const labels = lang === 'en'
    ? { perCapita: 'Per capita / per worker', unit: 'Unit', reset: 'Reset selection' }
    : { perCapita: 'Per cápita / por trabajador', unit: 'Unidad', reset: 'Reiniciar selección' };

  body.innerHTML = `
    <label class="rp-option">
      <input type="checkbox" id="opt-per-capita" ${State.get('perCapita') ? 'checked' : ''}>
      <span class="rp-option-label">${labels.perCapita}</span>
    </label>
    <div class="rp-option" style="cursor:default">
      <button class="footer-btn" id="opt-reset" style="width:100%; padding: 6px 10px;">${labels.reset}</button>
    </div>
  `;

  document.getElementById('opt-per-capita').addEventListener('change', e => {
    State.set('perCapita', e.target.checked);
  });
  document.getElementById('opt-reset').addEventListener('click', () => {
    State.clearCountries();
  });
}

async function renderTerritories() {
  const list = document.getElementById('rp-territory-list');
  const search = document.getElementById('rp-territory-search');
  if (!list) return;
  let countries = [];
  try {
    const idx = await DataLoader.loadCategoriesIndex();
    countries = (idx && idx.countries) || [];
  } catch (e) {
    list.innerHTML = '<div style="padding:8px 10px; color:var(--c-text-3); font-size:12px;">No se pudo cargar el índice de países.</div>';
    return;
  }
  countries.sort((a, b) => a.country.localeCompare(b.country));

  function paint(filter) {
    const f = (filter || '').toLowerCase();
    const sel = State.get('selectedCountries');
    list.innerHTML = countries
      .filter(c => !f || c.country.toLowerCase().includes(f) || c.iso3.toLowerCase().includes(f))
      .slice(0, 250)
      .map(c => `<div class="rp-territory ${sel.includes(c.iso3) ? 'selected' : ''}" data-iso="${c.iso3}">
        <span>${c.country}</span><span style="color:var(--c-text-3); font-size:10px;">${c.iso3}</span>
      </div>`).join('');
    list.querySelectorAll('.rp-territory').forEach(el => {
      el.addEventListener('click', () => State.toggleCountry(el.dataset.iso));
    });
  }

  paint('');
  if (search) search.addEventListener('input', e => paint(e.target.value));
}

function renderTerritoriesHighlight() {
  const sel = State.get('selectedCountries');
  document.querySelectorAll('.rp-territory').forEach(el => {
    el.classList.toggle('selected', sel.includes(el.dataset.iso));
  });
}

async function renderCropCategories() {
  const list = document.getElementById('rp-crop-list');
  const search = document.getElementById('rp-crop-search');
  if (!list) return;
  let cats = [];
  try {
    const idx = await DataLoader.loadCategoriesIndex();
    cats = (idx && idx.categories_all) || [];
  } catch (e) {
    list.innerHTML = '<div style="padding:8px 10px; color:var(--c-text-3); font-size:12px;">No se pudo cargar el índice de categorías.</div>';
    return;
  }
  cats.sort();

  function paint(filter) {
    const f = (filter || '').toLowerCase();
    const sel = State.get('cropCategoryFilter');
    list.innerHTML = `
      <div class="rp-crop ${sel === null ? 'selected' : ''}" data-cat=""><span>Todas las categorías</span></div>
      ${cats.filter(c => !f || c.toLowerCase().includes(f))
            .map(c => `<div class="rp-crop ${sel === c ? 'selected' : ''}" data-cat="${c}">${c}</div>`)
            .join('')}
    `;
    list.querySelectorAll('.rp-crop').forEach(el => {
      el.addEventListener('click', () => {
        State.set('cropCategoryFilter', el.dataset.cat || null);
        paint(search ? search.value : '');
      });
    });
  }

  paint('');
  if (search) search.addEventListener('input', e => paint(e.target.value));
}
