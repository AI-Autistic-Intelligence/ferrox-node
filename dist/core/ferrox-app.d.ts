import * as http from 'http';
import { HttpEngineType } from '../transports/http-adapters';
import { FerroxSentinelSecurityEngine } from '../security/sentinel-integration';
import { ImprovedLoggerService } from '@node-yalc/logger';
export interface FerroxAppOptions {
    engine?: HttpEngineType;
    port?: number;
    host?: string;
    controllers?: any[];
    globalGuards?: any[];
    sentinelSecretKey?: string;
}
export declare class FerroxApp {
    private adapter;
    private port;
    private host;
    private controllers;
    private globalGuards;
    sentinel: FerroxSentinelSecurityEngine;
    logger: ImprovedLoggerService;
    private server?;
    private di;
    constructor(options?: FerroxAppOptions);
    private registerControllers;
    start(): Promise<http.Server>;
    shutdown(): Promise<void>;
}
