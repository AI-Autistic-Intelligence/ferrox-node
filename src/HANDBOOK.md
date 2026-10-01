# Ferrox-Node Microservice - Deep Kernel-to-Userland Handbook

## 1. Executive Summary

This handbook details the **Ferrox-Node Dummy App**, serving as the architectural baseline for Node.js microservices within the Ferrox ecosystem.

While Node.js is heavily favored for its non-blocking I/O, the JavaScript ecosystem suffers from extreme abstraction bloat and a fundamental misunderstanding of the V8 engine and `libuv`. As a Senior Engineer, my objective was to strip away the "magic" of heavy frameworks like NestJS, providing a razor-sharp, strictly-typed Dependency Injection container layered over Fastify, engineered with deep respect for the Node.js event loop and V8 garbage collector.

---

## 2. Low-Level Architectural Blueprint

### 2.1 The libuv Reactor & Event Loop Mechanics
Node.js runs on a single main thread for executing JavaScript, orchestrated by the V8 Engine, while relying on the C-based `libuv` library to handle asynchronous I/O via the OS kernel.
- **The Epoll Bridge**: When Ferrox-Node receives an HTTP request via Fastify, `libuv` uses Linux `epoll` (or macOS `kqueue`) to detect the TCP socket read readiness. It dispatches a callback to the V8 call stack.
- **Thread Pool Exhaustion**: Standard file system operations (`fs.readFile`) and cryptographic hashes (e.g., Argon2id) cannot be non-blocking at the kernel level. `libuv` offloads these to a hidden Thread Pool (default 4 threads, `UV_THREADPOOL_SIZE`). If 5 concurrent users request a password hash, the 5th request blocks until a thread is freed. We explicitly tune this variable based on the physical core count of the host machine to prevent catastrophic latency tailing.

### 2.2 V8 Engine JIT & Fastify Schema Optimization
Why do we wrap **Fastify** instead of Express?
- **Hidden Classes (Inline Caching)**: V8 optimizes JavaScript by creating hidden classes (Shapes) for objects. Express dynamically mutates request objects, breaking these hidden classes and forcing V8 into slow dictionary-lookups. Fastify is structurally rigid, keeping V8 executing in highly optimized JIT-compiled assembly.
- **C-Level Serialization**: Fastify uses `fast-json-stringify`. Instead of relying on standard `JSON.stringify` (which requires recursive reflection at runtime), Fastify pre-compiles JSON Schemas into raw V8 functions that directly output byte buffers. This results in a 2x-3x throughput increase in JSON serialization at the CPU level.

### 2.3 Custom Dependency Injection (`FerroxDIContainer`)
Heavy frameworks use proxies and runtime reflection that severely impact boot times and memory footprints.
- **Reflect Metadata**: Our custom DI container uses TypeScript decorators (`@Injectable`) to embed type metadata during the TSC compile step. 
- **Singleton Resolution**: At boot time, `FerroxDIContainer` traverses the dependency graph and instantiates singletons. This entirely avoids runtime prototype chaining delays during active request handling.

---

## 3. Programmer & DevOps Handbook

### 3.1 Advanced Tuning & Deployment
Node.js processes are bound to a single core. To utilize modern multi-core processors:
```bash
# Set libuv thread pool to match physical cores for crypto/fs tasks
export UV_THREADPOOL_SIZE=$(nproc)

# Force V8 Garbage Collector flags for tight memory environments
node --max-old-space-size=512 --nouse-idle-notification dist/dummy-app.js
```
- `--max-old-space-size`: Prevents the Node.js process from arbitrarily consuming RAM before triggering a major GC sweep.
- **Cluster/PM2**: Deploy the app using PM2 cluster mode or Kubernetes StatefulSets. Never run a single Node process on a 16-core machine.

### 3.2 Security: Redaction & ReDoS Prevention
- **`fast-redact`**: PII (Passwords, Tokens) in request payloads can accidentally leak into structured logs. We configure the global Pino logger with `fast-redact` to strip sensitive keys at the AST level before writing to `stdout`, preventing SIEM compliance breaches.
- **ReDoS Protections**: Fastify safely handles malformed JSON parsing, preventing Event Loop blocking (which would freeze the entire Node instance) by strictly enforcing payload length limits before passing the buffer to `JSON.parse`.

### 3.3 The Fail-Fast Boot Philosophy
The application implements `OnAppStart` interfaces.
- **Kubernetes Readiness Probes**: If the application cannot connect to PostgreSQL or Redis during `OnAppStart`, it immediately throws an unhandled exception and crashes. This is a critical pattern. If it degrades gracefully, Kubernetes will mark the Pod as "Ready" and route traffic to it, resulting in 500 Bad Gateway cascades. Crashing immediately triggers the `CrashLoopBackOff`, protecting the ingress flow.

---

## 4. Senior Engineering Philosophy
To master Node.js, one must understand that it is simply a JavaScript runtime bolted onto a highly efficient C event loop. By replacing generic middleware with tightly compiled JSON schemas, avoiding V8 de-optimizations through rigid object structures, and properly tuning the `libuv` thread pool, we transform a notoriously fragile ecosystem into an industrial-grade backend capable of handling tens of thousands of requests per second per core. Architecture is about knowing exactly what the hardware is doing underneath the JavaScript abstraction.
