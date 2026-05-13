// ============================================================================
// COUNTRY PROFILE - Side panel with mini charts for selected country
// ============================================================================

import DataLoader from '../data-loader.js';
import State from '../state.js';
import { COLORS, formatGDP, formatRank, formatRatio } from '../utils.js';

let currentIso3 = null;

export function initCountryProfile() {
    document.getElementById('profile-close').addEventListener('click', closeProfile);

    document.getElementById('profile-btn-details').addEventListener('click', () => {
        if (currentIso3) {
            State.set('selectedCountries', [currentIso3]);
            State.set('activeSection', 'analysis');
            window.location.hash = '#analysis';
        }
    });

    document.getElementById('profile-btn-compare').addEventListener('click', () => {
        if (currentIso3) {
            State.addCountry(currentIso3);
            State.set('activeSection', 'analysis');
            window.location.hash = '#analysis';
        }
    });
}

export function openProfile(iso3) {
    currentIso3 = iso3;
    const panel = document.getElementById('country-profile');
    const meta = DataLoader.getMetadata(iso3);
    const year = State.get('currentYear');
    const val = DataLoader.getCountryValue(iso3, year);
    const rank = DataLoader.getCountryRank(iso3, year);
    const total = DataLoader.getTotalCountries(year);
    const worldVal = DataLoader.getWorldValue(year);

    document.getElementById('profile-name').textContent = meta ? meta.name : iso3;
    document.getElementById('profile-region').textContent = meta ? (meta.region_maddison || meta.region_minerva || '') : '';
    document.getElementById('profile-gdppc').textContent = formatGDP(val?.pc);
    document.getElementById('profile-rank').textContent = rank ? formatRank(rank, total) : '—';
    document.getElementById('profile-ratio').textContent = (val && worldVal) ? formatRatio(val.pc / worldVal.pc) : '—';

    const reliabilityMap = { h: 'High', m: 'Medium', l: 'Low' };
    document.getElementById('profile-reliability').textContent = val ? (reliabilityMap[val.r] || '—') : '—';

    renderMiniChart('profile-chart-gdppc', iso3, 'gdppc');
    renderMiniChart('profile-chart-ranking', iso3, 'ranking');
    renderMiniChart('profile-chart-ratio', iso3, 'ratio');

    panel.classList.add('open');
}

export function closeProfile() {
    document.getElementById('country-profile').classList.remove('open');
    currentIso3 = null;
}

export function isProfileOpen() {
    return currentIso3 !== null;
}

function renderMiniChart(containerId, iso3, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const data = DataLoader.getCountryData(iso3);
    if (!data) return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 140;
    const margin = { top: 8, right: 8, bottom: 22, left: 48 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const svg = d3.select(container).append('svg')
        .attr('width', width)
        .attr('height', height);

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const [minY, maxY] = State.get('yearRange');
    const filtered = data.filter(d => d.y >= minY && d.y <= maxY);

    const xScale = d3.scaleLinear().domain([minY, maxY]).range([0, w]);

    let yData, yLabel, color, refLine;

    if (type === 'gdppc') {
        yData = filtered.map(d => ({ y: d.y, v: d.pc }));
        yLabel = 'GDP pc';
        color = COLORS.primary;
    } else if (type === 'ranking') {
        yData = filtered.map(d => ({
            y: d.y,
            v: DataLoader.getCountryRank(iso3, d.y)
        })).filter(d => d.v != null);
        yLabel = 'Rank';
        color = COLORS.accent;
    } else if (type === 'ratio') {
        const worldData = DataLoader.getWorldData();
        yData = filtered.map(d => {
            const wd = worldData.find(w => w.y === d.y);
            return { y: d.y, v: wd ? d.pc / wd.pc : null };
        }).filter(d => d.v != null);
        yLabel = 'Ratio';
        color = '#2a9d8f';
        refLine = 1.0;
    }

    if (!yData || yData.length === 0) return;

    let yDomain;
    if (type === 'ranking') {
        const maxRank = d3.max(yData, d => d.v);
        yDomain = [Math.min(maxRank + 5, 199), 1]; // Inverted
    } else {
        yDomain = [0, d3.max(yData, d => d.v) * 1.1];
    }

    const yScale = d3.scaleLinear().domain(yDomain).range([h, 0]).nice();

    // Grid lines
    g.selectAll('.mini-grid')
        .data(yScale.ticks(4))
        .join('line')
        .attr('class', 'grid-line')
        .attr('x1', 0).attr('x2', w)
        .attr('y1', d => yScale(d)).attr('y2', d => yScale(d));

    // Axes
    g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.format('d')))
        .attr('class', 'axis');

    g.append('g')
        .call(d3.axisLeft(yScale).ticks(4).tickFormat(type === 'gdppc' ? d => {
            if (d >= 1000) return (d / 1000) + 'K';
            return d;
        } : type === 'ratio' ? d3.format('.1f') : d3.format('d')))
        .attr('class', 'axis');

    // Reference line
    if (refLine != null && yScale(refLine) >= 0 && yScale(refLine) <= h) {
        g.append('line')
            .attr('class', 'chart-reference-line')
            .attr('x1', 0).attr('x2', w)
            .attr('y1', yScale(refLine)).attr('y2', yScale(refLine));
    }

    // Line
    const line = d3.line()
        .x(d => xScale(d.y))
        .y(d => yScale(d.v))
        .curve(d3.curveMonotoneX)
        .defined(d => d.v != null);

    g.append('path')
        .datum(yData)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('d', line);

    // Current year marker
    const currentYear = State.get('currentYear');
    const currentEntry = yData.find(d => d.y === currentYear);
    if (currentEntry && currentEntry.v != null) {
        g.append('circle')
            .attr('cx', xScale(currentEntry.y))
            .attr('cy', yScale(currentEntry.v))
            .attr('r', 3.5)
            .attr('fill', color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5);
    }
}

export function updateProfileYear() {
    if (currentIso3) {
        const year = State.get('currentYear');
        const val = DataLoader.getCountryValue(currentIso3, year);
        const rank = DataLoader.getCountryRank(currentIso3, year);
        const total = DataLoader.getTotalCountries(year);
        const worldVal = DataLoader.getWorldValue(year);

        document.getElementById('profile-gdppc').textContent = formatGDP(val?.pc);
        document.getElementById('profile-rank').textContent = rank ? formatRank(rank, total) : '—';
        document.getElementById('profile-ratio').textContent = (val && worldVal) ? formatRatio(val.pc / worldVal.pc) : '—';

        const reliabilityMap = { h: 'High', m: 'Medium', l: 'Low' };
        document.getElementById('profile-reliability').textContent = val ? (reliabilityMap[val.r] || '—') : '—';
    }
}
