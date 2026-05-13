// ============================================================================
// REGRESSION - Linear regression and structural break detection
// ============================================================================

export function linearRegression(data) {
    const n = data.length;
    if (n < 2) return null;

    const sumX = data.reduce((s, d) => s + d.y, 0);
    const sumY = data.reduce((s, d) => s + d.pc, 0);
    const sumXY = data.reduce((s, d) => s + d.y * d.pc, 0);
    const sumX2 = data.reduce((s, d) => s + d.y * d.y, 0);

    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    const meanY = sumY / n;
    const ssTot = data.reduce((s, d) => s + (d.pc - meanY) ** 2, 0);
    const ssRes = data.reduce((s, d) => s + (d.pc - (slope * d.y + intercept)) ** 2, 0);
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return { slope, intercept, r2, n };
}

export function segmentedRegression(data, maxBreaks = 1) {
    if (data.length < 6 || maxBreaks < 1) {
        const reg = linearRegression(data);
        return reg ? [{ ...reg, startYear: data[0].y, endYear: data[data.length - 1].y }] : [];
    }

    // Try every possible breakpoint
    const baseReg = linearRegression(data);
    const baseR2 = baseReg ? baseReg.r2 : 0;

    let bestBreak = null;
    let bestCombinedR2 = baseR2;

    const minSegment = 10;
    for (let i = minSegment; i < data.length - minSegment; i++) {
        const left = data.slice(0, i);
        const right = data.slice(i);

        const regL = linearRegression(left);
        const regR = linearRegression(right);

        if (!regL || !regR) continue;

        // Weighted R2
        const combinedR2 = (regL.r2 * left.length + regR.r2 * right.length) / data.length;

        if (combinedR2 > bestCombinedR2 + 0.01) {
            bestCombinedR2 = combinedR2;
            bestBreak = i;
        }
    }

    if (bestBreak === null) {
        return [{ ...baseReg, startYear: data[0].y, endYear: data[data.length - 1].y }];
    }

    const left = data.slice(0, bestBreak);
    const right = data.slice(bestBreak);
    const regL = linearRegression(left);
    const regR = linearRegression(right);

    return [
        { ...regL, startYear: left[0].y, endYear: left[left.length - 1].y },
        { ...regR, startYear: right[0].y, endYear: right[right.length - 1].y }
    ];
}

export function computePeriodStats(data, periodLength) {
    const periods = [];
    if (!data || data.length === 0) return periods;

    const startYear = data[0].y;
    const endYear = data[data.length - 1].y;

    let y = startYear;
    while (y < endYear) {
        const end = Math.min(y + periodLength, endYear);
        const startEntry = data.find(d => d.y === y);
        const endEntry = data.find(d => d.y === end);

        if (startEntry && endEntry && startEntry.pc > 0 && endEntry.pc > 0) {
            const years = end - y;
            const cagr = Math.pow(endEntry.pc / startEntry.pc, 1 / years) - 1;
            const absoluteChange = endEntry.pc - startEntry.pc;
            const percentChange = (endEntry.pc - startEntry.pc) / startEntry.pc;

            const periodData = data.filter(d => d.y >= y && d.y <= end);
            const reg = linearRegression(periodData);

            periods.push({
                start: y,
                end,
                years,
                startValue: startEntry.pc,
                endValue: endEntry.pc,
                cagr,
                absoluteChange,
                percentChange,
                r2: reg ? reg.r2 : null
            });
        }
        y = end;
    }

    return periods;
}
