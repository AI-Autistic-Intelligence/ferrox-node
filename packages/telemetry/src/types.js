"use strict";
/**
 * Pure domain definitions for Motorsport & Formula 1 Telemetry.
 * Conforms to Ferrox DDD architecture (zero external dependencies).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HISTORICAL_GRACE_MS = exports.FERRARI_TEAM = void 0;
exports.isFerrari = isFerrari;
exports.sessionAvailability = sessionAvailability;
exports.isImmutable = isImmutable;
exports.FERRARI_TEAM = 'Ferrari';
function isFerrari(driver) {
    return driver.team.toLowerCase().includes(exports.FERRARI_TEAM.toLowerCase());
}
exports.HISTORICAL_GRACE_MS = 30 * 60 * 1000;
function sessionAvailability(session, nowMs) {
    const start = Date.parse(session.dateStart);
    const end = Date.parse(session.dateEnd);
    if (nowMs >= end + exports.HISTORICAL_GRACE_MS)
        return 'available';
    if (nowMs >= start - exports.HISTORICAL_GRACE_MS)
        return 'live';
    return 'upcoming';
}
function isImmutable(session, nowMs) {
    return nowMs >= Date.parse(session.dateEnd) + 4 * exports.HISTORICAL_GRACE_MS;
}
