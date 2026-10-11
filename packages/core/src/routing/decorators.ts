/**
 * Routing & Guard Decorators for Ferrox-Node Standalone Framework
 */
import 'reflect-metadata';

export interface RouteMetadata {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handlerName: string;
  guards: unknown[];
}

export interface ControllerMetadata {
  prefix: string;
  guards: unknown[];
  routes: RouteMetadata[];
}

const CONTROLLER_METADATA_KEY = Symbol('ferrox:controller');
const ROUTE_METADATA_KEY = Symbol('ferrox:routes');
const GUARDS_METADATA_KEY = Symbol('ferrox:guards');
const ROLES_METADATA_KEY = Symbol('ferrox:roles');

export function Controller(prefix: string = ''): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(CONTROLLER_METADATA_KEY, prefix, target);
  };
}

function createRouteDecorator(method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH') {
  return (path: string = ''): MethodDecorator => {
    return (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<unknown>) => {
      const routes: RouteMetadata[] = Reflect.getMetadata(ROUTE_METADATA_KEY, target.constructor) || [];
      routes.push({
        method,
        path,
        handlerName: String(propertyKey),
        guards: [],
      });
      Reflect.defineMetadata(ROUTE_METADATA_KEY, routes, target.constructor);
    };
  };
}

export const Get = createRouteDecorator('GET');
export const Post = createRouteDecorator('POST');
export const Put = createRouteDecorator('PUT');
export const Delete = createRouteDecorator('DELETE');
export const Patch = createRouteDecorator('PATCH');

export function UseGuard(...guards: unknown[]): ClassDecorator | MethodDecorator {
  return (target: Function | Object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<unknown>) => {
    if (propertyKey) {
      // Method guard
      const existingGuards = Reflect.getMetadata(GUARDS_METADATA_KEY, target.constructor, propertyKey) || [];
      Reflect.defineMetadata(GUARDS_METADATA_KEY, [...existingGuards, ...guards], target.constructor, propertyKey);
    } else {
      // Class guard
      const existingGuards = Reflect.getMetadata(GUARDS_METADATA_KEY, target) || [];
      Reflect.defineMetadata(GUARDS_METADATA_KEY, [...existingGuards, ...guards], target);
    }
  };
}

export function Roles(...roles: string[]): ClassDecorator | MethodDecorator {
  return (target: Function | Object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<unknown>) => {
    if (propertyKey) {
      Reflect.defineMetadata(ROLES_METADATA_KEY, roles, target.constructor, propertyKey);
    } else {
      Reflect.defineMetadata(ROLES_METADATA_KEY, roles, target);
    }
  };
}

export function getControllerMetadata(controllerInstance: unknown): ControllerMetadata {
  const target = (controllerInstance as any).constructor;
  const prefix = Reflect.getMetadata(CONTROLLER_METADATA_KEY, target) || '';
  const classGuards = Reflect.getMetadata(GUARDS_METADATA_KEY, target) || [];
  const rawRoutes: RouteMetadata[] = Reflect.getMetadata(ROUTE_METADATA_KEY, target) || [];

  const routes = rawRoutes.map((r) => {
    const methodGuards = Reflect.getMetadata(GUARDS_METADATA_KEY, target, r.handlerName) || [];
    return {
      ...r,
      guards: [...classGuards, ...methodGuards],
    };
  });

  return {
    prefix,
    guards: classGuards,
    routes,
  };
}

export function getRolesMetadata(target: unknown, propertyKey?: string): string[] {
  if (propertyKey) {
    return Reflect.getMetadata(ROLES_METADATA_KEY, (target as any).constructor, propertyKey) || [];
  }
  return Reflect.getMetadata(ROLES_METADATA_KEY, target) || [];
}

/**
 * Dependency Injection Decorators
 */
const INJECTABLE_METADATA_KEY = 'ferrox:injectable';

export function Injectable(): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(INJECTABLE_METADATA_KEY, true, target);
  };
}

export function Inject(token: unknown): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existingInjections = Reflect.getMetadata('ferrox:injections', target) || [];
    existingInjections.push({ index: parameterIndex, token });
    Reflect.defineMetadata('ferrox:injections', existingInjections, target);
  };
}
