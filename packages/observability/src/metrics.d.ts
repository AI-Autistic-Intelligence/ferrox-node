import * as client from 'prom-client';
export declare class GlobalMetricsEngine {
    private static isInitialized;
    private static samplingTimer;
    /**
     * Gauge metric that tracks the Node.js Event Loop Lag.
     * Crucial for detecting if synchronous code is blocking the main thread.
     */
    static eventLoopLag: client.Gauge<string>;
    /**
     * Gauge metric tracking the number of active connections in the database pool.
     */
    static activeDatabaseConnections: client.Gauge<string>;
    /**
     * Counter tracking the total number of HTTP 5xx Server Errors (Crashes/Panics).
     */
    static http5xxErrorRate: client.Counter<string>;
    /**
     * Gauge metric for the current V8 Memory Heap Used in bytes.
     */
    static processMemoryHeapUsed: client.Gauge<string>;
    /**
     * Initializes default global system metrics and alerts
     */
    static init(): void;
    /**
     * Periodically sample non-event-driven metrics.
     * Starts a detached setInterval that samples event loop lag and memory usage.
     * Includes built-in alerting thresholds (e.g. 100ms lag, 1.5GB memory).
     */
    static sampleMetrics(): void;
    private static startPeriodicSampling;
    static destroy(): void;
    /**
     * Hook into process-level crash events to record them before the process dies.
     * Captures uncaught exceptions and unhandled promise rejections, increments
     * the 5xx error rate metric, and logs the critical failure.
     */
    private static setupPanicHooks;
    /**
     * Generates the Prometheus Metrics text to be exposed on an endpoint (e.g., /metrics).
     *
     * @returns {Promise<string>} A string containing all metrics formatted for Prometheus scraping.
     */
    static getMetricsString(): Promise<string>;
}
