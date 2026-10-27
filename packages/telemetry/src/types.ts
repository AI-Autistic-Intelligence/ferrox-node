/**
 * Pure domain definitions for Motorsport & Formula 1 Telemetry.
 * Conforms to Ferrox DDD architecture (zero external dependencies).
 */

export type SessionAvailability = 'available' | 'live' | 'upcoming';

export interface SessionInfo {
  readonly sessionKey: number;
  readonly meetingKey: number;
  readonly name: string;
  readonly type: string;
  readonly circuit: string;
  readonly country: string;
  readonly location: string;
  readonly dateStart: string;
  readonly dateEnd: string;
  readonly year: number;
}

export interface DriverInfo {
  readonly number: number;
  readonly acronym: string;
  readonly fullName: string;
  readonly team: string;
  readonly teamColour: string;
  readonly headshotUrl: string | null;
}

export interface Lap {
  readonly driver: number;
  readonly lap: number;
  readonly start: string | null;
  readonly duration: number | null;
  readonly sector1: number | null;
  readonly sector2: number | null;
  readonly sector3: number | null;
  readonly i1Speed: number | null;
  readonly i2Speed: number | null;
  readonly speedTrap: number | null;
  readonly pitOutLap: boolean;
}

export interface Stint {
  readonly driver: number;
  readonly stint: number;
  readonly lapStart: number;
  readonly lapEnd: number;
  readonly compound: string;
  readonly tyreAgeAtStart: number;
}

export interface PitStop {
  readonly driver: number;
  readonly lap: number;
  readonly date: string;
  readonly laneDuration: number | null;
  readonly stopDuration: number | null;
}

export interface CarSample {
  readonly date: string;
  readonly speed: number;
  readonly rpm: number;
  readonly gear: number;
  readonly throttle: number;
  readonly brake: number;
  readonly drs: number | null;
}

export interface LocationSample {
  readonly date: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface RaceControlMessage {
  readonly date: string;
  readonly lap: number | null;
  readonly category: string;
  readonly flag: string | null;
  readonly scope: string | null;
  readonly driver: number | null;
  readonly message: string;
}

export interface TrackWeatherSample {
  readonly date: string;
  readonly airTemperature: number;
  readonly trackTemperature: number;
  readonly humidity: number;
  readonly pressure: number;
  readonly rainfall: number;
  readonly windSpeed: number;
  readonly windDirection: number;
}

export interface TeamRadioClip {
  readonly date: string;
  readonly driver: number;
  readonly recordingUrl: string;
}

export interface SessionResultRow {
  readonly position: number | null;
  readonly driver: number;
  readonly laps: number;
  readonly points: number;
  readonly dnf: boolean;
  readonly dns: boolean;
  readonly dsq: boolean;
  readonly gapToLeader: number | string | null;
  readonly duration: number | null;
}

export interface IntervalSample {
  readonly date: string;
  readonly driver: number;
  readonly gapToLeader: number | string | null;
  readonly interval: number | string | null;
}

export const FERRARI_TEAM = 'Ferrari';

export function isFerrari(driver: Pick<DriverInfo, 'team'>): boolean {
  return driver.team.toLowerCase().includes(FERRARI_TEAM.toLowerCase());
}

export const HISTORICAL_GRACE_MS = 30 * 60 * 1000;

export function sessionAvailability(session: Pick<SessionInfo, 'dateStart' | 'dateEnd'>, nowMs: number): SessionAvailability {
  const start = Date.parse(session.dateStart);
  const end = Date.parse(session.dateEnd);
  if (nowMs >= end + HISTORICAL_GRACE_MS) return 'available';
  if (nowMs >= start - HISTORICAL_GRACE_MS) return 'live';
  return 'upcoming';
}

export function isImmutable(session: Pick<SessionInfo, 'dateEnd'>, nowMs: number): boolean {
  return nowMs >= Date.parse(session.dateEnd) + 4 * HISTORICAL_GRACE_MS;
}

export interface TelemetryDeltaPoint {
  readonly d: number;
  readonly tA: number;
  readonly tB: number;
  readonly deltaT: number;
  readonly speedA: number;
  readonly speedB: number;
  readonly deltaSpeed: number;
  readonly throttleA: number;
  readonly throttleB: number;
  readonly brakeA: number;
  readonly brakeB: number;
  readonly gearA: number;
  readonly gearB: number;
  readonly drsA: number | null;
  readonly drsB: number | null;
  readonly gLatA: number;
  readonly gLatB: number;
  readonly gLongA: number;
  readonly gLongB: number;
  readonly x: number | null;
  readonly y: number | null;
}

export interface MiniSectorDominance {
  readonly sectorIndex: number;
  readonly startDistance: number;
  readonly endDistance: number;
  readonly fasterDriver: number;
  readonly deltaMs: number;
  readonly speedDeltaKmh: number;
}

export interface BrakingZoneComparison {
  readonly cornerIndex: number;
  readonly distance: number;
  readonly brakingDistanceA: number;
  readonly brakingDistanceB: number;
  readonly brakePointDeltaMeters: number;
  readonly apexSpeedA: number;
  readonly apexSpeedB: number;
  readonly apexSpeedDelta: number;
}

export interface LapComparison {
  readonly driverA: DriverInfo;
  readonly driverB: DriverInfo;
  readonly lapA: Lap;
  readonly lapB: Lap;
  readonly lapTimeDelta: number;
  readonly samples: readonly TelemetryDeltaPoint[];
  readonly miniSectors: readonly MiniSectorDominance[];
  readonly brakingZones: readonly BrakingZoneComparison[];
  readonly fasterDriverNumber: number;
  readonly maxSpeedDelta: { readonly positive: number; readonly negative: number };
}

export interface FuelCorrectedStint {
  readonly driver: number;
  readonly stint: number;
  readonly compound: string;
  readonly lapsCount: number;
  readonly rawDegSlope: number;
  readonly fuelCorrectedDegSlope: number;
  readonly r2: number;
  readonly predictedCliffLap: number | null;
  readonly laps: readonly { readonly lap: number; readonly rawTime: number; readonly fuelCorrectedTime: number }[];
}

export interface DriverPaceSummary {
  readonly driver: DriverInfo;
  readonly medianCleanPace: number;
  readonly consistencyIqr: number;
  readonly standardDeviation: number;
  readonly theoreticalBestLap: number | null;
  readonly actualBestLap: number | null;
  readonly potentialGain: number | null;
  readonly bestS1: number | null;
  readonly bestS2: number | null;
  readonly bestS3: number | null;
  readonly cleanLapsCount: number;
}

export interface RacePaceAnalysis {
  readonly sessionKey: number;
  readonly drivers: readonly DriverPaceSummary[];
  readonly fuelCorrectedStints: readonly FuelCorrectedStint[];
  readonly fastestCleanPaceDriver: number | null;
}
