"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linearRegression = linearRegression;
exports.computeStintDegradation = computeStintDegradation;
exports.evaluateUndercutWindow = evaluateUndercutWindow;
exports.computePitMedianTime = computePitMedianTime;
function linearRegression(xs, ys) {
    const n = Math.min(xs.length, ys.length);
    if (n < 2)
        return null;
    let sx = 0, sy = 0;
    for (let i = 0; i < n; i++) {
        sx += xs[i];
        sy += ys[i];
    }
    const mx = sx / n, my = sy / n;
    let sxx = 0, sxy = 0, syy = 0;
    for (let i = 0; i < n; i++) {
        const dx = xs[i] - mx;
        const dy = ys[i] - my;
        sxx += dx * dx;
        sxy += dx * dy;
        syy += dy * dy;
    }
    if (sxx === 0)
        return null;
    const slope = sxy / sxx;
    const intercept = my - slope * mx;
    const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
    return { slope: Number(slope.toFixed(4)), intercept: Number(intercept.toFixed(3)), r2: Number(r2.toFixed(3)) };
}
/**
 * Calculates tyre degradation slope using linear regression on representative laps.
 */
function computeStintDegradation(stints, laps, pitLaps) {
    const pitSet = new Set(pitLaps);
    const out = [];
    for (const s of stints) {
        const stintLaps = laps
            .filter((l) => l.driver === s.driver &&
            l.lap >= s.lapStart &&
            l.lap <= s.lapEnd &&
            l.duration !== null &&
            !l.pitOutLap &&
            !pitSet.has(l.lap) &&
            l.lap > 1)
            .sort((a, b) => a.lap - b.lap);
        if (stintLaps.length < 3)
            continue;
        // Filter outliers (107% threshold vs median)
        const times = stintLaps.map((l) => l.duration).sort((a, b) => a - b);
        const medianTime = times[Math.floor(times.length / 2)];
        const cleanLaps = stintLaps.filter((l) => l.duration <= medianTime * 1.07);
        if (cleanLaps.length < 3)
            continue;
        const xs = cleanLaps.map((_, idx) => idx + 1);
        const ys = cleanLaps.map((l) => l.duration);
        const reg = linearRegression(xs, ys);
        if (reg) {
            out.push({
                driver: s.driver,
                stint: s.stint,
                compound: s.compound,
                laps: cleanLaps.length,
                degPerLapSeconds: reg.slope,
                r2: reg.r2,
            });
        }
    }
    return out;
}
/**
 * Models the pit window undercut dynamics between two drivers.
 */
function evaluateUndercutWindow(chaserDriver, targetDriver, currentGap, medianPitLoss, chaserDeg, freshTyreDelta, currentLap) {
    const outlapAdvantage = Math.max(0.4, freshTyreDelta + chaserDeg * 8);
    const projectedExitGap = currentGap - outlapAdvantage;
    let probability = 0;
    if (currentGap <= 1.2) {
        probability = 92;
    }
    else if (currentGap <= 2.0) {
        probability = 78;
    }
    else if (currentGap <= 2.8) {
        probability = 58;
    }
    else if (currentGap <= 3.5) {
        probability = 32;
    }
    else {
        probability = 10;
    }
    return {
        chaserDriver,
        targetDriver,
        currentGapSeconds: Number(currentGap.toFixed(2)),
        pitLossSeconds: Number(medianPitLoss.toFixed(2)),
        freshTyrePaceDelta: Number(freshTyreDelta.toFixed(2)),
        projectedExitGapSeconds: Number(projectedExitGap.toFixed(2)),
        undercutSuccessProbability: probability,
        optimalPitWindowLap: currentLap + (currentGap < 2.0 ? 1 : 2),
    };
}
function computePitMedianTime(pitStops) {
    const laneTimes = pitStops
        .map((p) => p.laneDuration)
        .filter((d) => d !== null && d > 12 && d < 45)
        .sort((a, b) => a - b);
    if (laneTimes.length === 0)
        return 22.0;
    const mid = laneTimes.length >> 1;
    return laneTimes.length % 2 ? laneTimes[mid] : (laneTimes[mid - 1] + laneTimes[mid]) / 2;
}
