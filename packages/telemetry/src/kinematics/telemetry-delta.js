"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MINI_SECTOR_COUNT = exports.DEFAULT_RESAMPLE_STEP_METERS = void 0;
exports.interpolateAtDistance = interpolateAtDistance;
exports.computeLapComparison = computeLapComparison;
exports.DEFAULT_RESAMPLE_STEP_METERS = 10;
exports.DEFAULT_MINI_SECTOR_COUNT = 25;
function interpolateAtDistance(trace, targetD) {
    if (trace.length === 0) {
        return { t: 0, speed: 0, throttle: 0, brake: 0, gear: 0, drs: null, gLat: 0, gLong: 0, x: null, y: null };
    }
    if (trace.length === 1 || targetD <= trace[0].d) {
        const p = trace[0];
        return { t: p.t, speed: p.speed, throttle: p.throttle, brake: p.brake, gear: p.gear, drs: p.drs, gLat: p.gLat, gLong: p.gLong, x: p.x, y: p.y };
    }
    const last = trace[trace.length - 1];
    if (targetD >= last.d) {
        return { t: last.t, speed: last.speed, throttle: last.throttle, brake: last.brake, gear: last.gear, drs: last.drs, gLat: last.gLat, gLong: last.gLong, x: last.x, y: last.y };
    }
    // Binary search for surrounding segment
    let low = 0;
    let high = trace.length - 1;
    while (low <= high) {
        const mid = (low + high) >> 1;
        if (trace[mid].d <= targetD) {
            if (mid === trace.length - 1 || trace[mid + 1].d > targetD) {
                low = mid;
                break;
            }
            low = mid + 1;
        }
        else {
            high = mid - 1;
        }
    }
    const p0 = trace[low];
    const p1 = trace[Math.min(low + 1, trace.length - 1)];
    const span = p1.d - p0.d;
    const ratio = span > 0 ? (targetD - p0.d) / span : 0;
    return {
        t: Number((p0.t + (p1.t - p0.t) * ratio).toFixed(3)),
        speed: Number((p0.speed + (p1.speed - p0.speed) * ratio).toFixed(1)),
        throttle: Math.round(p0.throttle + (p1.throttle - p0.throttle) * ratio),
        brake: ratio >= 0.5 ? p1.brake : p0.brake,
        gear: ratio >= 0.5 ? p1.gear : p0.gear,
        drs: ratio >= 0.5 ? p1.drs : p0.drs,
        gLat: Number((p0.gLat + (p1.gLat - p0.gLat) * ratio).toFixed(2)),
        gLong: Number((p0.gLong + (p1.gLong - p0.gLong) * ratio).toFixed(2)),
        x: p0.x !== null && p1.x !== null ? Math.round(p0.x + (p1.x - p0.x) * ratio) : null,
        y: p0.y !== null && p1.y !== null ? Math.round(p0.y + (p1.y - p0.y) * ratio) : null,
    };
}
function computeLapComparison(driverA, driverB, lapA, lapB, dynA, dynB, stepMeters = exports.DEFAULT_RESAMPLE_STEP_METERS, miniSectorCount = exports.DEFAULT_MINI_SECTOR_COUNT) {
    const maxDA = dynA.trace.length > 0 ? dynA.trace[dynA.trace.length - 1].d : 0;
    const maxDB = dynB.trace.length > 0 ? dynB.trace[dynB.trace.length - 1].d : 0;
    const totalD = Math.min(maxDA, maxDB);
    if (totalD <= 0 || dynA.trace.length < 2 || dynB.trace.length < 2) {
        return {
            driverA,
            driverB,
            lapA,
            lapB,
            lapTimeDelta: 0,
            samples: [],
            miniSectors: [],
            brakingZones: [],
            fasterDriverNumber: driverA.number,
            maxSpeedDelta: { positive: 0, negative: 0 },
        };
    }
    const samples = [];
    let maxPosDelta = 0;
    let maxNegDelta = 0;
    for (let d = 0; d <= totalD; d += stepMeters) {
        const pA = interpolateAtDistance(dynA.trace, d);
        const pB = interpolateAtDistance(dynB.trace, d);
        const deltaT = Number((pB.t - pA.t).toFixed(3));
        const deltaSpeed = Number((pA.speed - pB.speed).toFixed(1));
        if (deltaSpeed > maxPosDelta)
            maxPosDelta = deltaSpeed;
        if (deltaSpeed < maxNegDelta)
            maxNegDelta = deltaSpeed;
        samples.push({
            d,
            tA: pA.t,
            tB: pB.t,
            deltaT,
            speedA: pA.speed,
            speedB: pB.speed,
            deltaSpeed,
            throttleA: pA.throttle,
            throttleB: pB.throttle,
            brakeA: pA.brake,
            brakeB: pB.brake,
            gearA: pA.gear,
            gearB: pB.gear,
            drsA: pA.drs,
            drsB: pB.drs,
            gLatA: pA.gLat,
            gLatB: pB.gLat,
            gLongA: pA.gLong,
            gLongB: pB.gLong,
            x: pA.x ?? pB.x,
            y: pA.y ?? pB.y,
        });
    }
    // Compute Mini-Sector Dominance
    const miniSectors = [];
    const sectorSpan = totalD / miniSectorCount;
    for (let i = 0; i < miniSectorCount; i++) {
        const sStart = i * sectorSpan;
        const sEnd = Math.min(totalD, (i + 1) * sectorSpan);
        const startA = interpolateAtDistance(dynA.trace, sStart);
        const endA = interpolateAtDistance(dynA.trace, sEnd);
        const timeA = endA.t - startA.t;
        const startB = interpolateAtDistance(dynB.trace, sStart);
        const endB = interpolateAtDistance(dynB.trace, sEnd);
        const timeB = endB.t - startB.t;
        const deltaSec = timeB - timeA;
        const deltaMs = Math.round(Math.abs(deltaSec) * 1000);
        const fasterDriver = deltaSec >= 0 ? driverA.number : driverB.number;
        const avgSpeedA = (startA.speed + endA.speed) / 2;
        const avgSpeedB = (startB.speed + endB.speed) / 2;
        miniSectors.push({
            sectorIndex: i + 1,
            startDistance: Math.round(sStart),
            endDistance: Math.round(sEnd),
            fasterDriver,
            deltaMs,
            speedDeltaKmh: Number((avgSpeedA - avgSpeedB).toFixed(1)),
        });
    }
    // Compute Braking Zone Comparison for Corner Apexes
    const brakingZones = [];
    for (let cIdx = 0; cIdx < dynA.corners.length; cIdx++) {
        const cA = dynA.corners[cIdx];
        // Find closest corner apex in driver B
        const cB = dynB.corners.find((b) => Math.abs(b.distance - cA.distance) <= 80);
        if (!cB)
            continue;
        // Find braking onset for A
        let brakeStartA = cA.distance;
        for (let j = samples.length - 1; j >= 0; j--) {
            if (samples[j].d <= cA.distance && samples[j].brakeA > 0) {
                brakeStartA = samples[j].d;
            }
            else if (samples[j].d < cA.distance && samples[j].brakeA === 0 && brakeStartA < cA.distance) {
                break;
            }
        }
        // Find braking onset for B
        let brakeStartB = cB.distance;
        for (let j = samples.length - 1; j >= 0; j--) {
            if (samples[j].d <= cB.distance && samples[j].brakeB > 0) {
                brakeStartB = samples[j].d;
            }
            else if (samples[j].d < cB.distance && samples[j].brakeB === 0 && brakeStartB < cB.distance) {
                break;
            }
        }
        const distA = Math.max(0, cA.distance - brakeStartA);
        const distB = Math.max(0, cB.distance - brakeStartB);
        brakingZones.push({
            cornerIndex: cIdx + 1,
            distance: cA.distance,
            brakingDistanceA: Math.round(distA),
            brakingDistanceB: Math.round(distB),
            brakePointDeltaMeters: Math.round(brakeStartA - brakeStartB),
            apexSpeedA: cA.apexSpeed,
            apexSpeedB: cB.apexSpeed,
            apexSpeedDelta: cA.apexSpeed - cB.apexSpeed,
        });
    }
    const durationA = lapA.duration ?? (dynA.trace.length > 0 ? dynA.trace[dynA.trace.length - 1].t : 0);
    const durationB = lapB.duration ?? (dynB.trace.length > 0 ? dynB.trace[dynB.trace.length - 1].t : 0);
    const lapTimeDelta = Number((durationB - durationA).toFixed(3));
    const fasterDriverNumber = lapTimeDelta >= 0 ? driverA.number : driverB.number;
    return {
        driverA,
        driverB,
        lapA,
        lapB,
        lapTimeDelta,
        samples,
        miniSectors,
        brakingZones,
        fasterDriverNumber,
        maxSpeedDelta: { positive: maxPosDelta, negative: maxNegDelta },
    };
}
