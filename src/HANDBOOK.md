# Ferrox-Node Microservice - Programmer & User Handbook

## 1. Executive Summary

This handbook covers the design, usage, and operational guidelines for the **Ferrox-Node Dummy App**, which serves as the fundamental standalone microservice reference architecture.

Node.js is infamous for "NPM fatigue" and heavily fragmented architectures. As a Senior Engineer, my goal with Ferrox-Node was to provide a structured, Opinionated, Enterprise-grade layer over engines like Fastify and Express, bringing Angular/NestJS-like Dependency Injection (DI) and strictly typed lifecycles, without the overhead of heavy abstractions.

---

## 2. Architectural Blueprint

### 2.1 The Domain Problem
Teams building Node.js microservices often face spaghetti code due to ad-hoc global singletons, unhandled promise rejections, and disorganized middleware. A robust backend needs a centralized way to boot, manage dependencies, inject configurations, and gracefully shut down.

### 2.2 System Components
1. **Engine Agnosticism (`FerroxApp`)**
   - The core orchestrator dynamically wraps high-performance engines (Fastify is default). This allows migrating engines in the future without rewriting controllers.
2. **Custom DI Container (`FerroxDIContainer`)**
   - Utilizes TypeScript decorators (`@Injectable`, `@Controller`) and `reflect-metadata` to dynamically resolve class dependencies. 
   - Eliminates `require()` or `import` spaghetti for services like `FerroxConfigService` or DB Connections.
3. **Strict Lifecycle Hooks**
   - `OnAppStart`: Used to verify database connectivity, fetch external keys, or validate configs before accepting HTTP traffic.
   - `OnAppDestroy`: Hooks into `SIGINT/SIGTERM` to gracefully drain HTTP connections, close DB pools, and flush logs.
4. **Onion Middleware & Routing**
   - Global wildcards intercept routes. Controllers are isolated leaves in the routing tree.
5. **Resilience & Security**
   - Integrates Redaction (`fast-redact`) at the logger level (`pino`) to ensure PII and passwords are never written to disk or stdout.

---

## 3. Programmer Handbook (Developer Guide)

### 3.1 Environment Setup
```bash
npm install
# Compile TypeScript
npm run build
# Start the server
node dist/dummy-app.js
```

### 3.2 Creating Controllers and Services
To create a new business logic module:
1. **Create the Service**:
   ```typescript
   @Injectable()
   export class PaymentService {
       process() { return "Processed"; }
   }
   ```
2. **Create the Controller**:
   ```typescript
   @Controller('/api/payments')
   export class PaymentController {
       constructor(private paymentService: PaymentService) {}

       @Get('/')
       handle() { return this.paymentService.process(); }
   }
   ```
3. **Register in Bootstrap**:
   Register both classes in the `FerroxDIContainer` and attach the controller to the `FerroxApp` array.

### 3.3 Handling Application State
Always implement `OnAppStart` if your controller relies on caches or external systems. If the external system is unreachable, throw an error in `OnAppStart` to crash the microservice immediately (Fail-Fast principle).

---

## 4. User & DevOps Handbook (Operations)

### 4.1 Deployment Strategy
Node.js is single-threaded. To maximize CPU utilization:
- **Kubernetes**: Run one Node.js process per container, and deploy `N` replicas based on the node's CPU cores. Set limits to ~1 CPU per pod.
- **PM2**: If running on bare-metal, use PM2 in Cluster Mode to automatically spawn workers equal to the number of logical cores.

### 4.2 Graceful Shutdown
The framework automatically traps OS signals (`SIGTERM`). 
In Kubernetes, when a pod is terminated, the Load Balancer stops routing new traffic. `OnAppDestroy` ensures that any currently processing requests have time to finish before the Node process exits (avoiding 502 Bad Gateway errors for clients).

### 4.3 Logging
Logs are formatted in JSON via `pino` (`sonic-boom`).
Do not parse logs locally. Ensure `stdout` is piped to a log aggregator (e.g., FluentBit -> ElasticSearch or Datadog). 

---

## 5. Senior Engineering Decisions

1. **Why Custom DI instead of Inversify/NestJS?** NestJS is fantastic but extremely heavy, pulling in dozens of RxJS and Express dependencies. Our custom `FerroxDIContainer` achieves the same DX (Developer Experience) with decorators but is 10x lighter and optimized specifically for Fastify.
2. **Why Fastify Default?** Fastify parses JSON significantly faster than Express and handles schema validation natively at the C++ libuv binding level, making it the superior choice for high-throughput microservices.
3. **Why Fail-Fast on Boot?** If a microservice boots successfully but the database is down, Kubernetes marks it as "Ready" and routes traffic to it, resulting in 500 errors for users. By verifying connections in `OnAppStart` and crashing if they fail, Kubernetes enters a `CrashLoopBackOff` and prevents bad traffic routing.
