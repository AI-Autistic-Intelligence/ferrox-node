import 'reflect-metadata';
import { FerroxApp, Controller, Get, Injectable, FerroxDIContainer, OnAppStart, OnAppDestroy, FerroxConfigService } from './index';

@Injectable()
export class HelloService {
  getHello(): string {
    return 'Hello from Ferrox-Node DI Container!';
  }
}

@Controller('/api/hello')
export class HelloController implements OnAppStart, OnAppDestroy {
  constructor(
    private helloService: HelloService,
    private configService: FerroxConfigService
  ) {}

  onAppStart() {
    console.log(`[HelloController] Lifecycle Hook: Application Started!`);
    console.log(`[HelloController] Config Test: Fallback Value = ${this.configService.get('MISSING_KEY') || 'NOT_FOUND'}`);
  }

  onAppDestroy() {
    console.log(`[HelloController] Lifecycle Hook: Application Destroyed!`);
  }

  @Get('/')
  sayHello() {
    return {
      message: this.helloService.getHello(),
      timestamp: new Date().toISOString()
    };
  }

  @Get('/error')
  triggerError() {
    throw new Error('This is a simulated error to test the global handler');
  }
}

async function bootstrap() {
  const di = FerroxDIContainer.getInstance();
  const helloService = new HelloService();
  const configService = new FerroxConfigService();

  di.register(HelloService, helloService);
  di.register(FerroxConfigService, configService);
  di.register(HelloController, new HelloController(helloService, configService));

  const app = new FerroxApp({
    engine: 'fastify',
    port: 3000,
    controllers: [HelloController],
    middlewares: [
      {
        path: '*',
        handler: (req: any, res: any, next: any) => {
          console.log(`[Middleware] Executing globally for ${req.method} ${req.url}`);
          next();
        }
      }
    ]
  });

  await app.start();
}

bootstrap().catch(console.error);
