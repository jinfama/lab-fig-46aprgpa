// ============================================================================
// GROWTH CHART - Annual and period growth rate analysis
// ============================================================================

import DataLoader from '../data-loader.js';
import { COLORS, getColorForIndex, calcCAGR, formatPercent } from '../utils.js';

export default class GrowthChart {
    constructor(container, options = {}) {
        this.container = typeof container === 'string'
            ? document.querySelector(container) : container;
        this.countries = options.countries || [];
        this.xDomain = options.xDomain || [1750, 2024];
        this.periodLength = options.periodLength || 25;
        this.showPeriods = options.showPeriods || false;
        this.render();
    }

    render() {
        if (!this.container || this.countries.length === 0) {
            if (this.container) this.container.innerHTML = '';
            return;
        }
        this.container.innerHTML = '';

        if (this.showPeriods) {
            this.renderPeriods();
        } else {
            this.renderAnnual();
        }
    }

    renderAnnual() {
        const iso3 = this.countries[0];
        const data = DataLoader.getCountryData(iso3);
        if (!data) return;

        const filtered = data.filter(d => d.y >= this.xDomain[0] && d.y <= this.xDomain[1] && d.pc != null);

        const growthData = [];
        for (let i = 1; i < filtered.length; i++) {
            const prev = filtered[i - 1].pc;
            const curr = filtered[i].pc;
            if (prev > 0) {
                growthData.push({
                    y: filtered[i].y,
                    rate: (curr - prev) / prev
                });
            }
        }

        const rect = this.container.getBoundingClientRect();
        const width = rect.width || 600;
        const height = rect.height || 400;
        const margin = { top: 15, right: 20, bottom: 35, left: 60 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;

        const svg = d3.select(this.container).append('svg')
            .attr('width', width).attr('height', height);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const xScale = d3.scaleLinear().domain(this.xDomain).range([0, w]);

        const maxAbs = d3.max(growthData, d => Math.abs(d.rate)) || 0.1;
        const yScale = d3.scaleLinear().domain([-maxAbs * 1.1, maxAbs * 1.1]).range([h, 0]).nice();

        // Grid
        g.selectAll('.grid-h')
            .data(yScale.ticks(6))
            .join('line')
            .attr('class', 'grid-line')
            .attr('x1', 0).attr('x2', w)
            .attr('y1', d => yScale(d)).attr('y2', d => yScale(d));

        // Zero line
        g.append('line')
            .attr('x1', 0).attr('x2', w)
            .attr('y1', yScale(0)).attr('y2', yScale(0))
            .attr('stroke', COLORS.dark)
            .attr('stroke-width', 0.5);

        // Axes
        g.append('g')
            .attr('transform', `translate(0,${h})`)
            .attr('class', 'axis')
            .call(d3.axisBottom(xScale).ticks(8).tickFormat(d3.format('d')));

        g.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(yScale).ticks(6).tickFormat(d => (d * 100).toFixed(0) + '%'));

        // Bars
        const barWidth = Math.max(0.5, w / growthData.length - 0.3);
        g.selectAll('.growth-bar')
            .data(growthData)
            .join('rect')
            .attr('x', d => xScale(d.y) - barWidth / 2)
            .attr('y', d => d.rate >= 0 ? yScale(d.rate) : yScale(0))
            .attr('width', barWidth)
            .attr('height', d => Math.abs(yScale(d.rate) - yScale(0)))
            .attr('fill', d => d.rate >= 0 ? COLORS.primary : COLORS.accent)
            .attr('opacity', 0.7);

        // Y label
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 14)
            .attr('x', -h / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', COLORS.lightGray)
            .text('Annual growth rate');
    }

    renderPeriods() {
        const rect = this.container.getBoundingClientRect();
        const width = rect.width || 600;
        const height = rect.height || 400;
        const margin = { top: 15, right: 90, bottom: 35, left: 60 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;

        // Calculate periods
        const [startYear, endYear] = this.xDomain;
        const periods = [];
        let y = startYear;
        while (y < endYear) {
            const end = Math.min(y + this.periodLength, endYear);
            periods.push({ start: y, end });
            y = end;
        }

        // For each country, compute CAGR per period
        const seriesData = this.countries.map((iso3, i) => {
            const data = DataLoader.getCountryData(iso3);
            const meta = DataLoader.getMetadata(iso3);
            return {
                iso3,
                label: meta ? meta.name : iso3,
                color: getColorForIndex(i),
                periods: periods.map(p => {
                    if (!data) return { ...p, cagr: null };
                    const startEntry = data.find(d => d.y === p.start);
                    const endEntry = data.find(d => d.y === p.end);
                    const cagr = (startEntry && endEntry) ? calcCAGR(startEntry.pc, endEntry.pc, p.end - p.start) : null;
                    return { ...p, cagr };
                })
            };
        });

        const svg = d3.select(this.container).append('svg')
            .attr('width', width).attr('height', height);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const xScale = d3.scaleBand()
            .domain(periods.map(p => `${p.start}-${p.end}`))
            .range([0, w])
            .padding(0.2);

        const innerScale = d3.scaleBand()
            .domain(seriesData.map(s => s.iso3))
            .range([0, xScale.bandwidth()])
            .padding(0.05);

        const allRates = seriesData.flatMap(s => s.periods.map(p => p.cagr).filter(c => c != null));
        const maxAbs = d3.max(allRates, d => Math.abs(d)) || 0.05;
        const yScale = d3.scaleLinear().domain([-maxAbs * 1.1, maxAbs * 1.1]).range([h, 0]).nice();

        // Grid
        g.selectAll('.grid-h')
            .data(yScale.ticks(6))
            .join('line')
            .attr('class', 'grid-line')
            .attr('x1', 0).attr('x2', w)
            .attr('y1', d => yScale(d)).attr('y2', d => yScale(d));

        // Zero line
        g.append('line')
            .attr('x1', 0).attr('x2', w)
            .attr('y1', yScale(0)).attr('y2', yScale(0))
            .attr('stroke', COLORS.dark).attr('stroke-width', 0.5);

        // Axes
        g.append('g')
            .attr('transform', `translate(0,${h})`)
            .attr('class', 'axis')
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .style('font-size', '9px')
            .attr('transform', 'rotate(-30)')
            .attr('text-anchor', 'end');

        g.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(yScale).ticks(6).tickFormat(d => (d * 100).toFixed(1) + '%'));

        // Bars
        seriesData.forEach(s => {
            s.periods.forEach(p => {
                if (p.cagr == null) return;
                const periodKey = `${p.start}-${p.end}`;
                const x = xScale(periodKey) + innerScale(s.iso3);
                g.append('rect')
                    .attr('x', x)
                    .attr('y', p.cagr >= 0 ? yScale(p.cagr) : yScale(0))
                    .attr('width', innerScale.bandwidth())
                    .attr('height', Math.abs(yScale(p.cagr) - yScale(0)))
                    .attr('fill', s.color)
                    .attr('opacity', 0.8);
            });
        });

        // Legend
        seriesData.forEach((s, i) => {
            g.append('text')
                .attr('class', 'end-label')
                .attr('x', w + 8)
                .attr('y', 20 + i * 16)
                .attr('fill', s.color)
                .text(s.label);
        });

        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 14)
            .attr('x', -h / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', COLORS.lightGray)
            .text('Compound annual growth rate');
    }

    update(options) {
        if (options.countries !== undefined) this.countries = options.countries;
        if (options.xDomain !== undefined) this.xDomain = options.xDomain;
        if (options.periodLength !== undefined) this.periodLength = options.periodLength;
        if (options.showPeriods !== undefined) this.showPeriods = options.showPeriods;
        this.render();
    }

    destroy() {
        if (this.container) this.container.innerHTML = '';
    }
}
