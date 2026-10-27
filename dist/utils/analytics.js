"use strict";
/** Period-over-period growth helpers for admin analytics. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.inPeriod = void 0;
exports.resolvePeriods = resolvePeriods;
exports.computeGrowth = computeGrowth;
const DAY = 86_400_000;
/** Current and equal-length previous period for a range; null for "all". */
function resolvePeriods(range, now, from, to) {
    if (range === "all")
        return null;
    let start;
    let end;
    if (range === "custom") {
        if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
            return null;
        }
        start = from;
        end = to;
    }
    else {
        const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
        end = now;
        start = new Date(now.getTime() - days * DAY);
    }
    const len = end.getTime() - start.getTime();
    return {
        current: { start, end },
        previous: { start: new Date(start.getTime() - len), end: start },
    };
}
function computeGrowth(current, previous) {
    if (previous === null || !Number.isFinite(previous) || !Number.isFinite(current)) {
        return { kind: "none" };
    }
    if (previous === 0)
        return current > 0 ? { kind: "new" } : { kind: "flat" };
    const pct = Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
    return Number.isFinite(pct) ? { kind: "pct", pct } : { kind: "none" };
}
const inPeriod = (d, p) => {
    if (!d)
        return false;
    const t = new Date(d).getTime();
    return t >= p.start.getTime() && t < p.end.getTime();
};
exports.inPeriod = inPeriod;
