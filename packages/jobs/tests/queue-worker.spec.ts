import { ReliableQueueWorker } from '../src/jobs/queue-worker';
import '../src/jobs/jobs-scheduler-sse';

describe('ReliableQueueWorker', () => {
  it('should enqueue and consume a job', async () => {
    // We mock Redis for this test to avoid needing a real Redis server
    const mockRedis = {
      lpush: jest.fn().mockResolvedValue(1),
      brpoplpush: jest.fn(),
      lrem: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue(true)
    };

    jest.mock('ioredis', () => {
      return jest.fn().mockImplementation(() => mockRedis);
    });

    const Redis = require('ioredis');
    const worker = new ReliableQueueWorker('redis://localhost', 'test-q');
    (worker as any).client = mockRedis;

    // Enqueue
    const id = await worker.enqueue({ data: 123 });
    expect(id).toBeDefined();
    expect(mockRedis.lpush).toHaveBeenCalled();

    // Consume (mock brpoplpush to return one job then block forever)
    const jobRaw = JSON.stringify({ jobId: 'j1', payload: { data: 123 }, retryCount: 0 });
    mockRedis.brpoplpush.mockResolvedValueOnce(jobRaw).mockImplementation(() => new Promise(() => {}));

    let handledJob: any = null;
    worker.startConsuming(async (job) => {
      handledJob = job;
      await worker.stop();
    });

    // Wait a tick for promises to resolve
    await new Promise(r => setTimeout(r, 100));

    expect(handledJob).toBeDefined();
    expect(handledJob.payload.data).toBe(123);
    expect(mockRedis.lrem).toHaveBeenCalled();
  });

  it('should handle handler error gracefully', async () => {
    const mockRedis = {
      lpush: jest.fn().mockResolvedValue(1),
      brpoplpush: jest.fn(),
      lrem: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue(true)
    };
    const worker = new ReliableQueueWorker('redis://localhost', 'test-q2');
    (worker as any).client = mockRedis;

    const jobRaw = JSON.stringify({ jobId: 'j2', payload: { data: 123 }, retryCount: 0 });
    // First time returns job, second time blocks
    mockRedis.brpoplpush.mockResolvedValueOnce(jobRaw).mockImplementation(() => new Promise(() => {}));

    worker.startConsuming(async (job) => {
      await worker.stop();
      throw new Error('Handler Failed');
    });

    await new Promise(r => setTimeout(r, 100));
    expect(mockRedis.lrem).not.toHaveBeenCalled();
  });

  it('should handle consume loop redis error gracefully', async () => {
    const mockRedis = {
      lpush: jest.fn().mockResolvedValue(1),
      brpoplpush: jest.fn(),
      lrem: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue(true)
    };
    const worker = new ReliableQueueWorker('redis://localhost', 'test-q3');
    (worker as any).client = mockRedis;

    // First time throws Redis error, second time blocks
    mockRedis.brpoplpush.mockRejectedValueOnce(new Error('Redis Connection Error')).mockImplementation(() => new Promise(() => {}));

    worker.startConsuming(async (job) => {
      // should not be reached
    });

    await new Promise(r => setTimeout(r, 100)); // allow loop to catch and log
    await worker.stop();
  });

  it('should ignore null job when brpoplpush times out', async () => {
    const mockRedis = {
      lpush: jest.fn().mockResolvedValue(1),
      brpoplpush: jest.fn(),
      lrem: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue(true)
    };
    const worker = new ReliableQueueWorker('redis://localhost', 'test-q4');
    (worker as any).client = mockRedis;

    // Return null first time, block second time
    mockRedis.brpoplpush.mockResolvedValueOnce(null).mockImplementation(() => new Promise(() => {}));

    worker.startConsuming(async (job) => {
      // should not be reached
    });

    await new Promise(r => setTimeout(r, 100));
    await worker.stop();
    expect(mockRedis.brpoplpush).toHaveBeenCalled();
  });
});
