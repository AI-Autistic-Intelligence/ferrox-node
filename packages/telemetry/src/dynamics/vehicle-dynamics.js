"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeVehicleDynamics = void 0;
exports.computeCurvature = computeCurvature;
exports.buildVehicleDynamics = buildVehicleDynamics;
exports.computeAeroEfficiency = computeAeroEfficiency;
const GRAVITY = 9.80665;
const KMH_TO_MS = 1 / 3.6;
/**
 * Three-point circumscribed circle curvature: kappa = 2*|cross(A->B, A->C)| / (|AB|*|BC|*|CA|)
 */
function computeCurvature(p1, p2, p3) {
    const ax = p1.x, ay = p1.y;
    const bx = p2.x, by = p2.y;
    const cx = p3.x, cy = p3.y;
    const abx = bx - ax, aby = by - ay;
    const bcx = cx - bx, bcy = cy - by;
    const cax = ax - cx, cay = ay - cy;
    const cross = abx * bcy - aby * bcx;
    const dAB = Math.hypot(abx, aby);
    const dBC = Math.hypot(bcx, bcy);
    const dCA = Math.hypot(cax, cay);
    const denom = dAB * dBC * dCA;
    if (denom < 1e-4)
        return { kappa: 0, sign: 1 };
    const kappa = (2 * Math.abs(cross)) / denom;
    const sign = cross >= 0 ? 1 : -1;
    return { kappa, sign };
}
/**
 * Interweaves car samples with spatial locations and derives 2D vehicle dynamics:
 * - Longitudinal acceleration (a_long = dv/dt)
 * - Curvature kappa and Lateral acceleration (a_lat = v^2 * kappa)
 * - Resulting G-force envelope
 */
function buildVehicleDynamics(carSamples, locationSamples) {
    const sortedCar = [...carSamples].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const sortedLoc = [...locationSamples].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    if (sortedCar.length === 0) {
        return {
            trace: [],
            corners: [],
            envelope: { maxLongAccG: 0, maxBrakingG: 0, maxLatLeftG: 0, maxLatRightG: 0, samples: [] },
        };
    }
    const t0 = Date.parse(sortedCar[0].date);
    const trace = [];
    let d = 0;
    let locIdx = 0;
    for (let i = 0; i < sortedCar.length; i++) {
        const c = sortedCar[i];
        const tMs = Date.parse(c.date);
        const t = (tMs - t0) / 1000;
        // Advance location cursor
        while (locIdx < sortedLoc.length - 1 && Date.parse(sortedLoc[locIdx + 1].date) <= tMs) {
            locIdx++;
        }
        const loc = sortedLoc[locIdx] ?? null;
        if (i > 0) {
            const prev = trace[i - 1];
            const dt = t - prev.t;
            if (dt > 0) {
                d += ((prev.speed + c.speed) / 2) * KMH_TO_MS * dt;
            }
        }
        // Longitudinal acceleration
        let aLong = 0;
        if (i > 0) {
            const prev = trace[i - 1];
            const dt = t - prev.t;
            if (dt > 0.01) {
                const dv = (c.speed - prev.speed) * KMH_TO_MS;
                aLong = dv / dt;
            }
        }
        const gLong = Math.max(-5.5, Math.min(3.5, aLong / GRAVITY));
        // Lateral acceleration from curvature
        let gLat = 0;
        if (locIdx > 0 && locIdx < sortedLoc.length - 1) {
            const p1 = sortedLoc[locIdx - 1];
            const p2 = sortedLoc[locIdx];
            const p3 = sortedLoc[locIdx + 1];
            const { kappa, sign } = computeCurvature(p1, p2, p3);
            const v = c.speed * KMH_TO_MS;
            const aLat = v * v * kappa;
            gLat = Math.max(-5.5, Math.min(5.5, (aLat / GRAVITY) * sign));
        }
        const gTotal = Math.hypot(gLong, gLat);
        trace.push({
            t,
            d,
            speed: c.speed,
            gLong: Number(gLong.toFixed(2)),
            gLat: Number(gLat.toFixed(2)),
            gTotal: Number(gTotal.toFixed(2)),
            throttle: c.throttle,
            brake: c.brake > 0 ? 1 : 0,
            gear: c.gear,
            rpm: c.rpm,
            drs: c.drs,
            x: loc ? loc.x : null,
            y: loc ? loc.y : null,
        });
    }
    // Detect corner apexes (local minima in speed with speed drop and curvature)
    const corners = [];
    let cornerCounter = 1;
    for (let i = 2; i < trace.length - 2; i++) {
        const cur = trace[i];
        const prev1 = trace[i - 1];
        const prev2 = trace[i - 2];
        const next1 = trace[i + 1];
        const next2 = trace[i + 2];
        const isLocalMin = cur.speed <= prev1.speed && cur.speed <= prev2.speed && cur.speed <= next1.speed && cur.speed <= next2.speed;
        const isCornering = cur.speed < 260 && (Math.abs(cur.gLat) >= 0.25 || cur.brake > 0);
        if (isLocalMin && isCornering && cur.x !== null && cur.y !== null) {
            // Ensure distance from previous corner > 100m to avoid double-counting
            const lastCorner = corners[corners.length - 1];
            if (!lastCorner || cur.d - lastCorner.distance > 100) {
                corners.push({
                    index: cornerCounter++,
                    distance: Math.round(cur.d),
                    apexSpeed: Math.round(cur.speed),
                    apexGTotal: cur.gTotal,
                    x: cur.x,
                    y: cur.y,
                });
            }
        }
    }
    // Compute G-G Envelope bounds and downsampled scatter points
    let maxLongAccG = 0;
    let maxBrakingG = 0;
    let maxLatLeftG = 0;
    let maxLatRightG = 0;
    for (const p of trace) {
        if (p.gLong > maxLongAccG)
            maxLongAccG = p.gLong;
        if (p.gLong < maxBrakingG)
            maxBrakingG = p.gLong;
        if (p.gLat < maxLatLeftG)
            maxLatLeftG = p.gLat;
        if (p.gLat > maxLatRightG)
            maxLatRightG = p.gLat;
    }
    const stride = Math.max(1, Math.floor(trace.length / 120));
    const envelopeSamples = trace
        .filter((_, idx) => idx % stride === 0)
        .map((p) => ({ gLat: p.gLat, gLong: p.gLong, speed: Math.round(p.speed) }));
    return {
        trace,
        corners,
        envelope: {
            maxLongAccG: Number(maxLongAccG.toFixed(2)),
            maxBrakingG: Number(maxBrakingG.toFixed(2)),
            maxLatLeftG: Number(maxLatLeftG.toFixed(2)),
            maxLatRightG: Number(maxLatRightG.toFixed(2)),
            samples: envelopeSamples,
        },
    };
}
exports.computeVehicleDynamics = buildVehicleDynamics;
function computeAeroEfficiency(trace, i1Speed, i2Speed, speedTrap) {
    let topDrsOn = 0;
    let topDrsOff = 0;
    for (const p of trace) {
        const isDrs = p.drs !== null && p.drs >= 10;
        if (isDrs) {
            if (p.speed > topDrsOn)
                topDrsOn = p.speed;
        }
        else {
            if (p.speed > topDrsOff)
                topDrsOff = p.speed;
        }
    }
    return {
        topSpeedDrsOn: topDrsOn > 0 ? topDrsOn : null,
        topSpeedDrsOff: topDrsOff > 0 ? topDrsOff : null,
        drsDeltaKmh: topDrsOn > 0 && topDrsOff > 0 ? Number((topDrsOn - topDrsOff).toFixed(1)) : null,
        speedTrap,
        i1Speed,
        i2Speed,
    };
}
