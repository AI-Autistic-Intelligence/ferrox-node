# Ferrox-Node Microservice - The Definitive Enterprise Handbook

## 1. Executive Summary & Senior Engineering Vision

This handbook details the architectural blueprint for Node.js microservices in the Ferrox ecosystem.

Node.js is favored for its async I/O, but its ecosystem is infamous for "NPM fatigue," spaghetti callbacks, and monolithic abstractions (like NestJS) that mask the underlying engine. As a Senior Engineer, the objective is to create a razor-sharp, strictly-typed Dependency Injection container layered over Fastify. This framework provides Enterprise-grade lifecycle management, strict security middlewares, and profound mechanical sympathy for the V8 Engine and the `libuv` event loop.

---

## 2. Low-Level Architecture & OS-Kernel Interactions

### 2.1 The libuv Reactor & Event Loop Mechanics
Node.js runs Javascript on a single thread via the V8 Engine, delegating I/O to the C-based `libuv` library.
- **The Epoll Bridge**: When traffic hits the server, `libuv` uses Linux `epoll` (or macOS `kqueue`) to detect TCP socket readiness. It executes non-blocking read/writes and posts callbacks back to the V8 event queue.
- **Thread Pool Tuning**: Operations like cryptographic hashing (Argon2id) or synchronous filesystem access cannot be non-blocking at the OS level. `libuv` offloads these to a hidden Thread Pool (default 4 threads). If traffic spikes, this thread pool is exhausted, causing immense latency tails. We dynamically tune `UV_THREADPOOL_SIZE` to match the physical CPU cores to guarantee consistent throughput.

### 2.2 V8 Engine JIT & Fastify Optimization
We explicitly use **Fastify** as our default engine, rejecting Express.
- **Hidden Classes (Inline Caching)**: Express dynamic request mutations destroy V8's "Hidden Classes" (Shapes), forcing the JIT compiler into slow dictionary-lookups. Fastify maintains rigid object structures, keeping V8 in highly optimized compiled assembly.
- **C-Level Serialization**: Fastify utilizes `fast-json-stringify`. It pre-compiles JSON Schemas into raw V8 C++ bindings that dump bytes directly, completely bypassing the reflection overhead of native `JSON.stringify`.

---

## 3. Application Architecture & Framework Internals

### 3.1 Custom Dependency Injection (`FerroxDIContainer`)
Heavy frameworks like NestJS use RxJS and deep proxy chains that bloat memory.
- **Reflect Metadata**: Our custom DI container uses TypeScript decorators (`@Injectable`, `@Controller`) to embed type tokens during TSC compilation.
- **Boot-time Resolution**: The DI container resolves the entire dependency graph and instantiates singletons strictly at boot time. This achieves zero-overhead dependency resolution during active HTTP request handling.

### 3.2 Command Query Responsibility Segregation (CQRS)
To prevent the "Fat Controller" anti-pattern, Ferrox-Node enforces CQRS.
- **Commands**: State-mutating operations are dispatched to a `CommandBus`. They are transactional and often emit Domain Events.
- **Queries**: Read operations are dispatched to a `QueryBus`, which bypasses the heavy domain model to read directly from optimized Datagrids or Redis caches.

### 3.3 Lifecycle Hooks & The Fail-Fast Philosophy
- **`OnAppStart`**: Executes before the HTTP server binds. If the DB connection fails here, we throw an error and crash immediately. Kubernetes sees the crash, triggers `CrashLoopBackOff`, and stops routing traffic. Graceful degradation here is an anti-pattern that leads to 500 Bad Gateway cascades.
- **`OnAppDestroy`**: Hooks into `SIGTERM/SIGINT`. It drains active connections and closes DB pools gracefully before the OS kills the process.

---

## 4. Resilience & Chaos Engineering

### 4.1 Circuit Breaker Pattern
If a downstream service (e.g., Payment API) fails continuously, the `CircuitBreaker` trips. It transitions to an `OPEN` state, immediately rejecting requests (Fast-Fail) rather than allowing sockets to hang and exhaust the Node.js connection pool.

### 4.2 Singleflight Deduplication
To prevent Cache Stampedes (Thundering Herd), `Singleflight` groups identical concurrent requests. If 1,000 users request the exact same cache-missed resource, the database is queried only once. The single promise result is then fanned out to all 1,000 waiting clients.

---

## 5. Security Model: Zero-Trust Pipeline

### 5.1 PASETO Authentication
JWT is deprecated due to Algorithm Confusion vulnerabilities. Ferrox enforces **PASETO v4.local** tokens. These are symmetrically encrypted via AEAD (XChaCha20-Poly1305), guaranteeing that the payload is utterly opaque to the client and tamper-proof.

### 5.2 Onion Middleware & Redaction
The 7-Layer Onion Request Pipeline intercepts all traffic.
- **`fast-redact`**: PII (Passwords, tokens) must never touch disk. We intercept the Pino logger stream at the AST level, mathematically stripping sensitive keys before writing to `stdout`, ensuring strict GDPR and SIEM compliance.
- **ReDoS Prevention**: Payload lengths are strictly capped before parsing to prevent Regular Expression Denial of Service attacks via malformed JSON, safeguarding the Event Loop.

---

## 6. Developer Workflow & Operations

### 6.1 Advanced Node.js Tuning
Node.js processes are bound to a single physical core. To scale effectively:
```bash
# Match the libuv thread pool to physical cores
export UV_THREADPOOL_SIZE=$(nproc)

# Constrain V8 Garbage Collector limits for predictable scaling
node --max-old-space-size=512 --nouse-idle-notification dist/main.js
```
- `--max-old-space-size`: Prevents V8 from hoarding RAM before running a massive, world-stopping GC cycle. Forces frequent, lightweight GC sweeps, leading to flat P99 latency.
- **Scaling**: Use Kubernetes Deployments or PM2 Cluster Mode to spawn `N` replicas, where `N` equals the number of physical cores.

### 6.2 Logging and Telemetry
Never write logs to files via `fs.writeFile`. Output raw JSON to `stdout` utilizing `pino` (backed by `sonic-boom` asynchronous log streams). Let a DaemonSet (like FluentBit or Promtail) forward logs to Elasticsearch/Grafana Loki.
All logs are automatically injected with W3C `trace_id` headers using Node's native `AsyncLocalStorage`, achieving Distributed Tracing without passing context objects manually.

---

## 7. Senior Engineering Conclusion

To master Node.js, one must recognize that it is merely a JavaScript runtime bolted onto an extraordinarily efficient C event loop. By replacing bloated middleware with compiled JSON schemas, avoiding V8 de-optimizations through structural rigidity, and enforcing mathematical Fail-Fast lifecycles, we transform a fragile scripting ecosystem into an industrial-grade backend capable of handling tens of thousands of requests per second per core. Architecture is absolute knowledge of the hardware beneath the code.
