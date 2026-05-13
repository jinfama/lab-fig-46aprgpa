// ============================================================================
// MAP SECTION - Controller for the map viewer tab
// ============================================================================

import State from '../state.js';
import DataLoader from '../data-loader.js';
import { initChoropleth, updateChoropleth, highlightCountries } from './choropleth.js';
import Timeline from '../components/timeline.js';
import { getColorForIndex } from '../utils.js';

let timeline = null;
let initialized = false;

export function initMapSection() {
    if (initialized) return;
    initialized = true;

    // Initialize choropleth
    initChoropleth();

    // Initialize timeline
    timeline = new Timeline('map-timeline');

    // Indicator mode select
    const indicatorSelect = document.getElementById('map-indicator-select');
    const benchmarkGroup = document.getElementById('map-benchmark-group');
    const benchmarkSelect = document.getElementById('map-benchmark-select');

    indicatorSelect.addEventListener('change', () => {
        State.set('indicatorMode', indicatorSelect.value);
        benchmarkGroup.style.display = indicatorSelect.value === 'ratio_custom' ? '' : 'none';
    });

    // Populate benchmark select
    const allMeta = DataLoader.getAllMetadata();
    benchmarkSelect.innerHTML = allMeta.map(m =>
        `<option value="${m.iso3}">${m.name}</option>`
    ).join('');

    benchmarkSelect.addEventListener('change', () => {
        const iso3 = benchmarkSelect.value;
        const meta = DataLoader.getMetadata(iso3);
        State.set('benchmarkEntity', {
            type: 'country',
            iso3,
            label: meta ? meta.name : iso3
        });
    });

    // Compare button
    document.getElementById('map-compare-btn').addEventListener('click', () => {
        State.set('activeSection', 'analysis');
        window.location.hash = '#analysis';
    });

    // State subscriptions
    State.subscribe('currentYear', () => updateChoropleth());
    State.subscribe('indicatorMode', () => updateChoropleth());
    State.subscribe('benchmarkEntity', () => updateChoropleth());
    State.subscribe('selectedCountries', () => {
        highlightCountries();
        updateChips();
    });

    updateChoropleth();
    updateChips();
}

function updateChips() {
    const countries = State.get('selectedCountries');
    const chipsEl = document.getElementById('map-chips');
    const compareBtn = document.getElementById('map-compare-btn');

    if (countries.length === 0) {
        chipsEl.innerHTML = '<span style="color:var(--color-light-gray);font-size:11px">Click countries on the map to select them</span>';
        compareBtn.style.display = 'none';
        return;
    }

    compareBtn.style.display = '';
    chipsEl.innerHTML = countries.map((iso3, i) => {
        const meta = DataLoader.getMetadata(iso3);
        const name = meta ? meta.name : iso3;
        const color = getColorForIndex(i);
        return `<span class="chip">
            <span class="chip-color" style="background:${color}"></span>
            ${name}
            <span class="chip-remove" data-iso3="${iso3}">&times;</span>
        </span>`;
    }).join('');

    chipsEl.querySelectorAll('.chip-remove').forEach(el => {
        el.addEventListener('click', () => {
            State.removeCountry(el.dataset.iso3);
        });
    });
}
