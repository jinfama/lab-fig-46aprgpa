// ============================================================================
// LINE CHART - Reusable D3 line chart component
// ============================================================================

import { COLORS, getColorForIndex, formatGDPCompact, calcMovingAverage, calcLinearRegression } from '../utils.js';

export default class LineChart {
    constructor(options) {
        this.container = typeof options.container === 'string'
            ? document.querySelector(options.container) : options.container;
        this.series = options.series || [];
        this.xDomain = options.xDomain || [1750, 2024];
        this.yLabel = options.yLabel || '';
        this.movingAverage = options.movingAverage || 0;
        this.showRegression = options.showRegression || false;
        this.referenceLine = options.referenceLine; // { value, label }
        this.yDomainFixed = options.yDomain; // optional fixed y domain
        this.invertY = options.invertY || false;
        this.formatY = options.formatY || null;
        this.showEndLabels = options.showEndLabels !== false;

        this.svg = null;
        this.render();
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        const rect = this.container.getBoundingClientRect();
        const width = rect.width || 600;
        const height = rect.height || 400;
        const margin = { top: 15, right: this.showEndLabels ? 90 : 20, bottom: 35, left: 60 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;

        if (w <= 0 || h <= 0) return;

        this.svg = d3.select(this.container).append('svg')
            .attr('width', width)
            .attr('height', height);

        const g = this.svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Clip path
        g.append('defs').append('clipPath')
            .attr('id', 'clip-' + Math.random().toString(36).substring(7))
            .append('rect')
            .attr('width', w)
            .attr('height', h);

        // Scales
        const xScale = d3.scaleLinear().domain(this.xDomain).range([0, w]);

        // Compute y domain from all series
        let yMin = Infinity, yMax = -Infinity;
        this.series.forEach(s => {
            const data = s.data.filter(d => d.y >= this.xDomain[0] && d.y <= this.xDomain[1]);
            data.forEach(d => {
                if (d.pc != null) {
                    yMin = Math.min(yMin, d.pc);
                    yMax = Math.max(yMax, d.pc);
                }
            });
        });

        if (this.yDomainFixed) {
            yMin = this.yDomainFixed[0];
            yMax = this.yDomainFixed[1];
        } else if (this.invertY) {
            // Keep as is for ranking
        } else {
            yMin = Math.min(0, yMin);
            yMax = yMax * 1.08;
        }

        if (yMin === Infinity) yMin = 0;
        if (yMax === -Infinity) yMax = 100;

        const yDomain = this.invertY ? [yMax, yMin] : [yMin, yMax];
        const yScale = d3.scaleLinear().domain(yDomain).range([h, 0]).nice();

        // Grid lines
        const yTicks = yScale.ticks(6);
        g.selectAll('.grid-h')
            .data(yTicks)
            .join('line')
            .attr('class', 'grid-line')
            .attr('x1', 0).attr('x2', w)
            .attr('y1', d => yScale(d)).attr('y2', d => yScale(d));

        // X axis
        g.append('g')
            .attr('transform', `translate(0,${h})`)
            .attr('class', 'axis')
            .call(d3.axisBottom(xScale).ticks(8).tickFormat(d3.format('d')));

        // Y axis
        const yAxisFormat = this.formatY || (d => {
            if (Math.abs(d) >= 1e6) return (d / 1e6).toFixed(0) + 'M';
            if (Math.abs(d) >= 1e3) return (d / 1e3).toFixed(0) + 'K';
            return d;
        });

        g.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(yScale).ticks(6).tickFormat(yAxisFormat));

        // Y label
        if (this.yLabel) {
            g.append('text')
                .attr('transform', 'rotate(-90)')
                .attr('y', -margin.left + 14)
                .attr('x', -h / 2)
                .attr('text-anchor', 'middle')
                .style('font-size', '10px')
                .style('fill', COLORS.lightGray)
                .text(this.yLabel);
        }

        // Reference line
        if (this.referenceLine != null) {
            const refY = yScale(this.referenceLine.value);
            if (refY >= 0 && refY <= h) {
                g.append('line')
                    .attr('class', 'chart-reference-line')
                    .attr('x1', 0).attr('x2', w)
                    .attr('y1', refY).attr('y2', refY);
                if (this.referenceLine.label) {
                    g.append('text')
                        .attr('x', w - 4)
                        .attr('y', refY - 4)
                        .attr('text-anchor', 'end')
                        .style('font-size', '9px')
                        .style('fill', COLORS.lightGray)
                        .text(this.referenceLine.label);
                }
            }
        }

        // Draw series
        const lineGen = d3.line()
            .x(d => xScale(d.y))
            .y(d => yScale(d.pc))
            .curve(d3.curveMonotoneX)
            .defined(d => d.pc != null);

        // Split data into segments of consecutive years (gap > 2 years = break)
        const splitSegments = (arr) => {
            const valid = arr.filter(d => d.pc != null);
            if (valid.length === 0) return [];
            const segs = [];
            let seg = [valid[0]];
            for (let i = 1; i < valid.length; i++) {
                if (valid[i].y - valid[i - 1].y <= 2) {
                    seg.push(valid[i]);
                } else {
                    segs.push(seg);
                    seg = [valid[i]];
                }
            }
            segs.push(seg);
            return segs;
        };

        this.series.forEach((s, i) => {
            let data = s.data.filter(d => d.y >= this.xDomain[0] && d.y <= this.xDomain[1]);
            if (data.length === 0) return;

            const color = s.color || getColorForIndex(i);
            const isDashed = s.dashed || false;
            const lineWidth = s.lineWidth || 1.8;

            // Moving average
            if (this.movingAverage > 1) {
                const maData = calcMovingAverage(data, this.movingAverage);

                // Original line (faded) - with gap handling
                const origSegs = splitSegments(data);
                origSegs.forEach(seg => {
                    if (seg.length === 1) {
                        g.append('circle').attr('cx', xScale(seg[0].y)).attr('cy', yScale(seg[0].pc)).attr('r', 2).attr('fill', color).attr('opacity', 0.25);
                    } else {
                        g.append('path').datum(seg).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 0.8).attr('stroke-opacity', 0.25).attr('d', lineGen);
                    }
                });

                // MA line (bold)
                g.append('path')
                    .datum(maData)
                    .attr('fill', 'none')
                    .attr('stroke', color)
                    .attr('stroke-width', lineWidth + 0.5)
                    .attr('d', lineGen);
            } else {
                // Draw with gap handling
                const segs = splitSegments(data);
                segs.forEach(seg => {
                    if (seg.length === 1) {
                        g.append('circle').attr('cx', xScale(seg[0].y)).attr('cy', yScale(seg[0].pc)).attr('r', 2.5).attr('fill', color);
                    } else {
                        g.append('path').datum(seg).attr('fill', 'none').attr('stroke', color).attr('stroke-width', lineWidth).attr('stroke-dasharray', isDashed ? '6,4' : 'none').attr('d', lineGen);
                    }
                });
            }

            // Regression line
            if (this.showRegression) {
                const validData = data.filter(d => d.pc != null);
                const reg = calcLinearRegression(validData);
                if (reg) {
                    const x1 = this.xDomain[0];
                    const x2 = this.xDomain[1];
                    const y1 = reg.slope * x1 + reg.intercept;
                    const y2 = reg.slope * x2 + reg.intercept;

                    g.append('line')
                        .attr('class', 'regression-line')
                        .attr('x1', xScale(x1)).attr('x2', xScale(x2))
                        .attr('y1', yScale(y1)).attr('y2', yScale(y2))
                        .attr('stroke', color);

                    g.append('text')
                        .attr('class', 'regression-label')
                        .attr('x', xScale(x2) - 4)
                        .attr('y', yScale(y2) - 6)
                        .attr('text-anchor', 'end')
                        .text(`R² = ${reg.r2.toFixed(3)}`);
                }
            }

            // End label
            if (this.showEndLabels) {
                const lastPoint = data.filter(d => d.pc != null).slice(-1)[0];
                if (lastPoint) {
                    g.append('text')
                        .attr('class', 'end-label')
                        .attr('x', xScale(lastPoint.y) + 6)
                        .attr('y', yScale(lastPoint.pc) + 4)
                        .attr('fill', color)
                        .text(s.label || s.key);
                }
            }
        });

        // Hover interaction
        const hoverG = g.append('g').style('display', 'none');
        const hoverLine = hoverG.append('line')
            .attr('class', 'hover-line')
            .attr('y1', 0).attr('y2', h);

        const hoverDots = hoverG.selectAll('.hover-dot')
            .data(this.series)
            .join('circle')
            .attr('r', 3.5)
            .attr('fill', (d, i) => d.color || getColorForIndex(i))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5);

        const hoverRect = g.append('rect')
            .attr('width', w).attr('height', h)
            .attr('fill', 'none')
            .attr('pointer-events', 'all');

        hoverRect.on('mousemove', (event) => {
            const [mx] = d3.pointer(event);
            const year = Math.round(xScale.invert(mx));
            hoverG.style('display', null);
            hoverLine.attr('x1', xScale(year)).attr('x2', xScale(year));

            hoverDots.each((s, i, nodes) => {
                const data = s.data.filter(d => d.y >= this.xDomain[0] && d.y <= this.xDomain[1]);
                let displayData = data;
                if (this.movingAverage > 1) {
                    displayData = calcMovingAverage(data, this.movingAverage);
                }
                const entry = displayData.find(d => d.y === year);
                if (entry && entry.pc != null) {
                    d3.select(nodes[i])
                        .attr('cx', xScale(year))
                        .attr('cy', yScale(entry.pc))
                        .style('display', null);
                } else {
                    d3.select(nodes[i]).style('display', 'none');
                }
            });
        });

        hoverRect.on('mouseleave', () => {
            hoverG.style('display', 'none');
        });
    }

    update(options) {
        if (options.series !== undefined) this.series = options.series;
        if (options.xDomain !== undefined) this.xDomain = options.xDomain;
        if (options.yLabel !== undefined) this.yLabel = options.yLabel;
        if (options.movingAverage !== undefined) this.movingAverage = options.movingAverage;
        if (options.showRegression !== undefined) this.showRegression = options.showRegression;
        if (options.referenceLine !== undefined) this.referenceLine = options.referenceLine;
        if (options.yDomain !== undefined) this.yDomainFixed = options.yDomain;
        if (options.invertY !== undefined) this.invertY = options.invertY;
        if (options.formatY !== undefined) this.formatY = options.formatY;
        this.render();
    }

    destroy() {
        if (this.container) this.container.innerHTML = '';
    }
}
