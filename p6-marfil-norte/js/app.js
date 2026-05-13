// ============================================================================
// APP.JS - Application entry point, routing, initialization
// ============================================================================

import State from './state.js';
import DataLoader from './data-loader.js';
import { initGlobeSection } from './globe/globe-section.js';
import { initMapSection } from './map/map-section.js';
import { initAnalysisSection } from './analysis/analysis-section.js';
import { initStatisticsSection } from './statistics/statistics-section.js';
import { captureScreenshot, toggleFullscreen, exportCSV } from './components/export.js';

// ---- TAB NAVIGATION ---- //
const sections = {
    globe: document.getElementById('section-globe'),
    map: document.getElementById('section-map'),
    analysis: document.getElementById('section-analysis'),
    statistics: document.getElementById('section-statistics')
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

    // Stop timeline when leaving a section
    if (State.get('isPlaying')) {
        State.set('isPlaying', false);
    }
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

    if (sections[section]) {
        switchSection(section);
    }

    // Parse URL params
    if (parts[1]) {
        const params = new URLSearchParams(parts[1]);
        if (params.has('c')) {
            const countries = params.get('c').split(',').filter(Boolean);
            State.set('selectedCountries', countries);
        }
        if (params.has('year')) {
            State.set('currentYear', parseInt(params.get('year')));
        }
        if (params.has('range')) {
            const [s, e] = params.get('range').split('-').map(Number);
            if (s && e) State.set('yearRange', [s, e]);
        }
        if (params.has('mode')) {
            State.set('indicatorMode', params.get('mode'));
        }
    }
}

window.addEventListener('hashchange', handleHash);

// ---- HEADER ACTIONS ---- //
document.getElementById('btn-screenshot').addEventListener('click', captureScreenshot);
document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);

// ---- FOOTER ACTIONS ---- //
document.getElementById('footer-screenshot').addEventListener('click', captureScreenshot);
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
                gdp_pc_ppp: d.pc,
                gdp_total_ppp_millions: d.tot,
                reliability: d.r === 'h' ? 'high' : d.r === 'm' ? 'medium' : 'low'
            });
        });
    });

    exportCSV(rows, `maddison_gdp_${countries.join('_')}.csv`);
});

// ---- SECTION STATE CHANGE -> Navigate ---- //
State.subscribe('activeSection', (section) => {
    switchSection(section);
});

// ---- INITIALIZATION ---- //
async function init() {
    try {
        await DataLoader.init();

        // Initialize all sections
        initGlobeSection();
        initMapSection();
        initAnalysisSection();
        initStatisticsSection();

        // Handle initial route
        handleHash();

        // Hide loading screen
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('hidden');
        setTimeout(() => loadingScreen.remove(), 500);

        console.log('Maddison GDP Explorer initialized successfully');

    } catch (err) {
        console.error('Initialization failed:', err);
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.querySelector('.loading-subtitle').textContent =
            'Failed to load data. Please ensure data files are in the /data folder.';
        loadingScreen.querySelector('.loading-bar').style.display = 'none';
    }
}

init();
