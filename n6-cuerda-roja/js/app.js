// Main controller. Orchestrates landing → app handoff and wires components.

import { State } from './state.js';
import { DataLoader } from './data-loader.js?v=20260517-ui33';
import { getCategory } from './indicators.js?v=20260517-ui33';
import { initLanding } from './landing.js';
import { initSidebar } from './sidebar.js?v=20260517-ui33';
import { initQueryBar } from './query-bar.js?v=20260517-ui33';
import { initTimeline } from './timeline.js?v=20260517-ui33';
import { initRightPanel } from './right-panel.js?v=20260517-ui33';
import { initMapView } from './views/map.js?v=20260517-ui33';
import { initTrendView } from './views/trend.js?v=20260517-ui33';
import { initRankingView } from './views/ranking.js?v=20260517-ui33';
import { initTreemapView } from './views/treemap.js?v=20260517-ui33';
import { initTableView } from './views/table.js?v=20260517-ui33';
import { initAboutView } from './views/about.js?v=20260517-ui33';

const VIEWS = ['map', 'trend', 'ranking', 'treemap', 'table', 'about'];
let _lastDataView = 'map';

function switchView(view) {
  VIEWS.forEach(v => {
    const pane = document.getElementById(`panel-${v}`);
    if (pane) pane.classList.toggle('active', v === view);
  });
  document.querySelectorAll('.vw-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });
  if (view !== 'about') _lastDataView = view;
  State.set('activeView', view);
}

function returnToDataView() {
  if (State.get('activeView') === 'about') switchView(_lastDataView || 'map');
}

function categoryDefaults(catId, firstIndicatorId) {
  const next = { activeCategory: catId, activeIndicator: firstIndicatorId };
  if (catId === 'footprints') {
    Object.assign(next, {
      trendLayout: 'facet',
      trendFacetBy: 'territory',
      footprintFlow: 'footprint',
      footprintFlows: ['footprint', 'imports', 'exports', 'domestic'],
      footprintTrendMode: 'all',
    });
  } else if (catId === 'productivity') {
    Object.assign(next, {
      productivityDirection: 'unit_per_hour',
      productivityLaborInput: 'hours',
      functionalUnit: 'tonne',
    });
  }
  return next;
}

async function bootApp() {
  // Preload manifest + regions for the default map view.
  try { await DataLoader.loadManifest(); } catch (_) {}

  initSidebar({
    onCategoryChange(catId) {
      // When switching category, fall back to its first indicator.
      const cat = getCategory(catId);
      if (cat && cat.indicators.length) {
        State.setMany(categoryDefaults(catId, cat.indicators[0].id));
      } else {
        State.set('activeCategory', catId);
      }
      returnToDataView();
    },
    onAbout() { switchView('about'); },
  });

  initQueryBar({
    onIndicatorChange(indId) { State.set('activeIndicator', indId); returnToDataView(); },
    onCategoryChange(catId) {
      const cat = getCategory(catId);
      if (cat && cat.indicators.length) {
        State.setMany(categoryDefaults(catId, cat.indicators[0].id));
      } else {
        State.set('activeCategory', catId);
      }
      returnToDataView();
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
  if (togglePanel) {
    togglePanel.classList.add('active');
    togglePanel.setAttribute('aria-pressed', 'true');
    togglePanel.addEventListener('click', () => {
      const rp = document.getElementById('right-panel');
      if (!rp) return;
      const collapsed = rp.classList.toggle('collapsed');
      State.set('rightPanelVisible', !collapsed);
      togglePanel.classList.toggle('active', !collapsed);
      togglePanel.setAttribute('aria-pressed', String(!collapsed));
    });
  }

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
