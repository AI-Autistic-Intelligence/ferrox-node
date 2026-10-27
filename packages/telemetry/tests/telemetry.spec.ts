import {
  isFerrari,
  sessionAvailability,
  isImmutable,
  computeCurvature,
  buildVehicleDynamics,
  computeVehicleDynamics,
  computeAeroEfficiency,
  buildDistanceTrace,
  traceStats,
  alignTraceToLapTime,
  resampleByDistance,
  computeDelta,
  buildTrackMap,
  downsample,
  interpolateAtDistance,
  computeLapComparison,
  linearRegression,
  computeStintDegradation,
  evaluateUndercutWindow,
  computePitMedianTime,
  fuelCorrectedLapTime,
  computeFuelCorrectedStints,
  computeDriverPaceSummary,
  computeRacePaceAnalysis,
  ferrariChampionshipView,
  calculateMaxRemainingPoints,
  isContenderMathematicallyEliminated,
  summariseTrackWeather,
  weatherDescription,
  MARANELLO_COORDINATES,
  OpenF1Client,
  JolpicaClient,
  OpenMeteoClient,
  mapSession,
  mapDriver,
  mapLap,
  mapStint,
  mapPit,
  mapCarSample,
  mapLocation,
  mapRaceControl,
  mapWeather,
  mapRadio,
  mapResult,
  mapInterval,
  mapRace,
} from '../src/index.js';

describe('@ferrox-node/telemetry Suite', () => {
  describe('types & helper rules', () => {
    it('identifies Ferrari teams correctly', () => {
      expect(isFerrari({ team: 'Scuderia Ferrari' })).toBe(true);
      expect(isFerrari({ team: 'Ferrari HP' })).toBe(true);
      expect(isFerrari({ team: 'Red Bull Racing' })).toBe(false);
    });

    it('determines session availability and immutability', () => {
      const now = Date.parse('2026-05-10T15:00:00Z');
      const upcoming = {
        dateStart: '2026-05-10T16:00:00Z',
        dateEnd: '2026-05-10T18:00:00Z',
      };
      expect(sessionAvailability(upcoming, now)).toBe('upcoming');

      const live = {
        dateStart: '2026-05-10T14:45:00Z',
        dateEnd: '2026-05-10T17:00:00Z',
      };
      expect(sessionAvailability(live, now)).toBe('live');

      const past = {
        dateStart: '2026-05-10T10:00:00Z',
        dateEnd: '2026-05-10T12:00:00Z',
      };
      expect(sessionAvailability(past, now)).toBe('available');
      expect(isImmutable(past, now)).toBe(true);
    });
  });

  describe('vehicle dynamics & aero', () => {
    it('computes curvature kappa and handles collinear points', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 10, y: 0 };
      const p3 = { x: 20, y: 0 };
      const c1 = computeCurvature(p1, p2, p3);
      expect(c1.kappa).toBe(0);

      const pArc1 = { x: 0, y: 10 };
      const pArc2 = { x: 10, y: 0 };
      const pArc3 = { x: 20, y: 10 };
      const c2 = computeCurvature(pArc1, pArc2, pArc3);
      expect(c2.kappa).toBeGreaterThan(0);
    });

    it('builds vehicle dynamics trace and G-G envelope', () => {
      const car = [
        { date: '2026-05-10T12:00:00.000Z', speed: 200, rpm: 11000, gear: 6, throttle: 100, brake: 0, drs: 12 },
        { date: '2026-05-10T12:00:01.000Z', speed: 220, rpm: 11500, gear: 6, throttle: 100, brake: 0, drs: 12 },
        { date: '2026-05-10T12:00:02.000Z', speed: 100, rpm: 8000, gear: 3, throttle: 0, brake: 1, drs: 0 },
        { date: '2026-05-10T12:00:03.000Z', speed: 80, rpm: 7500, gear: 2, throttle: 20, brake: 0, drs: 0 },
        { date: '2026-05-10T12:00:04.000Z', speed: 120, rpm: 9000, gear: 3, throttle: 80, brake: 0, drs: 0 },
      ];
      const loc = [
        { date: '2026-05-10T12:00:00.000Z', x: 100, y: 200, z: 0 },
        { date: '2026-05-10T12:00:01.000Z', x: 150, y: 220, z: 0 },
        { date: '2026-05-10T12:00:02.000Z', x: 200, y: 300, z: 0 },
        { date: '2026-05-10T12:00:03.000Z', x: 250, y: 320, z: 0 },
        { date: '2026-05-10T12:00:04.000Z', x: 300, y: 350, z: 0 },
      ];

      const res = buildVehicleDynamics(car, loc);
      expect(res.trace.length).toBe(5);
      expect(res.envelope.samples.length).toBeGreaterThan(0);
      expect(computeVehicleDynamics).toBe(buildVehicleDynamics);

      const aero = computeAeroEfficiency(res.trace, 280, 310, 335);
      expect(aero.topSpeedDrsOn).toBe(220);
      expect(aero.topSpeedDrsOff).toBe(120);
      expect(aero.drsDeltaKmh).toBe(100);
      expect(aero.speedTrap).toBe(335);
    });

    it('handles empty vehicle dynamics gracefully', () => {
      const res = buildVehicleDynamics([], []);
      expect(res.trace).toEqual([]);
      expect(res.envelope.maxBrakingG).toBe(0);
    });
  });

  describe('kinematics & distance trace', () => {
    const carSamples = [
      { date: '2026-05-10T12:00:00.000Z', speed: 150, rpm: 10000, gear: 5, throttle: 100, brake: 0, drs: 0 },
      { date: '2026-05-10T12:00:01.000Z', speed: 200, rpm: 11000, gear: 6, throttle: 100, brake: 0, drs: 12 },
      { date: '2026-05-10T12:00:02.000Z', speed: 100, rpm: 7500, gear: 3, throttle: 0, brake: 1, drs: 0 },
      { date: '2026-05-10T12:00:03.000Z', speed: 180, rpm: 10500, gear: 5, throttle: 99, brake: 0, drs: 0 },
    ];

    it('builds distance trace and calculates trace stats', () => {
      const trace = buildDistanceTrace(carSamples);
      expect(trace.length).toBe(4);
      expect(trace[trace.length - 1].d).toBeGreaterThan(0);

      const stats = traceStats(trace);
      expect(stats).not.toBeNull();
      expect(stats!.topSpeed).toBe(200);
      expect(stats!.minimumSpeed).toBe(100);
      expect(stats!.gearChanges).toBeGreaterThan(0);
    });

    it('aligns trace to lap time and resamples by distance', () => {
      const trace = buildDistanceTrace(carSamples);
      const aligned = alignTraceToLapTime(trace, 85.5);
      expect(aligned[aligned.length - 1].t).toBeCloseTo(85.5);

      const resampled = resampleByDistance(aligned, 10);
      expect(resampled.length).toBeGreaterThan(0);
      expect(resampled[0].d).toBe(0);

      const delta = computeDelta(trace, aligned, 10);
      expect(delta.length).toBeGreaterThan(0);
    });

    it('builds SVG track map and downsamples items', () => {
      const trace = buildDistanceTrace(carSamples);
      const loc = [
        { date: '2026-05-10T12:00:00.000Z', x: 100, y: 150, z: 0 },
        { date: '2026-05-10T12:00:01.000Z', x: 200, y: 250, z: 0 },
        { date: '2026-05-10T12:00:02.000Z', x: 300, y: 350, z: 0 },
        { date: '2026-05-10T12:00:03.000Z', x: 400, y: 450, z: 0 },
      ];
      const map = buildTrackMap(loc, trace, carSamples[0].date);
      expect(map.points.length).toBe(4);
      expect(downsample([1, 2, 3, 4, 5], 3).length).toBe(3);
    });

    it('interpolates at distance and computes lap comparison', () => {
      const carA = [
        { date: '2026-05-10T12:00:00.000Z', speed: 150, rpm: 10000, gear: 5, throttle: 100, brake: 0, drs: 0 },
        { date: '2026-05-10T12:00:02.000Z', speed: 220, rpm: 11500, gear: 6, throttle: 100, brake: 0, drs: 0 },
      ];
      const carB = [
        { date: '2026-05-10T12:00:00.000Z', speed: 140, rpm: 9800, gear: 5, throttle: 100, brake: 0, drs: 0 },
        { date: '2026-05-10T12:00:02.000Z', speed: 210, rpm: 11200, gear: 6, throttle: 100, brake: 0, drs: 0 },
      ];
      const dynA = buildVehicleDynamics(carA, []);
      const dynB = buildVehicleDynamics(carB, []);

      const p = interpolateAtDistance(dynA.trace, 20);
      expect((p as any).d).toBeUndefined(); // InterpolatedPoint has no d, only t/speed/etc.
      expect(p.speed).toBeGreaterThan(0);

      const driverA = { number: 16, acronym: 'LEC', fullName: 'Charles Leclerc', team: 'Ferrari', teamColour: 'E80020', headshotUrl: null };
      const driverB = { number: 55, acronym: 'SAI', fullName: 'Carlos Sainz', team: 'Ferrari', teamColour: 'E80020', headshotUrl: null };
      const lapA = { driver: 16, lap: 5, start: null, duration: 80.5, sector1: null, sector2: null, sector3: null, i1Speed: null, i2Speed: null, speedTrap: null, pitOutLap: false };
      const lapB = { driver: 55, lap: 5, start: null, duration: 80.9, sector1: null, sector2: null, sector3: null, i1Speed: null, i2Speed: null, speedTrap: null, pitOutLap: false };

      const comp = computeLapComparison(driverA, driverB, lapA, lapB, dynA, dynB, 10, 5);
      expect(comp.samples.length).toBeGreaterThan(0);
      expect(comp.miniSectors.length).toBe(5);
      expect(comp.fasterDriverNumber).toBe(16);
    });
  });

  describe('race strategy, tyre degradation & fuel correction', () => {
    it('performs linear regression accurately', () => {
      const res = linearRegression([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
      expect(res).not.toBeNull();
      expect(res!.slope).toBe(2);
      expect(res!.intercept).toBe(0);
      expect(res!.r2).toBe(1);

      expect(linearRegression([1], [1])).toBeNull();
      expect(linearRegression([1, 1], [1, 2])).toBeNull();
    });

    it('computes fuel corrected lap time and stints degradation', () => {
      const corr = fuelCorrectedLapTime(90.0, 10, 0.05);
      expect(corr).toBe(90.45);

      const stints = [{ driver: 16, stint: 1, lapStart: 1, lapEnd: 6, compound: 'MEDIUM', tyreAgeAtStart: 0 }];
      const laps = [
        { driver: 16, lap: 2, duration: 90.0, pitOutLap: false, start: null, sector1: null, sector2: null, sector3: null, i1Speed: null, i2Speed: null, speedTrap: null },
        { driver: 16, lap: 3, duration: 90.2, pitOutLap: false, start: null, sector1: null, sector2: null, sector3: null, i1Speed: null, i2Speed: null, speedTrap: null },
        { driver: 16, lap: 4, duration: 90.4, pitOutLap: false, start: null, sector1: null, sector2: null, sector3: null, i1Speed: null, i2Speed: null, speedTrap: null },
        { driver: 16, lap: 5, duration: 90.7, pitOutLap: false, start: null, sector1: null, sector2: null, sector3: null, i1Speed: null, i2Speed: null, speedTrap: null },
      ];

      const corrStints = computeFuelCorrectedStints(stints, laps, []);
      expect(corrStints.length).toBe(1);
      expect(corrStints[0].compound).toBe('MEDIUM');
      expect(corrStints[0].fuelCorrectedDegSlope).toBeGreaterThan(0);

      const deg = computeStintDegradation(stints, laps, []);
      expect(deg.length).toBe(1);
    });

    it('evaluates undercut window and pit median time', () => {
      const pred = evaluateUndercutWindow(16, 1, 1.0, 22.0, 0.08, 0.5, 20);
      expect(pred.undercutSuccessProbability).toBe(92);
      expect(pred.optimalPitWindowLap).toBe(21);

      const predFar = evaluateUndercutWindow(16, 1, 4.0, 22.0, 0.08, 0.5, 20);
      expect(predFar.undercutSuccessProbability).toBe(10);

      const pits = [
        { driver: 16, lap: 20, date: '', laneDuration: 21.5, stopDuration: 2.3 },
        { driver: 55, lap: 21, date: '', laneDuration: 22.5, stopDuration: 2.5 },
      ];
      expect(computePitMedianTime(pits)).toBe(22.0);
      expect(computePitMedianTime([])).toBe(22.0);
    });

    it('computes driver pace summary and race pace analysis', () => {
      const driver = { number: 16, acronym: 'LEC', fullName: 'Charles Leclerc', team: 'Ferrari', teamColour: 'E80020', headshotUrl: null };
      const laps = [
        { driver: 16, lap: 2, duration: 90.0, pitOutLap: false, start: null, sector1: 30.0, sector2: 30.0, sector3: 30.0, i1Speed: null, i2Speed: null, speedTrap: null },
        { driver: 16, lap: 3, duration: 90.1, pitOutLap: false, start: null, sector1: 29.9, sector2: 30.1, sector3: 30.1, i1Speed: null, i2Speed: null, speedTrap: null },
        { driver: 16, lap: 4, duration: 90.2, pitOutLap: false, start: null, sector1: 30.0, sector2: 30.0, sector3: 30.2, i1Speed: null, i2Speed: null, speedTrap: null },
      ];
      const summary = computeDriverPaceSummary(driver, laps, []);
      expect(summary.cleanLapsCount).toBe(3);
      expect(summary.actualBestLap).toBe(90.0);
      expect(summary.theoreticalBestLap).toBeCloseTo(89.9);

      const analysis = computeRacePaceAnalysis(1234, [driver], laps, [], []);
      expect(analysis.sessionKey).toBe(1234);
      expect(analysis.fastestCleanPaceDriver).toBe(16);
    });
  });

  describe('championship & weather models', () => {
    it('creates Ferrari championship view and calculates elimination', () => {
      const constructors = [
        { position: 1, points: 300, wins: 8, constructorId: 'mclaren', name: 'McLaren' },
        { position: 2, points: 260, wins: 4, constructorId: 'ferrari', name: 'Ferrari' },
      ];
      const drivers = [
        { position: 2, points: 150, wins: 2, driverId: 'leclerc', code: 'LEC', name: 'Charles Leclerc', constructor: 'Ferrari' },
      ];

      const view = ferrariChampionshipView(2026, 12, constructors, drivers);
      expect(view.constructor?.constructorId).toBe('ferrari');
      expect(view.gapToLeader).toBe(40);
      expect(view.drivers.length).toBe(1);

      expect(calculateMaxRemainingPoints(2, 1)).toBe(60); // 2*(25+1) + 8 = 60
      expect(isContenderMathematicallyEliminated(100, 200, 2, 1)).toBe(true);
      expect(isContenderMathematicallyEliminated(150, 200, 2, 1)).toBe(false);
    });

    it('summarises track weather and describes WMO codes', () => {
      expect(MARANELLO_COORDINATES.name).toContain('Maranello');
      expect(summariseTrackWeather([])).toBeNull();

      const samples = [
        { date: '2026-05-10T12:00:00Z', airTemperature: 22, trackTemperature: 35, humidity: 50, pressure: 1013, rainfall: 0, windSpeed: 10, windDirection: 180 },
        { date: '2026-05-10T12:01:00Z', airTemperature: 24, trackTemperature: 37, humidity: 55, pressure: 1012, rainfall: 1, windSpeed: 15, windDirection: 185 },
      ];
      const w = summariseTrackWeather(samples);
      expect(w).not.toBeNull();
      expect(w!.airTemperature.max).toBe(24);
      expect(w!.trackTemperature.min).toBe(35);
      expect(w!.rainDetected).toBe(true);

      expect(weatherDescription(0)).toBe('Clear sky');
      expect(weatherDescription(61)).toBe('Rain');
      expect(weatherDescription(999)).toBe('Variable conditions');
    });
  });

  describe('external client mappers', () => {
    it('maps OpenF1 payloads correctly', () => {
      const rawSession = { session_key: 9158, session_name: 'Race', date_start: '2026-05-10T13:00:00Z', date_end: '2026-05-10T15:00:00Z', year: 2026 };
      const s = mapSession(rawSession);
      expect(s.sessionKey).toBe(9158);

      const d = mapDriver({ driver_number: 16, full_name: 'Charles Leclerc', team_name: 'Ferrari' });
      expect(d.number).toBe(16);

      const l = mapLap({ driver_number: 16, lap_number: 1, lap_duration: 85.2 });
      expect(l.lap).toBe(1);

      const st = mapStint({ driver_number: 16, stint_number: 1, lap_start: 1, lap_end: 15, compound: 'HARD' });
      expect(st.compound).toBe('HARD');

      const p = mapPit({ driver_number: 16, lap_number: 15, date: '2026-05-10T13:20:00Z', lane_duration: 21.8 });
      expect(p.laneDuration).toBe(21.8);

      const car = mapCarSample({ date: '2026-05-10T13:00:00Z', speed: 290, rpm: 11000, n_gear: 7, throttle: 100, brake: 0 });
      expect(car.gear).toBe(7);

      const loc = mapLocation({ date: '2026-05-10T13:00:00Z', x: 10, y: 20, z: 0 });
      expect(loc.x).toBe(10);

      const rc = mapRaceControl({ date: '2026-05-10T13:00:00Z', category: 'Flag', flag: 'GREEN', message: 'TRACK CLEAR' });
      expect(rc.message).toBe('TRACK CLEAR');

      const w = mapWeather({ date: '2026-05-10T13:00:00Z', air_temperature: 25, track_temperature: 38 });
      expect(w.airTemperature).toBe(25);

      const r = mapRadio({ date: '2026-05-10T13:00:00Z', driver_number: 16, recording_url: 'https://example.com/audio.mp3' });
      expect(r.recordingUrl).toBe('https://example.com/audio.mp3');

      const res = mapResult({ driver_number: 16, position: 1, points: 25 });
      expect(res.position).toBe(1);

      const int = mapInterval({ date: '2026-05-10T13:00:00Z', driver_number: 16, gap_to_leader: 0 });
      expect(int.driver).toBe(16);
    });

    it('maps Jolpica races correctly', () => {
      const rawRace = {
        season: '2026',
        round: '1',
        raceName: 'Bahrain Grand Prix',
        date: '2026-03-01',
        time: '15:00:00Z',
        Circuit: {
          circuitName: 'Bahrain International Circuit',
          Location: { locality: 'Sakhir', country: 'Bahrain', lat: '26.0325', long: '50.5106' },
        },
        Qualifying: { date: '2026-02-28', time: '16:00:00Z' },
      };
      const race = mapRace(rawRace);
      expect(race.season).toBe(2026);
      expect(race.round).toBe(1);
      expect(race.sessions.length).toBe(2);
    });
  });

  describe('OpenF1Client, JolpicaClient & OpenMeteoClient HTTP integration', () => {
    it('executes client methods with mock HTTP adapter', async () => {
      const mockHttp: any = {
        getJson: jest.fn().mockImplementation(async (url: string) => {
          if (url.includes('driverstandings')) return { MRData: { StandingsTable: { StandingsLists: [{ season: '2026', round: '1', DriverStandings: [{ points: '25' }] }] } } };
          if (url.includes('constructorstandings')) return { MRData: { StandingsTable: { StandingsLists: [{ season: '2026', round: '1', ConstructorStandings: [{ points: '25' }] }] } } };
          if (url.includes('/current/next.json')) return { MRData: { RaceTable: { Races: [{ season: '2026', round: '2', Circuit: {} }] } } };
          if (url.includes('/v1/forecast') && url.includes('&current=')) return { latitude: 44.5, longitude: 10.8, current: { temperature_2m: 20, weather_code: 0 } };
          if (url.includes('/v1/forecast') && url.includes('&hourly=')) return { hourly: { time: ['2026-05-10T12:00'], temperature_2m: [20] } };
          if (url.includes('/sessions?year=')) return [{ session_key: 100, date_start: '2026-01-01', date_end: '2026-01-01' }];
          if (url.includes('/sessions?session_key=100')) return [{ session_key: 100, date_start: '2026-01-01', date_end: '2026-01-01' }];
          if (url.includes('/drivers?')) return [{ driver_number: 16, team_name: 'Ferrari' }];
          if (url.includes('/laps?')) return [{ driver_number: 16, lap_number: 1 }];
          if (url.includes('/stints?')) return [{ driver_number: 16, stint_number: 1 }];
          if (url.includes('/pit?')) return [{ driver_number: 16, lap_number: 10 }];
          if (url.includes('/race_control?')) return [{ message: 'OK' }];
          if (url.includes('/weather?')) return [{ air_temperature: 20 }];
          if (url.includes('/team_radio?')) return [{ driver_number: 16 }];
          if (url.includes('/session_result?')) return [{ driver_number: 16, position: 1 }];
          if (url.includes('/intervals?')) return [{ driver_number: 16 }];
          if (url.includes('/car_data?')) return [{ speed: 200 }];
          if (url.includes('/location?')) return [{ x: 10 }];
          return [];
        }),
      };

      const openf1 = new OpenF1Client(mockHttp);
      expect((await openf1.sessions(2026, 1000)).length).toBe(1);
      expect(await openf1.session(100, 1000)).not.toBeNull();
      expect((await openf1.drivers(100, 1000)).length).toBe(1);
      expect((await openf1.laps(100, 1000)).length).toBe(1);
      expect((await openf1.stints(100, 1000)).length).toBe(1);
      expect((await openf1.pitStops(100, 1000)).length).toBe(1);
      expect((await openf1.raceControl(100, 1000)).length).toBe(1);
      expect((await openf1.weather(100, 1000)).length).toBe(1);
      expect((await openf1.teamRadio(100, 1000)).length).toBe(1);
      expect((await openf1.sessionResult(100, 1000)).length).toBe(1);
      expect((await openf1.intervals(100, 1000)).length).toBe(1);
      expect((await openf1.carData(100, 16, '2026-01-01', '2026-01-02', 1000)).length).toBe(1);
      expect((await openf1.location(100, 16, '2026-01-01', '2026-01-02', 1000)).length).toBe(1);

      const jolpica = new JolpicaClient(mockHttp);
      expect((await jolpica.driverStandings('2026', 1000)).rows.length).toBe(1);
      expect((await jolpica.constructorStandings('2026', 1000)).rows.length).toBe(1);
      expect(await jolpica.nextRace(1000)).not.toBeNull();

      const meteo = new OpenMeteoClient(mockHttp);
      expect(await meteo.current(44.5, 10.8, 1000)).not.toBeNull();
      expect((await meteo.hourly(44.5, 10.8, '2026-05-10', '2026-05-11', 1000)).length).toBe(1);
    });
  });
});
