const fs = require('fs');
const path = require('path');

const rootPath = path.join('C:', 'Users', 'nn', 'Desktop', 'code', 'ferrox-node');

// 2. Fix @node-yalc/transports stub
const transportsIndex = path.join(rootPath, 'node-yalc', 'transports', 'src', 'index.ts');
fs.writeFileSync(transportsIndex, `
export type HttpEngineType = 'express' | 'fastify';
export interface IFerroxHttpAdapter {
  use(...args: any[]): void;
  registerRoute(route: any): void;
  type: HttpEngineType;
  listen(port: number): Promise<any>;
  close(): Promise<void>;
}
export class ExpressHttpAdapter implements IFerroxHttpAdapter {
  use(...args: any[]): void {}
  registerRoute(route: any): void {}
  type: HttpEngineType = 'express';
  async listen(port: number): Promise<any> { return {}; }
  async close(): Promise<void> {}
}
export class FastifyHttpAdapter implements IFerroxHttpAdapter {
  use(...args: any[]): void {}
  registerRoute(route: any): void {}
  type: HttpEngineType = 'fastify';
  async listen(port: number): Promise<any> { return {}; }
  async close(): Promise<void> {}
}
export interface FerroxRouteDefinition {}
`);

// 5. Patch ferrox-app.ts for implicit any and undefined server
const ferroxAppPath = path.join(rootPath, 'src', 'core', 'ferrox-app.ts');
let appCode = fs.readFileSync(ferroxAppPath, 'utf8');

// Replace any missing types
appCode = appCode.replace(/req, res, next/g, 'req: any, res: any, next: any');
appCode = appCode.replace(/return server;/g, 'return server as any;');

fs.writeFileSync(ferroxAppPath, appCode);

console.log('Fixed typescript errors part 2');
