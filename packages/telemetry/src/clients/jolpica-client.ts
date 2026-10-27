import { ConstructorStanding, DriverStanding, RaceWeekend } from '../championship/championship.js';
import type { ICachedHttpClient } from '@node-yalc/transports';

type Raw = Record<string, any>;

const toNum = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};

const utc = (date: unknown, time: unknown): string => `${String(date)}T${typeof time === 'string' ? time : '00:00:00Z'}`;

const SESSION_FIELDS: [string, string][] = [
  ['FirstPractice', 'Practice 1'],
  ['SecondPractice', 'Practice 2'],
  ['ThirdPractice', 'Practice 3'],
  ['SprintQualifying', 'Sprint Qualifying'],
  ['SprintShootout', 'Sprint Shootout'],
  ['Sprint', 'Sprint'],
  ['Qualifying', 'Qualifying'],
];

export function mapRace(r: Raw): RaceWeekend {
  const loc = r.Circuit?.Location ?? {};
  const sessions = SESSION_FIELDS.filter(([k]) => r[k]?.date).map(([k, name]) => ({ name, startUtc: utc(r[k].date, r[k].time) }));
  const raceStartUtc = utc(r.date, r.time);
  sessions.push({ name: 'Race', startUtc: raceStartUtc });
  sessions.sort((a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc));
  return {
    season: toNum(r.season),
    round: toNum(r.round),
    raceName: String(r.raceName ?? ''),
    circuitName: String(r.Circuit?.circuitName ?? ''),
    locality: String(loc.locality ?? ''),
    country: String(loc.country ?? ''),
    latitude: toNum(loc.lat),
    longitude: toNum(loc.long),
    raceStartUtc,
    sessions,
  };
}

export interface StandingsPayload<T> {
  readonly season: number | null;
  readonly round: number | null;
  readonly rows: T[];
}

function standingsList(payload: Raw): Raw | null {
  return payload?.MRData?.StandingsTable?.StandingsLists?.[0] ?? null;
}

export class JolpicaClient {
  constructor(private readonly http: ICachedHttpClient) {}

  async driverStandings(season: string, ttl: number): Promise<StandingsPayload<DriverStanding>> {
    const list = standingsList(await this.http.getJson<Raw>(`/${season}/driverstandings.json?limit=100`, ttl));
    if (!list) return { season: null, round: null, rows: [] };
    const rows: DriverStanding[] = (list.DriverStandings ?? []).map((d: Raw) => ({
      position: toNum(d.position ?? d.positionText),
      points: toNum(d.points),
      wins: toNum(d.wins),
      driverId: String(d.Driver?.driverId ?? ''),
      code: String(d.Driver?.code ?? d.Driver?.familyName?.slice(0, 3).toUpperCase() ?? ''),
      name: `${d.Driver?.givenName ?? ''} ${d.Driver?.familyName ?? ''}`.trim(),
      constructor: String(d.Constructors?.[d.Constructors.length - 1]?.name ?? ''),
    }));
    return { season: toNum(list.season), round: toNum(list.round), rows };
  }

  async constructorStandings(season: string, ttl: number): Promise<StandingsPayload<ConstructorStanding>> {
    const list = standingsList(await this.http.getJson<Raw>(`/${season}/constructorstandings.json?limit=100`, ttl));
    if (!list) return { season: null, round: null, rows: [] };
    const rows: ConstructorStanding[] = (list.ConstructorStandings ?? []).map((c: Raw) => ({
      position: toNum(c.position ?? c.positionText),
      points: toNum(c.points),
      wins: toNum(c.wins),
      constructorId: String(c.Constructor?.constructorId ?? ''),
      name: String(c.Constructor?.name ?? ''),
    }));
    return { season: toNum(list.season), round: toNum(list.round), rows };
  }

  async nextRace(ttl: number): Promise<RaceWeekend | null> {
    const payload = await this.http.getJson<Raw>('/current/next.json', ttl);
    const race = payload?.MRData?.RaceTable?.Races?.[0];
    return race ? mapRace(race) : null;
  }
}
