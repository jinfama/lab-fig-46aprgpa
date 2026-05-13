// ============================================================================
// CHOROPLETH - D3 world map with Natural Earth projection
// ============================================================================

import DataLoader from '../data-loader.js';
import State from '../state.js';
import Tooltip from '../components/tooltip.js';
import { COLORS, formatGDP, formatRank, formatRatio } from '../utils.js';

let svg, g, projection, pathGen;
let countryPaths;
let colorScale;
let legendCanvas, legendCtx;

export function initChoropleth() {
    svg = d3.select('#map-svg');
    const container = document.querySelector('.map-container');

    // Add hatching pattern definition
    const defs = svg.append('defs');
    const pattern = defs.append('pattern')
        .attr('id', 'hatching')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 6)
        .attr('height', 6)
        .attr('patternTransform', 'rotate(45)');
    pattern.append('line')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', 0).attr('y2', 6)
        .attr('class', 'map-hatching');

    // Projection
    projection = d3.geoNaturalEarth1()
        .rotate([-10, 0]);

    pathGen = d3.geoPath().projection(projection);

    g = svg.append('g');

    // Draw countries
    const features = DataLoader.getGeoFeatures();
    countryPaths = g.selectAll('.country')
        .data(features)
        .join('path')
        .attr('class', 'country')
        .attr('d', pathGen)
        .attr('fill', d => getColor(d.properties.iso3))
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.4)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
            const iso3 = d.properties.iso3;
            if (iso3) {
                State.toggleCountry(iso3);
            }
        })
        .on('mouseenter', (event, d) => {
            const iso3 = d.properties.iso3;
            const name = d.properties.name || iso3;
            const year = State.get('currentYear');
            const val = DataLoader.getCountryValue(iso3, year);
            const rank = DataLoader.getCountryRank(iso3, year);
            const total = DataLoader.getTotalCountries(year);
            const worldVal = DataLoader.getWorldValue(year);
            const ratio = (val && worldVal) ? val.pc / worldVal.pc : null;

            Tooltip.show(`
                <div class="tooltip-title"><span>${name}</span><span>${year}</span></div>
                <div class="tooltip-row"><span class="tooltip-label">GDP per capita</span><span class="tooltip-value">${formatGDP(val?.pc)}</span></div>
                <div class="tooltip-row"><span class="tooltip-label">World rank</span><span class="tooltip-value">${rank ? formatRank(rank, total) : '—'}</span></div>
                <div class="tooltip-row"><span class="tooltip-label">vs World avg</span><span class="tooltip-value">${ratio ? formatRatio(ratio) : '—'}</span></div>
                <div class="tooltip-row"><span class="tooltip-label">Reliability</span><span class="tooltip-value">${val ? { h: 'High', m: 'Medium', l: 'Low' }[val.r] || '—' : '—'}</span></div>
            `, event);
        })
        .on('mousemove', (event) => {
            Tooltip.move(event);
        })
        .on('mouseleave', () => {
            Tooltip.hide();
        });

    // Legend
    legendCanvas = document.getElementById('map-legend-canvas');
    legendCtx = legendCanvas.getContext('2d');

    // Fit to container
    fitProjection();

    // Resize
    const resizeObserver = new ResizeObserver(() => fitProjection());
    resizeObserver.observe(container);
}

function fitProjection() {
    const container = document.querySelector('.map-container');
    const w = container.clientWidth;
    const h = container.clientHeight;
    svg.attr('viewBox', `0 0 ${w} ${h}`);

    projection.fitSize([w, h], {
        type: 'FeatureCollection',
        features: DataLoader.getGeoFeatures()
    });

    pathGen = d3.geoPath().projection(projection);
    if (countryPaths) {
        countryPaths.attr('d', pathGen);
    }
}

function getColor(iso3) {
    if (!iso3) return '#eee';
    const year = State.get('currentYear');
    const mode = State.get('indicatorMode');
    const val = DataLoader.getCountryValue(iso3, year);
    if (!val || val.pc == null) return '#eee';

    if (mode === 'ratio_world') {
        const worldVal = DataLoader.getWorldValue(year);
        if (!worldVal) return '#eee';
        return ratioColor(val.pc / worldVal.pc);
    } else if (mode === 'ratio_uk1900') {
        const uk1900 = DataLoader.getUK1900();
        if (!uk1900) return '#eee';
        return ratioColor(val.pc / uk1900);
    } else if (mode === 'ratio_custom') {
        const bench = State.get('benchmarkEntity');
        if (bench && bench.iso3) {
            const benchVal = DataLoader.getCountryValue(bench.iso3, year);
            if (benchVal) return ratioColor(val.pc / benchVal.pc);
        }
        return '#eee';
    }

    return absoluteColor(val.pc);
}

function absoluteColor(pc) {
    const logMin = Math.log(300);
    const logMax = Math.log(60000);
    const t = Math.max(0, Math.min(1, (Math.log(Math.max(pc, 300)) - logMin) / (logMax - logMin)));
    return d3.interpolateBlues(0.1 + t * 0.85);
}

function ratioColor(ratio) {
    if (ratio <= 0) return '#eee';
    const logRatio = Math.log2(ratio);
    const maxLog = 3;
    const t = Math.max(-1, Math.min(1, logRatio / maxLog));
    return d3.interpolateRdBu(0.5 + t * 0.45);
}

export function updateChoropleth() {
    if (!countryPaths) return;

    countryPaths
        .attr('fill', d => getColor(d.properties.iso3))
        .attr('stroke', d => {
            const iso3 = d.properties.iso3;
            if (State.get('selectedCountries').includes(iso3)) {
                return COLORS.dark;
            }
            return '#fff';
        })
        .attr('stroke-width', d => {
            const iso3 = d.properties.iso3;
            if (State.get('selectedCountries').includes(iso3)) return 1.5;
            return 0.4;
        });

    // Update year display
    document.getElementById('map-year-display').textContent = State.get('currentYear');

    // Update legend
    updateLegend();
}

function updateLegend() {
    const mode = State.get('indicatorMode');
    const titleEl = document.getElementById('map-legend-title');
    const minEl = document.getElementById('map-legend-min');
    const maxEl = document.getElementById('map-legend-max');

    if (!legendCtx) return;

    const w = 200;
    legendCtx.clearRect(0, 0, w, 10);

    if (mode === 'absolute') {
        titleEl.textContent = 'GDP per capita (2011 USD PPP)';
        for (let i = 0; i < w; i++) {
            const t = i / w;
            legendCtx.fillStyle = d3.interpolateBlues(0.1 + t * 0.85);
            legendCtx.fillRect(i, 0, 1, 10);
        }
        minEl.textContent = '$300';
        maxEl.textContent = '$60K';
    } else {
        titleEl.textContent = mode === 'ratio_world' ? 'Ratio vs World average' :
            mode === 'ratio_uk1900' ? 'Ratio vs UK 1900' : 'Ratio vs benchmark';
        for (let i = 0; i < w; i++) {
            const t = i / w; // 0 to 1
            legendCtx.fillStyle = d3.interpolateRdBu(0.05 + t * 0.9);
            legendCtx.fillRect(i, 0, 1, 10);
        }
        minEl.textContent = '0.12x';
        maxEl.textContent = '8x';
    }
}

export function highlightCountries() {
    updateChoropleth();
}
