import { AppLoggerFactory } from '@node-yalc/logger';
import Redis from 'ioredis';

const logger = AppLoggerFactory('QueueWorker');

/**
 * Standardized context passed to job handlers during execution.
 */
export interface JobContext {
  /** Unique auto-generated identifier for the job. */
  jobId: string;
  /** The arbitrary payload data passed when the job was enqueued. */
  payload: any;
  /** Tracks how many times this job has been retried after failures. */
  retryCount: number;
}

/**
 * Type alias for an asynchronous function that processes a job from the queue.
 */
export type JobHandler = (ctx: JobContext) => Promise<void>;

/**
 * Enterprise Reliable Queue Worker using Redis.
 * 
 * Implements the Reliable Queue pattern using `BRPOPLPUSH` (blocking list pop and push).
 * This ensures that if the worker process crashes while processing a job, the job is not lost;
 * it remains in a dedicated "processing" queue for eventual recovery or Dead Letter Queue (DLQ) routing.
 */
export class ReliableQueueWorker {
  private client: Redis;
  private queueName: string;
  private processingQueueName: string;
  private handler!: JobHandler;
  private isRunning: boolean = false;

  /**
   * Initializes a new background worker bound to a specific Redis queue.
   * 
   * @param redisUrl The full connection string for Redis (e.g., 'redis://localhost:6379').
   * @param queueName The logical name of the queue (will be automatically prefixed with 'ferrox:queue:').
   */
  constructor(redisUrl: string, queueName: string) {
    this.client = new Redis(redisUrl);
    this.queueName = `ferrox:queue:${queueName}`;
    this.processingQueueName = `${this.queueName}:processing`; // For crash recovery
  }

  /**
   * Pushes a new job onto the left side of the Redis list queue (`LPUSH`).
   * 
   * @param payload The data required for the job to execute.
   * @returns {Promise<string>} The randomly generated `jobId` assigned to the payload.
   */
  async enqueue(payload: any): Promise<string> {
    const jobId = Math.random().toString(36).substring(2, 15);
    const jobData = JSON.stringify({ jobId, payload, retryCount: 0 });
    
    await this.client.lpush(this.queueName, jobData);
    logger?.debug?.(`[Queue] Enqueued job ${jobId} to ${this.queueName}`);
    return jobId;
  }

  /**
   * Starts a non-blocking infinite loop that listens for incoming jobs and processes them.
   * 
   * @param {JobHandler} handler The logic to execute when a job is pulled.
   */
  async startConsuming(handler: JobHandler): Promise<void> {
    this.handler = handler;
    this.isRunning = true;
    logger.log(`[Queue] Worker started for queue ${this.queueName}`);

    // Start background loop
    this.consumeLoop();
  }

  /**
   * The internal background daemon loop.
   * Blocks safely using Redis `BRPOPLPUSH` and moves items atomically to a processing list.
   * @private
   */
  private async consumeLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Reliable Queue Pattern: Move from Main to Processing atomically
        // BRPOPLPUSH blocks until a job is available (timeout 5 seconds)
        const jobRaw = await this.client.brpoplpush(this.queueName, this.processingQueueName, 5);
        
        if (jobRaw) {
          const job: JobContext = JSON.parse(jobRaw);
          logger?.debug?.(`[Queue] Processing job ${job.jobId}`);
          
          try {
            await this.handler(job);
            
            // Success: Remove from processing queue using `LREM`
            await this.client.lrem(this.processingQueueName, 1, jobRaw);
            logger?.debug?.(`[Queue] Job ${job.jobId} completed successfully`);
          } catch (err: any) {
            logger.error(`[Queue] Job ${job.jobId} failed: ${err.message}`);
            // Logic for DLQ (Dead Letter Queue) or Retry would go here
            // e.g., if retryCount < 3, push back to queueName with incremented retryCount
          }
        }
      } catch (err: any) {
        logger.error(`[Queue] Error in consume loop: ${err.message}`);
        await new Promise(r => setTimeout(r, 2000)); // Sleep before retrying
      }
    }
  }

  /**
   * Gracefully shuts down the worker, exiting the loop and closing the Redis connection.
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    await this.client.quit();
    logger.log(`[Queue] Worker stopped for queue ${this.queueName}`);
  }
}

