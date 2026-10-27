"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MARANELLO_COORDINATES = void 0;
exports.summariseTrackWeather = summariseTrackWeather;
exports.weatherDescription = weatherDescription;
exports.MARANELLO_COORDINATES = {
    latitude: 44.5326,
    longitude: 10.864,
    name: 'Scuderia Ferrari Gestione Sportiva, Maranello',
};
function summariseTrackWeather(samples) {
    if (samples.length === 0)
        return null;
    let airMin = Infinity, airMax = -Infinity, airSum = 0;
    let trackMin = Infinity, trackMax = -Infinity, trackSum = 0;
    let humidityMax = 0;
    let windSpeedMax = 0;
    let rainDetected = false;
    for (const s of samples) {
        if (s.airTemperature < airMin)
            airMin = s.airTemperature;
        if (s.airTemperature > airMax)
            airMax = s.airTemperature;
        airSum += s.airTemperature;
        if (s.trackTemperature < trackMin)
            trackMin = s.trackTemperature;
        if (s.trackTemperature > trackMax)
            trackMax = s.trackTemperature;
        trackSum += s.trackTemperature;
        if (s.humidity > humidityMax)
            humidityMax = s.humidity;
        if (s.windSpeed > windSpeedMax)
            windSpeedMax = s.windSpeed;
        if (s.rainfall > 0)
            rainDetected = true;
    }
    const n = samples.length;
    return {
        samples: n,
        airTemperature: {
            min: Number(airMin.toFixed(1)),
            max: Number(airMax.toFixed(1)),
            avg: Number((airSum / n).toFixed(1)),
        },
        trackTemperature: {
            min: Number(trackMin.toFixed(1)),
            max: Number(trackMax.toFixed(1)),
            avg: Number((trackSum / n).toFixed(1)),
        },
        humidityMax: Number(humidityMax.toFixed(1)),
        windSpeedMax: Number(windSpeedMax.toFixed(1)),
        rainDetected,
    };
}
function weatherDescription(code) {
    switch (code) {
        case 0: return 'Clear sky';
        case 1:
        case 2: return 'Mainly clear / partly cloudy';
        case 3: return 'Overcast';
        case 45:
        case 48: return 'Fog';
        case 51:
        case 53:
        case 55: return 'Drizzle';
        case 61:
        case 63:
        case 65: return 'Rain';
        case 71:
        case 73:
        case 75: return 'Snow';
        case 80:
        case 81:
        case 82: return 'Rain showers';
        case 95:
        case 96:
        case 99: return 'Thunderstorm';
        default: return 'Variable conditions';
    }
}
