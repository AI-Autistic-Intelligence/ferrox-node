"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenMeteoClient = void 0;
const weather_js_1 = require("../weather/weather.js");
const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
class OpenMeteoClient {
    http;
    constructor(http) {
        this.http = http;
    }
    async current(lat, lon, ttl) {
        const q = `/v1/forecast?latitude=${lat}&longitude=${lon}` +
            '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure' +
            '&timezone=auto';
        const p = await this.http.getJson(q, ttl);
        const c = p?.current;
        if (!c)
            return null;
        return {
            latitude: n(p.latitude),
            longitude: n(p.longitude),
            time: String(c.time),
            timezone: String(p.timezone ?? 'UTC'),
            temperature: n(c.temperature_2m),
            apparentTemperature: n(c.apparent_temperature),
            humidity: n(c.relative_humidity_2m),
            precipitation: n(c.precipitation),
            weatherCode: n(c.weather_code),
            description: (0, weather_js_1.weatherDescription)(n(c.weather_code)),
            windSpeed: n(c.wind_speed_10m),
            windDirection: n(c.wind_direction_10m),
            pressure: n(c.surface_pressure),
        };
    }
    async hourly(lat, lon, startDate, endDate, ttl) {
        const q = `/v1/forecast?latitude=${lat}&longitude=${lon}` +
            '&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m' +
            `&start_date=${startDate}&end_date=${endDate}&timezone=GMT`;
        const p = await this.http.getJson(q, ttl);
        const h = p?.hourly;
        if (!h || !Array.isArray(h.time))
            return [];
        return h.time.map((t, i) => ({
            time: `${t}Z`,
            temperature: n(h.temperature_2m?.[i]),
            precipitationProbability: n(h.precipitation_probability?.[i]),
            weatherCode: n(h.weather_code?.[i]),
            windSpeed: n(h.wind_speed_10m?.[i]),
        }));
    }
}
exports.OpenMeteoClient = OpenMeteoClient;
