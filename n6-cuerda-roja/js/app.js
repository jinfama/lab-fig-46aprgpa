// Main controller. Orchestrates landing → app handoff and wires components.

import { State } from './state.js';
import { DataLoader } from './data-loader.js';
import { CATEGORIES, getCategory, getIndicator } from './indicators.js';
import { initLanding } from './landing.js';
import { initSidebar } from './sidebar.js';
import { initQueryBar } from './query-bar.js';
import { initTimeline } from './timeline.js';
import { initRightPanel } from './right-panel.js';
import { initMapView } from './views/map.js';
import { initTrendView } from './views/trend.js';
import { initRankingView } from './views/ranking.js';
import { initTreemapView } from './views/treemap.js';
import { initTableView } from './views/table.js';
import { initAboutView } from './views/about.js';

const VIEWS = ['map', 'trend', 'ranking', 'treemap', 'table', 'about'];

function switchView(view) {
  VIEWS.forEach(v => {
    const pane = document.getElementById(`panel-${v}`);
    if (pane) pane.classList.toggle('active', v === view);
  });
  document.querySelectorAll('.vw-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });
  State.set('activeView', view);
}

async function bootApp() {
  // Preload manifest + regions for the default map view.
  try { await DataLoader.loadManifest(); } catch (_) {}

  initSidebar({
    onCategoryChange(catId) {
      // When switching category, fall back to its first indicator.
      const cat = getCategory(catId);
      if (cat && cat.indicators.length) {
        State.setMany({ activeCategory: catId, activeIndicator: cat.indicators[0].id });
      } else {
        State.set('activeCategory', catId);
      }
    },
    onAbout() { switchView('about'); },
  });

  initQueryBar({
    onIndicatorChange(indId) { State.set('activeIndicator', indId); },
    onCategoryChange(catId) {
      const cat = getCategory(catId);
      if (cat && cat.indicators.length) {
        State.setMany({ activeCategory: catId, activeIndicator: cat.indicators[0].id });
      } else {
        State.set('activeCategory', catId);
      }
    },
  });

  initTimeline();
  initRightPanel();

  // Init views.
  await initMapView();
  initTrendView();
  initRankingView();
  initTreemapView();
  initTableView();
  initAboutView();

  // View switcher buttons.
  document.querySelectorAll('.vw-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
  // Info button → about view.
  const infoBtn = document.getElementById('btn-info');
  if (infoBtn) infoBtn.addEventListener('click', () => switchView('about'));

  // Toggle right panel.
  const togglePanel = document.getElementById('btn-toggle-panel');
  if (togglePanel) togglePanel.addEventListener('click', () => {
    const rp = document.getElementById('right-panel');
    rp.classList.toggle('hidden');
  });

  // Fullscreen.
  document.getElementById('btn-fs').addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  });

  // Apply initial language (already set by landing's language switcher).
  applyAppI18n(State.get('language'));
  State.subscribe('language', applyAppI18n);
}

function applyAppI18n(lang) {
  const D = {
    es: { source: 'Fuente: FAO · ILO · World Bank · GSI · pipeline labour (Infante-Amate, UGR)' },
    en: { source: 'Source: FAO · ILO · World Bank · GSI · labour pipeline (Infante-Amate, UGR)' },
  };
  const f = document.getElementById('footer-source');
  if (f && D[lang]) f.textContent = D[lang].source;
}

// ---------- bootstrap ----------
initLanding({ onEnter: bootApp });
