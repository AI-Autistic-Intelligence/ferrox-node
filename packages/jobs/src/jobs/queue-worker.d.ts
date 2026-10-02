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
export declare class ReliableQueueWorker {
    private client;
    private queueName;
    private processingQueueName;
    private handler;
    private isRunning;
    constructor(redisUrl: string, queueName: string);
    /**
     * Pushes a new job onto the queue
     */
    enqueue(payload: any): Promise<string>;
    /**
     * Starts listening to the queue
     */
    startConsuming(handler: JobHandler): Promise<void>;
    private consumeLoop;
    stop(): Promise<void>;
}
