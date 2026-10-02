import 'reflect-metadata';
import 'reflect-metadata';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  UseGuard,
  Roles,
  getControllerMetadata,
  getRolesMetadata,
  Injectable,
  Inject,
} from '../src/routing/decorators';

class MockGuard {}
class MockGuard2 {}

@Injectable()
@UseGuard(MockGuard)
@Roles('admin', 'user')
@Controller('/test')
class TestClass {
  constructor(@Inject('MyToken') private myProp: any) {}

  @UseGuard(MockGuard2)
  @Roles('moderator')
  @Get('/hello')
  hello() {}

  @Post('/hi')
  hi() {}
  
  @Put('/put')
  put() {}
  
  @Delete('/delete')
  del() {}
  
  @Patch('/patch')
  patch() {}
}

@Injectable()
@Controller()
class EmptyTestClass {
  @Get()
  hello() {}
}

@Controller()
class NoRoutesTestClass {}

describe('Decorators', () => {
  it('should set and get controller metadata', () => {
    const instance = new TestClass(null);
    const meta = getControllerMetadata(instance);
    
    expect(meta.prefix).toBe('/test');
    expect(meta.guards.length).toBeGreaterThan(0);
    expect(meta.routes.length).toBe(5);
    
    const helloRoute = meta.routes.find((r) => r.handlerName === 'hello');
    expect(helloRoute).toBeDefined();
    expect(helloRoute?.method).toBe('GET');
    expect(helloRoute?.path).toBe('/hello');
    expect(helloRoute?.guards.length).toBe(2); // Class guard + Method guard

    // Test empty controller
    const emptyInstance = new EmptyTestClass();
    const emptyMeta = getControllerMetadata(emptyInstance);
    expect(emptyMeta.prefix).toBe('');
    expect(emptyMeta.routes[0].path).toBe('');

    // Test no routes controller
    const noRoutesInstance = new NoRoutesTestClass();
    const noRoutesMeta = getControllerMetadata(noRoutesInstance);
    expect(noRoutesMeta.routes).toEqual([]);
  });

  it('should set and get roles metadata', () => {
    const instance = new TestClass(null);
    const classRoles = getRolesMetadata(instance.constructor);
    expect(classRoles).toEqual(['admin', 'user']);
    
    // For methods, getRolesMetadata takes the instance (target)
    const methodRoles = getRolesMetadata(instance, 'hello');
    expect(methodRoles).toEqual(['moderator']);

    // Test empty roles
    const emptyInstance = new EmptyTestClass();
    expect(getRolesMetadata(emptyInstance.constructor)).toEqual([]);
    expect(getRolesMetadata(emptyInstance, 'hello')).toEqual([]);
  });

  it('should register injections', () => {
    const injections = Reflect.getMetadata('ferrox:injections', TestClass);
    expect(injections.length).toBe(1);
    expect(injections[0].token).toBe('MyToken');
  });

  it('should register injectable', () => {
    const isInjectable = Reflect.getMetadata('ferrox:injectable', TestClass);
    expect(isInjectable).toBe(true);
  });
});
