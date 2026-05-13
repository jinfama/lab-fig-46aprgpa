/**
 * CAHE Mini-Viz: Timeseries (stacked area / line)
 * Lightweight D3 component for article inline figures.
 * 
 * Usage: new MiniTimeseries(containerEl, config)
 * Config: { data, caption, mode, highlight, colors, unit, width, height, vizLink, vizLinkText }
 */
class MiniTimeseries {
  constructor(container, config) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.cfg = Object.assign({
      mode: 'stacked',     // 'stacked' | 'line' | 'multiline'
      width: 760,
      height: 380,
      margin: { top: 20, right: 20, bottom: 50, left: 70 },
      animate: true,
      unit: '',
      caption: '',
      data: [],
      highlight: [],
      colors: {},
      formatValue: null,
    }, config);

    this.playing = false;
    this.playYear = null;
    this.init();
  }

  init() {
    const { cfg, container } = this;
    const wrap = d3.select(container);
    wrap.classed('mini-viz mini-timeseries', true);

    // Responsive container
    const figEl = wrap.append('figure').attr('class', 'mini-viz-figure');

    // SVG 
    const svgWrap = figEl.append('div').attr('class', 'mini-viz-svg-wrap');
    this.svg = svgWrap.append('svg')
      .attr('viewBox', `0 0 ${cfg.width} ${cfg.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Controls bar
    this.controlsEl = figEl.append('div').attr('class', 'mini-viz-controls');

    // Caption + viz link
    if (cfg.caption || cfg.vizLink) {
      const cap = figEl.append('figcaption');
      if (cfg.caption) cap.append('span').text(cfg.caption);
      if (cfg.vizLink) {
        cap.append('a')
          .attr('href', cfg.vizLink)
          .attr('class', 'mini-viz-link')
          .text(cfg.vizLinkText || 'Ver visualización interactiva \u2192');
      }
    }

    this.processData();
    this.draw();
    this.addInteraction();
    if (cfg.animate) this.addPlayButton();
  }

  processData() {
    const { cfg } = this;
    const raw = cfg.data;

    // Get unique series (excluding 'Total' for stacked)
    this.series = [...new Set(raw.map(d => d.tipo))];
    if (cfg.mode === 'stacked') {
      this.series = this.series.filter(s => s !== 'Total');
    }

    // Get years
    this.years = [...new Set(raw.map(d => d.year))].sort((a, b) => a - b);

    // Track which years each series actually has data for
    this.seriesYears = {};
    for (const s of this.series) {
      this.seriesYears[s] = new Set(raw.filter(d => d.tipo === s).map(d => d.year));
    }

    // Pivot: year → { tipo1: val, tipo2: val, ... }
    this.pivoted = new Map();
    for (const year of this.years) {
      const row = { year };
      for (const s of this.series) {
        const match = raw.find(d => d.year === year && d.tipo === s);
        row[s] = match ? +match.valor : null;
      }
      this.pivoted.set(year, row);
    }

    // Build color map
    this.colorMap = {};
    for (const s of this.series) {
      if (cfg.colors[s]) {
        this.colorMap[s] = cfg.colors[s];
      } else {
        const match = raw.find(d => d.tipo === s);
        this.colorMap[s] = match ? match.color : '#999';
      }
    }
  }

  draw() {
    const { cfg, svg, years, series, pivoted, colorMap } = this;
    const m = cfg.margin;
    const w = cfg.width - m.left - m.right;
    const h = cfg.height - m.top - m.bottom;

    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    this.g = g;

    // Scales
    this.x = d3.scaleLinear().domain(d3.extent(years)).range([0, w]);
    
    const dataArr = Array.from(pivoted.values());

    if (cfg.mode === 'stacked') {
      // For stacked, treat null as 0
      const stackData = dataArr.map(row => {
        const r = { year: row.year };
        for (const s of series) r[s] = row[s] != null ? row[s] : 0;
        return r;
      });
      const stack = d3.stack().keys(series).order(d3.stackOrderNone).offset(d3.stackOffsetDiverging);
      this.stacked = stack(stackData);

      const yMin = d3.min(this.stacked, layer => d3.min(layer, d => d[0]));
      const yMax = d3.max(this.stacked, layer => d3.max(layer, d => d[1]));
      this.y = d3.scaleLinear().domain([Math.min(0, yMin * 1.05), yMax * 1.05]).range([h, 0]);

      // Areas
      const area = d3.area()
        .x(d => this.x(d.data.year))
        .y0(d => this.y(d[0]))
        .y1(d => this.y(d[1]))
        .curve(d3.curveMonotoneX);

      this.layers = g.selectAll('.area-layer')
        .data(this.stacked)
        .join('path')
        .attr('class', 'area-layer')
        .attr('d', area)
        .attr('fill', d => colorMap[d.key])
        .attr('opacity', 0.85)
        .attr('stroke', 'white')
        .attr('stroke-width', 0.5);

    } else {
      // Line/multiline mode — filter out null values so lines end where data ends
      const yMax = d3.max(dataArr, row => {
        return d3.max(series.map(s => row[s]).filter(v => v != null));
      });
      this.y = d3.scaleLinear().domain([0, yMax * 1.05]).range([h, 0]);

      const line = d3.line()
        .defined(d => d.value != null)
        .x(d => this.x(d.year))
        .y(d => this.y(d.value))
        .curve(d3.curveMonotoneX);

      for (const s of series) {
        const lineData = dataArr.map(row => ({ year: row.year, value: row[s] }));
        g.append('path')
          .datum(lineData)
          .attr('class', 'line-path')
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', colorMap[s])
          .attr('stroke-width', 2);
      }
    }

    // Axes
    const xAxis = d3.axisBottom(this.x).tickFormat(d3.format('d')).ticks(8);
    g.append('g')
      .attr('class', 'axis axis-x')
      .attr('transform', `translate(0,${h})`)
      .call(xAxis);

    const formatY = cfg.formatValue || (v => {
      if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(1) + ' Gt';
      if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(0) + ' Mt';
      if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(0) + 'k';
      return v.toFixed(1);
    });

    const yAxis = d3.axisLeft(this.y).ticks(6).tickFormat(formatY);
    g.append('g')
      .attr('class', 'axis axis-y')
      .call(yAxis);

    if (cfg.unit) {
      g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', `rotate(-90)`)
        .attr('x', -h / 2)
        .attr('y', -m.left + 16)
        .attr('text-anchor', 'middle')
        .text(cfg.unit);
    }

    // Zero baseline (if y domain includes negatives)
    if (this.y.domain()[0] < 0) {
      g.append('line')
        .attr('class', 'zero-line')
        .attr('x1', 0).attr('x2', w)
        .attr('y1', this.y(0)).attr('y2', this.y(0))
        .attr('stroke', '#333')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0.6);
    }

    // Vertical line for hover
    this.hoverLine = g.append('line')
      .attr('class', 'hover-line')
      .attr('y1', 0).attr('y2', h)
      .style('display', 'none');

    // Legend
    this.addLegend();
  }

  addLegend() {
    const { series, colorMap, cfg } = this;
    const legendEl = this.controlsEl.append('div').attr('class', 'mini-viz-legend');

    const items = legendEl.selectAll('.legend-item')
      .data(series)
      .join('div')
      .attr('class', 'legend-item')
      .classed('highlighted', d => cfg.highlight.includes(d))
      .on('click', (event, d) => this.toggleHighlight(d));

    items.append('span')
      .attr('class', 'legend-color')
      .style('background', d => colorMap[d]);

    items.append('span')
      .attr('class', 'legend-label')
      .text(d => d);
  }

  toggleHighlight(serie) {
    const { cfg } = this;
    const idx = cfg.highlight.indexOf(serie);
    if (idx >= 0) {
      cfg.highlight.splice(idx, 1);
    } else {
      cfg.highlight.push(serie);
    }

    // Update legend
    this.controlsEl.selectAll('.legend-item')
      .classed('highlighted', d => cfg.highlight.includes(d));

    // Update opacity
    if (cfg.mode === 'stacked') {
      this.layers
        .attr('opacity', d => {
          if (cfg.highlight.length === 0) return 0.85;
          return cfg.highlight.includes(d.key) ? 0.95 : 0.25;
        });
    }
  }

  addInteraction() {
    const { cfg, g, x, y, years, pivoted, colorMap, series } = this;
    const m = cfg.margin;
    const w = cfg.width - m.left - m.right;
    const h = cfg.height - m.top - m.bottom;

    // Tooltip
    const tooltip = d3.select(this.container).append('div')
      .attr('class', 'mini-viz-tooltip')
      .style('display', 'none');

    // Overlay for mouse events
    const overlay = g.append('rect')
      .attr('class', 'overlay')
      .attr('width', w)
      .attr('height', h)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair');

    const bisect = d3.bisector(d => d).left;

    overlay.on('mousemove', (event) => {
      const [mx] = d3.pointer(event);
      const yearVal = x.invert(mx);
      const idx = bisect(years, yearVal);
      const year = years[Math.min(idx, years.length - 1)];
      const row = pivoted.get(year);
      if (!row) return;

      this.hoverLine
        .attr('x1', x(year)).attr('x2', x(year))
        .style('display', null);

      const formatVal = cfg.formatValue || (v => {
        if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + ' Mt';
        return v.toLocaleString('es-ES');
      });

      let html = `<div class="tt-year">${year}</div>`;
      const displayed = cfg.highlight.length > 0
        ? series.filter(s => cfg.highlight.includes(s))
        : series;

      for (const s of displayed) {
        if (row[s] == null) continue;
        html += `<div class="tt-row">
          <span class="tt-color" style="background:${colorMap[s]}"></span>
          <span class="tt-label">${s}</span>
          <span class="tt-value">${formatVal(row[s])}</span>
        </div>`;
      }

      // Total (only for stacked mode or when all series have data)
      const validSeries = series.filter(s => row[s] != null);
      if (validSeries.length > 1) {
        const total = validSeries.reduce((sum, s) => sum + row[s], 0);
        html += `<div class="tt-total">Total: ${formatVal(total)}</div>`;
      }

      tooltip.html(html).style('display', null);

      // Position tooltip
      const containerRect = this.container.getBoundingClientRect();
      const svgRect = this.svg.node().getBoundingClientRect();
      const scale = svgRect.width / cfg.width;
      const tipX = svgRect.left - containerRect.left + (x(year) + m.left) * scale;
      
      tooltip
        .style('left', (tipX + 15) + 'px')
        .style('top', '20px');
    })
    .on('mouseleave', () => {
      this.hoverLine.style('display', 'none');
      tooltip.style('display', 'none');
    });
  }

  addPlayButton() {
    const playBtn = this.controlsEl.append('button')
      .attr('class', 'mini-viz-play')
      .text('▶ Timelapse')
      .on('click', () => this.togglePlay(playBtn));
    this.playBtn = playBtn;
  }

  togglePlay(btn) {
    if (this.playing) {
      this.playing = false;
      btn.text('▶ Timelapse');
      if (this.playTimer) this.playTimer.stop();
      // Restore full view
      if (this.cfg.mode === 'stacked') {
        this.layers.attr('d', d3.area()
          .x(d => this.x(d.data.year))
          .y0(d => this.y(d[0]))
          .y1(d => this.y(d[1]))
          .curve(d3.curveMonotoneX)
        );
      }
      return;
    }

    this.playing = true;
    btn.text('⏸ Pausa');
    
    const { years, x, y, g, cfg } = this;
    let yearIdx = 0;

    // Clip path for progressive reveal
    let clipRect = g.select('.play-clip rect');
    if (clipRect.empty()) {
      const clip = g.append('clipPath').attr('id', 'play-clip-' + Math.random().toString(36).slice(2));
      clipRect = clip.append('rect')
        .attr('x', 0).attr('y', 0)
        .attr('height', cfg.height)
        .attr('width', 0);
      
      if (cfg.mode === 'stacked') {
        this.layers.attr('clip-path', `url(#${clip.attr('id')})`);
      }
    }

    const w = cfg.width - cfg.margin.left - cfg.margin.right;
    
    this.playTimer = d3.interval(() => {
      if (yearIdx >= years.length) {
        this.playing = false;
        btn.text('▶ Timelapse');
        this.playTimer.stop();
        clipRect.attr('width', w);
        return;
      }

      const year = years[yearIdx];
      clipRect.attr('width', x(year));
      
      // Move hover line
      this.hoverLine
        .attr('x1', x(year)).attr('x2', x(year))
        .style('display', null);

      yearIdx++;
    }, 30);
  }
}
