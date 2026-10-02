import 'reflect-metadata';

type Constructor<T = any> = new (...args: any[]) => T;

export class FerroxDIContainer {
  private static instance = new FerroxDIContainer();
  private providers = new Map<any, any>();
  private resolving = new Set<any>();

  private constructor() {}

  public static getInstance(): FerroxDIContainer {
    return FerroxDIContainer.instance;
  }

  public register<T>(token: any, provider: T): void {
    this.providers.set(token, provider);
  }

  public resolve<T>(target: Constructor<T>): T {
    if (this.providers.has(target)) {
      return this.providers.get(target);
    }

    if (this.resolving.has(target)) {
      throw new Error(`Circular dependency detected while resolving ${target.name}`);
    }

    this.resolving.add(target);

    // Get injection tokens (constructor parameters)
    const tokens = Reflect.getMetadata('design:paramtypes', target) || [];
    
    // Resolve all dependencies
    const injections = tokens.map((token: any) => this.resolve(token));

    // Instantiate with dependencies
    const instance = new target(...injections);
    
    // Register as a singleton
    this.providers.set(target, instance);
    this.resolving.delete(target);

    return instance;
  }
}
