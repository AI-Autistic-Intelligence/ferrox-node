import { Injectable } from '@ferrox-node/core';
import { ReliableQueueWorker, JobContext } from '@ferrox-node/jobs';
import { AppLoggerFactory } from '@node-yalc/logger';
import { AppConfig } from '../config/app.config';

const logger = AppLoggerFactory('BackgroundJobService');

export interface QueuedJobStatus {
  jobId: string;
  queue: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  payload: any;
  result?: any;
  createdAt: string;
}

@Injectable()
export class BackgroundJobService {
  private worker?: ReliableQueueWorker;
  private inMemoryQueue: Map<string, QueuedJobStatus> = new Map();
  private redisConnected: boolean = false;

  constructor(private config: AppConfig) {}

  async init(): Promise<void> {
    try {
      this.worker = new ReliableQueueWorker(this.config.redisUrl, 'showcase-jobs');
      
      // Start consuming in the background
      await this.worker.startConsuming(async (ctx: JobContext) => {
        logger.log(`[Job Worker] Received background job ${ctx.jobId}: ${JSON.stringify(ctx.payload)}`);
        
        // Update in-memory tracker
        const current = this.inMemoryQueue.get(ctx.jobId);
        if (current) current.status = 'PROCESSING';

        // Simulate asynchronous processing (e.g., PDF generation, MailHog email dispatch)
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (current) {
          current.status = 'COMPLETED';
          current.result = { processedAt: new Date().toISOString() };
        }

        logger.log(`[Job Worker] Job ${ctx.jobId} processed successfully`);
      });

      this.redisConnected = true;
      logger.log(`[ReliableQueueWorker] Connected to Redis queue at ${this.config.redisUrl}`);
    } catch (err: any) {
      logger.warn(`[ReliableQueueWorker] Redis unavailable (${err.message}). Using resident memory async queue.`);
      this.redisConnected = false;
    }
  }

  async enqueue(payload: any): Promise<string> {
    const jobId = `job_${Math.random().toString(36).substring(2, 10)}`;
    const jobRecord: QueuedJobStatus = {
      jobId,
      queue: 'showcase-jobs',
      status: 'PENDING',
      payload,
      createdAt: new Date().toISOString()
    };

    this.inMemoryQueue.set(jobId, jobRecord);

    if (this.worker && this.redisConnected) {
      try {
        await this.worker.enqueue(payload);
      } catch (err: any) {
        logger.warn(`Failed enqueueing to Redis, processing in memory: ${err.message}`);
        this.processInMemory(jobRecord);
      }
    } else {
      this.processInMemory(jobRecord);
    }

    return jobId;
  }

  private processInMemory(job: QueuedJobStatus): void {
    setImmediate(async () => {
      job.status = 'PROCESSING';
      await new Promise((r) => setTimeout(r, 50));
      job.status = 'COMPLETED';
      job.result = { simulatedWorker: true, completedAt: new Date().toISOString() };
      logger.log(`[InMemoryQueue] Completed job ${job.jobId}`);
    });
  }

  getJob(jobId: string): QueuedJobStatus | null {
    return this.inMemoryQueue.get(jobId) || null;
  }

  getAllJobs(): QueuedJobStatus[] {
    return Array.from(this.inMemoryQueue.values());
  }

  async stop(): Promise<void> {
    if (this.worker && this.redisConnected) {
      await this.worker.stop();
    }
  }
}
