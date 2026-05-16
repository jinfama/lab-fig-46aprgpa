// Data loader with in-memory cache + indexed views.
// Loads manifest first, then datasets on demand.

const CACHE = {};
let _manifest = null;

async function _fetchJson(url) {
  if (CACHE[url]) return CACHE[url];
  const res = await fetch(url);
  if (!res.ok) throw new Error(`[DataLoader] ${url} → ${res.status}`);
  const data = await res.json();
  CACHE[url] = data;
  return data;
}

// Built lazily from regions_categories: { iso3 → { year → { categoryLabor → row } } }
let _countryCategoryIdx = null;

export const DataLoader = {
  async loadManifest() {
    if (_manifest) return _manifest;
    try {
      _manifest = await _fetchJson('data/manifest.json');
    } catch (_) {
      _manifest = await _fetchJson('data/manifest_provisional.json');
    }
    return _manifest;
  },
  getManifest() { return _manifest; },

  async loadWorldTopo()         { return _fetchJson('data/world-110m.json'); },
  async loadRegions()           { return _fetchJson('data/regions.json'); },
  async loadRegionsLabor()      { return _fetchJson('data/regions_labor.json'); },
  async loadRegionsCategories() { return _fetchJson('data/regions_categories.json'); },
  async loadCategoriesIndex()   { return _fetchJson('data/categories_index.json'); },
  async loadCountryCategories(iso3) { return _fetchJson(`data/categories/${iso3}.json`); },
  async loadCountryItems(iso3)      { return _fetchJson(`data/items/${iso3}.json`); },
  async loadCountryFootprints(iso3) { return _fetchJson(`data/footprints/${iso3}.json`); },
  async loadConditions()        { return _fetchJson('data/conditions.json'); },
  async loadForcedLaborRisk()   { return _fetchJson('data/forced_labor_risk.json'); },
  async loadCountryYearIndicators() { return _fetchJson('data/country_year_indicators.json'); },
  async loadIsoMapping()        { return _fetchJson('data/iso_m49.json'); },
};
