// Catalogue of categories x indicators.
// Each indicator declares the data field to read, label, unit, and which
// dataset partition supplies it.

export const CATEGORIES = [
  {
    id: 'labour',
    label: { es: 'Trabajo agrario', en: 'Agricultural labour' },
    icon: 'workers',
    indicators: [
      { id: 'workers',          field: 'workers',          label: { es: 'Trabajadores',           en: 'Workers' },             unit: 'personas', source: 'regions' },
      { id: 'hours_total',      field: 'hours_total',      label: { es: 'Horas totales',          en: 'Total hours' },         unit: 'h/año',    source: 'regions' },
      { id: 'hours_per_worker', field: 'hours_per_worker', label: { es: 'Horas por trabajador',   en: 'Hours per worker' },    unit: 'h',        source: 'regions', cropFilter: false },
      { id: 'area_harvested',   field: 'area_harvested',   label: { es: 'Superficie cosechada',   en: 'Area harvested' },      unit: 'ha',       source: 'regions' },
      { id: 'livestock_units',  field: 'livestock_units',  label: { es: 'Unidades de ganado',     en: 'Livestock units' },     unit: 'UG',       source: 'regions' },
      { id: 'production_tonnes',field: 'production_tonnes',label: { es: 'Producción (toneladas)', en: 'Production (tonnes)' }, unit: 't',        source: 'regions' },
    ],
  },
  {
    id: 'productivity',
    label: { es: 'Productividad', en: 'Productivity' },
    icon: 'efficiency',
    indicators: [
      { id: 'h_per_functional_unit', field: 'h_per_tonne', label: { es: 'Productividad física', en: 'Physical productivity' }, unit: 'UF/h', source: 'regions', functionalUnit: true },
      { id: 'va_per_worker', field: 'va_per_worker', label: { es: 'Valor añadido / trabajador', en: 'Value added / worker' }, unit: 'USD/trab.', source: 'regions', cropFilter: false },
    ],
  },
  {
    id: 'conditions',
    label: { es: 'Condiciones laborales', en: 'Labour conditions' },
    icon: 'scale',
    indicators: [
      { id: 'monthly_wage',        field: 'monthly_wage',        label: { es: 'Salario mensual',            en: 'Monthly wage' },          unit: 'USD-PPP', source: 'regions', cropFilter: false },
      { id: 'va_per_worker',       field: 'va_per_worker',       label: { es: 'Valor añadido / trabajador', en: 'Value added / worker' },  unit: 'USD',     source: 'regions', cropFilter: false },
      { id: 'pct_child_labor',     field: 'pct_child_labor',     label: { es: '% trabajo infantil',         en: '% child labour' },        unit: '%',       source: 'regions', cropFilter: false, warn: true },
      { id: 'hours_child_labor',   field: 'hours_child_labor',   label: { es: 'Horas de trabajo infantil',  en: 'Child labour hours' },    unit: 'h/año',   source: 'regions', cropFilter: false, conditionHours: true, rateField: 'pct_child_labor', warn: true },
      { id: 'pct_forced_labor',    field: 'pct_forced_labor',    label: { es: '% trabajo forzoso',          en: '% forced labour' },       unit: '%',       source: 'regions', cropFilter: false, warn: true },
      { id: 'hours_forced_labor',  field: 'hours_forced_labor',  label: { es: 'Horas de trabajo forzoso',   en: 'Forced labour hours' },   unit: 'h/año',   source: 'regions', cropFilter: false, conditionHours: true, rateField: 'pct_forced_labor', warn: true },
      { id: 'pct_extreme_poverty', field: 'pct_extreme_poverty', label: { es: '% en pobreza extrema',       en: '% extreme poverty' },     unit: '%',       source: 'regions', cropFilter: false, warn: true },
      { id: 'hours_extreme_poverty', field: 'hours_extreme_poverty', label: { es: 'Horas en pobreza extrema', en: 'Extreme-poverty hours' }, unit: 'h/año',   source: 'regions', cropFilter: false, conditionHours: true, rateField: 'pct_extreme_poverty', warn: true },
      { id: 'pct_not_covered',     field: 'pct_not_covered',     label: { es: '% sin protección social',    en: '% without social cover' },unit: '%',       source: 'regions', cropFilter: false, warn: true },
      { id: 'hours_not_covered',   field: 'hours_not_covered',   label: { es: 'Horas sin protección social', en: 'Hours without social cover' }, unit: 'h/año', source: 'regions', cropFilter: false, conditionHours: true, rateField: 'pct_not_covered', warn: true },
    ],
  },
  {
    id: 'footprints',
    label: { es: 'Huellas laborales', en: 'Labour footprints' },
    icon: 'footprint',
    indicators: [
      { id: 'fp_hours_total',  field: 'footprint',          label: { es: 'Horas anuales',            en: 'Annual hours' },           unit: 'h/año', source: 'trade_footprint', footprintFlow: true },
      { id: 'fp_hours_child',  field: 'hours_child_labor',  label: { es: 'Trabajo infantil embebido',en: 'Embedded child labour' },  unit: 'h/año', source: 'footprints', warn: true },
      { id: 'fp_hours_forced', field: 'hours_forced_labor', label: { es: 'Trabajo forzoso embebido', en: 'Embedded forced labour' }, unit: 'h/año', source: 'footprints', warn: true },
    ],
  },
  {
    id: 'trade',
    label: { es: 'Comercio bilateral', en: 'Bilateral trade' },
    icon: 'flow',
    indicators: [
      { id: 'bilateral_trade', field: 'tonnes', label: { es: 'Flujos comerciales', en: 'Trade flows' }, unit: 't', source: 'bilateral_trade', cropFilter: false },
    ],
  },
  {
    id: 'country_profile',
    label: { es: 'País', en: 'Country' },
    icon: 'country',
    indicators: [
      { id: 'country_profile', field: 'profile', label: { es: 'Panel país', en: 'Country panel' }, unit: '', source: 'profile', cropFilter: false },
    ],
  },
];

// Quick lookup helpers.
export function getCategory(id) { return CATEGORIES.find(c => c.id === id); }
export function getIndicator(catId, indId) {
  const c = getCategory(catId);
  return c ? c.indicators.find(i => i.id === indId) : null;
}

// SVG icon paths — one per category, used in the sidebar.
export const ICON_PATHS = {
  workers:    'M9 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 13a4 4 0 0 1 8 0v3H3v-3Zm10 0a4 4 0 0 1 8 0v3h-8v-3Z',
  efficiency: 'M3 17l5-6 3 3 7-9M14 5h6v6',
  scale:      'M12 3v15M5 7h14M6 7l-3 5h6l-3-5Zm12 0l-3 5h6l-3-5ZM7 19h10',
  footprint:  'M9 16c0 1 1 2 2 2s2-1 2-2-1-3-2-3-2 2-2 3Zm-4-7c0 1 .5 2 1.5 2S8 10 8 9 7.5 7 6.5 7 5 8 5 9Zm5-4c0 1 1 2 2 2s2-1 2-2-1-2-2-2-2 1-2 2Zm6 2c0 1 .5 2 1.5 2S19 8 19 7s-.5-2-1.5-2S16 6 16 7Z',
  flow:       'M3 6h12l-3-3M3 6l3 3M21 14h-12l3 3M21 14l-3-3M3 18h7M21 6h-5',
  country:    'M12 21s7-5.2 7-12A7 7 0 1 0 5 9c0 6.8 7 12 7 12Zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
};

