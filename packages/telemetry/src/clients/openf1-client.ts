import {
  CarSample,
  DriverInfo,
  IntervalSample,
  Lap,
  LocationSample,
  PitStop,
  RaceControlMessage,
  SessionInfo,
  SessionResultRow,
  Stint,
  TeamRadioClip,
  TrackWeatherSample,
} from '../types.js';
import type { ICachedHttpClient } from '@node-yalc/transports';

type Raw = Record<string, unknown>;

const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);

function lastDefined(v: unknown): unknown {
  if (!Array.isArray(v)) return v;
  for (let i = v.length - 1; i >= 0; i--) if (v[i] !== null && v[i] !== undefined) return v[i];
  return null;
}

export const mapSession = (r: Raw): SessionInfo => ({
  sessionKey: num(r.session_key),
  meetingKey: num(r.meeting_key),
  name: str(r.session_name),
  type: str(r.session_type),
  circuit: str(r.circuit_short_name),
  country: str(r.country_name),
  location: str(r.location),
  dateStart: str(r.date_start),
  dateEnd: str(r.date_end),
  year: num(r.year),
});

export const mapDriver = (r: Raw): DriverInfo => ({
  number: num(r.driver_number),
  acronym: str(r.name_acronym, String(num(r.driver_number))),
  fullName: str(r.full_name, str(r.broadcast_name)),
  team: str(r.team_name, 'Unknown'),
  teamColour: str(r.team_colour, '888888'),
  headshotUrl: strOrNull(r.headshot_url),
});

export const mapLap = (r: Raw): Lap => ({
  driver: num(r.driver_number),
  lap: num(r.lap_number),
  start: strOrNull(r.date_start),
  duration: numOrNull(r.lap_duration),
  sector1: numOrNull(r.duration_sector_1),
  sector2: numOrNull(r.duration_sector_2),
  sector3: numOrNull(r.duration_sector_3),
  i1Speed: numOrNull(r.i1_speed),
  i2Speed: numOrNull(r.i2_speed),
  speedTrap: numOrNull(r.st_speed),
  pitOutLap: r.is_pit_out_lap === true,
});

export const mapStint = (r: Raw): Stint => ({
  driver: num(r.driver_number),
  stint: num(r.stint_number),
  lapStart: num(r.lap_start),
  lapEnd: num(r.lap_end, num(r.lap_start)),
  compound: str(r.compound, 'UNKNOWN'),
  tyreAgeAtStart: num(r.tyre_age_at_start),
});

export const mapPit = (r: Raw): PitStop => ({
  driver: num(r.driver_number),
  lap: num(r.lap_number),
  date: str(r.date),
  laneDuration: numOrNull(r.lane_duration) ?? numOrNull(r.pit_duration),
  stopDuration: numOrNull(r.stop_duration),
});

export const mapCarSample = (r: Raw): CarSample => ({
  date: str(r.date),
  speed: num(r.speed),
  rpm: num(r.rpm),
  gear: num(r.n_gear),
  throttle: num(r.throttle),
  brake: num(r.brake),
  drs: numOrNull(r.drs),
});

export const mapLocation = (r: Raw): LocationSample => ({
  date: str(r.date),
  x: num(r.x),
  y: num(r.y),
  z: num(r.z),
});

export const mapRaceControl = (r: Raw): RaceControlMessage => ({
  date: str(r.date),
  lap: numOrNull(r.lap_number),
  category: str(r.category),
  flag: strOrNull(r.flag),
  scope: strOrNull(r.scope),
  driver: numOrNull(r.driver_number),
  message: str(r.message),
});

export const mapWeather = (r: Raw): TrackWeatherSample => ({
  date: str(r.date),
  airTemperature: num(r.air_temperature),
  trackTemperature: num(r.track_temperature),
  humidity: num(r.humidity),
  pressure: num(r.pressure),
  rainfall: num(r.rainfall),
  windSpeed: num(r.wind_speed),
  windDirection: num(r.wind_direction),
});

export const mapRadio = (r: Raw): TeamRadioClip => ({
  date: str(r.date),
  driver: num(r.driver_number),
  recordingUrl: str(r.recording_url),
});

export const mapResult = (r: Raw): SessionResultRow => {
  const gap = lastDefined(r.gap_to_leader);
  const duration = lastDefined(r.duration);
  return {
    position: numOrNull(r.position),
    driver: num(r.driver_number),
    laps: num(r.number_of_laps),
    points: num(r.points),
    dnf: r.dnf === true,
    dns: r.dns === true,
    dsq: r.dsq === true,
    gapToLeader: typeof gap === 'number' || typeof gap === 'string' ? gap : null,
    duration: numOrNull(duration),
  };
};

export const mapInterval = (r: Raw): IntervalSample => {
  const gap = r.gap_to_leader;
  const int = r.interval;
  return {
    date: str(r.date),
    driver: num(r.driver_number),
    gapToLeader: typeof gap === 'number' || typeof gap === 'string' ? gap : null,
    interval: typeof int === 'number' || typeof int === 'string' ? int : null,
  };
};

function list<T>(payload: unknown, mapper: (r: Raw) => T): T[] {
  return Array.isArray(payload) ? payload.filter((x) => x && typeof x === 'object').map((x) => mapper(x as Raw)) : [];
}

export class OpenF1Client {
  constructor(private readonly http: ICachedHttpClient) {}

  async sessions(year: number, ttl: number): Promise<SessionInfo[]> {
    return list(await this.http.getJson(`/sessions?year=${year}`, ttl), mapSession);
  }

  async session(sessionKey: number, ttl: number): Promise<SessionInfo | null> {
    const rows = list(await this.http.getJson(`/sessions?session_key=${sessionKey}`, ttl), mapSession);
    return rows[0] ?? null;
  }

  async drivers(sessionKey: number, ttl: number): Promise<DriverInfo[]> {
    const rows = list(await this.http.getJson(`/drivers?session_key=${sessionKey}`, ttl), mapDriver);
    const unique = new Map<number, DriverInfo>();
    for (const d of rows) unique.set(d.number, d);
    return [...unique.values()];
  }

  async laps(sessionKey: number, ttl: number): Promise<Lap[]> {
    return list(await this.http.getJson(`/laps?session_key=${sessionKey}`, ttl), mapLap);
  }

  async stints(sessionKey: number, ttl: number): Promise<Stint[]> {
    return list(await this.http.getJson(`/stints?session_key=${sessionKey}`, ttl), mapStint);
  }

  async pitStops(sessionKey: number, ttl: number): Promise<PitStop[]> {
    return list(await this.http.getJson(`/pit?session_key=${sessionKey}`, ttl), mapPit);
  }

  async raceControl(sessionKey: number, ttl: number): Promise<RaceControlMessage[]> {
    return list(await this.http.getJson(`/race_control?session_key=${sessionKey}`, ttl), mapRaceControl);
  }

  async weather(sessionKey: number, ttl: number): Promise<TrackWeatherSample[]> {
    return list(await this.http.getJson(`/weather?session_key=${sessionKey}`, ttl), mapWeather);
  }

  async teamRadio(sessionKey: number, ttl: number): Promise<TeamRadioClip[]> {
    return list(await this.http.getJson(`/team_radio?session_key=${sessionKey}`, ttl), mapRadio);
  }

  async sessionResult(sessionKey: number, ttl: number): Promise<SessionResultRow[]> {
    return list(await this.http.getJson(`/session_result?session_key=${sessionKey}`, ttl), mapResult);
  }

  async intervals(sessionKey: number, ttl: number): Promise<IntervalSample[]> {
    return list(await this.http.getJson(`/intervals?session_key=${sessionKey}`, ttl), mapInterval);
  }

  async carData(sessionKey: number, driver: number, fromIso: string, toIso: string, ttl: number): Promise<CarSample[]> {
    const q = `/car_data?session_key=${sessionKey}&driver_number=${driver}&date>=${encodeURIComponent(fromIso)}&date<=${encodeURIComponent(toIso)}`;
    return list(await this.http.getJson(q, ttl), mapCarSample);
  }

  async location(sessionKey: number, driver: number, fromIso: string, toIso: string, ttl: number): Promise<LocationSample[]> {
    const q = `/location?session_key=${sessionKey}&driver_number=${driver}&date>=${encodeURIComponent(fromIso)}&date<=${encodeURIComponent(toIso)}`;
    return list(await this.http.getJson(q, ttl), mapLocation);
  }
}
