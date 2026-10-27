import { Lap, PitStop, Stint } from '../types.js';

export interface LinearRegressionResult {
  readonly slope: number;
  readonly intercept: number;
  readonly r2: number;
}

export function linearRegression(xs: readonly number[], ys: readonly number[]): LinearRegressionResult | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
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
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
  return { slope: Number(slope.toFixed(4)), intercept: Number(intercept.toFixed(3)), r2: Number(r2.toFixed(3)) };
}

export interface StintDegradation {
  readonly driver: number;
  readonly stint: number;
  readonly compound: string;
  readonly laps: number;
  readonly degPerLapSeconds: number;
  readonly r2: number;
}

export interface UndercutPrediction {
  readonly chaserDriver: number;
  readonly targetDriver: number;
  readonly currentGapSeconds: number;
  readonly pitLossSeconds: number;
  readonly freshTyrePaceDelta: number;
  readonly projectedExitGapSeconds: number;
  readonly undercutSuccessProbability: number;
  readonly optimalPitWindowLap: number;
}

/**
 * Calculates tyre degradation slope using linear regression on representative laps.
 */
export function computeStintDegradation(
  stints: readonly Stint[],
  laps: readonly Lap[],
  pitLaps: readonly number[]
): StintDegradation[] {
  const pitSet = new Set(pitLaps);
  const out: StintDegradation[] = [];

  for (const s of stints) {
    const stintLaps = laps
      .filter(
        (l) =>
          l.driver === s.driver &&
          l.lap >= s.lapStart &&
          l.lap <= s.lapEnd &&
          l.duration !== null &&
          !l.pitOutLap &&
          !pitSet.has(l.lap) &&
          l.lap > 1
      )
      .sort((a, b) => a.lap - b.lap);

    if (stintLaps.length < 3) continue;

    // Filter outliers (107% threshold vs median)
    const times = stintLaps.map((l) => l.duration as number).sort((a, b) => a - b);
    const medianTime = times[Math.floor(times.length / 2)];
    const cleanLaps = stintLaps.filter((l) => (l.duration as number) <= medianTime * 1.07);

    if (cleanLaps.length < 3) continue;

    const xs = cleanLaps.map((_, idx) => idx + 1);
    const ys = cleanLaps.map((l) => l.duration as number);
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
export function evaluateUndercutWindow(
  chaserDriver: number,
  targetDriver: number,
  currentGap: number,
  medianPitLoss: number,
  chaserDeg: number,
  freshTyreDelta: number,
  currentLap: number
): UndercutPrediction {
  const outlapAdvantage = Math.max(0.4, freshTyreDelta + chaserDeg * 8);
  const projectedExitGap = currentGap - outlapAdvantage;

  let probability = 0;
  if (currentGap <= 1.2) {
    probability = 92;
  } else if (currentGap <= 2.0) {
    probability = 78;
  } else if (currentGap <= 2.8) {
    probability = 58;
  } else if (currentGap <= 3.5) {
    probability = 32;
  } else {
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

export function computePitMedianTime(pitStops: readonly PitStop[]): number {
  const laneTimes = pitStops
    .map((p) => p.laneDuration)
    .filter((d): d is number => d !== null && d > 12 && d < 45)
    .sort((a, b) => a - b);

  if (laneTimes.length === 0) return 22.0;
  const mid = laneTimes.length >> 1;
  return laneTimes.length % 2 ? laneTimes[mid] : (laneTimes[mid - 1] + laneTimes[mid]) / 2;
}
