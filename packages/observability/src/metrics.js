"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalMetricsEngine = void 0;
const client = __importStar(require("prom-client"));
const logger_factory_1 = require("@node-yalc/logger/logger.factory");
const logger = (0, logger_factory_1.AppLoggerFactory)('GlobalMetricsEngine');
class GlobalMetricsEngine {
    static isInitialized = false;
    static samplingTimer = null;
    /**
     * Gauge metric that tracks the Node.js Event Loop Lag.
     * Crucial for detecting if synchronous code is blocking the main thread.
     */
    static eventLoopLag;
    /**
     * Gauge metric tracking the number of active connections in the database pool.
     */
    static activeDatabaseConnections;
    /**
     * Counter tracking the total number of HTTP 5xx Server Errors (Crashes/Panics).
     */
    static http5xxErrorRate;
    /**
     * Gauge metric for the current V8 Memory Heap Used in bytes.
     */
    static processMemoryHeapUsed;
    /**
     * Initializes default global system metrics and alerts
     */
    static init() {
        if (this.isInitialized)
            return;
        this.isInitialized = true;
        logger.log('[Metrics] Initializing Global Infrastructure Metrics (Prometheus)');
        // 1. Collect Default Node.js Metrics (CPU, RAM, GC, File Descriptors)
        client.collectDefaultMetrics({ prefix: 'ferrox_sys_' });
        // 2. Define Custom System Metrics
        this.eventLoopLag = new client.Gauge({
            name: 'ferrox_sys_event_loop_lag_ms',
            help: 'Delay of the Node.js Event Loop in milliseconds',
        });
        this.activeDatabaseConnections = new client.Gauge({
            name: 'ferrox_sys_db_connections_active',
            help: 'Current active connections in the Database Pool',
        });
        this.http5xxErrorRate = new client.Counter({
            name: 'ferrox_sys_http_5xx_total',
            help: 'Total number of HTTP 5xx Server Errors (Crashes/Panics)',
        });
        this.processMemoryHeapUsed = new client.Gauge({
            name: 'ferrox_sys_memory_heap_used_bytes',
            help: 'Current V8 Memory Heap Used',
        });
        // 3. Start Periodic Sampling
        this.startPeriodicSampling();
        this.setupPanicHooks();
    }
    /**
     * Periodically sample non-event-driven metrics.
     * Starts a detached setInterval that samples event loop lag and memory usage.
     * Includes built-in alerting thresholds (e.g. 100ms lag, 1.5GB memory).
     */
    static sampleMetrics() {
        // Monitor Event Loop Lag
        const start = process.hrtime.bigint();
        setImmediate(() => {
            const end = process.hrtime.bigint();
            const lagMs = Number(end - start) / 1_000_000;
            this.eventLoopLag.set(lagMs);
            // Alert if Event Loop is severely blocked (Over 100ms means Node is choking!)
            if (lagMs > 100) {
                logger.warn(`[ALERT] Event Loop Lag detected: ${lagMs.toFixed(2)}ms! Sync code is blocking the thread.`);
            }
        });
        // Monitor Memory Heap
        const memUsage = process.memoryUsage();
        this.processMemoryHeapUsed.set(memUsage.heapUsed);
        // Alert on high memory usage (e.g., > 1.5GB)
        if (memUsage.heapUsed > 1.5 * 1024 * 1024 * 1024) {
            logger.error(`[ALERT] CRITICAL MEMORY USAGE! Heap is at ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
        }
    }
    static startPeriodicSampling() {
        this.samplingTimer = setInterval(() => {
            this.sampleMetrics();
        }, 5000);
        this.samplingTimer.unref(); // unref so it doesn't prevent Node from exiting
    }
    static destroy() {
        if (this.samplingTimer) {
            clearInterval(this.samplingTimer);
            this.samplingTimer = null;
        }
        client.register.clear();
        this.isInitialized = false;
    }
    /**
     * Hook into process-level crash events to record them before the process dies.
     * Captures uncaught exceptions and unhandled promise rejections, increments
     * the 5xx error rate metric, and logs the critical failure.
     */
    static setupPanicHooks() {
        process.on('uncaughtException', (err) => {
            logger.error(`[ALERT] Uncaught Exception (Process Crash imminent): ${err.message}`);
            this.http5xxErrorRate.inc(); // Increment crash counter
        });
        process.on('unhandledRejection', (reason) => {
            logger.error(`[ALERT] Unhandled Promise Rejection: ${reason}`);
            this.http5xxErrorRate.inc();
        });
    }
    /**
     * Generates the Prometheus Metrics text to be exposed on an endpoint (e.g., /metrics).
     *
     * @returns {Promise<string>} A string containing all metrics formatted for Prometheus scraping.
     */
    static async getMetricsString() {
        return await client.register.metrics();
    }
}
exports.GlobalMetricsEngine = GlobalMetricsEngine;
