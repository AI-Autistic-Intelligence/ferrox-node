---
id: dummy-app-guide
title: Enterprise Showcase App (Dummy App)
sidebar_label: Reference App (Dummy)
---

# Ferrox-Node Enterprise Showcase

The `dummy-app` (available in `src/dummy-app.ts`) is not just a simple "Hello World", but a comprehensive **Reference Implementation** (or Showcase) for the Ferrox-Node framework. 
It demonstrates how to orchestrate various Enterprise-grade modules (Security, Resilience, Infrastructure, Dependency Injection) in a realistic environment, significantly reducing the cognitive load for developers building production-ready microservices.

## Objectives of the Showcase App

The primary goal is to display a **secure by default** and **fault-tolerant** architecture. Instead of forcing developers to manually wire up logging, validation, and circuit breakers, the dummy-app provides a fully configured template outlining the framework's *best practices*.

## Architectural Choices and Trade-offs

During the creation of this template, specific choices and compromises were made to balance production robustness with a smooth onboarding experience:

### 1. Centralized Error Handling (`@node-yalc/errors`)

- **Choice**: All business or validation failures throw strongly-typed exceptions (e.g., `BadRequestError`, `InternalServerError`, `UnauthorizedError`) instead of the classic `throw new Error()`.
- **Reason (Security)**: Prevents *Information Disclosure* attacks. Throwing a native `Error()` might expose the Stack Trace to the client. By using Yalc classes, the Global Exception Filter catches the error and serializes it safely, ensuring a standardized JSON output to the frontends.

### 2. Security and Authentication (PASETO vs JWT)

- **Choice**: Replacing JWT in favor of PASETO v4.local (Platform-Agnostic Security Tokens).
- **Reason**: JWT forces developers to select and validate the signing algorithm, historically leading to *Algorithm Confusion* vulnerabilities. PASETO v4 Local uses symmetric AEAD cryptography by default: payloads are not just signed, but **encrypted and opaque**. The client cannot tamper with or inspect the content without the secret (which resides only on the server).

### 3. Resilience (Circuit Breaker)

- **Choice**: Vital backend services (simulated by `BusinessLogicService`) execute their transactions within a **Circuit Breaker** Design Pattern.
- **Reason (Stability)**: In microservice architectures, a slow DB or an inactive third-party API creates bottlenecks (sockets remain hanging). This causes an overload (Cascading Failure). The Circuit Breaker intercepts N consecutive errors (configured to 3) and *opens the circuit*, failing immediately in fast-fail mode to protect remaining resources (e.g., the Thread Pool).

### 4. Infrastructure as Code (IaC) and DeployFactory

- **Choice**: Automatic generation of deployment manifests (e.g., Kubernetes YAML, Dockerfile) upon application startup (`onAppStart`).
- **Trade-off**: This generation is only enabled in the **Development** environment (when `NODE_ENV !== 'production'`). This slightly slows down local startup but guarantees that deployment files are always perfectly aligned (Zero Drift) with the actual application architecture.

### 5. Mocking the DatabaseFactory

- **Trade-off**: The code contains a `DatabaseConnectionConfig` object ready for a real PostgreSQL connection, but the actual connection call is *commented out* (`// await DatabaseFactory.createConnection(dbConfig)`).
- **Reason (Developer Experience)**: To make the dummy-app executable `out-of-the-box` for anyone cloning the repository. If left uncommented, the script would crash for developers lacking an active Postgres container on their local port. This template shows the intent without enforcing strict system requirements.

### 6. Lifecycle Protection (Graceful Shutdown)

- **Choice**: Utilization of `process.on('uncaughtException')` and integrated Lifecycle Hooks (`onAppDestroy`).
- **Reason**: A sudden crash (OOM or V8 panic) without connection cleanup causes Data Corruption and dangling sockets. The showcase app demonstrates how to catch main thread panics, orchestrate a controlled teardown, and force an exit to prevent silent crash-loops.

## How to use it

The `dummy-app.ts` file is designed as a starting point. Developers can:
1. Uncomment the `DatabaseFactory` logic by providing real credentials in `.env`.
2. Add Guards (`@UseGuard`) to methods exposed by the controller to automate PASETO protection.
3. Extend Controllers and Services using the exclusive `FerroxDIContainer`.
