/* ───────────────────────────────────────────────
   Atlas Histórico Municipal de España — app.js
   D3 v7 + topojson-client + ES modules. Sin bundler.
   ─────────────────────────────────────────────── */

const state = {
    data: null,               // poblacion.json (kept for legacy population path)
    municipios: null,         // GeoJSON convertido desde topojson
    provincias: null,
    comunidades: null,
    overlays: {},             // overlays cargados (calzadas, etc.)
    sources: {                // each entry: null until lazy-loaded
        'historeco.json': null,
        'usos_suelo.json': null,
        'calzada.json': null,
    },
    catalog: null,            // atlas_indicators.json — index of all 43 indicators
    categories: null,         // dict built from catalog (8 categories)
    yearIdx: 0,    // index into the active indicator's years array
    category: "poblacion",
    indicator: "pob",
    activeOverlays: new Set(),// overlays activos en transporte
    viewLevel: "mun",         // mun | prov | ccaa
    selectedInes: [],
    hoveredIne: null,
    playing: false,
    playTimer: null,
    animFrameYear: null,
};

// Years array of the active indicator (poblacion's by default).
let CENSUS = [];
let YEAR_MIN = 1900, YEAR_MAX = 2025;

// Paleta secuencial estilo Opportunity Atlas:
// quintil bajo = beige tenue (visible sobre el azul-gris del mar),
// quintil alto = rojo profundo (las ciudades destacan).
const POP_COLORS = ["#fbe8c2", "#fbc887", "#f59055", "#d44e2a", "#7d1f0d"];
const CAMBIO_COLORS = ["#1f3a5f", "#5781a8", "#a8c6dd", "#f2efe9", "#e9b694", "#b35a32", "#5e1a0c"];
const LINE_COLORS = ["#c0392b", "#2b5797", "#2d8659", "#7d4ba0", "#c97f1c", "#475569", "#9b1d1d", "#0e7490"];
const NO_DATA_COLOR = "#e4e8ec";

// Order + display labels + icons for the 8 categories surfaced in the top tabs.
// Categories not listed here are dropped from the UI.
const CATEGORY_DEF = [
    { id: 'poblacion',  label: 'Población',  icon: '<path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>' },
    { id: 'demografia', label: 'Demografía', icon: '<path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>' },
    { id: 'clima',      label: 'Clima',      icon: '<path fill="currentColor" d="M19.36 10.04C18.68 6.59 15.65 4 12 4c-2.9 0-5.41 1.65-6.65 4.06C2.34 8.43 0 10.97 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.65-2.06-4.79-4.64-4.96z"/>' },
    { id: 'usos_suelo', label: 'Usos del suelo', icon: '<path fill="currentColor" d="M3 17l4-3 3 2 4-4 4 2 3-2v6H3z"/><path fill="currentColor" opacity="0.4" d="M3 11l4-3 3 2 4-4 4 2 3-2v3l-3 2-4-2-4 4-3-2-4 3z"/>' },
    { id: 'hidrologia', label: 'Hidrología', icon: '<path fill="currentColor" d="M12 2C8 6 4 10 4 14a8 8 0 0016 0c0-4-4-8-8-12z"/>' },
    { id: 'geografia',  label: 'Geografía',  icon: '<path fill="currentColor" d="M14 6l-4.22 5.63 1.25 1.67L14 9.33 19 16H5.76l3.27-4.36L9.78 11 11 12.42 5 20h14l-5-8z"/>' },
    { id: 'transporte', label: 'Transporte', icon: '<path fill="currentColor" d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2zM18 14l4 3-4 3v-6z"/>' },
    { id: 'transporte_historico', label: 'Histórico', icon: '<path fill="currentColor" d="M3 4h18v2H3zm0 4h18v2H3zm0 4h18v2H3zm0 4h12v2H3zm14 0h4v2h-4z"/>' },
];

// Categories with type='derived' have computed indicators (densidad, cambio etc.)
// derived from the population panel. The rest map to source files via the catalog.
const DERIVED_INDICATORS = {
    pob:     { name: 'Población total',   desc: 'Habitantes por municipio.', kind: 'pop' },
    pob_log: { name: 'Población (log)',   desc: 'Escala logarítmica: contraste rural-urbano.', kind: 'pop_log' },
    densidad:{ name: 'Densidad',          desc: 'Habitantes por km².', kind: 'densidad' },
    cambio:  { name: 'Cambio % desde 1900', desc: 'Variación porcentual respecto a 1900.', kind: 'cambio' },
};

// Geo overlays (lines, points). Belong to category 'transporte'.
const OVERLAY_INDICATORS = [
    { id: 'calzadas',    name: 'Calzadas romanas',     desc: 'Red viaria romana en Hispania (ss. I a.C. – V d.C.).', file: 'data/calzadas_romanas.geojson', style: 'ov-roman' },
    { id: 'fc_iberico',  name: 'Ferrocarril ibérico',  desc: 'Red de vía ibérica histórica (1848 en adelante).',      file: 'data/ferrocarril_iberico.geojson',  style: 'ov-rail-iberian' },
    { id: 'fc_estrecho', name: 'Ferrocarril estrecho', desc: 'Red de vía estrecha (FEVE, FGV, etc.).',                 file: 'data/ferrocarril_estrecho.geojson', style: 'ov-rail-narrow' },
    { id: 'fc_ave',      name: 'AVE / Alta velocidad', desc: 'Red ferroviaria de alta velocidad (desde 1992).',        file: 'data/ferrocarril_ave.geojson',     style: 'ov-rail-hsr' },
];

let CATEGORIES = {};  // populated by buildCategoriesFromCatalog()

function buildCategoriesFromCatalog() {
    const out = {};
    // Población = derived layers from poblacion.json + overlays
    out.poblacion = {
        label: 'Población',
        type: 'choropleth',
        indicators: Object.entries(DERIVED_INDICATORS).map(([id, m]) => ({ id, name: m.name, desc: m.desc })),
        default: 'pob',
    };
    // Transporte = overlay layers (lines, not choropleth) + 2 distance choropleths from historeco
    out.transporte = {
        label: 'Transporte',
        type: 'mixed', // overlays + indicator pills both available
        indicators: OVERLAY_INDICATORS.map(o => ({ ...o, kind: 'overlay' })),
        default: null,
        autoOverlays: OVERLAY_INDICATORS.map(o => o.id),
        // Plus distance-based choropleths from historeco
        choroplethExtras: [],
    };
    // The rest of the categories come straight from the catalog
    for (const ind of state.catalog.indicators) {
        const cat = ind.category;
        if (cat === 'poblacion') continue;       // already handled
        if (!out[cat]) {
            out[cat] = {
                label: CATEGORY_DEF.find(d => d.id === cat)?.label || cat,
                type: 'choropleth',
                indicators: [],
                default: null,
            };
        }
        out[cat].indicators.push({
            id: ind.id,
            name: ind.name,
            desc: `${ind.name} (${ind.unit}). Fuente: ${ind.source_file.replace('.json', '')}.`,
            unit: ind.unit,
            sourceFile: ind.source_file,
            kind: cat === 'transporte' ? 'distance' : undefined,
        });
        if (!out[cat].default && cat !== 'transporte') out[cat].default = ind.id;
    }
    // Move transport indicators from catalog (highspeed, airport) into the transporte category
    if (out.transporte_historico) {
        // 'transporte_historico' = single calzada indicator. Merge with 'transporte'? Keep separate for now.
    }
    CATEGORIES = out;
}

const $ = (s) => document.querySelector(s);
const map = d3.select("#map");
const tooltip = $("#tooltip");

let projection, pathGen, pathGenMain, pathGenCanarias;
let mapSize = { w: 0, h: 0 };
let insetFrames = [];

// ───────── Loading helpers ─────────
function setLoading(status, pct) {
    const el = $("#loading-status");
    if (el && status != null) el.textContent = status;
    const bar = $("#loading-bar-fill");
    if (bar && pct != null) bar.style.width = `${Math.round(pct * 100)}%`;
}
function hideLoading() {
    $("#loading").classList.add("hidden");
}

async function loadJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    const text = await response.text();
    return JSON.parse(text.replace(/-?\bInfinity\b/g, "null"));
}

function rewindPolygonRings(geometry) {
    if (!geometry) return geometry;
    if (geometry.type === "Polygon") {
        geometry.coordinates.forEach(ring => ring.reverse());
    } else if (geometry.type === "MultiPolygon") {
        geometry.coordinates.forEach(poly => poly.forEach(ring => ring.reverse()));
    }
    return geometry;
}

function rewindFeatureCollection(collection) {
    collection.features.forEach(f => rewindPolygonRings(f.geometry));
    return collection;
}

// ───────── Data load ─────────
async function loadData() {
    setLoading("Cargando catálogo…", 0.03);
    state.catalog = await loadJson("data/atlas_indicators.json");

    setLoading("Cargando población…", 0.10);
    const pob = await loadJson("data/poblacion.json");
    state.data = pob;
    CENSUS = pob.years;
    YEAR_MIN = CENSUS[0];
    YEAR_MAX = CENSUS[CENSUS.length - 1];
    state.yearIdx = CENSUS.length - 1;

    setLoading("Cargando provincias…", 0.25);
    setLoading("Cargando municipios (2.1 MB)…", 0.5);
    const munTopo = await loadJson("data/municipios.topojson");
    setLoading("Procesando geometrías…", 0.85);
    state.municipios = rewindFeatureCollection(topojson.feature(munTopo, Object.values(munTopo.objects)[0]));

    state.municipios.features = state.municipios.features.filter(f => {
        const m = pob.municipios[f.properties.ine];
        const code = provinceCode(f);
        return m && code !== "51" && code !== "52";
    });

    state.municipios.features.forEach(f => {
        const m = pob.municipios[f.properties.ine];
        if (m) {
            if (!Number.isFinite(m.area_km2) || m.area_km2 <= 0) {
                const computedArea = geometryAreaKm2(f.geometry);
                if (computedArea > 0) m.area_km2 = computedArea;
            }
            f.properties.name = m.name;
            f.properties.prov = m.prov;
            f.properties.ccaa = m.ccaa_code;
            f.properties.area = m.area_km2;
        }
    });
    buildAdminLayersFromMunicipalTopo(munTopo, pob);

    buildCategoriesFromCatalog();
}

function buildAdminLayersFromMunicipalTopo(munTopo, pob) {
    const object = Object.values(munTopo.objects)[0];
    const provinceGroups = new Map();
    const ccaaGroups = new Map();
    const provinceToCcaa = new Map();

    object.geometries.forEach(g => {
        const m = pob.municipios[g.properties?.ine];
        if (!isMuniIncluded(m) || !m.prov || !m.ccaa_code) return;
        if (!provinceGroups.has(m.prov)) provinceGroups.set(m.prov, []);
        if (!ccaaGroups.has(m.ccaa_code)) ccaaGroups.set(m.ccaa_code, []);
        provinceGroups.get(m.prov).push(g);
        ccaaGroups.get(m.ccaa_code).push(g);
        if (!provinceToCcaa.has(m.prov)) provinceToCcaa.set(m.prov, m.ccaa_code);
    });

    state.provincias = {
        type: "FeatureCollection",
        features: Array.from(provinceGroups, ([code, geometries]) => ({
            type: "Feature",
            properties: {
                code,
                name: pob.provincias?.[code]?.name || code,
                ccaa: provinceToCcaa.get(code) || "",
            },
            geometry: stripInteriorRings(topojson.merge(munTopo, geometries)),
        })).sort((a, b) => a.properties.code.localeCompare(b.properties.code)),
    };

    state.comunidades = {
        type: "FeatureCollection",
        features: Array.from(ccaaGroups, ([code, geometries]) => ({
            type: "Feature",
            properties: {
                code,
                name: pob.ccaa?.[code]?.name || code,
                inset: code === "05" ? "canarias" : null,
            },
            geometry: stripInteriorRings(topojson.merge(munTopo, geometries)),
        })).sort((a, b) => a.properties.code.localeCompare(b.properties.code)),
    };
}

// Lazy-load a non-population source file (historeco, usos_suelo, calzada).
// Returns the parsed JSON (cached after first call). Invalidates the colour-
// scale cache for indicators that live in this file (their values were
// previously unknown, so any cached scale was nonsense).
async function loadSource(filename) {
    if (state.sources[filename]) return state.sources[filename];
    setLoading(`Cargando ${filename}…`, null);
    const data = await loadJson(`data/${filename}`);
    state.sources[filename] = data;
    _scaleCache.clear();
    _aggregateCache.clear();
    return data;
}

// Resolve which source file an indicator's data lives in.
function indicatorSourceFile(indId) {
    if (DERIVED_INDICATORS[indId]) return null; // population derived — uses state.data
    const meta = state.catalog?.indicators.find(i => i.id === indId);
    return meta?.source_file || null;
}

// Years array of a given indicator (or null if it has no time dimension).
function indicatorYears(indId) {
    if (DERIVED_INDICATORS[indId]) return state.data.years;
    const src = indicatorSourceFile(indId);
    if (!src) return null;
    const data = state.sources[src];
    if (!data) return null;       // not loaded yet
    return data.years || null;     // calzada has no years → null = single value
}

// Get the time series of an indicator at a given municipio. Returns array or null.
function indicatorSeriesAt(ine, indId) {
    if (DERIVED_INDICATORS[indId]) {
        return state.data.municipios[ine]?.pob || null;
    }
    const src = indicatorSourceFile(indId);
    if (!src) return null;
    const data = state.sources[src];
    if (!data) return null;
    const muni = data.data?.[ine];
    if (!muni) return null;
    const v = muni[indId];
    if (Array.isArray(v)) return v;
    if (v == null) return null;
    return [v]; // calzada: single scalar wrapped as length-1 array
}

// ───────── Map setup ─────────
function provinceCode(feature) {
    return feature?.properties?.ine?.slice(0, 2) || feature?.properties?.code || "";
}

function featureCollection(features) {
    return { type: "FeatureCollection", features };
}

function visitCoordinates(geometry, cb) {
    if (!geometry) return;
    if (geometry.type === "GeometryCollection") {
        geometry.geometries.forEach(g => visitCoordinates(g, cb));
        return;
    }
    const scan = (coords) => {
        if (!coords) return;
        if (typeof coords[0] === "number" && typeof coords[1] === "number") {
            cb(coords);
        } else {
            coords.forEach(scan);
        }
    };
    scan(geometry.coordinates);
}

function ringAreaKm2(ring) {
    const points = ring.filter(p => Number.isFinite(p?.[0]) && Number.isFinite(p?.[1]));
    if (points.length < 3) return 0;
    const lat0 = d3.mean(points, p => p[1]) * Math.PI / 180;
    const radiusKm = 6371.0088;
    const xy = points.map(([lon, lat]) => [
        radiusKm * lon * Math.PI / 180 * Math.cos(lat0),
        radiusKm * lat * Math.PI / 180,
    ]);
    let sum = 0;
    for (let i = 0; i < xy.length; i++) {
        const [x1, y1] = xy[i];
        const [x2, y2] = xy[(i + 1) % xy.length];
        sum += x1 * y2 - x2 * y1;
    }
    return Math.abs(sum) / 2;
}

function geometryAreaKm2(geometry) {
    if (!geometry) return 0;
    if (geometry.type === "Polygon") {
        const rings = geometry.coordinates || [];
        if (!rings.length) return 0;
        const outer = ringAreaKm2(rings[0]);
        const holes = rings.slice(1).reduce((acc, ring) => acc + ringAreaKm2(ring), 0);
        return Math.max(0, outer - holes);
    }
    if (geometry.type === "MultiPolygon") {
        return (geometry.coordinates || []).reduce((acc, poly) => {
            const outer = ringAreaKm2(poly[0] || []);
            const holes = poly.slice(1).reduce((sum, ring) => sum + ringAreaKm2(ring), 0);
            return acc + Math.max(0, outer - holes);
        }, 0);
    }
    if (geometry.type === "GeometryCollection") {
        return geometry.geometries.reduce((acc, g) => acc + geometryAreaKm2(g), 0);
    }
    return 0;
}

function stripInteriorRings(geometry) {
    if (!geometry) return geometry;
    if (geometry.type === "Polygon") {
        return { ...geometry, coordinates: geometry.coordinates.slice(0, 1) };
    }
    if (geometry.type === "MultiPolygon") {
        return {
            ...geometry,
            coordinates: geometry.coordinates.map(poly => poly.slice(0, 1)),
        };
    }
    if (geometry.type === "GeometryCollection") {
        return { ...geometry, geometries: geometry.geometries.map(stripInteriorRings) };
    }
    return geometry;
}

function coordinateBounds(features) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    features.forEach(f => visitCoordinates(f.geometry, ([x, y]) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }));
    return [[minX, minY], [maxX, maxY]];
}

function fitMercatorByBounds(features, extent) {
    if (!features.length) return null;
    const [[minX, minY], [maxX, maxY]] = coordinateBounds(features);
    if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;
    const center = [(minX + maxX) / 2, (minY + maxY) / 2];
    const proj = d3.geoMercator().center(center).scale(1).translate([0, 0]);
    const p1 = proj([minX, maxY]);
    const p2 = proj([maxX, minY]);
    const scale = Math.min(
        (extent[1][0] - extent[0][0]) / Math.max(1e-9, p2[0] - p1[0]),
        (extent[1][1] - extent[0][1]) / Math.max(1e-9, p2[1] - p1[1])
    );
    const targetCx = (extent[0][0] + extent[1][0]) / 2;
    const targetCy = (extent[0][1] + extent[1][1]) / 2;
    const sourceCx = (p1[0] + p2[0]) / 2;
    const sourceCy = (p1[1] + p2[1]) / 2;
    proj.scale(scale).translate([targetCx - scale * sourceCx, targetCy - scale * sourceCy]);
    return proj;
}

function fmtCoord(value) {
    return Math.round(value * 1000) / 1000;
}

function pointPath(point, proj) {
    const p = proj(point);
    return p && Number.isFinite(p[0]) && Number.isFinite(p[1])
        ? `${fmtCoord(p[0])},${fmtCoord(p[1])}`
        : null;
}

function ringPath(ring, proj) {
    const points = ring.map(pt => pointPath(pt, proj)).filter(Boolean);
    return points.length ? `M${points.join("L")}Z` : "";
}

function linePath(line, proj) {
    const points = line.map(pt => pointPath(pt, proj)).filter(Boolean);
    return points.length ? `M${points.join("L")}` : "";
}

function geometryPath(geometry, proj) {
    if (!geometry || !proj) return "";
    if (geometry.type === "Polygon") {
        return geometry.coordinates.map(ring => ringPath(ring, proj)).join("");
    }
    if (geometry.type === "MultiPolygon") {
        return geometry.coordinates.flatMap(poly => poly.map(ring => ringPath(ring, proj))).join("");
    }
    if (geometry.type === "LineString") {
        return linePath(geometry.coordinates, proj);
    }
    if (geometry.type === "MultiLineString") {
        return geometry.coordinates.map(line => linePath(line, proj)).join("");
    }
    if (geometry.type === "GeometryCollection") {
        return geometry.geometries.map(g => geometryPath(g, proj)).join("");
    }
    return "";
}

function featurePath(feature, proj) {
    return geometryPath(feature.geometry, proj);
}

function fitPath(features, extent) {
    if (!features.length) return null;
    const proj = fitMercatorByBounds(features, extent);
    return proj ? (feature) => featurePath(feature, proj) : null;
}

function setupProjection() {
    const svg = map.node();
    const rect = svg.getBoundingClientRect();
    const w = Math.max(rect.width, 100);
    const h = Math.max(rect.height, 100);
    mapSize = { w, h };
    map.attr("viewBox", `0 0 ${w} ${h}`).attr("preserveAspectRatio", "xMidYMid meet");

    const insetCodes = new Set(["35", "38"]);
    const mainFeatures = state.municipios.features.filter(f => !insetCodes.has(provinceCode(f)));
    const canarias = state.municipios.features.filter(f => ["35", "38"].includes(provinceCode(f)));

    const pad = Math.min(26, Math.max(12, w * 0.02));
    projection = fitMercatorByBounds(mainFeatures, [[pad, pad], [w - pad, h - pad]]);
    pathGenMain = (feature) => featurePath(feature, projection);

    const canaryW = Math.min(250, Math.max(150, w * 0.22));
    const canaryH = Math.min(110, Math.max(76, h * 0.18));
    const canaryX = pad;
    const canaryY = h - pad - canaryH;
    pathGenCanarias = fitPath(canarias, [[canaryX + 10, canaryY + 18], [canaryX + canaryW - 10, canaryY + canaryH - 10]]);

    insetFrames = [
        pathGenCanarias && { label: "Canarias", x: canaryX, y: canaryY, w: canaryW, h: canaryH },
    ].filter(Boolean);

    pathGen = (feature) => {
        const code = provinceCode(feature);
        if ((feature.properties?.inset === "canarias" || code === "35" || code === "38") && pathGenCanarias) {
            return pathGenCanarias(feature);
        }
        return pathGenMain(feature);
    };
}

function renderInsetFrames() {
    const g = map.append("g").attr("class", "layer-insets");
    g.selectAll("rect")
        .data(insetFrames)
        .enter().append("rect")
        .attr("class", "inset-frame")
        .attr("x", d => d.x)
        .attr("y", d => d.y)
        .attr("width", d => d.w)
        .attr("height", d => d.h);
    g.selectAll("text")
        .data(insetFrames)
        .enter().append("text")
        .attr("class", "inset-label")
        .attr("x", d => d.x + 8)
        .attr("y", d => d.y + 13)
        .text(d => d.label);
}

// Render municipios en chunks para no bloquear el hilo principal
async function renderMapProgressive() {
    setupProjection();
    map.selectAll("*").remove();
    applyViewLevelClass();
    map.append("rect")
        .attr("class", "map-background")
        .attr("width", mapSize.w)
        .attr("height", mapSize.h);
    map.append("g").attr("class", "layer-municipios");
    map.append("g").attr("class", "layer-provincias-fill");
    map.append("g").attr("class", "layer-ccaa-fill");
    map.append("g").attr("class", "layer-boundaries");
    map.append("g").attr("class", "layer-overlays");

    const feats = state.municipios.features;
    const total = feats.length;
    const CHUNK = 1500;
    const useChoropleth = isPaintableIndicator(state.indicator);
    const colorFn = useChoropleth ? colorScaleFor(state.indicator) : null;
    const layer = state.indicator;
    const groupedValues = useChoropleth ? aggregateValuesForLevel(state.viewLevel, layer, currentYear()) : null;

    const gMun = map.select("g.layer-municipios");
    for (let i = 0; i < total; i += CHUNK) {
        const slice = feats.slice(i, i + CHUNK);
        gMun.selectAll(null)
            .data(slice)
            .enter().append("path")
            .attr("class", "municipio")
            .attr("d", pathGen)
            .attr("data-ine", d => d.properties.ine)
            .attr("fill", d => {
                if (!useChoropleth) return NO_DATA_COLOR;
                const v = valueForFeature(d, layer, currentYear(), groupedValues);
                return v == null ? NO_DATA_COLOR : colorFn(v);
            })
            .on("mouseover", onMuniHover)
            .on("mouseleave", onMuniLeave)
            .on("click", onMuniClick);

        const pct = 0.85 + 0.13 * Math.min(1, (i + CHUNK) / total);
        setLoading(`Renderizando ${Math.min(i + CHUNK, total)} / ${total} municipios…`, pct);
        await new Promise(r => setTimeout(r, 0));
    }

    // Provincias (líneas)
    const gProvFill = map.select("g.layer-provincias-fill");
    gProvFill.selectAll("path.provincia-fill")
        .data(state.provincias.features)
        .enter().append("path")
        .attr("class", "provincia-fill")
        .attr("d", pathGen)
        .attr("data-code", d => d.properties.code)
        .attr("fill", NO_DATA_COLOR)
        .on("mouseover", onMuniHover)
        .on("mouseleave", onMuniLeave);

    const gCcaaFill = map.select("g.layer-ccaa-fill");
    gCcaaFill.selectAll("path.ccaa-fill")
        .data(state.comunidades.features)
        .enter().append("path")
        .attr("class", "ccaa-fill")
        .attr("d", pathGen)
        .attr("data-code", d => d.properties.code)
        .attr("fill", NO_DATA_COLOR)
        .on("mouseover", onMuniHover)
        .on("mouseleave", onMuniLeave);

    const gBoundary = map.select("g.layer-boundaries");
    gBoundary.selectAll("path.provincia-line")
        .data(state.provincias.features)
        .enter().append("path")
        .attr("class", "provincia-line")
        .attr("d", pathGen);
    gBoundary.selectAll("path.ccaa-line")
        .data(state.comunidades.features)
        .enter().append("path")
        .attr("class", "ccaa-line")
        .attr("d", pathGen);

    await renderActiveOverlays();
    renderInsetFrames();
    paintMunicipios();

    refreshSelectionStyles();
    setLoading("Listo", 1);
    setTimeout(hideLoading, 250);
}

// ───────── Value computation ─────────
function currentYear() {
    return state.animFrameYear ?? CENSUS[state.yearIdx];
}

// Linearly interpolate a value from a series along a years grid.
function interpSeries(series, years, year) {
    if (!series || !years || years.length === 0) return null;
    if (series.length === 1) return series[0]; // static (no time dimension)
    const n = Math.min(series.length, years.length);
    const valid = (v) => v != null && Number.isFinite(v);
    let lo = -1;
    let hi = -1;
    for (let i = 0; i < n; i++) {
        if (years[i] <= year && valid(series[i])) lo = i;
        if (years[i] >= year && valid(series[i])) {
            hi = i;
            break;
        }
    }
    if (lo < 0 && hi < 0) return null;
    if (lo < 0) return series[hi];
    if (hi < 0) return series[lo];
    if (lo === hi) return series[lo];
    const v0 = series[lo], v1 = series[hi];
    const span = years[hi] - years[lo];
    if (span === 0) return v0;
    const t = (year - years[lo]) / span;
    return v0 + t * (v1 - v0);
}

function getMuniValueAnim(ine, year) {
    return interpSeries(state.data.municipios[ine]?.pob, state.data.years, year);
}

// Generic value getter for ANY indicator (derived from population, or from
// historeco / usos_suelo / calzada). Returns null when data not loaded yet.
function indicatorValue(ine, indId, year) {
    if (indId === 'cambio') {
        const m = state.data.municipios[ine];
        if (!m) return null;
        const v0 = m.pob?.[0];
        const vN = getMuniValueAnim(ine, year);
        if (v0 == null || vN == null || v0 === 0) return null;
        return ((vN - v0) / v0) * 100;
    }
    if (indId === 'densidad') {
        const m = state.data.municipios[ine];
        if (!m) return null;
        const v = getMuniValueAnim(ine, year);
        const area = m.area_km2;
        if (v == null || !area || area <= 0) return null;
        return v / area;
    }
    if (indId === 'pob' || indId === 'pob_log') {
        return getMuniValueAnim(ine, year);
    }
    // Generic catalog indicator
    const series = indicatorSeriesAt(ine, indId);
    if (!series) return null;
    const years = indicatorYears(indId);
    if (!years) return series[0]; // static (calzada-style)
    return interpSeries(series, years, year);
}

// Backwards-compatible alias used by older code paths in this file.
function layerValue(ine, year, layer) { return indicatorValue(ine, layer, year); }

function isMuniIncluded(m) {
    return m && m.prov !== "51" && m.prov !== "52" && m.ccaa_code !== "18" && m.ccaa_code !== "19";
}

function featureGroupKey(feature, level = state.viewLevel) {
    const ine = feature?.properties?.ine;
    const m = state.data?.municipios?.[ine];
    if (level === "prov") return m?.prov || feature?.properties?.prov || feature?.properties?.code || provinceCode(feature);
    if (level === "ccaa") return m?.ccaa_code || feature?.properties?.ccaa || feature?.properties?.code || "";
    return ine;
}

function aggregationMode(indId) {
    if (indId === "densidad") return "density";
    if (indId === "cambio") return "change";
    if (indId === "pob" || indId === "pob_log") return "sum";

    const meta = indicatorMeta(indId);
    const id = (indId || "").toLowerCase();
    const name = (meta.name || "").toLowerCase();
    const unit = (meta.unit || "").toLowerCase();
    if (unit.includes("%") || id.includes("share")) return "mean";
    if (id.includes("distance") || id.startsWith("dist_") || id.startsWith("to_")) return "mean";
    if (
        unit.includes("ha") ||
        unit.includes("hm") ||
        id.includes("_ha") ||
        id.includes("area") ||
        name.includes("area") ||
        name.includes("superficie") ||
        name.includes("volumen")
    ) {
        return "sum";
    }
    return "mean";
}

function aggregateValuesForLevel(level, indId, year) {
    if (level === "mun") return null;
    const cacheKey = `${level}|${indId}|${Math.round(year * 1000) / 1000}`;
    if (_aggregateCache.has(cacheKey)) return _aggregateCache.get(cacheKey);

    const mode = aggregationMode(indId);
    const groups = new Map();
    const bucketFor = (key) => {
        if (!groups.has(key)) {
            groups.set(key, { sum: 0, count: 0, pop: 0, basePop: 0, area: 0 });
        }
        return groups.get(key);
    };

    for (const [ine, m] of Object.entries(state.data?.municipios || {})) {
        if (!isMuniIncluded(m)) continue;
        const key = level === "prov" ? m.prov : m.ccaa_code;
        if (!key) continue;
        const bucket = bucketFor(key);

        if (mode === "density") {
            const pop = getMuniValueAnim(ine, year);
            if (pop != null && Number.isFinite(pop)) bucket.pop += pop;
            if (m.area_km2 > 0) bucket.area += m.area_km2;
            continue;
        }

        if (mode === "change") {
            const base = m.pob?.[0];
            const pop = getMuniValueAnim(ine, year);
            if (base != null && Number.isFinite(base)) bucket.basePop += base;
            if (pop != null && Number.isFinite(pop)) bucket.pop += pop;
            continue;
        }

        const v = indicatorValue(ine, indId, year);
        if (v == null || !Number.isFinite(v)) continue;
        bucket.sum += v;
        bucket.count += 1;
    }

    const values = new Map();
    groups.forEach((bucket, key) => {
        let value = null;
        if (mode === "density") {
            value = bucket.area > 0 ? bucket.pop / bucket.area : null;
        } else if (mode === "change") {
            value = bucket.basePop > 0 ? ((bucket.pop - bucket.basePop) / bucket.basePop) * 100 : null;
        } else if (mode === "sum") {
            value = bucket.count > 0 ? bucket.sum : null;
        } else {
            value = bucket.count > 0 ? bucket.sum / bucket.count : null;
        }
        if (value != null && Number.isFinite(value)) values.set(key, value);
    });
    _aggregateCache.set(cacheKey, values);
    return values;
}

function valueForFeature(feature, indId, year, groupedValues = null) {
    if (state.viewLevel === "mun") return indicatorValue(feature.properties.ine, indId, year);
    const values = groupedValues || aggregateValuesForLevel(state.viewLevel, indId, year);
    return values?.get(featureGroupKey(feature, state.viewLevel)) ?? null;
}

function groupNameForFeature(feature) {
    const ine = feature?.properties?.ine;
    const m = state.data?.municipios?.[ine];
    if (!m) {
        if (state.viewLevel === "prov") return state.data.provincias[feature?.properties?.code]?.name || feature?.properties?.name || "";
        if (state.viewLevel === "ccaa") return state.data.ccaa[feature?.properties?.code]?.name || feature?.properties?.name || "";
        return feature?.properties?.name || "";
    }
    if (state.viewLevel === "prov") return state.data.provincias[m.prov]?.name || m.name;
    if (state.viewLevel === "ccaa") return state.data.ccaa[m.ccaa_code]?.name || m.name;
    return m.name;
}

function groupMetaForFeature(feature, year) {
    const ine = feature?.properties?.ine;
    const m = state.data?.municipios?.[ine];
    if (!m) {
        if (state.viewLevel === "prov") return `Provincia · ${Math.round(year)}`;
        if (state.viewLevel === "ccaa") return `CCAA · ${Math.round(year)}`;
        return `${Math.round(year)}`;
    }
    if (state.viewLevel === "prov") return `Provincia · ${Math.round(year)}`;
    if (state.viewLevel === "ccaa") return `CCAA · ${Math.round(year)}`;
    return `${state.data.provincias[m.prov]?.name ?? ""} · ${Math.round(year)}`;
}

// True if the current indicator is a paintable (choropleth) indicator,
// vs an overlay layer like calzadas / ferrocarril.
function isPaintableIndicator(indId) {
    if (!indId) return false;
    if (DERIVED_INDICATORS[indId]) return true;
    if (OVERLAY_INDICATORS.some(o => o.id === indId)) return false;
    return !!state.catalog?.indicators.find(i => i.id === indId);
}

function activeMapSelector() {
    if (state.viewLevel === "prov") return "path.provincia-fill";
    if (state.viewLevel === "ccaa") return "path.ccaa-fill";
    return "path.municipio";
}

function paintMunicipios() {
    const cat = CATEGORIES[state.category];
    const year = currentYear();
    map.selectAll("path.municipio,path.provincia-fill,path.ccaa-fill").attr("fill", NO_DATA_COLOR);

    if (isPaintableIndicator(state.indicator) && cat?.type !== 'placeholder') {
        const colorFn = colorScaleFor(state.indicator);
        const groupedValues = aggregateValuesForLevel(state.viewLevel, state.indicator, year);
        map.selectAll(activeMapSelector())
            .attr("fill", d => {
                const v = valueForFeature(d, state.indicator, year, groupedValues);
                return v == null ? NO_DATA_COLOR : colorFn(v);
            });
        renderLegend(state.indicator);
    } else if (cat?.type === 'mixed' || cat?.type === 'overlay') {
        renderOverlayLegend();
    } else {
        $("#legend").innerHTML = '';
    }
    $("#timebar-year").textContent = Math.round(year);
    $("#legend-year").textContent = Math.round(year);
    updateSourceFooter();
}

// Look up an indicator's metadata (for unit, name) regardless of whether it's
// derived from population or from the catalog.
function indicatorMeta(indId) {
    if (DERIVED_INDICATORS[indId]) {
        const m = DERIVED_INDICATORS[indId];
        const unitMap = { pop: 'hab.', pop_log: 'hab. (log)', densidad: 'hab/km²', cambio: '%' };
        return { name: m.name, unit: unitMap[m.kind] || '', desc: m.desc };
    }
    const ind = state.catalog?.indicators.find(i => i.id === indId);
    if (!ind) return { name: indId, unit: '', desc: '' };
    return { name: ind.name, unit: ind.unit, desc: `${ind.name} (${ind.unit})` };
}

function sourceInfoForIndicator(indId = state.indicator) {
    if (state.category === "transporte" && !isPaintableIndicator(indId)) {
        return "Trazados: calzadas romanas y ferrocarriles historicos.<br>Distancias: indicadores separados en la lista.";
    }
    if (DERIVED_INDICATORS[indId]) {
        return "Fuente: Goerlich &amp; Mas / BBVA-Ivie 1900-2011; INE Padron continuo 1996-2025.<br>Base municipal armonizada a limites actuales.";
    }
    const src = indicatorSourceFile(indId);
    if (src === "historeco.json") {
        return "Fuente: HistoReCo y elaboraciones municipales asociadas.<br>Variables climaticas, geograficas, hidrologicas, agrarias y distancias.";
    }
    if (src === "usos_suelo.json") {
        return "Fuente: HYDE + LUH2, agregadas a municipio.<br>Superficies historicas de cultivos, pastos, urbano, bosque y otros usos.";
    }
    if (src === "calzada.json") {
        return "Fuente: distancias calculadas a la red de calzadas romanas.<br>La ruta visible se activa en Transporte.";
    }
    return "Fuente: compilacion local del atlas municipal.<br>Consulta Sobre para metodologia y citas.";
}

function updateSourceFooter() {
    const el = $("#source-footer");
    if (el) el.innerHTML = sourceInfoForIndicator();
}

// Per-indicator scale cache: keys = `${indicator}|<scale-version>`.
// We compute the scale ONCE using values pooled across the full time series
// so the legend stays constant when the user scrubs the timeline.
const _scaleCache = new Map();
const _aggregateCache = new Map();

function _computeScaleForLayer(layer) {
    if (layer === "cambio") {
        const fn = d3.scaleLinear()
            .domain([-80, -40, -10, 0, 50, 200, 500])
            .range(CAMBIO_COLORS)
            .clamp(true);
        return { kind: 'cambio', fn, breaks: null, signed: true, values: null };
    }

    // Pool values across all years × all munis → robust quantile breaks
    // that don't shift as the user moves through time.
    const yrs = indicatorYears(layer) || (state.data?.years || []);
    const sampleYears = yrs.length <= 4 ? yrs
        : [yrs[0], yrs[Math.floor(yrs.length / 3)], yrs[Math.floor(2 * yrs.length / 3)], yrs[yrs.length - 1]];
    const values = [];
    if (state.viewLevel === "mun") {
        const munIds = state.data ? Object.keys(state.data.municipios) : [];
        for (const ine of munIds) {
            const m = state.data.municipios[ine];
            if (!isMuniIncluded(m)) continue;
            for (const y of sampleYears) {
                const v = indicatorValue(ine, layer, y);
                if (v != null && Number.isFinite(v)) values.push(v);
            }
        }
    } else {
        for (const y of sampleYears) {
            const grouped = aggregateValuesForLevel(state.viewLevel, layer, y);
            for (const v of grouped.values()) {
                if (v != null && Number.isFinite(v)) values.push(v);
            }
        }
    }
    if (values.length === 0) {
        return { kind: 'empty', fn: () => NO_DATA_COLOR, breaks: null, signed: false, values };
    }

    // Diverging when the indicator naturally crosses zero (SPEI, balances…)
    const hasNeg = values.some(v => v < 0);
    const hasPos = values.some(v => v > 0);
    if (hasNeg && hasPos) {
        const absMax = Math.max(Math.abs(d3.min(values)), d3.max(values));
        const fn = d3.scaleLinear()
            .domain([-absMax, -absMax / 2, 0, absMax / 2, absMax])
            .range([CAMBIO_COLORS[0], CAMBIO_COLORS[2], CAMBIO_COLORS[3], CAMBIO_COLORS[4], CAMBIO_COLORS[6]])
            .clamp(true);
        return { kind: 'diverging', fn, breaks: { absMax }, signed: true, values };
    }

    values.sort((a, b) => a - b);
    if (layer === "pob_log") {
        const positive = values.filter(v => v > 0);
        if (!positive.length) {
            return { kind: 'empty', fn: () => POP_COLORS[0], breaks: null, signed: false, values };
        }
        const ext = [Math.log10(positive[0]), Math.log10(positive[positive.length - 1])];
        const sc = d3.scaleLinear()
            .domain([ext[0], (ext[0] + ext[1]) * 0.6, ext[1]])
            .range([POP_COLORS[0], POP_COLORS[2], POP_COLORS[4]]);
        const fn = v => v > 0 ? sc(Math.log10(v)) : POP_COLORS[0];
        return { kind: 'log', fn, breaks: { ext }, signed: false, values };
    }

    const breaks = {
        q50: d3.quantile(values, 0.5),
        q75: d3.quantile(values, 0.75),
        q90: d3.quantile(values, 0.9),
        q97: d3.quantile(values, 0.97),
    };
    const fn = v => {
        if (v == null || !Number.isFinite(v)) return NO_DATA_COLOR;
        if (v < breaks.q50) return POP_COLORS[0];
        if (v < breaks.q75) return POP_COLORS[1];
        if (v < breaks.q90) return POP_COLORS[2];
        if (v < breaks.q97) return POP_COLORS[3];
        return POP_COLORS[4];
    };
    return { kind: 'quantile', fn, breaks, signed: false, values };
}

function colorScaleFor(layer /*, year ignored — scale is constant */) {
    const key = `${state.viewLevel}|${layer}`;
    if (!_scaleCache.has(key)) {
        _scaleCache.set(key, _computeScaleForLayer(layer));
    }
    return _scaleCache.get(key).fn;
}

function getScaleInfo(layer) {
    const key = `${state.viewLevel}|${layer}`;
    if (!_scaleCache.has(key)) {
        _scaleCache.set(key, _computeScaleForLayer(layer));
    }
    return _scaleCache.get(key);
}

// ───────── Legend ─────────
// The legend is derived from the cached scale info — same breaks across
// every year, so it doesn't shift while the timeline plays.
function renderLegend(layer) {
    const legend = $("#legend");
    legend.innerHTML = "";
    let rows = [];

    if (layer === "cambio") {
        rows = [
            ["Pierde > 80%", CAMBIO_COLORS[0]],
            ["Pierde 40–80%", CAMBIO_COLORS[1]],
            ["Pierde 10–40%", CAMBIO_COLORS[2]],
            ["Estable (±10%)", CAMBIO_COLORS[3]],
            ["Crece +50–200%", CAMBIO_COLORS[4]],
            ["Crece +200–500%", CAMBIO_COLORS[5]],
            ["Crece > +500%", CAMBIO_COLORS[6]],
        ];
    } else if (layer === "pob_log") {
        rows = [
            ["10 hab.", POP_COLORS[0]],
            ["1.000 hab.", POP_COLORS[2]],
            ["100.000+ hab.", POP_COLORS[4]],
        ];
    } else {
        const info = getScaleInfo(layer);
        if (info.kind === 'empty' || !info.breaks) {
            legend.innerHTML = `<div style="font-size:11px;color:var(--ink-mute);font-style:italic">Sin datos para este indicador.</div>`;
            return;
        }
        const meta = indicatorMeta(layer);
        const unit = meta.unit ? ` ${meta.unit}` : '';
        const pickFmt = (m) => m >= 1000 ? d3.format(",.0f")
                          : m >= 10     ? d3.format(",.1f")
                                        : d3.format(",.2f");
        if (info.kind === 'diverging') {
            const m = info.breaks.absMax;
            const fmt = pickFmt(m);
            rows = [
                [`< -${fmt(m / 2)}${unit}`, CAMBIO_COLORS[0]],
                [`±${fmt(m / 4)}${unit}`,    CAMBIO_COLORS[3]],
                [`> +${fmt(m / 2)}${unit}`,  CAMBIO_COLORS[6]],
            ];
        } else {
            const b = info.breaks;
            const fmt = pickFmt(b.q97);
            rows = [
                [`< ${fmt(b.q50)}${unit}`,             POP_COLORS[0]],
                [`${fmt(b.q50)} – ${fmt(b.q75)}`,      POP_COLORS[1]],
                [`${fmt(b.q75)} – ${fmt(b.q90)}`,      POP_COLORS[2]],
                [`${fmt(b.q90)} – ${fmt(b.q97)}`,      POP_COLORS[3]],
                [`> ${fmt(b.q97)}${unit}`,              POP_COLORS[4]],
            ];
        }
    }
    rows.forEach(([label, color]) => {
        const row = document.createElement("div");
        row.className = "legend-row";
        row.innerHTML = `<span class="legend-swatch" style="background:${color}"></span><span>${label}</span>`;
        legend.appendChild(row);
    });
}

function renderOverlayLegend() {
    const legend = $("#legend");
    legend.innerHTML = "";
    if (state.activeOverlays.size === 0) {
        legend.innerHTML = `<div style="font-size:11px;color:var(--ink-mute);font-style:italic">Activa una capa para verla en el mapa.</div>`;
        return;
    }
    state.activeOverlays.forEach(id => {
        const ind = OVERLAY_INDICATORS.find(i => i.id === id);
        if (!ind) return;
        const row = document.createElement("div");
        row.className = "legend-row";
        row.innerHTML = `<span class="legend-line ${ind.style}"></span><span>${ind.name}</span>`;
        legend.appendChild(row);
    });
}

// ───────── Tooltip & selection ─────────
function onMuniHover(ev, d) {
    const ine = d.properties.ine;
    state.hoveredIne = ine || featureGroupKey(d, state.viewLevel);
    const year = currentYear();
    if (!groupNameForFeature(d)) return;
    const fmt = d3.format(",.0f");
    const fmtPct = d3.format("+,.1f");
    const fmtDens = d3.format(",.1f");

    let valueLine = "";
    const indId = state.indicator;
    const showChoropleth = isPaintableIndicator(indId);
    if (showChoropleth) {
        const v = valueForFeature(d, indId, year);
        const meta = indicatorMeta(indId);
        let valStr;
        if (v == null || !Number.isFinite(v)) {
            valStr = '—';
        } else if (indId === 'cambio') {
            valStr = fmtPct(v) + '%';
        } else if (Math.abs(v) >= 1000) {
            valStr = fmt(v) + (meta.unit ? ' ' + meta.unit : '');
        } else if (Math.abs(v) >= 10) {
            valStr = fmtDens(v) + (meta.unit ? ' ' + meta.unit : '');
        } else {
            valStr = d3.format(",.2f")(v) + (meta.unit ? ' ' + meta.unit : '');
        }
        valueLine = `<span>${meta.name.toLowerCase()}</span><strong>${valStr}</strong>`;
    } else {
        const pop = state.viewLevel === "mun"
            ? getMuniValueAnim(ine, year)
            : valueForFeature(d, "pob", year, aggregateValuesForLevel(state.viewLevel, "pob", year));
        valueLine = `<span>habitantes</span><strong>${pop == null ? "—" : fmt(pop)}</strong>`;
    }

    tooltip.innerHTML = `
        <div class="tooltip-name">${groupNameForFeature(d)}</div>
        <div class="tooltip-meta">${groupMetaForFeature(d, year)}</div>
        <div class="tooltip-value">${valueLine}</div>
    `;
    tooltip.classList.add("visible");
    moveTooltip(ev);
}
function onMuniLeave() {
    state.hoveredIne = null;
    tooltip.classList.remove("visible");
}
function onMuniClick(ev, d) {
    const ine = d.properties.ine;
    const additive = ev.shiftKey || ev.ctrlKey || ev.metaKey;
    if (additive) {
        const idx = state.selectedInes.indexOf(ine);
        if (idx >= 0) state.selectedInes.splice(idx, 1);
        else state.selectedInes.push(ine);
    } else {
        state.selectedInes = (state.selectedInes.length === 1 && state.selectedInes[0] === ine) ? [] : [ine];
    }
    refreshSelectionStyles();
    renderSelectionSidebar();
}
function moveTooltip(ev) {
    const mapEl = $(".map-area").getBoundingClientRect();
    tooltip.style.left = (ev.clientX - mapEl.left) + "px";
    tooltip.style.top = (ev.clientY - mapEl.top) + "px";
}
function refreshSelectionStyles() {
    map.selectAll("path.municipio").classed("selected", false);
    state.selectedInes.forEach(ine => {
        map.select(`path.municipio[data-ine="${ine}"]`).classed("selected", true);
    });
}

// ───────── Selection sidebar ─────────
function renderSelectionSidebar() {
    const list = $("#selection-list");
    const help = $("#selection-help");
    const clearBtn = $("#clear-btn");
    const count = $("#selection-count");

    count.textContent = state.selectedInes.length;
    list.innerHTML = "";
    if (state.selectedInes.length === 0) {
        help.style.display = "block";
        clearBtn.style.display = "none";
        d3.select("#sel-chart").selectAll("*").remove();
        return;
    }
    help.style.display = "none";
    clearBtn.style.display = "inline-block";

    const year = currentYear();
    const inChoropleth = isPaintableIndicator(state.indicator);
    state.selectedInes.forEach((ine, i) => {
        const m = state.data.municipios[ine];
        if (!m) return;
        const v = inChoropleth ? indicatorValue(ine, state.indicator, year) : getMuniValueAnim(ine, year);
        const fmt = state.indicator === 'cambio'   ? d3.format("+,.1f")
                  : state.indicator === 'densidad' ? d3.format(",.1f")
                  : (Math.abs(v ?? 0) >= 1000 ? d3.format(",.0f") : d3.format(",.2f"));
        const suffix = state.indicator === 'cambio' ? '%' : '';
        const item = document.createElement("div");
        item.className = "selection-item";
        item.innerHTML = `
            <span class="selection-dot" style="background:${LINE_COLORS[i % LINE_COLORS.length]}"></span>
            <span class="selection-name" title="${m.name}">${m.name}</span>
            <span class="selection-value">${v == null ? "—" : fmt(v) + suffix}</span>
            <span class="selection-remove" data-ine="${ine}">×</span>
        `;
        list.appendChild(item);
    });
    list.querySelectorAll(".selection-remove").forEach(el => {
        el.addEventListener("click", (e) => {
            const ine = e.target.dataset.ine;
            state.selectedInes = state.selectedInes.filter(i => i !== ine);
            refreshSelectionStyles();
            renderSelectionSidebar();
        });
    });

    drawMultiChart();
}

function drawMultiChart() {
    const svg = d3.select("#sel-chart");
    svg.selectAll("*").remove();
    if (state.selectedInes.length === 0) return;

    const w = svg.node().clientWidth || 280;
    const h = 130;
    const margin = { top: 10, right: 10, bottom: 18, left: 42 };
    const iw = w - margin.left - margin.right;
    const ih = h - margin.top - margin.bottom;

    const layer = isPaintableIndicator(state.indicator) ? state.indicator : 'pob';
    const yrs = indicatorYears(layer) || state.data.years;
    const series = state.selectedInes.map((ine, i) => {
        const m = state.data.municipios[ine];
        if (!m) return null;
        const points = yrs.map((y) => {
            const v = indicatorValue(ine, layer, y);
            return { year: y, v };
        }).filter(d => d.v != null && Number.isFinite(d.v));
        return { ine, name: m.name, color: LINE_COLORS[i % LINE_COLORS.length], points };
    }).filter(Boolean);
    if (series.length === 0) return;

    const x = d3.scaleLinear().domain([YEAR_MIN, YEAR_MAX]).range([0, iw]);
    const allValues = series.flatMap(s => s.points.map(p => p.v));
    const yMin = layer === "cambio" ? Math.min(0, d3.min(allValues)) : 0;
    const yMax = d3.max(allValues) * 1.05;
    const y = d3.scaleLinear().domain([yMin, yMax]).range([ih, 0]);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    if (layer === "cambio") {
        g.append("line").attr("class", "axis-line")
            .attr("x1", 0).attr("x2", iw)
            .attr("y1", y(0)).attr("y2", y(0));
    } else {
        g.append("line").attr("class", "axis-line")
            .attr("x1", 0).attr("x2", iw).attr("y1", ih).attr("y2", ih);
    }
    const lineGen = d3.line().x(d => x(d.year)).y(d => y(d.v)).curve(d3.curveMonotoneX);
    series.forEach(s => {
        g.append("path").datum(s.points)
            .attr("class", "data-line").attr("stroke", s.color).attr("d", lineGen);
        g.selectAll(`circle.dot-${s.ine}`).data(s.points).enter().append("circle")
            .attr("class", "data-dot").attr("fill", s.color)
            .attr("cx", d => x(d.year)).attr("cy", d => y(d.v));
    });
    const cy = currentYear();
    g.append("line").attr("class", "year-marker")
        .attr("x1", x(cy)).attr("x2", x(cy)).attr("y1", 0).attr("y2", ih);
    [YEAR_MIN, 1950, 2000, YEAR_MAX].forEach(yr => {
        if (yr < YEAR_MIN || yr > YEAR_MAX) return;
        g.append("text").attr("class", "axis-label")
            .attr("x", x(yr)).attr("y", ih + 12).attr("text-anchor", "middle").text(yr);
    });
    const fmtY = layer === "cambio" ? d3.format("+,.0f") : d3.format(",.0f");
    const ySuffix = layer === "cambio" ? "%" : "";
    g.append("text").attr("class", "axis-label")
        .attr("x", -4).attr("y", y(yMax) + 3).attr("text-anchor", "end")
        .text(fmtY(yMax) + ySuffix);
    g.append("text").attr("class", "axis-label")
        .attr("x", -4).attr("y", y(yMin) + 3).attr("text-anchor", "end")
        .text(fmtY(yMin) + ySuffix);
}

// ───────── Categories & indicators ─────────
function buildCategoryTabs() {
    const wrap = $("#cat-tabs");
    if (!wrap) return;
    wrap.innerHTML = '';
    CATEGORY_DEF.forEach(c => {
        if (!CATEGORIES[c.id]) return; // skip categories with no indicators
        const btn = document.createElement('button');
        btn.className = 'cat-tab' + (c.id === state.category ? ' active' : '');
        btn.dataset.cat = c.id;
        btn.innerHTML = `<svg viewBox="0 0 24 24" class="cat-icon">${c.icon}</svg><span>${c.label}</span>`;
        btn.addEventListener('click', () => switchCategory(c.id));
        wrap.appendChild(btn);
    });
}

async function switchCategory(catId) {
    if (!CATEGORIES[catId]) return;
    state.category = catId;
    document.querySelectorAll('.cat-tab').forEach(c => c.classList.toggle('active', c.dataset.cat === catId));
    // Clear overlays from previous category
    state.activeOverlays.clear();
    map.select("g.layer-overlays").selectAll("*").remove();

    // Pick the default indicator for this category
    const def = CATEGORIES[catId].default;
    state.indicator = def || null;
    if (catId === "transporte") {
        state.activeOverlays = new Set(CATEGORIES[catId].autoOverlays || []);
        await renderActiveOverlays();
    }
    renderIndicatorList();
    paintMunicipios();
    renderSelectionSidebar();

    // Lazy-load any source file the new indicator depends on
    try {
        await ensureIndicatorLoaded(state.indicator);
    } catch (e) {
        console.warn("No se pudo cargar indicador", state.indicator, e);
        $("#legend").innerHTML = `<div style="font-size:11px;color:var(--ink-mute);font-style:italic">No se pudo cargar este indicador.</div>`;
        return;
    }

    // Sync timeline/year array to the new indicator's grid
    syncCensusToIndicator();
    setupTimeline();
    renderIndicatorList();
    paintMunicipios();
    renderSelectionSidebar();
}

async function ensureIndicatorLoaded(indId) {
    const src = indicatorSourceFile(indId);
    if (!src) return; // derived (population), already loaded
    if (state.sources[src]) return;
    setLoading(`Cargando ${src} (puede tardar)…`, null);
    $("#loading").classList.remove('hidden');
    try {
        await loadSource(src);
    } finally {
        setTimeout(() => $("#loading").classList.add('hidden'), 100);
    }
}

// Re-aim CENSUS / YEAR_MIN / YEAR_MAX at the active indicator's years.
function syncCensusToIndicator() {
    const yrs = indicatorYears(state.indicator);
    if (yrs && yrs.length > 0) {
        CENSUS = yrs;
        YEAR_MIN = yrs[0];
        YEAR_MAX = yrs[yrs.length - 1];
        // Clamp current yearIdx
        if (state.yearIdx >= CENSUS.length) state.yearIdx = CENSUS.length - 1;
        state.animFrameYear = null;
    } else {
        // Static indicator (no time): pin to first/last
        const yrsPob = state.data.years;
        CENSUS = yrsPob;
        YEAR_MIN = yrsPob[0];
        YEAR_MAX = yrsPob[yrsPob.length - 1];
        state.yearIdx = yrsPob.length - 1;
        state.animFrameYear = null;
    }
}

function renderIndicatorList() {
    const list = $("#indicator-list");
    list.innerHTML = "";
    const cat = CATEGORIES[state.category];
    if (!cat) {
        $("#indicator-name").textContent = '—';
        $("#indicator-desc").textContent = '';
        return;
    }
    if (cat.type === "placeholder") {
        $("#indicator-name").textContent = cat.label;
        $("#indicator-desc").textContent = "Próximamente. En desarrollo.";
        return;
    }

    const indList = cat.indicators;
    indList.forEach(ind => {
        const isOverlay = ind.kind === 'overlay';
        const isActive = isOverlay ? state.activeOverlays.has(ind.id) : state.indicator === ind.id;
        const row = document.createElement("div");
        row.className = "ind-row" + (isActive ? " active" : "");
        const widget = isOverlay ? `<span class="ind-checkbox"></span>` : `<span class="ind-radio"></span>`;
        row.innerHTML = `${widget}<span>${ind.name}</span>`;
        row.addEventListener("click", async () => {
            if (isOverlay) {
                if (state.activeOverlays.has(ind.id)) {
                    state.activeOverlays.delete(ind.id);
                    removeOverlay(ind.id);
                } else {
                    state.activeOverlays.add(ind.id);
                    await addOverlay(ind);
                }
                renderIndicatorList();
                renderOverlayLegend();
            } else {
                state.indicator = ind.id;
                $("#indicator-name").textContent = ind.name;
                $("#indicator-desc").textContent = ind.desc;
                renderIndicatorList();
                paintMunicipios();
                renderSelectionSidebar();
                try {
                    await ensureIndicatorLoaded(ind.id);
                } catch (e) {
                    console.warn("No se pudo cargar indicador", ind.id, e);
                    $("#legend").innerHTML = `<div style="font-size:11px;color:var(--ink-mute);font-style:italic">No se pudo cargar este indicador.</div>`;
                    return;
                }
                syncCensusToIndicator();
                setupTimeline();
                $("#indicator-name").textContent = ind.name;
                $("#indicator-desc").textContent = ind.desc;
                renderIndicatorList();
                paintMunicipios();
                renderSelectionSidebar();
            }
        });
        list.appendChild(row);
    });

    // Active indicator name/desc
    const cur = indList.find(i => i.kind !== 'overlay' && i.id === state.indicator);
    if (cur) {
        $("#indicator-name").textContent = cur.name;
        $("#indicator-desc").textContent = cur.desc;
    } else if (state.category === 'transporte' || indList.every(i => i.kind === 'overlay')) {
        $("#indicator-name").textContent = cat.label;
        $("#indicator-desc").textContent = "Activa una o varias capas para superponerlas al mapa base.";
    }
}

async function renderActiveOverlays() {
    const layer = map.select("g.layer-overlays");
    if (layer.empty()) return;
    layer.selectAll("*").remove();
    for (const id of state.activeOverlays) {
        const ind = OVERLAY_INDICATORS.find(o => o.id === id);
        if (ind) await addOverlay(ind);
    }
}

async function addOverlay(ind) {
    if (!state.overlays[ind.id]) {
        try {
            state.overlays[ind.id] = await loadJson(ind.file);
        } catch (e) {
            console.warn("No se pudo cargar overlay", ind.id, e);
            state.activeOverlays.delete(ind.id);
            return;
        }
    }
    const data = state.overlays[ind.id];
    const g = map.select("g.layer-overlays").append("g")
        .attr("class", `overlay-${ind.id}`);
    g.selectAll(`path.${ind.style}`)
        .data(data.features)
        .enter().append("path")
        .attr("class", ind.style)
        .attr("d", pathGen);
}
function removeOverlay(id) {
    map.select(`g.layer-overlays > g.overlay-${id}`).remove();
}

// ───────── Time slider ─────────
let _timelineHandlersBound = false;
function setupTimeline() {
    const ticks = $("#timeline-ticks");
    ticks.innerHTML = "";
    const tl = $("#timeline");
    // Etiquetas en años clave (cada ~25 años, ajustado al rango disponible)
    const labelYears = new Set();
    const span = YEAR_MAX - YEAR_MIN;
    const step = span > 200 ? 50 : span > 100 ? 25 : 10;
    for (let y = Math.ceil(YEAR_MIN / step) * step; y <= YEAR_MAX; y += step) labelYears.add(y);
    labelYears.add(YEAR_MIN);
    labelYears.add(YEAR_MAX);

    CENSUS.forEach((y) => {
        const pct = ((y - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;
        const tick = document.createElement("div");
        tick.className = "timeline-tick";
        tick.style.left = pct + "%";
        ticks.appendChild(tick);
        if (labelYears.has(y)) {
            const lbl = document.createElement("div");
            lbl.className = "timeline-tick-label";
            lbl.style.left = pct + "%";
            lbl.textContent = y;
            ticks.appendChild(lbl);
        }
    });
    updateTimelineHandle();
    if (_timelineHandlersBound) return;  // attach drag handlers only once
    _timelineHandlersBound = true;
    let dragging = false;
    tl.addEventListener("mousedown", (e) => { dragging = true; onTimelineClick(e); });
    window.addEventListener("mouseup", () => dragging = false);
    window.addEventListener("mousemove", e => { if (dragging) onTimelineClick(e); });
}

function onTimelineClick(ev) {
    const tl = $("#timeline").getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (ev.clientX - tl.left) / tl.width));
    const year = YEAR_MIN + t * (YEAR_MAX - YEAR_MIN);
    let bestI = 0, bestD = Infinity;
    CENSUS.forEach((y, i) => { if (Math.abs(y - year) < bestD) { bestD = Math.abs(y - year); bestI = i; } });
    state.yearIdx = bestI;
    state.animFrameYear = null;
    stopPlay();
    paintMunicipios();
    renderSelectionSidebar();
    updateTimelineHandle();
}
function updateTimelineHandle() {
    let pct;
    if (state.animFrameYear != null) pct = (state.animFrameYear - YEAR_MIN) / (YEAR_MAX - YEAR_MIN);
    else pct = (CENSUS[state.yearIdx] - YEAR_MIN) / (YEAR_MAX - YEAR_MIN);
    $("#timeline-handle").style.left = (pct * 100) + "%";
    $("#timeline-fill").style.width = (pct * 100) + "%";
}

// ───────── Play / pause ─────────
function startPlay() {
    state.playing = true;
    $("#play-btn").innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor"/></svg>';
    let startY = state.animFrameYear ?? CENSUS[state.yearIdx];
    if (startY >= YEAR_MAX) startY = YEAR_MIN;
    state.animFrameYear = startY;
    state.playTimer = setInterval(() => {
        let y = state.animFrameYear + 1;
        if (y > YEAR_MAX) { stopPlay(); state.animFrameYear = null; return; }
        state.animFrameYear = y;
        for (let i = CENSUS.length - 1; i >= 0; i--) {
            if (CENSUS[i] <= y) { state.yearIdx = i; break; }
        }
        paintMunicipios();
        renderSelectionSidebar();
        updateTimelineHandle();
    }, 80);
}
function stopPlay() {
    state.playing = false;
    if (state.playTimer) { clearInterval(state.playTimer); state.playTimer = null; }
    $("#play-btn").innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
}

// ───────── Map level (mun/prov) ─────────
function applyViewLevelClass() {
    map
        .classed("view-mun", state.viewLevel === "mun")
        .classed("view-prov", state.viewLevel === "prov")
        .classed("view-ccaa", state.viewLevel === "ccaa");
}

function setViewLevel(level) {
    if (!["mun", "prov", "ccaa"].includes(level)) return;
    state.viewLevel = level;
    ["mun", "prov", "ccaa"].forEach(id => {
        const btn = $(`#btn-${id}`);
        if (btn) btn.classList.toggle("active", id === level);
    });
    applyViewLevelClass();
    paintMunicipios();
    renderSelectionSidebar();
}

function clampSidebarWidth(value) {
    const max = Math.max(260, Math.min(560, window.innerWidth - 420));
    return Math.round(Math.max(240, Math.min(max, value)));
}

function setSidebarWidth(width, persist = false) {
    const next = clampSidebarWidth(width);
    document.documentElement.style.setProperty("--sidebar-w", `${next}px`);
    if (persist) localStorage.setItem("atlasSidebarWidth", String(next));
}

function setupSidebarResize() {
    const handle = $("#sidebar-resizer");
    if (!handle) return;
    const saved = Number(localStorage.getItem("atlasSidebarWidth"));
    if (Number.isFinite(saved) && saved > 0) setSidebarWidth(saved);

    let dragging = false;
    const stopDragging = () => {
        if (!dragging) return;
        dragging = false;
        document.body.classList.remove("resizing-sidebar");
        const current = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sidebar-w"));
        if (Number.isFinite(current)) setSidebarWidth(current, true);
        if (state.municipios) renderMapProgressive();
    };

    handle.addEventListener("pointerdown", (e) => {
        dragging = true;
        handle.setPointerCapture?.(e.pointerId);
        document.body.classList.add("resizing-sidebar");
        e.preventDefault();
    });
    window.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        setSidebarWidth(e.clientX);
    });
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
}

function setupNavTabs() {
    const setMainTab = (tab) => {
        document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
        document.body.classList.toggle("show-about", tab === "about");
        if (tab === "map" && state.municipios) {
            setTimeout(() => renderMapProgressive(), 60);
        }
    };

    document.querySelectorAll("[data-tab]").forEach(btn => {
        btn.addEventListener("click", () => {
            setMainTab(btn.dataset.tab);
        });
    });
}

// ───────── Init ─────────
async function init() {
    setupNavTabs();
    setupSidebarResize();
    await loadData();
    syncCensusToIndicator();
    await renderMapProgressive();
    setupTimeline();
    buildCategoryTabs();
    renderIndicatorList();
    paintMunicipios();
    renderSelectionSidebar();

    $("#play-btn").addEventListener("click", () => state.playing ? stopPlay() : startPlay());
    $("#btn-mun").addEventListener("click", () => setViewLevel("mun"));
    $("#btn-prov").addEventListener("click", () => setViewLevel("prov"));
    $("#btn-ccaa").addEventListener("click", () => setViewLevel("ccaa"));
    $("#clear-btn").addEventListener("click", () => {
        state.selectedInes = [];
        refreshSelectionStyles();
        renderSelectionSidebar();
    });
    $(".map-area").addEventListener("mousemove", e => {
        if (tooltip.classList.contains("visible")) moveTooltip(e);
    });
    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => renderMapProgressive(), 200);
    });
}

init().catch(e => {
    console.error(e);
    setLoading("Error cargando datos: " + e.message, 1);
});
