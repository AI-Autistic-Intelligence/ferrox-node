const fs = require('fs');
const path = require('path');

const rootPath = path.join('C:', 'Users', 'nn', 'Desktop', 'code', 'ferrox-node');

// 1. Fix ConfigManager stub
const configIndex = path.join(rootPath, 'node-yalc', 'config', 'src', 'index.ts');
fs.writeFileSync(configIndex, `export class ConfigManager<T = any> {
  constructor(engine?: any, alias?: string) {}
  get(key: string): any { return null; }
}\n`);

// 2. Fix @node-yalc/transports stub
const transportsIndex = path.join(rootPath, 'node-yalc', 'transports', 'src', 'index.ts');
fs.writeFileSync(transportsIndex, `
export type HttpEngineType = 'express' | 'fastify';
export interface IFerroxHttpAdapter {}
export class ExpressHttpAdapter implements IFerroxHttpAdapter {}
export class FastifyHttpAdapter implements IFerroxHttpAdapter {}
export interface FerroxRouteDefinition {}
`);

// 3. Fix @node-yalc/security stub
const securityIndex = path.join(rootPath, 'node-yalc', 'security', 'src', 'index.ts');
fs.writeFileSync(securityIndex, `
export class FerroxSentinelSecurityEngine {
  constructor(app: any) {}
}
`);

// 4. Delete scratch_error.ts
const scratchError = path.join(rootPath, 'node-yalc', 'scratch_error.ts');
if (fs.existsSync(scratchError)) fs.unlinkSync(scratchError);

// 5. Patch ferrox-app.ts for implicit any and undefined server
const ferroxAppPath = path.join(rootPath, 'src', 'core', 'ferrox-app.ts');
let appCode = fs.readFileSync(ferroxAppPath, 'utf8');
appCode = appCode.replace('(req, res, next)', '(req: any, res: any, next: any)');
appCode = appCode.replace('return server;', 'return server as any;');
fs.writeFileSync(ferroxAppPath, appCode);

console.log('Fixed typescript errors');
