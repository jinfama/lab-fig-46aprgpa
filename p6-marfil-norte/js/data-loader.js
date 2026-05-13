// ============================================================================
// DATA LOADER - Fetches JSON files and builds lookup structures
// ============================================================================

import { NUMERIC_TO_ISO3 } from './utils.js';

const DataLoader = (() => {
    let countryData = {};    // countryData['GBR'] → [{y, pc, tot, r}, ...]
    let regionData = {};     // regionData['region_maddison']['Western Europe'] → [{y, pc, tot}, ...]
    let metadata = {};       // metadata['GBR'] → {name, region_maddison, region_minerva, region_un_sub}
    let metadataList = [];   // flat array of all metadata entries
    let worldData = [];      // [{y, pc, tot}, ...]
    let rankings = {};       // rankings[1900] → [{iso3, pc, rank}, ...]
    let geoFeatures = [];    // GeoJSON features with iso3 merged
    let UK_1900_GDPPC = 0;
    let allYears = [];
    let regionLists = {};    // regionLists['region_maddison'] → ['Western Europe', ...]
    let _ready = false;
    let _readyCallbacks = [];

    async function init() {
        try {
            const [countriesRaw, regionsRaw, metaRaw, topoRaw] = await Promise.all([
                fetch('data/maddison_countries.json').then(r => r.json()),
                fetch('data/maddison_regions.json').then(r => r.json()),
                fetch('data/maddison_metadata.json').then(r => r.json()),
                fetch('data/countries-110m.json').then(r => r.json())
            ]);

            // Build country lookup
            countriesRaw.forEach(c => {
                countryData[c.iso3] = c.data;
            });

            // Build region lookup
            regionsRaw.forEach(r => {
                if (!regionData[r.level]) regionData[r.level] = {};
                regionData[r.level][r.area] = r.data;
            });

            // Extract world data
            if (regionData['world'] && regionData['world']['World']) {
                worldData = regionData['world']['World'];
            }

            // Build metadata lookup
            metadataList = metaRaw;
            metaRaw.forEach(m => {
                metadata[m.iso3] = m;
            });

            // Build region lists for selectors
            const regionTypes = ['region_maddison', 'region_minerva', 'region_un_sub'];
            regionTypes.forEach(rt => {
                const values = new Set();
                metaRaw.forEach(m => {
                    if (m[rt]) values.add(m[rt]);
                });
                regionLists[rt] = [...values].sort();
            });

            // UK 1900 benchmark
            if (countryData['GBR']) {
                const uk1900 = countryData['GBR'].find(d => d.y === 1900);
                UK_1900_GDPPC = uk1900 ? uk1900.pc : 0;
            }

            // All years
            if (worldData.length > 0) {
                allYears = worldData.map(d => d.y);
            }

            // Pre-compute rankings for every year
            const countryIsos = Object.keys(countryData);
            allYears.forEach(year => {
                const entries = [];
                countryIsos.forEach(iso3 => {
                    const entry = countryData[iso3].find(d => d.y === year);
                    if (entry && entry.pc != null) {
                        entries.push({ iso3, pc: entry.pc });
                    }
                });
                entries.sort((a, b) => b.pc - a.pc);
                entries.forEach((e, i) => e.rank = i + 1);
                rankings[year] = entries;
            });

            // Convert TopoJSON to GeoJSON and merge ISO3
            const countries = topojson.feature(topoRaw, topoRaw.objects.countries);
            geoFeatures = countries.features.map(f => {
                const numId = parseInt(f.id || f.properties?.id);
                const iso3 = NUMERIC_TO_ISO3[numId];
                f.properties = f.properties || {};
                f.properties.iso3 = iso3;
                if (iso3 && metadata[iso3]) {
                    f.properties.name = metadata[iso3].name;
                }
                return f;
            }).filter(f => f.properties.iso3);

            _ready = true;
            _readyCallbacks.forEach(cb => cb());
            _readyCallbacks = [];

            console.log(`Data loaded: ${countryIsos.length} countries, ${allYears.length} years, ${geoFeatures.length} geo features`);

        } catch (err) {
            console.error('Failed to load data:', err);
            throw err;
        }
    }

    function onReady(cb) {
        if (_ready) { cb(); return; }
        _readyCallbacks.push(cb);
    }

    function getCountryData(iso3) {
        return countryData[iso3] || null;
    }

    function getCountryValue(iso3, year) {
        const data = countryData[iso3];
        if (!data) return null;
        return data.find(d => d.y === year) || null;
    }

    function getWorldValue(year) {
        return worldData.find(d => d.y === year) || null;
    }

    function getRegionData(level, area) {
        return regionData[level]?.[area] || null;
    }

    function getEntityData(entityId) {
        // entityId can be: iso3, "world:World", "region_maddison:Western Europe", etc.
        if (entityId === 'WLD' || entityId === 'world') return worldData;
        if (countryData[entityId]) return countryData[entityId];
        const parts = entityId.split(':');
        if (parts.length === 2) return getRegionData(parts[0], parts[1]);
        return null;
    }

    function getEntityName(entityId) {
        if (entityId === 'WLD' || entityId === 'world') return 'World';
        if (metadata[entityId]) return metadata[entityId].name;
        const parts = entityId.split(':');
        if (parts.length === 2) return parts[1];
        return entityId;
    }

    function getRanking(year) {
        return rankings[year] || [];
    }

    function getCountryRank(iso3, year) {
        const r = rankings[year];
        if (!r) return null;
        const entry = r.find(e => e.iso3 === iso3);
        return entry ? entry.rank : null;
    }

    function getTotalCountries(year) {
        return rankings[year] ? rankings[year].length : 199;
    }

    function getMetadata(iso3) {
        return metadata[iso3] || null;
    }

    function getAllMetadata() {
        return metadataList;
    }

    function getRegionLists() {
        return regionLists;
    }

    function getRegionCountries(regionType, regionName) {
        return metadataList.filter(m => m[regionType] === regionName).map(m => m.iso3);
    }

    function getGeoFeatures() {
        return geoFeatures;
    }

    function getWorldData() {
        return worldData;
    }

    function getAllYears() {
        return allYears;
    }

    function getUK1900() {
        return UK_1900_GDPPC;
    }

    function isReady() {
        return _ready;
    }

    function searchCountries(query) {
        if (!query || query.length < 1) return [];
        const q = query.toLowerCase();
        return metadataList
            .filter(m =>
                m.name.toLowerCase().includes(q) ||
                m.iso3.toLowerCase().includes(q)
            )
            .slice(0, 10);
    }

    return {
        init, onReady, isReady,
        getCountryData, getCountryValue, getWorldValue,
        getRegionData, getEntityData, getEntityName,
        getRanking, getCountryRank, getTotalCountries,
        getMetadata, getAllMetadata, getRegionLists, getRegionCountries,
        getGeoFeatures, getWorldData, getAllYears, getUK1900,
        searchCountries
    };
})();

export default DataLoader;
