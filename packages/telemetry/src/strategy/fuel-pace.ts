import { linearRegression } from './undercut.js';
import {
  DriverInfo,
  DriverPaceSummary,
  FuelCorrectedStint,
  Lap,
  RacePaceAnalysis,
  Stint,
} from '../types.js';

export const DEFAULT_FUEL_EFFECT_SEC_PER_LAP = 0.055;

export function fuelCorrectedLapTime(rawLapTime: number, lapNumber: number, fuelEffect = DEFAULT_FUEL_EFFECT_SEC_PER_LAP): number {
  return Number((rawLapTime + Math.max(0, lapNumber - 1) * fuelEffect).toFixed(3));
}

export function computeFuelCorrectedStints(
  stints: readonly Stint[],
  laps: readonly Lap[],
  pitLaps: readonly number[],
  fuelEffect = DEFAULT_FUEL_EFFECT_SEC_PER_LAP
): FuelCorrectedStint[] {
  const pitSet = new Set(pitLaps);
  const out: FuelCorrectedStint[] = [];

  for (const s of stints) {
    const stintLaps = laps
      .filter(
        (l) =>
          l.driver === s.driver &&
          l.lap >= s.lapStart &&
          l.lap <= s.lapEnd &&
          l.lap > 1 &&
          !pitSet.has(l.lap) &&
          !l.pitOutLap &&
          l.duration !== null
      )
      .sort((a, b) => a.lap - b.lap);

    if (stintLaps.length < 3) continue;

    // Filter outliers using 107% threshold relative to median
    const times = stintLaps.map((l) => l.duration as number).sort((a, b) => a - b);
    const medianTime = times[Math.floor(times.length / 2)];
    const cleanLaps = stintLaps.filter((l) => (l.duration as number) <= medianTime * 1.07);

    if (cleanLaps.length < 3) continue;

    const xs = cleanLaps.map((_, idx) => idx + 1);
    const rawYs = cleanLaps.map((l) => l.duration as number);
    const corrYs = cleanLaps.map((l) => fuelCorrectedLapTime(l.duration as number, l.lap, fuelEffect));

    const rawReg = linearRegression(xs, rawYs);
    const corrReg = linearRegression(xs, corrYs);

    if (!corrReg) continue;

    // Detect Tyre Cliff: identify where lap time delta to preceding lap exceeds 2x base slope
    let predictedCliffLap: number | null = null;
    for (let i = 2; i < cleanLaps.length; i++) {
      const lapDelta = corrYs[i] - corrYs[i - 1];
      if (lapDelta > Math.max(0.25, corrReg.slope * 2.5)) {
        predictedCliffLap = cleanLaps[i].lap;
        break;
      }
    }

    out.push({
      driver: s.driver,
      stint: s.stint,
      compound: s.compound,
      lapsCount: cleanLaps.length,
      rawDegSlope: rawReg ? rawReg.slope : 0,
      fuelCorrectedDegSlope: corrReg.slope,
      r2: corrReg.r2,
      predictedCliffLap,
      laps: cleanLaps.map((l, idx) => ({
        lap: l.lap,
        rawTime: rawYs[idx],
        fuelCorrectedTime: corrYs[idx],
      })),
    });
  }

  return out;
}

function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function computeDriverPaceSummary(driver: DriverInfo, laps: readonly Lap[], pitLaps: readonly number[]): DriverPaceSummary {
  const pitSet = new Set(pitLaps);
  const cleanLaps = laps
    .filter(
      (l) =>
        l.driver === driver.number &&
        l.lap > 1 &&
        !pitSet.has(l.lap) &&
        !l.pitOutLap &&
        l.duration !== null &&
        l.duration > 40 &&
        l.duration < 200
    )
    .sort((a, b) => a.lap - b.lap);

  if (cleanLaps.length === 0) {
    return {
      driver,
      medianCleanPace: 0,
      consistencyIqr: 0,
      standardDeviation: 0,
      theoreticalBestLap: null,
      actualBestLap: null,
      potentialGain: null,
      bestS1: null,
      bestS2: null,
      bestS3: null,
      cleanLapsCount: 0,
    };
  }

  const times = cleanLaps.map((l) => l.duration as number).sort((a, b) => a - b);
  // Re-filter 107% outliers for pure pace metrics
  const medianTime = times[Math.floor(times.length / 2)];
  const representativeTimes = times.filter((t) => t <= medianTime * 1.07);

  const finalMedian = representativeTimes[Math.floor(representativeTimes.length / 2)] ?? medianTime;
  const q1 = quantile(representativeTimes, 0.25);
  const q3 = quantile(representativeTimes, 0.75);
  const consistencyIqr = Number((q3 - q1).toFixed(3));

  const mean = representativeTimes.reduce((acc, cur) => acc + cur, 0) / representativeTimes.length;
  const variance = representativeTimes.reduce((acc, cur) => acc + Math.pow(cur - mean, 2), 0) / representativeTimes.length;
  const standardDeviation = Number(Math.sqrt(variance).toFixed(3));

  // Best Sectors
  const validS1 = cleanLaps.map((l) => l.sector1).filter((s): s is number => s !== null && s > 10);
  const validS2 = cleanLaps.map((l) => l.sector2).filter((s): s is number => s !== null && s > 10);
  const validS3 = cleanLaps.map((l) => l.sector3).filter((s): s is number => s !== null && s > 10);

  const bestS1 = validS1.length > 0 ? Number(Math.min(...validS1).toFixed(3)) : null;
  const bestS2 = validS2.length > 0 ? Number(Math.min(...validS2).toFixed(3)) : null;
  const bestS3 = validS3.length > 0 ? Number(Math.min(...validS3).toFixed(3)) : null;

  const actualBestLap = Number(Math.min(...times).toFixed(3));
  const theoreticalBestLap = bestS1 !== null && bestS2 !== null && bestS3 !== null ? Number((bestS1 + bestS2 + bestS3).toFixed(3)) : null;
  const potentialGain = theoreticalBestLap !== null && actualBestLap !== null ? Number(Math.max(0, actualBestLap - theoreticalBestLap).toFixed(3)) : null;

  return {
    driver,
    medianCleanPace: Number(finalMedian.toFixed(3)),
    consistencyIqr,
    standardDeviation,
    theoreticalBestLap,
    actualBestLap,
    potentialGain,
    bestS1,
    bestS2,
    bestS3,
    cleanLapsCount: representativeTimes.length,
  };
}

export function computeRacePaceAnalysis(
  sessionKey: number,
  drivers: readonly DriverInfo[],
  laps: readonly Lap[],
  stints: readonly Stint[],
  pitLaps: readonly number[]
): RacePaceAnalysis {
  const driverSummaries: DriverPaceSummary[] = [];

  for (const d of drivers) {
    const summary = computeDriverPaceSummary(d, laps, pitLaps);
    if (summary.cleanLapsCount > 0) {
      driverSummaries.push(summary);
    }
  }

  driverSummaries.sort((a, b) => a.medianCleanPace - b.medianCleanPace);
  const fuelStints = computeFuelCorrectedStints(stints, laps, pitLaps);

  return {
    sessionKey,
    drivers: driverSummaries,
    fuelCorrectedStints: fuelStints,
    fastestCleanPaceDriver: driverSummaries.length > 0 ? driverSummaries[0].driver.number : null,
  };
}
