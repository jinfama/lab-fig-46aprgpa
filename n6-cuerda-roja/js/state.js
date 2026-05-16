// Centralized pub/sub state.

const _state = {
  language:           'es',
  activeView:         'map',          // map | trend | ranking | treemap | table | about
  activeCategory:     'labour',
  activeIndicator:    'workers',
  selectedCountries: [],              // array of ISO3 codes
  currentYear:        2020,
  yearRange:         [1961, 2021],
  geoLevel:           'country',
  rightPanelVisible:  true,
  playing:            false,
  speed:              2,
  // Subset of crop categories applied as a filter (null = all).
  cropCategoryFilter: null,
  perCapita:          false,
};

const _subs = {};

export const State = {
  get(key) { return _state[key]; },
  getAll() { return { ..._state }; },

  set(key, value) {
    _state[key] = value;
    (_subs[key] || []).forEach(fn => fn(value));
    (_subs['*'] || []).forEach(fn => fn(key, value));
  },

  setMany(obj) {
    const keys = Object.keys(obj);
    keys.forEach(k => { _state[k] = obj[k]; });
    keys.forEach(k => (_subs[k] || []).forEach(fn => fn(_state[k])));
    (_subs['*'] || []).forEach(fn => fn(keys, obj));
  },

  subscribe(key, fn) {
    if (!_subs[key]) _subs[key] = [];
    _subs[key].push(fn);
    return () => { _subs[key] = _subs[key].filter(f => f !== fn); };
  },

  toggleCountry(iso3) {
    const cur = _state.selectedCountries;
    const next = cur.includes(iso3) ? cur.filter(c => c !== iso3) : [...cur, iso3];
    this.set('selectedCountries', next);
  },

  clearCountries() { this.set('selectedCountries', []); },
};
