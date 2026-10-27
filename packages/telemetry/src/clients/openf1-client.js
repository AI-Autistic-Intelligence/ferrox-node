"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenF1Client = exports.mapInterval = exports.mapResult = exports.mapRadio = exports.mapWeather = exports.mapRaceControl = exports.mapLocation = exports.mapCarSample = exports.mapPit = exports.mapStint = exports.mapLap = exports.mapDriver = exports.mapSession = void 0;
const num = (v, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const numOrNull = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v, fallback = '') => (typeof v === 'string' ? v : fallback);
const strOrNull = (v) => (typeof v === 'string' && v.length > 0 ? v : null);
function lastDefined(v) {
    if (!Array.isArray(v))
        return v;
    for (let i = v.length - 1; i >= 0; i--)
        if (v[i] !== null && v[i] !== undefined)
            return v[i];
    return null;
}
const mapSession = (r) => ({
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
exports.mapSession = mapSession;
const mapDriver = (r) => ({
    number: num(r.driver_number),
    acronym: str(r.name_acronym, String(num(r.driver_number))),
    fullName: str(r.full_name, str(r.broadcast_name)),
    team: str(r.team_name, 'Unknown'),
    teamColour: str(r.team_colour, '888888'),
    headshotUrl: strOrNull(r.headshot_url),
});
exports.mapDriver = mapDriver;
const mapLap = (r) => ({
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
exports.mapLap = mapLap;
const mapStint = (r) => ({
    driver: num(r.driver_number),
    stint: num(r.stint_number),
    lapStart: num(r.lap_start),
    lapEnd: num(r.lap_end, num(r.lap_start)),
    compound: str(r.compound, 'UNKNOWN'),
    tyreAgeAtStart: num(r.tyre_age_at_start),
});
exports.mapStint = mapStint;
const mapPit = (r) => ({
    driver: num(r.driver_number),
    lap: num(r.lap_number),
    date: str(r.date),
    laneDuration: numOrNull(r.lane_duration) ?? numOrNull(r.pit_duration),
    stopDuration: numOrNull(r.stop_duration),
});
exports.mapPit = mapPit;
const mapCarSample = (r) => ({
    date: str(r.date),
    speed: num(r.speed),
    rpm: num(r.rpm),
    gear: num(r.n_gear),
    throttle: num(r.throttle),
    brake: num(r.brake),
    drs: numOrNull(r.drs),
});
exports.mapCarSample = mapCarSample;
const mapLocation = (r) => ({
    date: str(r.date),
    x: num(r.x),
    y: num(r.y),
    z: num(r.z),
});
exports.mapLocation = mapLocation;
const mapRaceControl = (r) => ({
    date: str(r.date),
    lap: numOrNull(r.lap_number),
    category: str(r.category),
    flag: strOrNull(r.flag),
    scope: strOrNull(r.scope),
    driver: numOrNull(r.driver_number),
    message: str(r.message),
});
exports.mapRaceControl = mapRaceControl;
const mapWeather = (r) => ({
    date: str(r.date),
    airTemperature: num(r.air_temperature),
    trackTemperature: num(r.track_temperature),
    humidity: num(r.humidity),
    pressure: num(r.pressure),
    rainfall: num(r.rainfall),
    windSpeed: num(r.wind_speed),
    windDirection: num(r.wind_direction),
});
exports.mapWeather = mapWeather;
const mapRadio = (r) => ({
    date: str(r.date),
    driver: num(r.driver_number),
    recordingUrl: str(r.recording_url),
});
exports.mapRadio = mapRadio;
const mapResult = (r) => {
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
exports.mapResult = mapResult;
const mapInterval = (r) => {
    const gap = r.gap_to_leader;
    const int = r.interval;
    return {
        date: str(r.date),
        driver: num(r.driver_number),
        gapToLeader: typeof gap === 'number' || typeof gap === 'string' ? gap : null,
        interval: typeof int === 'number' || typeof int === 'string' ? int : null,
    };
};
exports.mapInterval = mapInterval;
function list(payload, mapper) {
    return Array.isArray(payload) ? payload.filter((x) => x && typeof x === 'object').map((x) => mapper(x)) : [];
}
class OpenF1Client {
    http;
    constructor(http) {
        this.http = http;
    }
    async sessions(year, ttl) {
        return list(await this.http.getJson(`/sessions?year=${year}`, ttl), exports.mapSession);
    }
    async session(sessionKey, ttl) {
        const rows = list(await this.http.getJson(`/sessions?session_key=${sessionKey}`, ttl), exports.mapSession);
        return rows[0] ?? null;
    }
    async drivers(sessionKey, ttl) {
        const rows = list(await this.http.getJson(`/drivers?session_key=${sessionKey}`, ttl), exports.mapDriver);
        const unique = new Map();
        for (const d of rows)
            unique.set(d.number, d);
        return [...unique.values()];
    }
    async laps(sessionKey, ttl) {
        return list(await this.http.getJson(`/laps?session_key=${sessionKey}`, ttl), exports.mapLap);
    }
    async stints(sessionKey, ttl) {
        return list(await this.http.getJson(`/stints?session_key=${sessionKey}`, ttl), exports.mapStint);
    }
    async pitStops(sessionKey, ttl) {
        return list(await this.http.getJson(`/pit?session_key=${sessionKey}`, ttl), exports.mapPit);
    }
    async raceControl(sessionKey, ttl) {
        return list(await this.http.getJson(`/race_control?session_key=${sessionKey}`, ttl), exports.mapRaceControl);
    }
    async weather(sessionKey, ttl) {
        return list(await this.http.getJson(`/weather?session_key=${sessionKey}`, ttl), exports.mapWeather);
    }
    async teamRadio(sessionKey, ttl) {
        return list(await this.http.getJson(`/team_radio?session_key=${sessionKey}`, ttl), exports.mapRadio);
    }
    async sessionResult(sessionKey, ttl) {
        return list(await this.http.getJson(`/session_result?session_key=${sessionKey}`, ttl), exports.mapResult);
    }
    async intervals(sessionKey, ttl) {
        return list(await this.http.getJson(`/intervals?session_key=${sessionKey}`, ttl), exports.mapInterval);
    }
    async carData(sessionKey, driver, fromIso, toIso, ttl) {
        const q = `/car_data?session_key=${sessionKey}&driver_number=${driver}&date>=${encodeURIComponent(fromIso)}&date<=${encodeURIComponent(toIso)}`;
        return list(await this.http.getJson(q, ttl), exports.mapCarSample);
    }
    async location(sessionKey, driver, fromIso, toIso, ttl) {
        const q = `/location?session_key=${sessionKey}&driver_number=${driver}&date>=${encodeURIComponent(fromIso)}&date<=${encodeURIComponent(toIso)}`;
        return list(await this.http.getJson(q, ttl), exports.mapLocation);
    }
}
exports.OpenF1Client = OpenF1Client;
