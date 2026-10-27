"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JolpicaClient = void 0;
exports.mapRace = mapRace;
const toNum = (v) => {
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : 0;
};
const utc = (date, time) => `${String(date)}T${typeof time === 'string' ? time : '00:00:00Z'}`;
const SESSION_FIELDS = [
    ['FirstPractice', 'Practice 1'],
    ['SecondPractice', 'Practice 2'],
    ['ThirdPractice', 'Practice 3'],
    ['SprintQualifying', 'Sprint Qualifying'],
    ['SprintShootout', 'Sprint Shootout'],
    ['Sprint', 'Sprint'],
    ['Qualifying', 'Qualifying'],
];
function mapRace(r) {
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
function standingsList(payload) {
    return payload?.MRData?.StandingsTable?.StandingsLists?.[0] ?? null;
}
class JolpicaClient {
    http;
    constructor(http) {
        this.http = http;
    }
    async driverStandings(season, ttl) {
        const list = standingsList(await this.http.getJson(`/${season}/driverstandings.json?limit=100`, ttl));
        if (!list)
            return { season: null, round: null, rows: [] };
        const rows = (list.DriverStandings ?? []).map((d) => ({
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
    async constructorStandings(season, ttl) {
        const list = standingsList(await this.http.getJson(`/${season}/constructorstandings.json?limit=100`, ttl));
        if (!list)
            return { season: null, round: null, rows: [] };
        const rows = (list.ConstructorStandings ?? []).map((c) => ({
            position: toNum(c.position ?? c.positionText),
            points: toNum(c.points),
            wins: toNum(c.wins),
            constructorId: String(c.Constructor?.constructorId ?? ''),
            name: String(c.Constructor?.name ?? ''),
        }));
        return { season: toNum(list.season), round: toNum(list.round), rows };
    }
    async nextRace(ttl) {
        const payload = await this.http.getJson('/current/next.json', ttl);
        const race = payload?.MRData?.RaceTable?.Races?.[0];
        return race ? mapRace(race) : null;
    }
}
exports.JolpicaClient = JolpicaClient;
