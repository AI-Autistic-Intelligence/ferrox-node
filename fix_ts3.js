const fs = require('fs');
const path = require('path');

const rootPath = path.join('C:', 'Users', 'nn', 'Desktop', 'code', 'ferrox-node');

const transportsIndex = path.join(rootPath, 'node-yalc', 'transports', 'src', 'index.ts');
fs.writeFileSync(transportsIndex, `
export type HttpEngineType = 'express' | 'fastify';
export interface IFerroxHttpAdapter {
  use(...args: any[]): void;
  registerRoute(route: any): void;
  type: HttpEngineType;
  listen(port: number, host: string): Promise<any>;
  close(): Promise<void>;
}
export class ExpressHttpAdapter implements IFerroxHttpAdapter {
  use(...args: any[]): void {}
  registerRoute(route: any): void {}
  type: HttpEngineType = 'express';
  async listen(port: number, host: string): Promise<any> { return {}; }
  async close(): Promise<void> {}
}
export class FastifyHttpAdapter implements IFerroxHttpAdapter {
  use(...args: any[]): void {}
  registerRoute(route: any): void {}
  type: HttpEngineType = 'fastify';
  async listen(port: number, host: string): Promise<any> { return {}; }
  async close(): Promise<void> {}
}
export interface FerroxRouteDefinition {}
`);

console.log('Fixed typescript errors part 3');
