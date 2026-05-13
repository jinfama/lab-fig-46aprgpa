// ============================================================================
// STATE MANAGEMENT - Centralized pub/sub state for cross-section communication
// ============================================================================

const State = (() => {
    const _state = {
        activeSection: 'globe',
        selectedCountries: [],
        selectedRegions: [],
        benchmarkEntity: { type: 'world', iso3: null, label: 'World average' },
        currentYear: 2024,
        yearRange: [1750, 2024],
        isPlaying: false,
        playSpeed: 200,
        indicatorMode: 'absolute',
        chartType: 'evolution',
        movingAverage: 0,
        showRegression: false,
        showPeriods: false,
        periodLength: 25,
        statisticsMode: 'trends',
        isFullscreen: false
    };

    const _subscribers = {};

    function _notify(key) {
        if (_subscribers[key]) {
            _subscribers[key].forEach(cb => {
                try { cb(_state[key], key); } catch (e) { console.error('State subscriber error:', e); }
            });
        }
        if (_subscribers['*']) {
            _subscribers['*'].forEach(cb => {
                try { cb(_state[key], key); } catch (e) { console.error('State subscriber error:', e); }
            });
        }
    }

    return {
        get(key) {
            return _state[key];
        },

        set(key, value) {
            if (JSON.stringify(_state[key]) === JSON.stringify(value)) return;
            _state[key] = value;
            _notify(key);
        },

        subscribe(key, callback) {
            if (!_subscribers[key]) _subscribers[key] = [];
            _subscribers[key].push(callback);
            return () => {
                _subscribers[key] = _subscribers[key].filter(cb => cb !== callback);
            };
        },

        addCountry(iso3) {
            const current = [..._state.selectedCountries];
            if (!current.includes(iso3)) {
                current.push(iso3);
                _state.selectedCountries = current;
                _notify('selectedCountries');
            }
        },

        removeCountry(iso3) {
            const current = _state.selectedCountries.filter(c => c !== iso3);
            if (current.length !== _state.selectedCountries.length) {
                _state.selectedCountries = current;
                _notify('selectedCountries');
            }
        },

        toggleCountry(iso3) {
            if (_state.selectedCountries.includes(iso3)) {
                this.removeCountry(iso3);
            } else {
                this.addCountry(iso3);
            }
        },

        clearCountries() {
            if (_state.selectedCountries.length > 0) {
                _state.selectedCountries = [];
                _notify('selectedCountries');
            }
        },

        getSnapshot() {
            return JSON.parse(JSON.stringify(_state));
        }
    };
})();

export default State;
