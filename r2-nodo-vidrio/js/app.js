// ============================================================================
// APP.JS - Application entry point, routing, initialization
// ============================================================================

import State from './state.js';
import DataLoader from './data-loader.js';
import { initGlobeSection } from './globe/globe-section.js';
import { initExploreSection } from './explore/explore-section.js';
import { initAnalysisSection } from './analysis/analysis-section.js';
import { toggleFullscreen, exportCSV } from './components/export.js';
import CountryPicker from './components/country-picker.js';

// ---- TAB NAVIGATION ---- //
const sections = {
    globe: document.getElementById('section-globe'),
    explore: document.getElementById('section-explore'),
    analysis: document.getElementById('section-analysis'),
    about: document.getElementById('section-about')
};

const tabButtons = document.querySelectorAll('.tab-btn');

function switchSection(sectionId) {
    Object.keys(sections).forEach(key => {
        sections[key].classList.toggle('active', key === sectionId);
    });
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === sectionId);
    });
    State.set('activeSection', sectionId);
    if (State.get('isPlaying')) State.set('isPlaying', false);
}

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const sectionId = btn.dataset.section;
        switchSection(sectionId);
        window.location.hash = '#' + sectionId;
    });
});

// ---- HASH ROUTING ---- //
function handleHash() {
    const hash = window.location.hash.replace('#', '') || 'globe';
    const parts = hash.split('?');
    const section = parts[0];
    if (sections[section]) switchSection(section);

    if (parts[1]) {
        const params = new URLSearchParams(parts[1]);
        if (params.has('c')) {
            State.set('selectedCountries', params.get('c').split(',').filter(Boolean));
        }
        if (params.has('year')) State.set('currentYear', parseInt(params.get('year')));
        if (params.has('range')) {
            const [s, e] = params.get('range').split('-').map(Number);
            if (s && e) State.set('yearRange', [s, e]);
        }
        if (params.has('ind')) State.set('indicator', params.get('ind'));
    }
}

window.addEventListener('hashchange', handleHash);

// ---- INTRO ---- //
const introOverlay = document.getElementById('intro-overlay');
const appEl = document.getElementById('app');

// Shared HTML template for the stripes intro container
const STRIPES_HTML = `
<div class="intro-stripes-container" style="position:absolute;inset:0;background:#1a1a2e;display:flex;flex-direction:column;align-items:center;justify-content:center">
  <svg id="intro-stripes-svg" style="position:absolute;inset:0;width:100%;height:100%"></svg>
  <div style="position:relative;z-index:2;text-align:center;color:#fff">
    <h1 style="font-size:56px;font-weight:700;margin-bottom:6px;letter-spacing:-1px;opacity:0" id="intro-title">Cascorro</h1>
    <p style="font-size:18px;color:rgba(255,255,255,.6);margin-bottom:24px;opacity:0" id="intro-subtitle">Global Environmental &amp; Human Development Explorer &middot; 199 countries &middot; 1750&ndash;2024</p>
    <button class="intro-enter" id="intro-enter" style="opacity:0;pointer-events:none">Start Exploring</button>
  </div>
</div>`;

/**
 * Wire the #intro-enter button inside a given overlay element.
 * Handles hiding the overlay, showing the app, retrying the globe, and cleanup.
 */
function wireIntroEnter(overlayEl) {
    const btn = overlayEl.querySelector('#intro-enter') || overlayEl.querySelector('.intro-enter');
    if (!btn) return;
    btn.addEventListener('click', () => {
        overlayEl.classList.add('hidden');
        appEl.style.display = 'flex';
        // Retry globe init now that app is visible
        setTimeout(() => {
            import('./globe/globe-renderer.js').then(m => m.retryGlobe());
        }, 100);
        setTimeout(() => overlayEl.remove(), 600);
    });
}

/**
 * Compute the normalized world GHG stripe data and the color scale.
 * Returns { stripeData: [{year, norm}], colorScale } or null if no data.
 */
function getStripesData() {
    const worldData = DataLoader.getWorldData();
    if (!worldData || worldData.length === 0) return null;

    const valid = worldData
        .filter(d => d.ghg != null)
        .sort((a, b) => a.y - b.y);
    if (valid.length === 0) return null;

    const ghgValues = valid.map(d => d.ghg);
    const minGhg = d3.min(ghgValues);
    const maxGhg = d3.max(ghgValues);
    const range = maxGhg - minGhg || 1; // avoid division by zero

    const stripeData = valid.map(d => ({
        year: d.y,
        norm: (d.ghg - minGhg) / range
    }));

    // Ed Hawkins warming stripes palette: RdBu reversed so low=blue, high=red
    const colorScale = d3.scaleSequential()
        .domain([0, 1])
        .interpolator(d3.interpolateRdBu);

    return { stripeData, colorScale };
}

/**
 * Render SVG stripe rects into the #intro-stripes-svg element.
 * All rects are rendered at the given startOpacity (0 for animated, 1 for static).
 */
function renderStripeRects(stripeData, colorScale, startOpacity) {
    const svg = d3.select('#intro-stripes-svg');
    if (svg.empty()) return svg;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const n = stripeData.length;
    const barW = width / n;

    svg.attr('viewBox', `0 0 ${width} ${height}`)
       .attr('preserveAspectRatio', 'none');

    svg.selectAll('rect')
        .data(stripeData)
        .enter()
        .append('rect')
        .attr('x', (d, i) => i * barW)
        .attr('y', 0)
        .attr('width', barW + 0.5) // small overlap to prevent sub-pixel gaps
        .attr('height', height)
        .attr('fill', d => colorScale(1 - d.norm)) // reversed: low ghg=blue, high ghg=red
        .attr('opacity', startOpacity);

    return svg;
}

/**
 * Animate the warming stripes intro on the #intro-overlay.
 * Replaces the overlay content, draws staggered stripes, then fades in text + button.
 */
function animateWarmingStripes() {
    if (!introOverlay) return;

    // Replace intro content with stripes container
    introOverlay.innerHTML = STRIPES_HTML;

    const stripesInfo = getStripesData();
    if (!stripesInfo) {
        // Fallback: just show title/button immediately if no world data
        d3.select('#intro-title').style('opacity', 1);
        d3.select('#intro-subtitle').style('opacity', 1);
        d3.select('#intro-enter').style('opacity', 1).style('pointer-events', 'auto');
        wireIntroEnter(introOverlay);
        return;
    }

    const { stripeData, colorScale } = stripesInfo;

    // Render rects starting at opacity 0 for animation
    const svg = renderStripeRects(stripeData, colorScale, 0);
    const n = stripeData.length;

    // Stagger animation: rects appear left to right over ~3 seconds
    svg.selectAll('rect')
        .transition()
        .delay((d, i) => i * (3000 / n))
        .duration(200)
        .attr('opacity', 1);

    // After stripes complete (~3.5s), fade in title, subtitle, button
    setTimeout(() => {
        d3.select('#intro-title')
            .transition().duration(800)
            .style('opacity', 1);
        d3.select('#intro-subtitle')
            .transition().delay(300).duration(800)
            .style('opacity', 1);
        d3.select('#intro-enter')
            .transition().delay(600).duration(800)
            .style('opacity', 1)
            .style('pointer-events', 'auto');
    }, 3500);

    // Wire the new button (old handler was lost when innerHTML was replaced)
    wireIntroEnter(introOverlay);
}

/**
 * Build static (non-animated) stripes for the home-button overlay.
 * All rects and text appear instantly at full opacity.
 */
function buildStaticStripes(overlayEl) {
    overlayEl.innerHTML = STRIPES_HTML;

    const stripesInfo = getStripesData();
    if (stripesInfo) {
        renderStripeRects(stripesInfo.stripeData, stripesInfo.colorScale, 1);
    }

    // Show title/subtitle/button immediately
    d3.select('#intro-title').style('opacity', 1);
    d3.select('#intro-subtitle').style('opacity', 1);
    d3.select('#intro-enter').style('opacity', 1).style('pointer-events', 'auto');

    wireIntroEnter(overlayEl);
}

// ---- HEADER ACTIONS ---- //
document.getElementById('btn-home').addEventListener('click', () => {
    // Recreate intro overlay with static stripes (no re-animation)
    const overlay = document.createElement('div');
    overlay.className = 'intro-overlay';
    overlay.id = 'intro-overlay';
    document.body.appendChild(overlay);
    appEl.style.display = 'none';
    buildStaticStripes(overlay);
});
document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);

// ---- FOOTER ACTIONS ---- //
document.getElementById('footer-fullscreen').addEventListener('click', toggleFullscreen);
document.getElementById('footer-csv').addEventListener('click', () => {
    const countries = State.get('selectedCountries');
    if (countries.length === 0) return;
    const yearRange = State.get('yearRange');
    const rows = [];
    countries.forEach(iso3 => {
        const data = DataLoader.getCountryData(iso3);
        const meta = DataLoader.getMetadata(iso3);
        if (!data) return;
        data.filter(d => d.y >= yearRange[0] && d.y <= yearRange[1]).forEach(d => {
            rows.push({
                iso3,
                country: meta ? meta.name : iso3,
                year: d.y,
                ghg_mt: d.ghg,
                ghg_pc_t: d.ghg_pc,
                co2ff_mt: d.co2ff,
                gdp_pc: d.gdp_pc,
                population: d.pop,
                hdi: d.hdi,
                hdi_ng: d.hdi_ng
            });
        });
    });
    exportCSV(rows, `cascorro_data_${countries.join('_')}.csv`);
});

// ---- SECTION STATE CHANGE ---- //
State.subscribe('activeSection', (section) => switchSection(section));

// ---- INITIALIZATION ---- //
async function init() {
    try {
        await DataLoader.init();

        // Set dynamic year range from loaded data
        const dataYearRange = DataLoader.getYearRange();
        if (dataYearRange) {
            State.set('yearRange', dataYearRange);
            State.set('yearFrom', dataYearRange[0]);
            State.set('currentYear', dataYearRange[1]);
        }

        // Set default countries if none specified via URL hash
        const DEFAULT_COUNTRIES = ['CHN', 'USA', 'IND', 'DEU', 'GBR', 'ESP'];
        State.set('selectedCountries', DEFAULT_COUNTRIES);

        initGlobeSection();
        initExploreSection();
        initAnalysisSection();
        CountryPicker.init();

        handleHash();

        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('hidden');
        setTimeout(() => loadingScreen.remove(), 500);

        // Launch animated warming stripes intro now that data is available
        animateWarmingStripes();

        console.log('Cascorro Explorer initialized successfully');

    } catch (err) {
        console.error('Initialization failed:', err);
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.querySelector('.loading-subtitle').textContent =
            'Failed to load data. Please check the console for errors.';
        loadingScreen.querySelector('.loading-bar').style.display = 'none';
    }
}

init();

// ---- ABOUT SECTION TABS ---- //
document.querySelectorAll('.about-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.about-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.about-panel').forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
        tab.classList.add('active');
        const panel = document.getElementById('about-panel-' + tab.dataset.aboutTab);
        if (panel) { panel.classList.add('active'); panel.style.display = 'block'; }
    });
});
// Method indicator buttons
document.querySelectorAll('.method-indicator-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.method-indicator-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.method-panel').forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
        btn.classList.add('active');
        const panel = document.getElementById('method-panel-' + btn.dataset.method);
        if (panel) { panel.classList.add('active'); panel.style.display = 'block'; }
    });
});
