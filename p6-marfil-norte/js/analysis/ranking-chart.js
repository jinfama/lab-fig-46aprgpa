// ============================================================================
// RANKING CHART - Bump chart showing world ranking position over time
// ============================================================================

import DataLoader from '../data-loader.js';
import { getColorForIndex, COLORS } from '../utils.js';

export default class RankingChart {
    constructor(container, options = {}) {
        this.container = typeof container === 'string'
            ? document.querySelector(container) : container;
        this.countries = options.countries || [];
        this.xDomain = options.xDomain || [1750, 2024];
        this.render();
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        const rect = this.container.getBoundingClientRect();
        const width = rect.width || 600;
        const height = rect.height || 400;
        const margin = { top: 15, right: 90, bottom: 35, left: 50 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;

        if (w <= 0 || h <= 0) return;

        const svg = d3.select(this.container).append('svg')
            .attr('width', width)
            .attr('height', height);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const xScale = d3.scaleLinear().domain(this.xDomain).range([0, w]);

        // Find max rank among selected countries
        let maxRank = 50;
        this.countries.forEach(iso3 => {
            const data = DataLoader.getCountryData(iso3);
            if (data) {
                data.filter(d => d.y >= this.xDomain[0] && d.y <= this.xDomain[1]).forEach(d => {
                    const rank = DataLoader.getCountryRank(iso3, d.y);
                    if (rank) maxRank = Math.max(maxRank, rank);
                });
            }
        });
        maxRank = Math.min(maxRank + 10, 199);

        const yScale = d3.scaleLinear().domain([maxRank, 1]).range([h, 0]);

        // Quartile zones
        const total = DataLoader.getTotalCountries(2024);
        const q1 = Math.ceil(total * 0.25);
        const q3 = Math.ceil(total * 0.75);

        g.append('rect')
            .attr('x', 0).attr('width', w)
            .attr('y', yScale(q1)).attr('height', yScale(1) - yScale(q1))
            .attr('fill', 'rgba(30, 96, 145, 0.04)');

        g.append('rect')
            .attr('x', 0).attr('width', w)
            .attr('y', yScale(maxRank)).attr('height', yScale(q3) - yScale(maxRank))
            .attr('fill', 'rgba(230, 57, 70, 0.04)');

        // Grid
        const yTicks = yScale.ticks(8);
        g.selectAll('.grid-h')
            .data(yTicks)
            .join('line')
            .attr('class', 'grid-line')
            .attr('x1', 0).attr('x2', w)
            .attr('y1', d => yScale(d)).attr('y2', d => yScale(d));

        // Axes
        g.append('g')
            .attr('transform', `translate(0,${h})`)
            .attr('class', 'axis')
            .call(d3.axisBottom(xScale).ticks(8).tickFormat(d3.format('d')));

        g.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(yScale).ticks(8).tickFormat(d3.format('d')));

        // Y label
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 14)
            .attr('x', -h / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', COLORS.lightGray)
            .text('World ranking (1 = highest GDP pc)');

        // Lines
        const lineGen = d3.line()
            .x(d => xScale(d.y))
            .y(d => yScale(d.rank))
            .curve(d3.curveMonotoneX)
            .defined(d => d.rank != null);

        this.countries.forEach((iso3, i) => {
            const data = DataLoader.getCountryData(iso3);
            if (!data) return;

            const rankData = data
                .filter(d => d.y >= this.xDomain[0] && d.y <= this.xDomain[1])
                .map(d => ({
                    y: d.y,
                    rank: DataLoader.getCountryRank(iso3, d.y)
                }))
                .filter(d => d.rank != null);

            const color = getColorForIndex(i);
            const meta = DataLoader.getMetadata(iso3);

            g.append('path')
                .datum(rankData)
                .attr('fill', 'none')
                .attr('stroke', color)
                .attr('stroke-width', 1.8)
                .attr('d', lineGen);

            // End label
            const last = rankData.slice(-1)[0];
            if (last) {
                g.append('text')
                    .attr('class', 'end-label')
                    .attr('x', xScale(last.y) + 6)
                    .attr('y', yScale(last.rank) + 4)
                    .attr('fill', color)
                    .text(meta ? meta.name : iso3);
            }
        });
    }

    update(options) {
        if (options.countries !== undefined) this.countries = options.countries;
        if (options.xDomain !== undefined) this.xDomain = options.xDomain;
        this.render();
    }

    destroy() {
        if (this.container) this.container.innerHTML = '';
    }
}
