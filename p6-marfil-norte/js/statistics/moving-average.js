// ============================================================================
// MOVING AVERAGE - Symmetric moving average calculations
// ============================================================================

export function computeMovingAverage(data, window) {
    if (!window || window <= 1 || !data || data.length === 0) return data;

    const half = Math.floor(window / 2);
    return data.map((d, i) => {
        const start = Math.max(0, i - half);
        const end = Math.min(data.length - 1, i + half);
        const slice = data.slice(start, end + 1).filter(s => s.pc != null);
        const avg = slice.length > 0
            ? slice.reduce((sum, s) => sum + s.pc, 0) / slice.length
            : null;
        return { ...d, pc: avg != null ? Math.round(avg) : d.pc, pc_raw: d.pc };
    });
}

export function computeExponentialMA(data, alpha = 0.1) {
    if (!data || data.length === 0) return data;

    const result = [{ ...data[0], pc_ema: data[0].pc }];
    for (let i = 1; i < data.length; i++) {
        const prev = result[i - 1].pc_ema;
        const curr = data[i].pc;
        const ema = curr != null && prev != null
            ? alpha * curr + (1 - alpha) * prev
            : curr;
        result.push({ ...data[i], pc_ema: ema != null ? Math.round(ema) : null });
    }
    return result;
}
