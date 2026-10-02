import { AppLoggerFactory } from '@node-yalc/logger';
import Redis from 'ioredis';

const logger = AppLoggerFactory('QueueWorker');

export interface JobContext {
  jobId: string;
  payload: any;
  retryCount: number;
}

export type JobHandler = (ctx: JobContext) => Promise<void>;

/**
 * Robust Queue Worker using Redis Lists (Reliable Queue pattern with BRPOPLPUSH / RPOPLPUSH)
 * or Streams to process background jobs.
 */
export class ReliableQueueWorker {
  private client: Redis;
  private queueName: string;
  private processingQueueName: string;
  private handler!: JobHandler;
  private isRunning: boolean = false;

  constructor(redisUrl: string, queueName: string) {
    this.client = new Redis(redisUrl);
    this.queueName = `ferrox:queue:${queueName}`;
    this.processingQueueName = `${this.queueName}:processing`; // For crash recovery
  }

  /**
   * Pushes a new job onto the queue
   */
  async enqueue(payload: any): Promise<string> {
    const jobId = Math.random().toString(36).substring(2, 15);
    const jobData = JSON.stringify({ jobId, payload, retryCount: 0 });
    
    await this.client.lpush(this.queueName, jobData);
    logger?.debug?.(`[Queue] Enqueued job ${jobId} to ${this.queueName}`);
    return jobId;
  }

  /**
   * Starts listening to the queue
   */
  async startConsuming(handler: JobHandler) {
    this.handler = handler;
    this.isRunning = true;
    logger.log(`[Queue] Worker started for queue ${this.queueName}`);

    // Start background loop
    this.consumeLoop();
  }

  private async consumeLoop() {
    while (this.isRunning) {
      try {
        // Reliable Queue Pattern: Move from Main to Processing atomically
        // BRPOPLPUSH blocks until a job is available (timeout 0 = infinite)
        const jobRaw = await this.client.brpoplpush(this.queueName, this.processingQueueName, 5);
        
        if (jobRaw) {
          const job: JobContext = JSON.parse(jobRaw);
          logger?.debug?.(`[Queue] Processing job ${job.jobId}`);
          
          try {
            await this.handler(job);
            
            // Success: Remove from processing queue
            await this.client.lrem(this.processingQueueName, 1, jobRaw);
            logger?.debug?.(`[Queue] Job ${job.jobId} completed successfully`);
          } catch (err: any) {
            logger.error(`[Queue] Job ${job.jobId} failed: ${err.message}`);
            // Logic for DLQ (Dead Letter Queue) or Retry would go here
            // e.g., if retryCount < 3, push back to queueName
          }
        }
      } catch (err: any) {
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

