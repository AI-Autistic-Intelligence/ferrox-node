import * as http from 'http';
import {
  HttpEngineType,
  IFerroxHttpAdapter,
  ExpressHttpAdapter,
  FastifyHttpAdapter,
  FerroxRouteDefinition,
} from '../transports/http-adapters';
import { getControllerMetadata } from '../routing/decorators';
import { FerroxSentinelSecurityEngine } from '../security/sentinel-integration';
import { AppLoggerFactory, ImprovedLoggerService } from '@node-yalc/logger';
import { FerroxDIContainer } from './di-container';

export interface FerroxAppOptions {
  engine?: HttpEngineType;
  port?: number;
  host?: string;
  controllers?: any[];
  globalGuards?: any[];
  middlewares?: Array<{ path?: string; handler: any }>;
  sentinelSecretKey?: string;
}

export class FerroxApp {
  private adapter: IFerroxHttpAdapter;
  private port: number;
  private host: string;
  private controllers: any[];
  private globalGuards: any[];
  private middlewares: Array<{ path?: string; handler: any }>;
  public sentinel: FerroxSentinelSecurityEngine;
  public logger: ImprovedLoggerService;
  private server?: http.Server;
  private di = FerroxDIContainer.getInstance();

  constructor(options: FerroxAppOptions = {}) {
    const engineType = options.engine || 'fastify';
    this.adapter = engineType === 'express' ? new ExpressHttpAdapter() : new FastifyHttpAdapter();
    this.port = options.port || 8080;
    this.host = options.host || '0.0.0.0';
    this.controllers = options.controllers || [];
    this.globalGuards = options.globalGuards || [];
    this.middlewares = options.middlewares || [];
    this.sentinel = new FerroxSentinelSecurityEngine(options.sentinelSecretKey);
    this.logger = AppLoggerFactory('FerroxApp');

    this.registerMiddlewares();
    this.registerControllers();
  }

  private registerMiddlewares(): void {
    for (const m of this.middlewares) {
      const path = m.path || '*';
      this.adapter.use(path, m.handler);
    }
  }

  private registerControllers(): void {
    for (const ControllerClass of this.controllers) {
      // Resolve controller instance via DI container
      const controllerInstance: any = this.di.resolve(ControllerClass);
      const meta = getControllerMetadata(controllerInstance);
      const prefix = meta.prefix;

      for (const routeMeta of meta.routes) {
        const fullPath = (prefix + routeMeta.path).replace(/\/+/g, '/');
        const handlerFn = controllerInstance[routeMeta.handlerName].bind(controllerInstance);

        const routeDef: FerroxRouteDefinition = {
          method: routeMeta.method,
          path: fullPath,
          handler: async (req: any, res: any) => {
            const startTime = Date.now();
            this.logger?.debug?.(`[REQUEST] ${req.method} ${req.url}`);

            try {
              // 1. Run global guards
              for (const guard of this.globalGuards) {
                const allowed = await guard.canActivate(req, res);
                if (!allowed) {
                  this.logger?.warn(`[GUARD] Global guard blocked request to ${req.url}`);
                  return;
                }
              }

              // 2. Run controller / route guards
              for (const guard of routeMeta.guards) {
                const allowed = await guard.canActivate(req, res);
                if (!allowed) {
                  this.logger?.warn(`[GUARD] Route guard blocked request to ${req.url}`);
                  return;
                }
              }

              // 3. Execute controller handler
              if (!handlerFn) throw new Error(`Handler not found`);
              const result = await handlerFn(req, res);
              this.logger?.debug?.(`[RESPONSE] ${req.method} ${req.url} - OK (${Date.now() - startTime}ms)`);
              return result;
            } catch (err: any) {
              this.logger?.error(`[ERROR] ${req.method} ${req.url} - Failed: ${err.message}`, err.stack);
              throw err;
            }
          },
        };

        this.adapter.registerRoute(routeDef);
      }
    }
  }

  public async start(): Promise<http.Server> {
    this.logger?.log(`\n================================================================`);
    this.logger?.log(`🚀 Ferrox Enterprise Node.js / TypeScript Security Framework v0.6.0`);
    this.logger?.log(`⚡ Engine: ${this.adapter.type.toUpperCase()} | Port: ${this.port}`);
    this.logger?.log(`🛡️ Sentinel AI & LSM Kernel Sandbox: ACTIVE`);
    this.logger?.log(`================================================================\n`);

    // Run OnAppStart hooks
    for (const ControllerClass of this.controllers) {
      const instance: any = this.di.resolve(ControllerClass);
      if (instance && typeof instance.onAppStart === 'function') {
        await instance.onAppStart();
      }
    }

    this.server = await this.adapter.listen(this.port, this.host);

    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());

    return this.server as any;
  }

  public async shutdown(): Promise<void> {
    this.logger?.log(`\n🛑 Gracefully shutting down Ferrox-Node Framework application...`);

    // Run OnAppDestroy hooks
    for (const ControllerClass of this.controllers) {
      const instance: any = this.di.resolve(ControllerClass);
      if (instance && typeof instance.onAppDestroy === 'function') {
        await instance.onAppDestroy();
      }
    }

    if (this.adapter) await this.adapter.close();
    this.logger?.log(`👋 Shutdown complete.`);
  }
}
