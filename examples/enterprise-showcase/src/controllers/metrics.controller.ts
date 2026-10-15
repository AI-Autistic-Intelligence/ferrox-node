import { Controller, Get, Injectable } from '@ferrox-node/core';
import { GlobalMetricsEngine } from '@ferrox-node/observability';

@Controller('/metrics')
@Injectable()
export class MetricsController {
  @Get('')
  async exportMetrics() {
    GlobalMetricsEngine.sampleMetrics();
    const metricsString = await GlobalMetricsEngine.getMetricsString();
    return metricsString;
  }
}
