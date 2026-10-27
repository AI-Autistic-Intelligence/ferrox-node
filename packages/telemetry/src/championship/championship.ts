export interface DriverStanding {
  readonly position: number;
  readonly points: number;
  readonly wins: number;
  readonly driverId: string;
  readonly code: string;
  readonly name: string;
  readonly constructor: string;
}

export interface ConstructorStanding {
  readonly position: number;
  readonly points: number;
  readonly wins: number;
  readonly constructorId: string;
  readonly name: string;
}

export interface RaceWeekend {
  readonly season: number;
  readonly round: number;
  readonly raceName: string;
  readonly circuitName: string;
  readonly locality: string;
  readonly country: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly raceStartUtc: string;
  readonly sessions: { name: string; startUtc: string }[];
}

export interface FerrariChampionshipView {
  readonly season: number | null;
  readonly round: number | null;
  readonly constructor: ConstructorStanding | null;
  readonly gapToLeader: number | null;
  readonly gapToNextAbove: number | null;
  readonly drivers: DriverStanding[];
}

export function ferrariChampionshipView(
  season: number | null,
  round: number | null,
  constructors: readonly ConstructorStanding[],
  drivers: readonly DriverStanding[]
): FerrariChampionshipView {
  const sorted = [...constructors].sort((a, b) => a.position - b.position);
  const idx = sorted.findIndex((c) => c.constructorId === 'ferrari');
  const ferrari = idx >= 0 ? sorted[idx] : null;
  return {
    season,
    round,
    constructor: ferrari,
    gapToLeader: ferrari ? sorted[0].points - ferrari.points : null,
    gapToNextAbove: ferrari && idx > 0 ? sorted[idx - 1].points - ferrari.points : null,
    drivers: drivers.filter((d) => d.constructor.toLowerCase() === 'ferrari'),
  };
}

export function calculateMaxRemainingPoints(
  remainingRounds: number,
  remainingSprints = 0,
  hasFastestLapPoint = true
): number {
  const racePoints = 25;
  const sprintPoints = 8;
  const flPoint = hasFastestLapPoint ? 1 : 0;
  return remainingRounds * (racePoints + flPoint) + remainingSprints * sprintPoints;
}

export function isContenderMathematicallyEliminated(
  contenderPoints: number,
  leaderPoints: number,
  remainingRounds: number,
  remainingSprints = 0
): boolean {
  const maxPointsAvailable = calculateMaxRemainingPoints(remainingRounds, remainingSprints);
  return contenderPoints + maxPointsAvailable < leaderPoints;
}
