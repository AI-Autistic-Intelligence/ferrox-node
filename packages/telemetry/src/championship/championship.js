"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ferrariChampionshipView = ferrariChampionshipView;
exports.calculateMaxRemainingPoints = calculateMaxRemainingPoints;
exports.isContenderMathematicallyEliminated = isContenderMathematicallyEliminated;
function ferrariChampionshipView(season, round, constructors, drivers) {
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
function calculateMaxRemainingPoints(remainingRounds, remainingSprints = 0, hasFastestLapPoint = true) {
    const racePoints = 25;
    const sprintPoints = 8;
    const flPoint = hasFastestLapPoint ? 1 : 0;
    return remainingRounds * (racePoints + flPoint) + remainingSprints * sprintPoints;
}
function isContenderMathematicallyEliminated(contenderPoints, leaderPoints, remainingRounds, remainingSprints = 0) {
    const maxPointsAvailable = calculateMaxRemainingPoints(remainingRounds, remainingSprints);
    return contenderPoints + maxPointsAvailable < leaderPoints;
}
