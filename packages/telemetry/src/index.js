"use strict";
/**
 * @ferrox-node/telemetry
 * Motorsport Telemetry, Vehicle Dynamics, Race Strategy & F1 Kinematics Engine
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./types.js"), exports);
__exportStar(require("./dynamics/vehicle-dynamics.js"), exports);
__exportStar(require("./kinematics/distance-trace.js"), exports);
__exportStar(require("./kinematics/telemetry-delta.js"), exports);
__exportStar(require("./strategy/undercut.js"), exports);
__exportStar(require("./strategy/fuel-pace.js"), exports);
__exportStar(require("./championship/championship.js"), exports);
__exportStar(require("./weather/weather.js"), exports);
__exportStar(require("./clients/openf1-client.js"), exports);
__exportStar(require("./clients/jolpica-client.js"), exports);
__exportStar(require("./clients/open-meteo-client.js"), exports);
