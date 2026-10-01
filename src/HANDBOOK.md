# Ferrox-Node Microservice - The Definitive Handbook

## 1. Executive Summary & Senior Engineering Vision

This handbook details the **Ferrox-Node Dummy App**, the architectural blueprint for Node.js microservices in the Ferrox ecosystem.

Node.js is favored for its async I/O, but its ecosystem is infamous for "NPM fatigue," spaghetti callbacks, and monolithic abstractions (like NestJS) that mask the underlying engine. As a Senior Engineer, my objective was to create a razor-sharp, strictly-typed Dependency Injection container layered over Fastify. This framework provides Enterprise-grade lifecycle management, strict security middlewares, and profound mechanical sympathy for the V8 Engine and the `libuv` event loop.

---

## 2. The Domain Problem

Building a Backend-For-Frontend (BFF) or microservice in Node.js requires extreme care. Unhandled promise rejections bring down the entire process. Global state leaks between requests. Without a rigid structure, injecting dependencies (Configs, DB pools) turns into a chaotic web of `require()` calls. We need the developer experience of Angular/NestJS, but with the raw execution speed of bare-metal Fastify.

---

## 3. Low-Level Architecture & OS-Kernel Interactions

### 3.1 The libuv Reactor & Event Loop Mechanics
Node.js runs Javascript on a single thread via the V8 Engine, delegating I/O to the C-based `libuv` library.
- **The Epoll Bridge**: When traffic hits the server, `libuv` uses Linux `epoll` (or macOS `kqueue`) to detect TCP socket readiness. It executes non-blocking read/writes and posts callbacks back to the V8 event queue.
- **Thread Pool Tuning**: Operations like cryptographic hashing (Argon2id) or synchronous filesystem access cannot be non-blocking at the OS level. `libuv` offloads these to a hidden Thread Pool (default 4 threads). If traffic spikes, this thread pool is exhausted, causing immense latency tails. We dynamically tune `UV_THREADPOOL_SIZE` to match the physical CPU cores to guarantee consistent throughput.

### 3.2 V8 Engine JIT & Fastify Optimization
We explicitly use **Fastify** as our default engine, rejecting Express.
- **Hidden Classes (Inline Caching)**: Express dynamic request mutations destroy V8's "Hidden Classes" (Shapes), forcing the JIT compiler into slow dictionary-lookups. Fastify maintains rigid object structures, keeping V8 in highly optimized compiled assembly.
- **C-Level Serialization**: Fastify utilizes `fast-json-stringify`. It pre-compiles JSON Schemas into raw V8 C++ bindings that dump bytes directly, completely bypassing the reflection overhead of native `JSON.stringify`.

---

## 4. Application Architecture & Framework Internals

### 4.1 Custom Dependency Injection (`FerroxDIContainer`)
Heavy frameworks like NestJS use RxJS and deep proxy chains that bloat memory.
- **Reflect Metadata**: Our custom DI container uses TypeScript decorators (`@Injectable`, `@Controller`) to embed type tokens during TSC compilation.
- **Boot-time Resolution**: The DI container resolves the entire dependency graph and instantiates singletons strictly at boot time. This achieves zero-overhead dependency resolution during active HTTP request handling.

### 4.2 Lifecycle Hooks & The Fail-Fast Philosophy
- **`OnAppStart`**: Executes before the HTTP server binds. If the DB connection fails here, we throw an error and crash immediately. Kubernetes sees the crash, triggers `CrashLoopBackOff`, and stops routing traffic. Graceful degradation here is an anti-pattern that leads to 500 Bad Gateway cascades.
- **`OnAppDestroy`**: Hooks into `SIGTERM/SIGINT`. It drains active connections and closes DB pools gracefully before the OS kills the process.

---

## 5. Security Model: Zero-Trust Pipeline

### 5.1 Onion Middleware & Redaction
The 7-Layer Onion Request Pipeline intercepts all traffic.
- **`fast-redact`**: PII (Passwords, PASETO tokens) must never touch disk. We intercept the Pino logger stream at the AST level, mathematically stripping sensitive keys before writing to `stdout`, ensuring strict GDPR and SIEM compliance.
- **ReDoS Prevention**: Fastify inherently protects against Node's greatest weakness—Event Loop blocking. Payload lengths are strictly capped before parsing to prevent Regular Expression Denial of Service attacks via malformed JSON.

---

## 6. Programmer's Guide (Developer Workflow)

### 6.1 Environment Setup
```bash
# 1. Install dependencies
npm install

# 2. Compile TypeScript
npm run build

# 3. Start the server
node dist/dummy-app.js
```

### 6.2 Creating Controllers and Services
1. **Define the Service**:
   ```typescript
   @Injectable()
   export class AuthService {
       validate() { return true; }
   }
   ```
2. **Define the Controller**:
   ```typescript
   @Controller('/api/auth')
   export class AuthController {
       constructor(private authService: AuthService) {}

       @Get('/login')
       handle() { return this.authService.validate(); }
   }
   ```
3. **Register**: Add them to the `FerroxDIContainer` and `FerroxApp` boostrap arrays.

---

## 7. User & DevOps Handbook (Operations)

### 7.1 Advanced Node.js Tuning
Node.js processes are bound to a single physical core. To scale:
```bash
# Match the libuv thread pool to physical cores
export UV_THREADPOOL_SIZE=$(nproc)

# Constrain V8 Garbage Collector limits for predictable scaling
node --max-old-space-size=512 --nouse-idle-notification dist/dummy-app.js
```
- `--max-old-space-size`: Prevents V8 from hoarding RAM before running a massive, world-stopping GC cycle. Forces frequent, lightweight GC sweeps.
- **Scaling**: Use Kubernetes Deployments or PM2 Cluster Mode to spawn `N` replicas, where `N` equals the number of physical cores.

### 7.2 Logging and Telemetry
Never write logs to files via `fs.writeFile`. Output raw JSON to `stdout` utilizing `pino` (backed by `sonic-boom` asynchronous log streams). Let a DaemonSet (like FluentBit) forward logs to Elasticsearch.

---

## 8. Senior Engineering Conclusion

To master Node.js, one must recognize that it is merely a JavaScript runtime bolted onto an extraordinarily efficient C event loop. By replacing bloated middleware with compiled JSON schemas, avoiding V8 de-optimizations through structural rigidity, and enforcing mathematical Fail-Fast lifecycles, we transform a fragile scripting ecosystem into an industrial-grade backend capable of handling tens of thousands of requests per second per core. Architecture is absolute knowledge of the hardware beneath the code.
