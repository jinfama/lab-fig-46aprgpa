// Top query bar that reads like a sentence: "Category / Indicator".

import { State } from './state.js';
import { CATEGORIES, getCategory, getIndicator } from './indicators.js';

export function initQueryBar({ onCategoryChange, onIndicatorChange }) {
  const catBtn      = document.getElementById('query-cat');
  const indBtn      = document.getElementById('query-ind');
  const catLabel    = document.getElementById('query-cat-label');
  const indLabel    = document.getElementById('query-ind-label');
  const catDropdown = document.getElementById('query-cat-dropdown');
  const indDropdown = document.getElementById('query-ind-dropdown');
  const selBar      = document.getElementById('selection-bar');

  const lang = () => State.get('language');

  function renderLabels() {
    const cat = getCategory(State.get('activeCategory'));
    const ind = cat ? getIndicator(cat.id, State.get('activeIndicator')) : null;
    if (catLabel && cat) catLabel.textContent = cat.label[lang()];
    if (indLabel && ind) indLabel.textContent = ind.label[lang()];
    else if (indLabel) indLabel.textContent = '—';
  }

  function renderCatDropdown() {
    catDropdown.innerHTML = CATEGORIES.map(c => `
      <div class="qd-item ${c.id === State.get('activeCategory') ? 'active' : ''} ${c.blocked ? 'qd-blocked' : ''}" data-cat="${c.id}">
        <span>${c.label[lang()]}</span>
        ${c.blocked ? `<span class="qd-item-desc">${(c.blockedMsg && c.blockedMsg[lang()]) || ''}</span>` : ''}
      </div>
    `).join('');
    catDropdown.querySelectorAll('.qd-item').forEach(it => {
      it.addEventListener('click', () => {
        const cat = getCategory(it.dataset.cat);
        if (cat.blocked) return;
        onCategoryChange(it.dataset.cat);
        catDropdown.classList.remove('open');
      });
    });
  }

  function renderIndDropdown() {
    const cat = getCategory(State.get('activeCategory'));
    if (!cat || !cat.indicators.length) {
      indDropdown.innerHTML = `<div class="qd-item" style="cursor:default;color:var(--c-text-3)">Sin indicadores disponibles</div>`;
      return;
    }
    indDropdown.innerHTML = cat.indicators.map(i => `
      <div class="qd-item ${i.id === State.get('activeIndicator') ? 'active' : ''}" data-ind="${i.id}">
        <span>${i.label[lang()]}</span>
        <span class="qd-item-desc">${i.unit}${i.warn ? ' · indicador sensible' : ''}</span>
      </div>
    `).join('');
    indDropdown.querySelectorAll('.qd-item').forEach(it => {
      it.addEventListener('click', () => {
        onIndicatorChange(it.dataset.ind);
        indDropdown.classList.remove('open');
      });
    });
  }

  function renderSelection() {
    if (!selBar) return;
    const sel = State.get('selectedCountries');
    selBar.innerHTML = sel.map(iso => `
      <span class="sel-chip" data-iso="${iso}">${iso}<span class="sel-chip-x" data-iso="${iso}">×</span></span>
    `).join('');
    selBar.querySelectorAll('.sel-chip-x').forEach(x => {
      x.addEventListener('click', e => {
        e.stopPropagation();
        State.toggleCountry(x.dataset.iso);
      });
    });
  }

  catBtn.addEventListener('click', () => {
    renderCatDropdown();
    catDropdown.classList.toggle('open');
    indDropdown.classList.remove('open');
  });
  indBtn.addEventListener('click', () => {
    renderIndDropdown();
    indDropdown.classList.toggle('open');
    catDropdown.classList.remove('open');
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.query-segment')) {
      catDropdown.classList.remove('open');
      indDropdown.classList.remove('open');
    }
  });

  // Initial paint.
  renderLabels();
  renderSelection();

  State.subscribe('activeCategory',  renderLabels);
  State.subscribe('activeIndicator', renderLabels);
  State.subscribe('language',        renderLabels);
  State.subscribe('selectedCountries', renderSelection);
}
