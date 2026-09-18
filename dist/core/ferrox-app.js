"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FerroxApp = void 0;
const http_adapters_1 = require("../transports/http-adapters");
const decorators_1 = require("../routing/decorators");
const sentinel_integration_1 = require("../security/sentinel-integration");
const logger_1 = require("@node-yalc/logger");
const di_container_1 = require("./di-container");
class FerroxApp {
    adapter;
    port;
    host;
    controllers;
    globalGuards;
    sentinel;
    logger;
    server;
    di = di_container_1.FerroxDIContainer.getInstance();
    constructor(options = {}) {
        const engineType = options.engine || 'fastify';
        this.adapter = engineType === 'express' ? new http_adapters_1.ExpressHttpAdapter() : new http_adapters_1.FastifyHttpAdapter();
        this.port = options.port || 8080;
        this.host = options.host || '0.0.0.0';
        this.controllers = options.controllers || [];
        this.globalGuards = options.globalGuards || [];
        this.sentinel = new sentinel_integration_1.FerroxSentinelSecurityEngine(options.sentinelSecretKey);
        this.logger = (0, logger_1.AppLoggerFactory)('FerroxApp');
        this.registerControllers();
    }
    registerControllers() {
        for (const ControllerClass of this.controllers) {
            // Resolve controller instance via DI container
            const controllerInstance = this.di.resolve(ControllerClass);
            const meta = (0, decorators_1.getControllerMetadata)(controllerInstance);
            const prefix = meta.prefix;
            for (const routeMeta of meta.routes) {
                const fullPath = (prefix + routeMeta.path).replace(/\/+/g, '/');
                const handlerFn = controllerInstance[routeMeta.handlerName].bind(controllerInstance);
                const routeDef = {
                    method: routeMeta.method,
                    path: fullPath,
                    handler: async (req, res) => {
                        const startTime = Date.now();
                        this.logger.debug(`[REQUEST] ${req.method} ${req.url}`);
                        try {
                            // 1. Run global guards
                            for (const guard of this.globalGuards) {
                                const allowed = await guard.canActivate(req, res);
                                if (!allowed) {
                                    this.logger.warn(`[GUARD] Global guard blocked request to ${req.url}`);
                                    return;
                                }
                            }
                            // 2. Run controller / route guards
                            for (const guard of routeMeta.guards) {
                                const allowed = await guard.canActivate(req, res);
                                if (!allowed) {
                                    this.logger.warn(`[GUARD] Route guard blocked request to ${req.url}`);
                                    return;
                                }
                            }
                            // 3. Execute controller handler
                            if (!handlerFn)
                                throw new Error(`Handler not found`);
                            const result = await handlerFn(req, res);
                            this.logger.debug(`[RESPONSE] ${req.method} ${req.url} - OK (${Date.now() - startTime}ms)`);
                            return result;
                        }
                        catch (err) {
                            this.logger.error(`[ERROR] ${req.method} ${req.url} - Failed: ${err.message}`, err.stack);
                            throw err;
                        }
                    },
                };
                this.adapter.registerRoute(routeDef);
            }
        }
    }
    async start() {
        this.logger.log(`\n================================================================`);
        this.logger.log(`🚀 Ferrox Enterprise Node.js / TypeScript Security Framework v0.6.0`);
        this.logger.log(`⚡ Engine: ${this.adapter.type.toUpperCase()} | Port: ${this.port}`);
        this.logger.log(`🛡️ Sentinel AI & LSM Kernel Sandbox: ACTIVE`);
        this.logger.log(`================================================================\n`);
        this.server = await this.adapter.listen(this.port, this.host);
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
        return this.server;
    }
    async shutdown() {
        this.logger.log(`\n🛑 Gracefully shutting down Ferrox-Node Framework application...`);
        if (this.adapter)
            await this.adapter.close();
        this.logger.log(`👋 Shutdown complete.`);
    }
}
exports.FerroxApp = FerroxApp;
