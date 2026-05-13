// ============================================================================
// STATISTICS SECTION - Controller for the advanced statistics tab
// ============================================================================

import State from '../state.js';
import DataLoader from '../data-loader.js';
import LineChart from '../analysis/line-chart.js';
import { linearRegression, segmentedRegression, computePeriodStats } from './regression.js';
import { sigmaConvergence, betaConvergence, pairwiseRatio } from './convergence.js';
import { getColorForIndex, COLORS, formatGDP, formatPercent, calcCAGR } from '../utils.js';

let chart = null;
let statsMode = 'trends';
let statsMA = 0;
let statsPeriodLength = 25;
let statsYearRange = [1750, 2024];
let initialized = false;

export function initStatisticsSection() {
    if (initialized) return;
    initialized = true;

    // Mode buttons
    document.querySelectorAll('#section-statistics [data-stats]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#section-statistics [data-stats]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            statsMode = btn.dataset.stats;
            redraw();
        });
    });

    // MA buttons
    document.querySelectorAll('#section-statistics [data-stats-ma]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#section-statistics [data-stats-ma]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            statsMA = parseInt(btn.dataset.statsMa);
            redraw();
        });
    });

    // Period buttons
    document.querySelectorAll('#section-statistics [data-stats-period]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#section-statistics [data-stats-period]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            statsPeriodLength = parseInt(btn.dataset.statsPeriod);
            redraw();
        });
    });

    // Year range
    document.getElementById('stats-year-start').addEventListener('change', () => {
        const s = parseInt(document.getElementById('stats-year-start').value) || 1750;
        const e = parseInt(document.getElementById('stats-year-end').value) || 2024;
        statsYearRange = [Math.max(1750, Math.min(s, e)), Math.min(2024, Math.max(s, e))];
        redraw();
    });
    document.getElementById('stats-year-end').addEventListener('change', () => {
        const s = parseInt(document.getElementById('stats-year-start').value) || 1750;
        const e = parseInt(document.getElementById('stats-year-end').value) || 2024;
        statsYearRange = [Math.max(1750, Math.min(s, e)), Math.min(2024, Math.max(s, e))];
        redraw();
    });

    // Search
    setupStatsSearch();

    // State subscriptions
    State.subscribe('selectedCountries', () => { updateChips(); redraw(); });

    updateChips();
    redraw();
}

function setupStatsSearch() {
    const input = document.getElementById('stats-search');
    const dropdown = document.getElementById('stats-autocomplete');

    input.addEventListener('input', () => {
        const query = input.value.trim();
        if (query.length < 1) { dropdown.classList.remove('visible'); return; }
        const results = DataLoader.searchCountries(query);
        if (results.length === 0) { dropdown.classList.remove('visible'); return; }
        dropdown.innerHTML = results.map(r => `
            <div class="autocomplete-item" data-iso3="${r.iso3}">
                <span>${r.name}</span>
                <span style="color:var(--color-light-gray)">${r.iso3}</span>
            </div>
        `).join('');
        dropdown.classList.add('visible');
        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                State.addCountry(item.dataset.iso3);
                input.value = '';
                dropdown.classList.remove('visible');
            });
        });
    });

    input.addEventListener('blur', () => setTimeout(() => dropdown.classList.remove('visible'), 200));
}

function updateChips() {
    const countries = State.get('selectedCountries');
    const chipsEl = document.getElementById('stats-chips');
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
        el.addEventListener('click', () => State.removeCountry(el.dataset.iso3));
    });
}

function redraw() {
    const countries = State.get('selectedCountries');
    const chartWrapper = document.getElementById('stats-chart-wrapper');
    const tableContainer = document.getElementById('stats-table-container');
    const summaryContainer = document.getElementById('stats-summary-container');

    tableContainer.innerHTML = '';
    summaryContainer.innerHTML = '';

    if (countries.length === 0) {
        chartWrapper.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-light-gray)">Select countries to begin statistical analysis</div>';
        return;
    }

    if (statsMode === 'trends') {
        drawTrends(chartWrapper, countries);
    } else if (statsMode === 'regression') {
        drawRegression(chartWrapper, tableContainer, countries);
    } else if (statsMode === 'periods') {
        drawPeriods(chartWrapper, tableContainer, summaryContainer, countries);
    } else if (statsMode === 'convergence') {
        drawConvergence(chartWrapper, tableContainer, countries);
    }
}

function drawTrends(wrapper, countries) {
    const series = countries.map((iso3, i) => ({
        key: iso3,
        label: DataLoader.getMetadata(iso3)?.name || iso3,
        data: DataLoader.getCountryData(iso3) || [],
        color: getColorForIndex(i)
    }));

    // Add world
    const worldData = DataLoader.getWorldData();
    if (worldData.length > 0) {
        series.push({ key: 'WLD', label: 'World', data: worldData, color: COLORS.accent, dashed: true, lineWidth: 1.2 });
    }

    if (chart) chart.destroy();
    chart = new LineChart({
        container: wrapper,
        series,
        xDomain: statsYearRange,
        yLabel: 'GDP per capita (2011 USD PPP)',
        movingAverage: statsMA,
        showRegression: false
    });
}

function drawRegression(wrapper, tableContainer, countries) {
    // Draw chart with regression lines
    const series = countries.map((iso3, i) => ({
        key: iso3,
        label: DataLoader.getMetadata(iso3)?.name || iso3,
        data: DataLoader.getCountryData(iso3) || [],
        color: getColorForIndex(i)
    }));

    if (chart) chart.destroy();
    chart = new LineChart({
        container: wrapper,
        series,
        xDomain: statsYearRange,
        yLabel: 'GDP per capita (2011 USD PPP)',
        movingAverage: statsMA,
        showRegression: true
    });

    // Build regression table
    let rows = '';
    countries.forEach((iso3, i) => {
        const data = DataLoader.getCountryData(iso3);
        if (!data) return;
        const filtered = data.filter(d => d.y >= statsYearRange[0] && d.y <= statsYearRange[1] && d.pc != null);
        const segments = segmentedRegression(filtered, 1);
        const meta = DataLoader.getMetadata(iso3);
        const name = meta ? meta.name : iso3;

        segments.forEach((seg, j) => {
            rows += `<tr>
                <td style="color:${getColorForIndex(i)};font-weight:600">${name}</td>
                <td>${seg.startYear}–${seg.endYear}</td>
                <td>${seg.slope.toFixed(2)}</td>
                <td>${seg.r2.toFixed(4)}</td>
                <td>${seg.n}</td>
            </tr>`;
        });
    });

    tableContainer.innerHTML = `
        <table class="stats-table">
            <thead><tr>
                <th>Country</th><th>Period</th><th>Slope ($/yr)</th><th>R²</th><th>N</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function drawPeriods(wrapper, tableContainer, summaryContainer, countries) {
    // Show period decomposition chart and table
    const { GrowthChart } = getGrowthChartModule();

    // For now, use line chart with period info in table
    const series = countries.map((iso3, i) => ({
        key: iso3,
        label: DataLoader.getMetadata(iso3)?.name || iso3,
        data: DataLoader.getCountryData(iso3) || [],
        color: getColorForIndex(i)
    }));

    if (chart) chart.destroy();
    chart = new LineChart({
        container: wrapper,
        series,
        xDomain: statsYearRange,
        yLabel: 'GDP per capita (2011 USD PPP)',
        movingAverage: statsMA,
        showRegression: false
    });

    // Period table
    countries.forEach((iso3, i) => {
        const data = DataLoader.getCountryData(iso3);
        if (!data) return;
        const filtered = data.filter(d => d.y >= statsYearRange[0] && d.y <= statsYearRange[1] && d.pc != null);
        const periods = computePeriodStats(filtered, statsPeriodLength);
        const meta = DataLoader.getMetadata(iso3);
        const name = meta ? meta.name : iso3;

        let rows = periods.map(p => `<tr>
            <td>${p.start}–${p.end}</td>
            <td>${formatGDP(p.startValue)}</td>
            <td>${formatGDP(p.endValue)}</td>
            <td style="color:${p.cagr >= 0 ? COLORS.primary : COLORS.accent};font-weight:600">${formatPercent(p.cagr)}</td>
            <td>${formatPercent(p.percentChange)}</td>
            <td>${p.r2 != null ? p.r2.toFixed(3) : '—'}</td>
        </tr>`).join('');

        tableContainer.innerHTML += `
            <div style="margin-bottom:16px">
                <div style="font-weight:600;color:${getColorForIndex(i)};margin-bottom:6px">${name}</div>
                <table class="stats-table">
                    <thead><tr>
                        <th>Period</th><th>Start GDP pc</th><th>End GDP pc</th><th>CAGR</th><th>Total change</th><th>R²</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;

        // Summary
        if (periods.length > 0) {
            const best = periods.reduce((a, b) => (a.cagr || 0) > (b.cagr || 0) ? a : b);
            const worst = periods.reduce((a, b) => (a.cagr || 0) < (b.cagr || 0) ? a : b);
            const overall = calcCAGR(filtered[0].pc, filtered[filtered.length - 1].pc, filtered[filtered.length - 1].y - filtered[0].y);

            summaryContainer.innerHTML += `
                <div class="stats-summary">
                    <div class="stats-summary-title">${name} — Summary</div>
                    <div class="stats-summary-row">
                        <span class="stats-summary-label">Overall CAGR</span>
                        <span class="stats-summary-value">${formatPercent(overall)}</span>
                    </div>
                    <div class="stats-summary-row">
                        <span class="stats-summary-label">Peak growth</span>
                        <span class="stats-summary-value" style="color:${COLORS.primary}">${best.start}–${best.end} (${formatPercent(best.cagr)})</span>
                    </div>
                    <div class="stats-summary-row">
                        <span class="stats-summary-label">Lowest growth</span>
                        <span class="stats-summary-value" style="color:${COLORS.accent}">${worst.start}–${worst.end} (${formatPercent(worst.cagr)})</span>
                    </div>
                </div>
            `;
        }
    });
}

function drawConvergence(wrapper, tableContainer, countries) {
    if (countries.length < 2) {
        // Sigma convergence for all selected countries
        wrapper.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-light-gray)">Select at least 2 countries for convergence analysis</div>';
        return;
    }

    // Pairwise ratio: first country vs second
    const data1 = DataLoader.getCountryData(countries[0]) || [];
    const data2 = DataLoader.getCountryData(countries[1]) || [];
    const meta1 = DataLoader.getMetadata(countries[0]);
    const meta2 = DataLoader.getMetadata(countries[1]);

    const ratioData = pairwiseRatio(data1, data2, statsYearRange);
    const ratioPcData = ratioData.map(d => ({ y: d.y, pc: d.ratio }));

    if (chart) chart.destroy();
    chart = new LineChart({
        container: wrapper,
        series: [{
            key: 'ratio',
            label: `${meta1?.name || countries[0]} / ${meta2?.name || countries[1]}`,
            data: ratioPcData,
            color: COLORS.primary
        }],
        xDomain: statsYearRange,
        yLabel: `Ratio: ${meta1?.name || countries[0]} / ${meta2?.name || countries[1]}`,
        movingAverage: statsMA,
        referenceLine: { value: 1.0, label: 'Equal' },
        formatY: d3.format('.2f')
    });

    // Sigma convergence if >2 countries
    if (countries.length >= 3) {
        const sigma = sigmaConvergence(countries, statsYearRange);
        const sigmaPcData = sigma.map(d => ({ y: d.y, pc: d.cv }));

        tableContainer.innerHTML = `
            <div style="margin-top:16px">
                <div style="font-weight:600;margin-bottom:6px">Sigma convergence (SD of log GDP pc)</div>
                <div style="font-size:12px;color:var(--color-gray)">
                    ${sigma.length > 0 ? `Start: ${sigma[0].cv.toFixed(3)} (${sigma[0].y}) → End: ${sigma[sigma.length - 1].cv.toFixed(3)} (${sigma[sigma.length - 1].y})` : '—'}
                    ${sigma.length > 1 ? ` · Change: ${((sigma[sigma.length - 1].cv - sigma[0].cv) / sigma[0].cv * 100).toFixed(1)}%` : ''}
                </div>
            </div>
        `;
    }
}

function getGrowthChartModule() {
    return { GrowthChart: null }; // Placeholder, growth chart handled inline
}
