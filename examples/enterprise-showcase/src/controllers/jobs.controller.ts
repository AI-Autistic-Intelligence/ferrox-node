import { Controller, Post, Get, Injectable } from '@ferrox-node/core';
import { BackgroundJobService } from '../services/background-job.service';
import { BadRequestError, NotFoundError } from '@node-yalc/errors';

@Controller('/api/v1/jobs')
@Injectable()
export class JobsController {
  constructor(private jobService: BackgroundJobService) {}

  @Post('/enqueue')
  async enqueueJob(req: { body?: { taskType?: string; data?: any } }) {
    const { taskType, data } = req.body || {};

    if (!taskType) {
      throw new BadRequestError('taskType is required to enqueue a background job.');
    }

    const jobId = await this.jobService.enqueue({
      taskType,
      data: data || {},
      submittedAt: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Job enqueued to Reliable Redis BRPOPLPUSH queue.',
      jobId
    };
  }

  @Get('/list')
  listJobs() {
    return {
      success: true,
      data: this.jobService.getAllJobs()
    };
  }

  @Get('/:id')
  getJob(req: { params?: { id?: string }; url?: string }) {
    const urlParts = (req.url || '').split('/');
    const jobId = req.params?.id || urlParts[urlParts.length - 1];

    const job = this.jobService.getJob(jobId);
    if (!job) {
      throw new NotFoundError(`Job ${jobId} not found.`);
    }

    return {
      success: true,
      data: job
    };
  }
}
