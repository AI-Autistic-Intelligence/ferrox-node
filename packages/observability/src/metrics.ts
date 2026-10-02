import * as client from 'prom-client';
import { AppLoggerFactory } from '@node-yalc/logger';
import * as perf_hooks from 'perf_hooks';

const logger = AppLoggerFactory('GlobalMetricsEngine');

/**
 * Enterprise Global Metrics Engine for Ferrox-Node Observability.
 * 
 * Provides a centralized singleton manager for exposing system telemetry, 
 * business KPIs, and infrastructure health checks to Prometheus and Grafana.
 * Automatically tracks CPU, Memory Heap, Event Loop Lag, and Application Panics.
 * 
 * Features:
 * - Prometheus Exporter (`prom-client`) integration
 * - Automated sampling of V8 Engine internals (Event Loop, Garbage Collection)
 * - Built-in threshold alerting for critical bottlenecks
 * - Panic hooks for uncaught exceptions tracing
 * 
 * @example
 * ```typescript
 * GlobalMetricsEngine.init();
 * const metricsStr = await GlobalMetricsEngine.getMetricsString();
 * ```
 */
export class GlobalMetricsEngine {
  private static isInitialized = false;
  private static samplingTimer: NodeJS.Timeout | null = null;

  /** 
   * Gauge metric that tracks the Node.js Event Loop Lag in milliseconds.
   * Crucial for detecting if synchronous code is blocking the main thread (CPU starvation).
   * @type {client.Gauge<string>}
   */
  public static eventLoopLag: client.Gauge<string>;

  /** 
   * Gauge metric tracking the number of active connections in the database pool.
   * Useful to detect connection leaks or database starvation.
   * @type {client.Gauge<string>}
   */
  public static activeDatabaseConnections: client.Gauge<string>;

  /** 
   * Counter tracking the total number of HTTP 5xx Server Errors (Crashes/Panics).
   * Monitored by the panic hooks to alert on system degradation.
   * @type {client.Counter<string>}
   */
  public static http5xxErrorRate: client.Counter<string>;

  /** 
   * Gauge metric for the current V8 Memory Heap Used in bytes.
   * Automatically alerts if the heap approaches the V8 max limit (e.g. 1.5GB default).
   * @type {client.Gauge<string>}
   */
  public static processMemoryHeapUsed: client.Gauge<string>;

  /**
   * Initializes default global system metrics, registers Prometheus collectors,
   * and starts the background sampling interval.
   * 
   * This method is idempotent and will safely return if called multiple times.
   */
  public static init(): void {
    if (this.isInitialized) return;
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
   * Uses `setImmediate` and `hrtime` to calculate precise Event Loop delay.
   * Includes built-in hardcoded alerting thresholds (e.g., > 100ms lag, > 1.5GB memory).
   */
  public static sampleMetrics(): void {
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

  /**
   * Starts a detached background interval for metric sampling.
   * The interval is unreferenced (`unref()`) to prevent it from keeping the Node process alive.
   * @private
   */
  private static startPeriodicSampling(): void {
    this.samplingTimer = setInterval(() => {
      this.sampleMetrics();
    }, 5000);
    this.samplingTimer.unref(); // unref so it doesn't prevent Node from exiting
  }

  /**
   * Gracefully tears down the metrics engine.
   * Stops the sampling timer and clears the Prometheus registry.
   */
  public static destroy(): void {
    if (this.samplingTimer) {
      clearInterval(this.samplingTimer);
      this.samplingTimer = null;
    }
    client.register.clear();
    this.isInitialized = false;
  }

  /**
   * Hooks into process-level crash events to record them before the process dies.
   * Captures `uncaughtException` and `unhandledRejection`, increments
   * the 5xx error rate metric, and logs the critical failure.
   * @private
   */
  private static setupPanicHooks(): void {
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
   * Generates the Prometheus Metrics text to be exposed on an endpoint (e.g., `/metrics`).
   * Fetches all registered metrics from the prom-client global registry.
   * 
   * @returns {Promise<string>} A string containing all metrics formatted for Prometheus scraping.
   */
  public static async getMetricsString(): Promise<string> {
    return await client.register.metrics();
  }
}

