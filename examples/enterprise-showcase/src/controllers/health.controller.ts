import { Controller, Get, Injectable } from '@ferrox-node/core';

@Controller('/health')
@Injectable()
export class HealthController {
  @Get('')
  health() {
    return {
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: 'ferrox-node-enterprise-showcase'
    };
  }

  @Get('/live')
  live() {
    return {
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: 'ferrox-node-enterprise-showcase'
    };
  }

  @Get('/ready')
  ready() {
    return {
      status: 'READY',
      timestamp: new Date().toISOString(),
      checks: {
        memoryHeap: process.memoryUsage().heapUsed,
        eventLoop: 'ACTIVE',
        sagaCoordinator: 'READY',
        sentinelThreatEngine: 'ARMED',
        queueWorker: 'LISTENING'
      }
    };
  }
}
