// ============================================================================
// CONVERGENCE - Sigma/beta convergence and pairwise ratio analysis
// ============================================================================

import DataLoader from '../data-loader.js';

export function sigmaConvergence(countryIso3s, yearRange) {
    const [startYear, endYear] = yearRange;
    const result = [];

    for (let y = startYear; y <= endYear; y++) {
        const values = [];
        countryIso3s.forEach(iso3 => {
            const val = DataLoader.getCountryValue(iso3, y);
            if (val && val.pc > 0) {
                values.push(Math.log(val.pc));
            }
        });

        if (values.length >= 2) {
            const mean = values.reduce((s, v) => s + v, 0) / values.length;
            const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
            const sd = Math.sqrt(variance);
            result.push({ y, cv: sd, n: values.length });
        }
    }

    return result;
}

export function betaConvergence(countryIso3s, startYear, endYear) {
    const result = [];
    const years = endYear - startYear;

    countryIso3s.forEach(iso3 => {
        const startVal = DataLoader.getCountryValue(iso3, startYear);
        const endVal = DataLoader.getCountryValue(iso3, endYear);

        if (startVal && endVal && startVal.pc > 0 && endVal.pc > 0) {
            const logInitial = Math.log(startVal.pc);
            const growthRate = Math.pow(endVal.pc / startVal.pc, 1 / years) - 1;
            const meta = DataLoader.getMetadata(iso3);

            result.push({
                iso3,
                name: meta ? meta.name : iso3,
                logInitialGDP: logInitial,
                initialGDP: startVal.pc,
                finalGDP: endVal.pc,
                growthRate,
                region: meta ? meta.region_maddison : null
            });
        }
    });

    return result;
}

export function pairwiseRatio(entity1Data, entity2Data, yearRange) {
    const [startYear, endYear] = yearRange;
    const result = [];

    for (let y = startYear; y <= endYear; y++) {
        const v1 = entity1Data.find(d => d.y === y);
        const v2 = entity2Data.find(d => d.y === y);

        if (v1 && v2 && v1.pc > 0 && v2.pc > 0) {
            result.push({
                y,
                ratio: v1.pc / v2.pc,
                v1: v1.pc,
                v2: v2.pc
            });
        }
    }

    return result;
}
