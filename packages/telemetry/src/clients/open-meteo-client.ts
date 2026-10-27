import { weatherDescription } from '../weather/weather.js';
import type { ICachedHttpClient } from '@node-yalc/transports';

type Raw = Record<string, any>;

export interface CurrentConditions {
  readonly latitude: number;
  readonly longitude: number;
  readonly time: string;
  readonly timezone: string;
  readonly temperature: number;
  readonly apparentTemperature: number;
  readonly humidity: number;
  readonly precipitation: number;
  readonly weatherCode: number;
  readonly description: string;
  readonly windSpeed: number;
  readonly windDirection: number;
  readonly pressure: number;
}

export interface HourlyForecastPoint {
  readonly time: string;
  readonly temperature: number;
  readonly precipitationProbability: number;
  readonly weatherCode: number;
  readonly windSpeed: number;
}

const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export class OpenMeteoClient {
  constructor(private readonly http: ICachedHttpClient) {}

  async current(lat: number, lon: number, ttl: number): Promise<CurrentConditions | null> {
    const q =
      `/v1/forecast?latitude=${lat}&longitude=${lon}` +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure' +
      '&timezone=auto';
    const p = await this.http.getJson<Raw>(q, ttl);
    const c = p?.current;
    if (!c) return null;
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
      description: weatherDescription(n(c.weather_code)),
      windSpeed: n(c.wind_speed_10m),
      windDirection: n(c.wind_direction_10m),
      pressure: n(c.surface_pressure),
    };
  }

  async hourly(lat: number, lon: number, startDate: string, endDate: string, ttl: number): Promise<HourlyForecastPoint[]> {
    const q =
      `/v1/forecast?latitude=${lat}&longitude=${lon}` +
      '&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m' +
      `&start_date=${startDate}&end_date=${endDate}&timezone=GMT`;
    const p = await this.http.getJson<Raw>(q, ttl);
    const h = p?.hourly;
    if (!h || !Array.isArray(h.time)) return [];
    return h.time.map((t: string, i: number) => ({
      time: `${t}Z`,
      temperature: n(h.temperature_2m?.[i]),
      precipitationProbability: n(h.precipitation_probability?.[i]),
      weatherCode: n(h.weather_code?.[i]),
      windSpeed: n(h.wind_speed_10m?.[i]),
    }));
  }
}
