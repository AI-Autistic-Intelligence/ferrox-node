import { CarSample, LocationSample } from '../types.js';

export interface TracePoint {
  readonly t: number;
  readonly d: number;
  readonly speed: number;
  readonly throttle: number;
  readonly brake: number;
  readonly gear: number;
  readonly rpm: number;
  readonly drs: number | null;
}

const KMH_TO_MS = 1 / 3.6;

export function buildDistanceTrace(samples: readonly CarSample[]): TracePoint[] {
  const sorted = [...samples].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const out: TracePoint[] = [];
  if (sorted.length === 0) return out;
  const t0 = Date.parse(sorted[0].date);
  let d = 0;
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const t = (Date.parse(s.date) - t0) / 1000;
    if (i > 0) {
      const prev = out[i - 1];
      d += ((prev.speed + s.speed) / 2) * KMH_TO_MS * (t - prev.t);
    }
    out.push({ t, d, speed: s.speed, throttle: s.throttle, brake: s.brake, gear: s.gear, rpm: s.rpm, drs: s.drs });
  }
  return out;
}

export interface BrakingZone {
  readonly startDistance: number;
  readonly entrySpeed: number;
  readonly minimumSpeed: number;
  readonly speedDrop: number;
}

export interface TraceStats {
  readonly lapDistance: number;
  readonly duration: number;
  readonly topSpeed: number;
  readonly minimumSpeed: number;
  readonly averageSpeed: number;
  readonly fullThrottlePct: number;
  readonly brakingPct: number;
  readonly gearChanges: number;
  readonly maxRpm: number;
  readonly brakingZones: BrakingZone[];
}

export const BRAKING_ZONE_MIN_DROP = 30;
export const FULL_THROTTLE = 98;

function pushZone(zones: BrakingZone[], z: { startDistance: number; entrySpeed: number; minimumSpeed: number }): void {
  const drop = z.entrySpeed - z.minimumSpeed;
  if (drop >= BRAKING_ZONE_MIN_DROP) zones.push({ ...z, speedDrop: drop });
}

export function traceStats(trace: readonly TracePoint[]): TraceStats | null {
  if (trace.length < 2) return null;
  const last = trace[trace.length - 1];
  let full = 0, braking = 0, gearChanges = 0, top = -Infinity, min = Infinity, maxRpm = 0;
  const zones: BrakingZone[] = [];
  let zone: { startDistance: number; entrySpeed: number; minimumSpeed: number } | null = null;

  for (let i = 0; i < trace.length; i++) {
    const p = trace[i];
    top = Math.max(top, p.speed);
    min = Math.min(min, p.speed);
    maxRpm = Math.max(maxRpm, p.rpm);
    if (i > 0) {
      const prev = trace[i - 1];
      const dt = p.t - prev.t;
      if (prev.throttle >= FULL_THROTTLE) full += dt;
      if (prev.brake > 0) braking += dt;
      if (p.gear !== prev.gear) gearChanges++;
    }
    if (p.brake > 0) {
      if (zone === null) zone = { startDistance: p.d, entrySpeed: p.speed, minimumSpeed: p.speed };
      zone.minimumSpeed = Math.min(zone.minimumSpeed, p.speed);
    } else if (zone !== null) {
      zone.minimumSpeed = Math.min(zone.minimumSpeed, p.speed);
      pushZone(zones, zone);
      zone = null;
    }
  }
  if (zone !== null) pushZone(zones, zone);

  return {
    lapDistance: last.d,
    duration: last.t,
    topSpeed: top,
    minimumSpeed: min,
    averageSpeed: last.t > 0 ? (last.d / last.t) * 3.6 : 0,
    fullThrottlePct: last.t > 0 ? (full / last.t) * 100 : 0,
    brakingPct: last.t > 0 ? (braking / last.t) * 100 : 0,
    gearChanges,
    maxRpm,
    brakingZones: zones,
  };
}

export function alignTraceToLapTime(trace: readonly TracePoint[], officialLapTime: number | null): TracePoint[] {
  if (trace.length < 2 || officialLapTime === null || officialLapTime <= 0) return [...trace];
  const span = trace[trace.length - 1].t;
  if (span <= 0) return [...trace];
  const k = officialLapTime / span;
  return trace.map((p) => ({ ...p, t: p.t * k }));
}

function interpolate(x0: number, x1: number, y0: number, y1: number, x: number): number {
  return x1 === x0 ? y0 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

export interface ResampledPoint {
  readonly d: number;
  readonly t: number;
  readonly speed: number;
  readonly throttle: number;
  readonly brake: number;
  readonly gear: number;
}

export function resampleByDistance(trace: readonly TracePoint[], step: number, targetLength?: number): ResampledPoint[] {
  if (trace.length < 2 || step <= 0) return [];
  const length = trace[trace.length - 1].d;
  const scale = targetLength && length > 0 ? targetLength / length : 1;
  const out: ResampledPoint[] = [];
  let j = 0;
  const end = length * scale;
  for (let d = 0; d <= end; d += step) {
    const raw = d / scale;
    while (j < trace.length - 2 && trace[j + 1].d < raw) j++;
    const a = trace[j], b = trace[j + 1];
    out.push({
      d,
      t: interpolate(a.d, b.d, a.t, b.t, raw),
      speed: interpolate(a.d, b.d, a.speed, b.speed, raw),
      throttle: interpolate(a.d, b.d, a.throttle, b.throttle, raw),
      brake: raw - a.d < b.d - raw ? a.brake : b.brake,
      gear: raw - a.d < b.d - raw ? a.gear : b.gear,
    });
  }
  return out;
}

export interface DeltaPoint {
  readonly d: number;
  readonly delta: number;
  readonly speedRef: number;
  readonly speedCmp: number;
}

export function computeDelta(ref: readonly TracePoint[], cmp: readonly TracePoint[], step = 10): DeltaPoint[] {
  if (ref.length < 2 || cmp.length < 2) return [];
  const length = ref[ref.length - 1].d;
  const r = resampleByDistance(ref, step);
  const c = resampleByDistance(cmp, step, length);
  const n = Math.min(r.length, c.length);
  const out: DeltaPoint[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ d: r[i].d, delta: c[i].t - r[i].t, speedRef: r[i].speed, speedCmp: c[i].speed });
  }
  return out;
}

export interface MapPoint {
  readonly x: number;
  readonly y: number;
  readonly t: number;
  readonly d: number;
  readonly speed: number;
}

export interface TrackMap {
  readonly width: number;
  readonly height: number;
  readonly points: MapPoint[];
}

export function buildTrackMap(
  locations: readonly LocationSample[],
  trace: readonly TracePoint[],
  traceStartIso: string | null,
  width = 600,
  height = 420,
  padding = 20,
): TrackMap {
  const valid = locations
    .filter((p) => !(p.x === 0 && p.y === 0 && p.z === 0))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  if (valid.length === 0 || trace.length === 0 || traceStartIso === null) return { width, height, points: [] };

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of valid) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const spanX = Math.max(maxX - minX, 1), spanY = Math.max(maxY - minY, 1);
  const scale = Math.min((width - 2 * padding) / spanX, (height - 2 * padding) / spanY);
  const offX = (width - spanX * scale) / 2, offY = (height - spanY * scale) / 2;
  const t0 = Date.parse(traceStartIso);

  let j = 0;
  const points = valid.map((p) => {
    const t = (Date.parse(p.date) - t0) / 1000;
    while (j < trace.length - 1 && trace[j + 1].t <= t) j++;
    const a = trace[j], b = trace[Math.min(j + 1, trace.length - 1)];
    const clampedT = Math.min(Math.max(t, a.t), b.t);
    return {
      x: +(offX + (p.x - minX) * scale).toFixed(1),
      y: +(height - (offY + (p.y - minY) * scale)).toFixed(1),
      t,
      d: interpolate(a.t, b.t, a.d, b.d, clampedT),
      speed: interpolate(a.t, b.t, a.speed, b.speed, clampedT),
    };
  });
  return { width, height, points };
}

export function downsample<T>(items: readonly T[], maxPoints: number): T[] {
  if (items.length <= maxPoints || maxPoints < 2) return [...items];
  const out: T[] = [];
  const stride = (items.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i++) out.push(items[Math.round(i * stride)]);
  return out;
}
