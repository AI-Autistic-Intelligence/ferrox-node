# 🚀 Ferrox-Node Enterprise Showcase Microservice

[![Node.js Version](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Fastify Engine](https://img.shields.io/badge/Engine-Fastify-000000?style=flat-square&logo=fastify)](https://fastify.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4%2B-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Security](https://img.shields.io/badge/Security-PASETO%20v4%20%2B%20TOTP%20%2B%20Sentinel-blueviolet?style=flat-square)](#security)
[![Observability](https://img.shields.io/badge/Observability-Prometheus%20%2B%20OpenTelemetry-E6522C?style=flat-square&logo=prometheus)](http://localhost:3000/metrics)

The **Ferrox-Node Enterprise Showcase** is the first-class reference microservice for the `@ferrox-node` ecosystem. It demonstrates how to combine modular packages into a high-throughput, fault-tolerant, resilient backend service.

---

## 🏛️ Architecture & Component Integration

```mermaid
graph TD
    Client[HTTP Client] -->|HTTP / JSON| Fastify[Fastify Adapter :3000]
    
    subgraph "Core & Security Layer"
        Fastify --> Sentinel[Sentinel Threat Engine WAF]
        Fastify --> PasetoGuard[PasetoAuthGuard (v4.local)]
        Fastify --> DI[FerroxDIContainer]
    end
    
    subgraph "Business Orchestration (CQRS & Sagas)"
        DI --> SagaCoordinator[AcidSagaCoordinator]
        SagaCoordinator --> Step1[Step 1: Multi-Warehouse Inventory Check & Allocation]
        SagaCoordinator --> Step2[Step 2: Payment Authorization & Capture]
        SagaCoordinator --> Step3[Step 3: Order Persistence & Confirmation]
    end
    
    subgraph "Asynchronous Job Processing"
        DI --> JobQueue[ReliableQueueWorker]
        JobQueue -->|BRPOPLPUSH| Redis[(Redis 7)]
        JobQueue -->|Worker Consumer| MailHog[MailHog SMTP :1025]
    end
    
    subgraph "Observability Layer"
        Fastify -->|GET /metrics| Metrics[GlobalMetricsEngine (Prometheus)]
        Metrics --> V8[V8 Memory & Event Loop Lag Sampling]
    end
```

### Key Modules Utilized
- **`@ferrox-node/core`**: `FerroxApp` orchestrator, `FerroxDIContainer` for dependency injection, route decorators (`@Controller`, `@Get`, `@Post`), and lifecycle hooks (`OnAppStart`, `OnAppDestroy`).
- **`@ferrox-node/security`**: Cryptographic PASETO v4 token issuance, RFC 6238 TOTP 2FA multi-factor authentication, and Sentinel Threat Engine heuristic scanner.
- **`@ferrox-node/cqrs`**: Distributed ACID Sagas (`AcidSagaCoordinator`) with guaranteed reverse compensation upon failure.
- **`@ferrox-node/jobs`**: Zero-loss background queues with Redis `BRPOPLPUSH` atomic migration and crash recovery.
- **`@ferrox-node/observability`**: Real-time event loop lag detection, V8 heap metrics, and Prometheus exporter on `/metrics`.

---

## 🚀 Quickstart & Docker Compose

### 1. Launch with Docker Compose
Spin up the complete infrastructure:
```bash
cd examples/enterprise-showcase
docker-compose up --build -d
```

Exposed Services:
| Service | Endpoint | Port | Description |
|---|---|---|---|
| **Showcase API** | `http://localhost:3000` | 3000 | Fastify enterprise microservice |
| **Prometheus Metrics**| `http://localhost:3000/metrics` | 3000 | Native V8 & system telemetry |
| **PostgreSQL 16**| `localhost:5432` | 5432 | Primary relational store |
| **Redis 7** | `localhost:6379` | 6379 | Reliable job queue & cache |
| **MailHog Web UI** | `http://localhost:8025` | 8025 | Email testing & inspection |

### 2. Run Locally in Development Mode
```bash
npm install
npm run start --workspace=@ferrox-node/enterprise-showcase
```

---

## 📡 API Reference & `curl` Examples

### 1. System Health Probes
```bash
# Liveness probe
curl -i -X GET http://localhost:3000/health/live

# Readiness probe
curl -i -X GET http://localhost:3000/health/ready
```

### 2. PASETO v4 Authentication & TOTP 2FA
```bash
# Obtain PASETO v4.local token
curl -i -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin_user", "password": "ferrox_secure_pass"}'

# Setup TOTP 2FA
curl -i -X POST http://localhost:3000/api/v1/auth/totp/setup \
  -H "Content-Type: application/json" \
  -d '{"userId": "usr_admin_01"}'
```

### 3. Distributed Saga Checkout (Multi-Warehouse Fallback)
```bash
# Fulfills from Milan because Rome is out of stock of PROD-A:
curl -i -X POST http://localhost:3000/api/v1/orders/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-SHOWCASE-01",
    "productId": "PROD-A",
    "quantity": 2,
    "customerId": "CUST-ROME",
    "totalCents": 5000,
    "paymentMethod": "CREDIT_CARD"
  }'

# Inspect warehouse stock
curl -i -X GET http://localhost:3000/api/v1/orders/warehouses
```

### 4. Saga Compensation on Payment Failure
```bash
# Simulates payment decline: automatically rolls back warehouse allocation:
curl -i -X POST http://localhost:3000/api/v1/orders/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-SHOWCASE-DECLINE",
    "productId": "PROD-A",
    "quantity": 2,
    "customerId": "CUST-OVERDRAWN",
    "totalCents": 5000,
    "paymentMethod": "CREDIT_CARD",
    "simulatePaymentFailure": true
  }'
```

### 5. Reliable Background Jobs (Redis BRPOPLPUSH)
```bash
# Enqueue background job
curl -i -X POST http://localhost:3000/api/v1/jobs/enqueue \
  -H "Content-Type: application/json" \
  -d '{
    "taskType": "GENERATE_MONTHLY_REPORT",
    "data": {"organizationId": "ORG-ALPHA", "format": "PDF"}
  }'

# List active / completed jobs
curl -i -X GET http://localhost:3000/api/v1/jobs/list
```

### 6. Prometheus Observability
```bash
curl -i -X GET http://localhost:3000/metrics
```

---

## 🧪 Automated Testing

Execute the test suite verifying security tokens, TOTP validation, Saga multi-warehouse allocation, compensation rollback, and reliable background jobs:

```bash
npm run test --workspace=@ferrox-node/enterprise-showcase
```
