import { FerroxDIContainer } from '../src/core/di-container';
import 'reflect-metadata';

class DependencyA {}

class ServiceB {
  constructor(public depA: DependencyA) {}
}

class CircularA {
  constructor(public b: any) {}
}
class CircularB {
  constructor(public a: any) {}
}

describe('FerroxDIContainer', () => {
  it('should resolve and register singletons', () => {
    const container = FerroxDIContainer.getInstance();
    Reflect.defineMetadata('design:paramtypes', [DependencyA], ServiceB);
    const service = container.resolve(ServiceB);
    
    expect(service).toBeDefined();
    expect(service.depA).toBeDefined();
    expect(service.depA instanceof DependencyA).toBe(true);

    const service2 = container.resolve(ServiceB);
    expect(service).toBe(service2); // Singleton
  });

  it('should detect circular dependencies', () => {
    Reflect.defineMetadata('design:paramtypes', [CircularB], CircularA);
    Reflect.defineMetadata('design:paramtypes', [CircularA], CircularB);

    const container = FerroxDIContainer.getInstance();
    expect(() => container.resolve(CircularA)).toThrow(/Circular dependency detected/);
  });

  it('should register custom providers', () => {
    const container = FerroxDIContainer.getInstance();
    const token = 'CustomToken';
    const provider = { test: true };
    container.register(token, provider);
    
    // Test that the provider was registered correctly by resolving it
    // Wait, resolve function throws if it's not in map and tries to instantiate string 'CustomToken' as a constructor.
    // Actually, `resolve` accepts any target and checks `this.providers.has(target)`
    const resolved = container.resolve(token as any);
    expect(resolved).toBe(provider);
  });
});
