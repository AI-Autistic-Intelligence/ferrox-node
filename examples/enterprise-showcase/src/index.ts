import 'reflect-metadata';
import { FerroxApp, FerroxDIContainer } from '@ferrox-node/core';
import { GlobalMetricsEngine } from '@ferrox-node/observability';
import { AppLoggerFactory } from '@node-yalc/logger';
import { loadConfig } from './config/app.config';
import { SecurityService } from './services/security.service';
import { OrderSagaService } from './services/order-saga.service';
import { BackgroundJobService } from './services/background-job.service';
import { AuthController } from './controllers/auth.controller';
import { OrdersController } from './controllers/orders.controller';
import { JobsController } from './controllers/jobs.controller';
import { MetricsController } from './controllers/metrics.controller';
import { HealthController } from './controllers/health.controller';

const logger = AppLoggerFactory('Bootstrap');

export async function bootstrapApp(overridePort?: number) {
  const config = loadConfig();
  if (overridePort) config.port = overridePort;

  logger.log('Bootstrapping Ferrox-Node Enterprise Showcase Microservice...');

  // 1. Initialize Prometheus & OpenTelemetry Observability
  GlobalMetricsEngine.init();

  // 2. Initialize DI Container & Register Services
  const di = FerroxDIContainer.getInstance();

  const securityService = new SecurityService(config);
  const orderSagaService = new OrderSagaService();
  const backgroundJobService = new BackgroundJobService(config);

  await backgroundJobService.init();

  di.register(SecurityService, securityService);
  di.register(OrderSagaService, orderSagaService);
  di.register(BackgroundJobService, backgroundJobService);

  // Register Controllers in DI
  di.register(AuthController, new AuthController(securityService));
  di.register(OrdersController, new OrdersController(orderSagaService));
  di.register(JobsController, new JobsController(backgroundJobService));
  di.register(MetricsController, new MetricsController());
  di.register(HealthController, new HealthController());

  // 3. Configure and Instantiate FerroxApp
  const app = new FerroxApp({
    engine: 'fastify',
    port: config.port,
    host: config.host,
    sentinelSecretKey: config.sentinelSecretKey,
    controllers: [
      AuthController,
      OrdersController,
      JobsController,
      MetricsController,
      HealthController
    ],
    middlewares: [
      {
        path: '*',
        handler: (req: any, _res: any, next: Function) => {
          logger.log(`[HTTP INCOMING] ${req.method} ${req.url}`);
          next();
        }
      }
    ]
  });

  const server = await app.start();

  logger.log(`🚀 Ferrox-Node Enterprise Showcase running on http://${config.host}:${config.port}`);
  logger.log(`📊 Prometheus Metrics available on http://${config.host}:${config.port}/metrics`);
  logger.log(`🛡️ PASETO v4 + TOTP 2FA + Sentinel Engine: ACTIVE`);

  return { app, server, securityService, orderSagaService, backgroundJobService };
}

// Auto-run if executed directly
if (require.main === module) {
  bootstrapApp().catch((err) => {
    logger.error('Failed to start application:', err.stack || err);
    process.exit(1);
  });
}
