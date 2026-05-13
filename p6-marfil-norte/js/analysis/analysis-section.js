// ============================================================================
// ANALYSIS SECTION - Controller for the analysis tab
// ============================================================================

import State from '../state.js';
import DataLoader from '../data-loader.js';
import LineChart from './line-chart.js';
import RankingChart from './ranking-chart.js';
import GrowthChart from './growth-chart.js';
import { getColorForIndex, COLORS } from '../utils.js';

let lineChart = null;
let rankingChart = null;
let growthChart = null;
let initialized = false;

const G7 = ['USA', 'GBR', 'DEU', 'FRA', 'JPN', 'ITA', 'CAN'];
const BRICS = ['BRA', 'RUS', 'IND', 'CHN', 'ZAF'];

export function initAnalysisSection() {
    if (initialized) return;
    initialized = true;

    // Chart type buttons
    document.querySelectorAll('#section-analysis [data-chart]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#section-analysis [data-chart]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            State.set('chartType', btn.dataset.chart);
        });
    });

    // Moving average buttons
    document.querySelectorAll('#section-analysis [data-ma]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#section-analysis [data-ma]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            State.set('movingAverage', parseInt(btn.dataset.ma));
        });
    });

    // Period length buttons
    document.querySelectorAll('#section-analysis [data-period]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#section-analysis [data-period]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            State.set('periodLength', parseInt(btn.dataset.period));
        });
    });

    // Regression toggle
    document.getElementById('btn-regression').addEventListener('click', function () {
        this.classList.toggle('active');
        State.set('showRegression', this.classList.contains('active'));
    });

    // Periods toggle
    document.getElementById('btn-periods').addEventListener('click', function () {
        this.classList.toggle('active');
        State.set('showPeriods', this.classList.contains('active'));
    });

    // Benchmark select
    const benchSelect = document.getElementById('analysis-benchmark-select');
    populateBenchmarkSelect(benchSelect);
    benchSelect.addEventListener('change', () => {
        const val = benchSelect.value;
        if (val === 'world') {
            State.set('benchmarkEntity', { type: 'world', iso3: null, label: 'World average' });
        } else if (val === 'uk1900') {
            State.set('benchmarkEntity', { type: 'uk1900', iso3: 'GBR', label: 'UK 1900' });
        } else {
            const meta = DataLoader.getMetadata(val);
            State.set('benchmarkEntity', { type: 'country', iso3: val, label: meta ? meta.name : val });
        }
    });

    // Year range inputs
    document.getElementById('analysis-year-start').addEventListener('change', updateYearRange);
    document.getElementById('analysis-year-end').addEventListener('change', updateYearRange);

    // Search
    setupSearch('analysis-search', 'analysis-autocomplete');

    // Presets
    document.getElementById('analysis-preset-g7').addEventListener('click', () => {
        State.set('selectedCountries', [...G7]);
    });
    document.getElementById('analysis-preset-brics').addEventListener('click', () => {
        State.set('selectedCountries', [...BRICS]);
    });
    document.getElementById('analysis-preset-clear').addEventListener('click', () => {
        State.clearCountries();
    });

    // Region selector
    const regionTypeSelect = document.getElementById('analysis-region-type');
    const regionNameSelect = document.getElementById('analysis-region-name');

    regionTypeSelect.addEventListener('change', () => {
        const type = regionTypeSelect.value;
        if (!type) {
            regionNameSelect.style.display = 'none';
            return;
        }
        const lists = DataLoader.getRegionLists();
        const names = lists[type] || [];
        regionNameSelect.innerHTML = '<option value="">Select region...</option>' +
            names.map(n => `<option value="${n}">${n}</option>`).join('');
        regionNameSelect.style.display = '';
    });

    regionNameSelect.addEventListener('change', () => {
        const type = regionTypeSelect.value;
        const name = regionNameSelect.value;
        if (type && name) {
            const countries = DataLoader.getRegionCountries(type, name);
            State.set('selectedCountries', countries);
            regionTypeSelect.value = '';
            regionNameSelect.style.display = 'none';
        }
    });

    // State subscriptions
    State.subscribe('selectedCountries', () => { updateChips(); redraw(); });
    State.subscribe('chartType', () => redraw());
    State.subscribe('movingAverage', () => redraw());
    State.subscribe('showRegression', () => redraw());
    State.subscribe('showPeriods', () => redraw());
    State.subscribe('periodLength', () => redraw());
    State.subscribe('benchmarkEntity', () => redraw());
    State.subscribe('yearRange', () => redraw());

    updateChips();
    redraw();
}

function updateYearRange() {
    const start = parseInt(document.getElementById('analysis-year-start').value) || 1750;
    const end = parseInt(document.getElementById('analysis-year-end').value) || 2024;
    State.set('yearRange', [Math.max(1750, Math.min(start, end)), Math.min(2024, Math.max(start, end))]);
}

function populateBenchmarkSelect(select) {
    const allMeta = DataLoader.getAllMetadata();
    const options = [
        '<option value="world">World average</option>',
        '<option value="uk1900">UK 1900</option>',
        ...allMeta.map(m => `<option value="${m.iso3}">${m.name}</option>`)
    ];
    select.innerHTML = options.join('');
}

function setupSearch(inputId, dropdownId) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);

    input.addEventListener('input', () => {
        const query = input.value.trim();
        if (query.length < 1) {
            dropdown.classList.remove('visible');
            return;
        }
        const results = DataLoader.searchCountries(query);
        if (results.length === 0) {
            dropdown.classList.remove('visible');
            return;
        }
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

    input.addEventListener('blur', () => {
        setTimeout(() => dropdown.classList.remove('visible'), 200);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dropdown.classList.remove('visible');
            input.blur();
        }
    });
}

function updateChips() {
    const countries = State.get('selectedCountries');
    const chipsEl = document.getElementById('analysis-chips');

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

function redraw() {
    const chartType = State.get('chartType');
    const countries = State.get('selectedCountries');
    const yearRange = State.get('yearRange');
    const ma = State.get('movingAverage');
    const showReg = State.get('showRegression');
    const showPeriods = State.get('showPeriods');
    const periodLength = State.get('periodLength');
    const benchmark = State.get('benchmarkEntity');

    const wrapper = document.getElementById('analysis-chart-wrapper');
    const titleEl = document.getElementById('analysis-title');
    const subtitleEl = document.getElementById('analysis-subtitle');

    if (countries.length === 0) {
        wrapper.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-light-gray)">Select countries to begin analysis</div>';
        titleEl.textContent = 'GDP per capita';
        subtitleEl.textContent = 'Select countries to begin';
        return;
    }

    if (chartType === 'evolution') {
        titleEl.textContent = 'GDP per capita evolution';
        subtitleEl.textContent = `${countries.length} ${countries.length === 1 ? 'country' : 'countries'} · ${yearRange[0]}–${yearRange[1]}`;

        const series = buildSeries(countries);
        // Add world as dashed reference
        const worldData = DataLoader.getWorldData();
        if (worldData.length > 0) {
            series.push({
                key: 'WLD',
                label: 'World',
                data: worldData,
                color: COLORS.accent,
                dashed: true,
                lineWidth: 1.2
            });
        }

        if (lineChart) lineChart.destroy();
        lineChart = new LineChart({
            container: wrapper,
            series,
            xDomain: yearRange,
            yLabel: 'GDP per capita (2011 USD PPP)',
            movingAverage: ma,
            showRegression: showReg
        });

    } else if (chartType === 'convergence') {
        const benchLabel = benchmark.label || 'World average';
        titleEl.textContent = `Convergence: ratio vs ${benchLabel}`;
        subtitleEl.textContent = `${countries.length} ${countries.length === 1 ? 'country' : 'countries'} · ${yearRange[0]}–${yearRange[1]}`;

        const series = countries.map((iso3, i) => {
            const data = DataLoader.getCountryData(iso3);
            const meta = DataLoader.getMetadata(iso3);
            if (!data) return null;

            const ratioData = data.map(d => {
                let benchValue;
                if (benchmark.type === 'uk1900') {
                    benchValue = DataLoader.getUK1900();
                } else if (benchmark.type === 'country' && benchmark.iso3) {
                    const bv = DataLoader.getCountryValue(benchmark.iso3, d.y);
                    benchValue = bv ? bv.pc : null;
                } else {
                    const wv = DataLoader.getWorldValue(d.y);
                    benchValue = wv ? wv.pc : null;
                }
                return {
                    y: d.y,
                    pc: (d.pc && benchValue) ? d.pc / benchValue : null
                };
            });

            return {
                key: iso3,
                label: meta ? meta.name : iso3,
                data: ratioData,
                color: getColorForIndex(i)
            };
        }).filter(Boolean);

        if (lineChart) lineChart.destroy();
        lineChart = new LineChart({
            container: wrapper,
            series,
            xDomain: yearRange,
            yLabel: `Ratio vs ${benchLabel}`,
            movingAverage: ma,
            showRegression: showReg,
            referenceLine: { value: 1.0, label: `= ${benchLabel}` },
            formatY: d3.format('.1f')
        });

    } else if (chartType === 'ranking') {
        titleEl.textContent = 'World GDP per capita ranking';
        subtitleEl.textContent = `${countries.length} ${countries.length === 1 ? 'country' : 'countries'} · ${yearRange[0]}–${yearRange[1]} · Rank 1 = highest`;

        if (rankingChart) rankingChart.destroy();
        rankingChart = new RankingChart(wrapper, {
            countries,
            xDomain: yearRange
        });

    } else if (chartType === 'growth') {
        titleEl.textContent = showPeriods ? `Growth rates by ${periodLength}-year periods` : 'Annual growth rates';
        subtitleEl.textContent = `${countries.length} ${countries.length === 1 ? 'country' : 'countries'} · ${yearRange[0]}–${yearRange[1]}`;

        if (growthChart) growthChart.destroy();
        growthChart = new GrowthChart(wrapper, {
            countries,
            xDomain: yearRange,
            periodLength,
            showPeriods
        });
    }
}

function buildSeries(countries) {
    return countries.map((iso3, i) => {
        const data = DataLoader.getCountryData(iso3);
        const meta = DataLoader.getMetadata(iso3);
        return {
            key: iso3,
            label: meta ? meta.name : iso3,
            data: data || [],
            color: getColorForIndex(i)
        };
    });
}
