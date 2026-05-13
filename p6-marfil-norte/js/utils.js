// ============================================================================
// UTILITIES - Formatters, color scales, calculations, constants
// ============================================================================

export const COLORS = {
    primary: '#1e6091',
    accent: '#e63946',
    dark: '#212529',
    gray: '#495057',
    lightGray: '#adb5bd',
    border: '#e0e0e0',
    bg: '#ffffff',
    bgLight: '#f8f9fa',
    success: '#28a745',
    warning: '#fd7e14'
};

export const COMPARISON_PALETTE = [
    '#1e6091', '#e63946', '#2a9d8f', '#e9c46a', '#264653',
    '#f4a261', '#6a4c93', '#1982c4', '#8ac926', '#ff595e'
];

// Number formatting
export function formatGDP(value) {
    if (value == null || isNaN(value)) return '—';
    if (value >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M';
    if (value >= 1e3) return '$' + d3.format(',')(Math.round(value));
    return '$' + Math.round(value);
}

export function formatGDPCompact(value) {
    if (value == null || isNaN(value)) return '—';
    if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
    if (value >= 1e4) return (value / 1e3).toFixed(1) + 'K';
    return d3.format(',')(Math.round(value));
}

export function formatGDPTotal(valueMil) {
    if (valueMil == null || isNaN(valueMil)) return '—';
    if (valueMil >= 1e6) return '$' + (valueMil / 1e6).toFixed(1) + 'T';
    if (valueMil >= 1e3) return '$' + (valueMil / 1e3).toFixed(1) + 'B';
    return '$' + Math.round(valueMil) + 'M';
}

export function formatRatio(value) {
    if (value == null || isNaN(value)) return '—';
    return value.toFixed(2) + 'x';
}

export function formatPercent(value) {
    if (value == null || isNaN(value)) return '—';
    const sign = value >= 0 ? '+' : '';
    return sign + (value * 100).toFixed(1) + '%';
}

export function formatYear(year) {
    return String(year);
}

export function formatRank(rank, total) {
    return `${rank}/${total}`;
}

// Color scales
export function getAbsoluteColorScale(min, max) {
    return d3.scaleSequential()
        .domain([min, max])
        .interpolator(d3.interpolateBlues);
}

export function getDivergingColorScale(center) {
    const maxDeviation = 5;
    return d3.scaleDiverging()
        .domain([1 / maxDeviation, 1, maxDeviation])
        .interpolator(d3.interpolateRdBu);
}

export function getReliabilityStyle(r) {
    switch (r) {
        case 'h': return { dash: 'none', opacity: 1 };
        case 'm': return { dash: '6,3', opacity: 0.85 };
        case 'l': return { dash: '3,3', opacity: 0.7 };
        default: return { dash: 'none', opacity: 1 };
    }
}

// Calculations
export function calcCAGR(startVal, endVal, years) {
    if (!startVal || !endVal || years <= 0) return null;
    return Math.pow(endVal / startVal, 1 / years) - 1;
}

export function calcMovingAverage(data, window) {
    if (!window || window <= 1) return data;
    const half = Math.floor(window / 2);
    return data.map((d, i) => {
        const start = Math.max(0, i - half);
        const end = Math.min(data.length - 1, i + half);
        const slice = data.slice(start, end + 1);
        const avg = d3.mean(slice, s => s.pc);
        return { ...d, pc: avg != null ? Math.round(avg) : d.pc };
    });
}

export function calcLinearRegression(data) {
    const n = data.length;
    if (n < 2) return null;
    const sumX = d3.sum(data, d => d.y);
    const sumY = d3.sum(data, d => d.pc);
    const sumXY = d3.sum(data, d => d.y * d.pc);
    const sumX2 = d3.sum(data, d => d.y * d.y);
    const sumY2 = d3.sum(data, d => d.pc * d.pc);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const ssRes = d3.sum(data, d => Math.pow(d.pc - (slope * d.y + intercept), 2));
    const ssTot = d3.sum(data, d => Math.pow(d.pc - sumY / n, 2));
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return { slope, intercept, r2 };
}

export function getColorForIndex(index) {
    return COMPARISON_PALETTE[index % COMPARISON_PALETTE.length];
}

// ISO 3166-1 numeric to ISO3 alpha mapping (for TopoJSON)
export const NUMERIC_TO_ISO3 = {
    4:'AFG',8:'ALB',12:'DZA',20:'AND',24:'AGO',28:'ATG',32:'ARG',51:'ARM',
    36:'AUS',40:'AUT',31:'AZE',44:'BHS',48:'BHR',50:'BGD',52:'BRB',112:'BLR',
    56:'BEL',84:'BLZ',204:'BEN',64:'BTN',68:'BOL',70:'BIH',72:'BWA',76:'BRA',
    96:'BRN',100:'BGR',854:'BFA',108:'BDI',132:'CPV',116:'KHM',120:'CMR',
    124:'CAN',140:'CAF',148:'TCD',152:'CHL',156:'CHN',170:'COL',174:'COM',
    178:'COG',180:'COD',188:'CRI',384:'CIV',191:'HRV',192:'CUB',196:'CYP',
    203:'CZE',208:'DNK',262:'DJI',212:'DMA',214:'DOM',218:'ECU',818:'EGY',
    222:'SLV',226:'GNQ',232:'ERI',233:'EST',748:'SWZ',231:'ETH',242:'FJI',
    246:'FIN',250:'FRA',266:'GAB',270:'GMB',268:'GEO',276:'DEU',288:'GHA',
    300:'GRC',308:'GRD',320:'GTM',324:'GIN',624:'GNB',328:'GUY',332:'HTI',
    340:'HND',348:'HUN',352:'ISL',356:'IND',360:'IDN',364:'IRN',368:'IRQ',
    372:'IRL',376:'ISR',380:'ITA',388:'JAM',392:'JPN',400:'JOR',398:'KAZ',
    404:'KEN',296:'KIR',408:'PRK',410:'KOR',414:'KWT',417:'KGZ',418:'LAO',
    428:'LVA',422:'LBN',426:'LSO',430:'LBR',434:'LBY',438:'LIE',440:'LTU',
    442:'LUX',450:'MDG',454:'MWI',458:'MYS',462:'MDV',466:'MLI',470:'MLT',
    584:'MHL',478:'MRT',480:'MUS',484:'MEX',583:'FSM',498:'MDA',492:'MCO',
    496:'MNG',499:'MNE',504:'MAR',508:'MOZ',104:'MMR',516:'NAM',520:'NRU',
    524:'NPL',528:'NLD',554:'NZL',558:'NIC',562:'NER',566:'NGA',807:'MKD',
    578:'NOR',512:'OMN',586:'PAK',585:'PLW',591:'PAN',598:'PNG',600:'PRY',
    604:'PER',608:'PHL',616:'POL',620:'PRT',634:'QAT',642:'ROU',643:'RUS',
    646:'RWA',659:'KNA',662:'LCA',670:'VCT',882:'WSM',674:'SMR',678:'STP',
    682:'SAU',686:'SEN',688:'SRB',690:'SYC',694:'SLE',702:'SGP',703:'SVK',
    705:'SVN',90:'SLB',706:'SOM',710:'ZAF',724:'ESP',144:'LKA',729:'SDN',
    740:'SUR',752:'SWE',756:'CHE',760:'SYR',762:'TJK',834:'TZA',764:'THA',
    626:'TLS',768:'TGO',776:'TON',780:'TTO',788:'TUN',792:'TUR',795:'TKM',
    798:'TUV',800:'UGA',804:'UKR',784:'ARE',826:'GBR',840:'USA',858:'URY',
    860:'UZB',548:'VUT',862:'VEN',704:'VNM',887:'YEM',894:'ZMB',716:'ZWE',
    275:'PSE',736:'SDN',728:'SSD',531:'CUW',534:'SXM',535:'BES',
    -99:'CYN',10:'ATA'
};
