"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReliableQueueWorker = void 0;
const logger_factory_1 = require("@node-yalc/logger/logger.factory");
const ioredis_1 = __importDefault(require("ioredis"));
const logger = (0, logger_factory_1.AppLoggerFactory)('QueueWorker');
/**
 * Robust Queue Worker using Redis Lists (Reliable Queue pattern with BRPOPLPUSH / RPOPLPUSH)
 * or Streams to process background jobs.
 */
class ReliableQueueWorker {
    client;
    queueName;
    processingQueueName;
    handler;
    isRunning = false;
    constructor(redisUrl, queueName) {
        this.client = new ioredis_1.default(redisUrl);
        this.queueName = `ferrox:queue:${queueName}`;
        this.processingQueueName = `${this.queueName}:processing`; // For crash recovery
    }
    /**
     * Pushes a new job onto the queue
     */
    async enqueue(payload) {
        const jobId = Math.random().toString(36).substring(2, 15);
        const jobData = JSON.stringify({ jobId, payload, retryCount: 0 });
        await this.client.lpush(this.queueName, jobData);
        logger?.debug?.(`[Queue] Enqueued job ${jobId} to ${this.queueName}`);
        return jobId;
    }
    /**
     * Starts listening to the queue
     */
    async startConsuming(handler) {
        this.handler = handler;
        this.isRunning = true;
        logger.log(`[Queue] Worker started for queue ${this.queueName}`);
        // Start background loop
        this.consumeLoop();
    }
    async consumeLoop() {
        while (this.isRunning) {
            try {
                // Reliable Queue Pattern: Move from Main to Processing atomically
                // BRPOPLPUSH blocks until a job is available (timeout 0 = infinite)
                const jobRaw = await this.client.brpoplpush(this.queueName, this.processingQueueName, 5);
                if (jobRaw) {
                    const job = JSON.parse(jobRaw);
                    logger?.debug?.(`[Queue] Processing job ${job.jobId}`);
                    try {
                        await this.handler(job);
                        // Success: Remove from processing queue
                        await this.client.lrem(this.processingQueueName, 1, jobRaw);
                        logger?.debug?.(`[Queue] Job ${job.jobId} completed successfully`);
                    }
                    catch (err) {
                        logger.error(`[Queue] Job ${job.jobId} failed: ${err.message}`);
                        // Logic for DLQ (Dead Letter Queue) or Retry would go here
                        // e.g., if retryCount < 3, push back to queueName
                    }
                }
            }
            catch (err) {
                logger.error(`[Queue] Error in consume loop: ${err.message}`);
                await new Promise(r => setTimeout(r, 2000)); // Sleep before retrying
            }
        }
    }
    async stop() {
        this.isRunning = false;
        await this.client.quit();
        logger.log(`[Queue] Worker stopped for queue ${this.queueName}`);
    }
}
exports.ReliableQueueWorker = ReliableQueueWorker;
