// ============================================================================
// GLOBE SECTION - Controller for the globe explorer tab
// ============================================================================

import State from '../state.js';
import DataLoader from '../data-loader.js';
import { initGlobe, updateGlobeColors, flyToCountry } from './globe-renderer.js';
import { initCountryProfile, openProfile, closeProfile, updateProfileYear } from './country-profile.js';
import Timeline from '../components/timeline.js';

let timeline = null;
let initialized = false;

export function initGlobeSection() {
    if (initialized) return;
    initialized = true;

    // Initialize globe
    initGlobe('globe-mount');

    // Initialize country profile
    initCountryProfile();

    // Initialize timeline
    timeline = new Timeline('globe-timeline');

    // Search functionality
    const searchInput = document.getElementById('globe-search-input');
    const searchResults = document.getElementById('globe-search-results');

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        if (query.length < 1) {
            searchResults.classList.remove('visible');
            return;
        }
        const results = DataLoader.searchCountries(query);
        if (results.length === 0) {
            searchResults.classList.remove('visible');
            return;
        }
        searchResults.innerHTML = results.map(r => `
            <div class="search-result-item" data-iso3="${r.iso3}">
                <span class="search-result-name">${r.name}</span>
                <span class="search-result-iso">${r.iso3}</span>
            </div>
        `).join('');
        searchResults.classList.add('visible');

        searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const iso3 = item.dataset.iso3;
                State.addCountry(iso3);
                flyToCountry(iso3);
                openProfile(iso3);
                searchInput.value = '';
                searchResults.classList.remove('visible');
            });
        });
    });

    searchInput.addEventListener('blur', () => {
        setTimeout(() => searchResults.classList.remove('visible'), 200);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchResults.classList.remove('visible');
            searchInput.blur();
        }
    });

    // Globe country click handler
    document.addEventListener('globe:countryClick', (e) => {
        const { iso3 } = e.detail;
        flyToCountry(iso3);
        openProfile(iso3);
    });

    // State subscriptions
    State.subscribe('currentYear', () => {
        updateGlobeColors();
        updateProfileYear();
    });

    State.subscribe('selectedCountries', () => {
        updateGlobeColors();
    });

    State.subscribe('indicatorMode', () => {
        updateGlobeColors();
    });
}
