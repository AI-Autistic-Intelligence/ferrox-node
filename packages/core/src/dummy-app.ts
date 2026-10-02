/**
 * # Ferrox-Node Enterprise Showcase (Bootstrap Application)
 * 
 * ## Introduction
 * This file serves as a "dummy-app" and reference implementation for the `ferrox-node` framework. 
 * It is not just a "Hello World", but a practical demonstration of how to orchestrate various modules 
 * (Dependency Injection, Routing, Security, Resilience, and Infrastructure) in a real 
 * Enterprise scenario, reducing the cognitive load on the developer.
 * 
 * ## Architectural Choices and Considerations
 * 1. **Centralized Error Handling (@node-yalc/errors)**:
 *    - *Choice*: Use strongly-typed exceptions (e.g., `BadRequestError`, `InternalServerError`).
 *    - *Reason*: Prevent stack traces from being exposed to the client (Information Disclosure) and guarantee 
 *      a standardized JSON response for the frontends.
 * 2. **Security via PASETO (Platform-Agnostic Security Tokens)**:
 *    - *Choice*: Replace JWT with PASETO v4.local.
 *    - *Reason*: JWT suffers from intrinsic vulnerabilities (alg type confusion). PASETO v4 (symmetric)
 *      offers AEAD cryptography (authenticated and encrypted) making payloads opaque and tamper-proof.
 * 3. **Resilience via Circuit Breaker**:
 *    - *Choice*: Implement the Circuit Breaker design pattern in core business services.
 *    - *Reason*: In a microservices architecture, a slow or "dead" service can cause 
 *      the entire system to lock up (Cascading Failures). The circuit temporarily "opens", 
 *      rejecting requests to protect the database and thread pool.
 * 4. **Infrastructure as Code (DeployFactory)**:
 *    - *Choice*: Auto-generate Kubernetes/Docker manifests on startup only in Development mode.
 *    - *Trade-off*: Slightly slows down startup in dev, but zeroes the risk of infrastructure 
 *      drift between the app's architecture and the deploy definitions.
 * 5. **Database Mocking**:
 *    - *Trade-off*: The code prepares and loads a real Postgres configuration, but 
 *      comments out the `createConnection` call.
 *    - *Reason*: Make the `ferrox-node` template downloadable and executable out-of-the-box 
 *      without requiring the developer to have an active Postgres container locally.
 */

import 'reflect-metadata';
import { 
  FerroxApp, 
  Controller, 
  Get, 
  Post,
  Injectable, 
  FerroxDIContainer, 
  OnAppStart, 
  OnAppDestroy, 
  FerroxConfigService,
  DeployConfig,
  CircuitBreaker,
  PasetoAuthService,
  DeployFactory
} from './index';
import { DatabaseFactory, DatabaseConnectionConfig } from '@ferrox-node/database';

import { AppLoggerFactory } from '@node-yalc/logger';
import { BadRequestError, InternalServerError, UnauthorizedError } from '@node-yalc/errors';

// Enterprise Yalc Logger Setup
const logger = AppLoggerFactory('Bootstrap');

/**
 * @class BusinessLogicService
 * @description
 * Simulates a vital backend service (e.g., payment processing or ERP communication).
 * Integrates the Circuit Breaker Pattern to guarantee isolation from cascading failures.
 */
@Injectable()
export class BusinessLogicService {
  // Configure Circuit Breaker: if 3 operations fail consecutively, the circuit opens for 5 seconds (5000ms).
  private circuitBreaker = new CircuitBreaker(3, 5000);

  /**
   * Processes a high-risk transaction.
   * The entire execution is wrapped by the resilience circuit.
   */
  async processHighRiskTransaction(payload: any): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      // Basic input validation. Automatically returns HTTP 400 Bad Request.
      if (!payload || !payload.amount) {
        throw new BadRequestError('Transaction amount is required for high-risk operations.');
      }
      
      logger.log(`Processing transaction of amount: ${payload.amount}`);
      
      // Simulation of a strict business constraint. Returns HTTP 500 Internal Server Error.
      if (payload.amount > 1000000) {
        throw new InternalServerError('Amount exceeds maximum processing threshold.');
      }

      // Returns a structured DTO that the framework will serialize into JSON.
      return {
        transactionId: `TXN-${Date.now()}`,
        status: 'COMPLETED',
        processedAt: new Date().toISOString(),
      };
    });
  }
}

/**
 * @class EnterpriseController
 * @description
 * Handles incoming HTTP calls (Routing) and implements the application startup
 * and destruction lifecycle to safely allocate/deallocate resources (e.g., Database).
 */
@Controller('/api/v1/enterprise')
export class EnterpriseController implements OnAppStart, OnAppDestroy {
  /**
   * Automatic Dependency Injection (DI). The framework will inject 
   * the pre-registered singletons for Business, Configuration, and Authentication.
   */
  constructor(
    private businessService: BusinessLogicService,
    private configService: FerroxConfigService,
    private authService: PasetoAuthService
  ) {}

  /**
   * Lifecycle Hook: Called when the HTTP engine is actively listening.
   * Leveraged here to prepare dynamic deployment scripts based on the environment.
   */
  async onAppStart() {
    logger.log(`[EnterpriseController] Application successfully bootstrapped and ready to accept traffic.`);
    
    // Architectural Trade-off: IaC (Infrastructure as Code) manifests are 
    // cold-generated to allow DevOps operations without write-locks during production.
    if (this.configService.get('NODE_ENV') !== 'production') {
      const deployConfig: DeployConfig = {
        appName: 'ferrox-enterprise-microservice',
        strategy: 'kubernetes',
        version: '1.0.0',
        port: 3000,
        environment: 'development'
      };
      
      try {
        DeployFactory.generateDeployment(deployConfig, './deploy-output');
        logger.log('Infrastructure-as-Code (Kubernetes) generated successfully in ./deploy-output');
      } catch (err: any) {
        logger.error('Failed to generate deployment scripts', err.stack || String(err));
      }
    }
  }

  /**
   * Lifecycle Hook: Executed on shutdown (SIGTERM/SIGINT).
   * Essential in Serverless or K8s environments to prevent Data Corruption in the database.
   */
  async onAppDestroy() {
    logger.log(`[EnterpriseController] Graceful shutdown initiated. Cleaning up resources...`);
    // Deterministic closure of database pooled connections.
    await DatabaseFactory.closeAllConnections();
  }

  /**
   * Basic monitoring route, used by Load Balancers (AWS ALB, K8s Liveness Probe).
   */
  @Get('/health')
  healthCheck() {
    return {
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Demonstration of secure token issuance using PASETO instead of JWT.
   */
  @Get('/auth/token')
  generateToken() {
    const payload = { sub: 'usr_123456', roles: ['admin', 'operator'] };
    // Issues a v4 token (symmetric) valid for 1 hour (3600 sec)
    const token = this.authService.generateV4LocalToken(payload, 3600);
    logger.log(`Generated new PASETO v4 token for user: ${payload.sub}`);
    
    return {
      accessToken: token,
      expiresIn: 3600,
      tokenType: 'v4.local'
    };
  }

  /**
   * Demonstration of manual token validation (can be automated with a @UseGuard).
   */
  @Get('/secure-data')
  getSecureData(req: any) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = this.authService.verifyV4LocalToken(token);
      return {
        message: 'Access Granted to Secure Data',
        user: decoded.sub,
        roles: decoded.roles
      };
    } catch (err: any) {
      throw new UnauthorizedError(`Token validation failed: ${err.message}`);
    }
  }

  /**
   * Endpoint to demonstrate the use of the business service and error handling.
   */
  @Post('/transaction')
  async handleTransaction(req: any) {
    const body = req.body || { amount: 50000 };
    
    try {
      const result = await this.businessService.processHighRiskTransaction(body);
      return result;
    } catch (err: any) {
      // We catch this here solely to log critical anomalies locally
      logger.error(`Transaction failed: ${err.message}`, err.stack);
      // By re-throwing the exception, we delegate HTTP formatting for the client to the framework
      throw err; 
    }
  }
}

/**
 * Application main entrypoint.
 */
async function bootstrap() {
  logger.log('Starting Ferrox-Node Enterprise Framework...');

  // 1. Dependency Injection Setup (Inversion of Control)
  // We use an explicit DI Container that stores instances and makes them globally retrievable.
  const di = FerroxDIContainer.getInstance();
  const businessService = new BusinessLogicService();
  const configService = new FerroxConfigService();
  
  // The secret is retrieved from configuration (.env or fallback defaults)
  const authService = new PasetoAuthService(
    configService.get('PASETO_SECRET') || 'enterprise-super-secure-secret-32b',
    'ferrox-auth-issuer'
  );

  di.register(BusinessLogicService, businessService);
  di.register(FerroxConfigService, configService);
  di.register(PasetoAuthService, authService);
  di.register(EnterpriseController, new EnterpriseController(businessService, configService, authService));

  // 2. Database Initialization
  // We prepare a complete configuration manifest. To avoid crashing for users 
  // exploring this dummy-app, we proactively catch connection errors 
  // or comment out the direct call.
  try {
    const dbConfig: DatabaseConnectionConfig = {
      type: 'postgresql',
      host: process.env.DB_HOST || 'localhost',
      port: 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: 'ferrox_db',
      synchronize: true, // Do not use in production: recreates tables!
      poolSize: 50       // High-concurrency ready
    };
    
    // Uncomment to actually connect the DB
    // await DatabaseFactory.createConnection(dbConfig);
    logger.log('Database configuration loaded. (Connection mocked for dummy-app)');
  } catch (err: any) {
    logger.error('Database initialization failed. Please check your credentials.', err.stack || String(err));
  }

  // 3. Application Bootstrapping
  // The Ferrox app is declared, selecting a hyper-performant web server (fastify).
  const app = new FerroxApp({
    engine: 'fastify',
    port: 3000,
    controllers: [EnterpriseController],
    middlewares: [
      {
        path: '*',
        handler: (req: any, res: any, next: any) => {
          logger.log(`[Global Middleware] HTTP ${req.method} request received at ${req.url}`);
          next();
        }
      }
    ]
  });

  // Start the server
  await app.start();
}

/**
 * Security: Catching panics and V8 VM faults to avoid silent terminations
 * and trace-less restart loops.
 */
process.on('uncaughtException', (err) => {
  logger.error('CRITICAL: Uncaught Exception detected. Shutting down gracefully...', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('CRITICAL: Unhandled Promise Rejection detected.', reason);
});

bootstrap().catch((err: any) => {
  logger.error('Failed to bootstrap application', err.stack || String(err));
});

