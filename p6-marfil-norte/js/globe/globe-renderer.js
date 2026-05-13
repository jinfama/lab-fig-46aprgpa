// ============================================================================
// GLOBE RENDERER - Globe.gl wrapper
// ============================================================================

import DataLoader from '../data-loader.js';
import State from '../state.js';
import Tooltip from '../components/tooltip.js';
import { COLORS, formatGDP, formatRank, formatRatio } from '../utils.js';

let globe = null;
let currentColorFn = null;

export function initGlobe(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const features = DataLoader.getGeoFeatures();

    // Globe.gl: create instance, mount to container, then configure
    globe = Globe()(container)
        .globeImageUrl('//cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg')
        .backgroundColor('#ffffff')
        .width(container.clientWidth)
        .height(container.clientHeight)
        .polygonsData(features)
        .polygonGeoJsonGeometry(d => d.geometry)
        .polygonCapColor(d => getCountryColor(d.properties.iso3))
        .polygonSideColor(() => 'rgba(0,0,0,0.04)')
        .polygonStrokeColor(() => '#495057')
        .polygonAltitude(d => {
            const iso3 = d.properties.iso3;
            return State.get('selectedCountries').includes(iso3) ? 0.02 : 0.005;
        })
        .polygonLabel(() => '')
        .onPolygonClick((polygon) => {
            const iso3 = polygon.properties.iso3;
            if (iso3) {
                State.toggleCountry(iso3);
                document.dispatchEvent(new CustomEvent('globe:countryClick', { detail: { iso3 } }));
            }
        })
        .onPolygonHover((polygon, prevPolygon) => {
            if (polygon) {
                const iso3 = polygon.properties.iso3;
                const name = polygon.properties.name || iso3;
                const year = State.get('currentYear');
                const val = DataLoader.getCountryValue(iso3, year);
                const rank = DataLoader.getCountryRank(iso3, year);
                const total = DataLoader.getTotalCountries(year);
                const worldVal = DataLoader.getWorldValue(year);
                const ratio = (val && worldVal) ? val.pc / worldVal.pc : null;

                const html = `
                    <div class="tooltip-title"><span>${name}</span><span>${year}</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">GDP per capita</span><span class="tooltip-value">${formatGDP(val?.pc)}</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">World rank</span><span class="tooltip-value">${rank ? formatRank(rank, total) : '—'}</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">vs World avg</span><span class="tooltip-value">${ratio ? formatRatio(ratio) : '—'}</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">Reliability</span><span class="tooltip-value">${val ? { h: 'High', m: 'Medium', l: 'Low' }[val.r] || '—' : '—'}</span></div>
                `;
                // Use a synthetic event position since globe.gl doesn't pass the event
                const rect = container.getBoundingClientRect();
                Tooltip.show(html, {
                    clientX: rect.left + rect.width / 2,
                    clientY: rect.top + rect.height / 2
                });
            } else {
                Tooltip.hide();
            }
        })
        .polygonsTransitionDuration(200);

    // Set initial camera
    globe.pointOfView({ lat: 20, lng: 10, altitude: 2.2 });

    // Mouse move for tooltip positioning
    container.addEventListener('mousemove', (e) => {
        Tooltip.move(e);
    });
    container.addEventListener('mouseleave', () => {
        Tooltip.hide();
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
        if (globe) {
            globe.width(container.clientWidth);
            globe.height(container.clientHeight);
        }
    });
    resizeObserver.observe(container);

    return globe;
}

function getCountryColor(iso3) {
    if (!iso3) return '#ddd';
    const year = State.get('currentYear');
    const mode = State.get('indicatorMode');
    const val = DataLoader.getCountryValue(iso3, year);
    if (!val || val.pc == null) return '#eee';

    if (mode === 'ratio_world') {
        const worldVal = DataLoader.getWorldValue(year);
        if (!worldVal) return '#eee';
        const ratio = val.pc / worldVal.pc;
        return ratioToColor(ratio);
    } else if (mode === 'ratio_uk1900') {
        const uk1900 = DataLoader.getUK1900();
        if (!uk1900) return '#eee';
        const ratio = val.pc / uk1900;
        return ratioToColor(ratio);
    } else if (mode === 'ratio_custom') {
        const bench = State.get('benchmarkEntity');
        if (bench && bench.iso3) {
            const benchVal = DataLoader.getCountryValue(bench.iso3, year);
            if (benchVal) {
                const ratio = val.pc / benchVal.pc;
                return ratioToColor(ratio);
            }
        }
        return '#eee';
    }

    // Absolute mode
    return absoluteToColor(val.pc);
}

function absoluteToColor(pc) {
    // Log scale from ~$300 to ~$60000
    const logMin = Math.log(300);
    const logMax = Math.log(60000);
    const t = Math.max(0, Math.min(1, (Math.log(Math.max(pc, 300)) - logMin) / (logMax - logMin)));
    return d3.interpolateBlues(0.15 + t * 0.8);
}

function ratioToColor(ratio) {
    // Diverging: <1 red, =1 white, >1 blue
    if (ratio <= 0) return '#eee';
    const logRatio = Math.log2(ratio);
    const maxLog = 3; // 8x
    const t = Math.max(-1, Math.min(1, logRatio / maxLog));
    // t: -1 to 1, map to RdBu
    return d3.interpolateRdBu(0.5 + t * 0.45);
}

export function updateGlobeColors() {
    if (!globe) return;
    globe.polygonCapColor(d => getCountryColor(d.properties.iso3));
    globe.polygonAltitude(d => {
        const iso3 = d.properties.iso3;
        return State.get('selectedCountries').includes(iso3) ? 0.02 : 0.005;
    });
}

export function flyToCountry(iso3) {
    if (!globe) return;
    const features = DataLoader.getGeoFeatures();
    const feature = features.find(f => f.properties.iso3 === iso3);
    if (feature) {
        const centroid = d3.geoCentroid(feature);
        globe.pointOfView({ lat: centroid[1], lng: centroid[0], altitude: 1.5 }, 800);
    }
}

export function resetGlobeView() {
    if (!globe) return;
    globe.pointOfView({ lat: 20, lng: 10, altitude: 2.2 }, 800);
}
