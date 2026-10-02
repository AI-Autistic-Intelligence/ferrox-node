# Ferrox-Node Framework (Workspace)

Ferrox-Node is an enterprise-grade, highly secure, modular web framework and ecosystem for Node.js / TypeScript. It serves as the Node.js twin to the Rust Ferrox core, providing unparalleled developer freedom and security.

## New Monorepo Architecture

The entire framework has been refactored into independent, modular `@ferrox-node/*` packages to provide maximum freedom and avoid cloud dependency bloat.

### Core Modules
* **`@ferrox-node/core`**: The naked engine containing the FerroxApp, Dependency Injection Container, HTTP Adapters (Express/Fastify), and Configuration Engine.
* **`@ferrox-node/security`**: Advanced PASETO & TOTP authentication, global Guards, LSM Kernel Sandboxing, and Sentinel Engine.
* **`@ferrox-node/cqrs`**: Event Bus, Command Bus, and robust SAGA / ACID distributed transaction coordination (`AcidSagaCoordinator`).
* **`@ferrox-node/jobs`**: Job schedulers and a robust `ReliableQueueWorker` (implementing `BRPOPLPUSH` in Redis) to handle workload crashes securely.
* **`@ferrox-node/observability`**: Tracing via OpenTelemetry and the `GlobalMetricsEngine` via `prom-client` to natively monitor Event Loop Lag, Memory Heap, and active instances.
* **`@ferrox-node/transports`**: DataGrid integration, storage engines, and advanced transports.
* **`@ferrox-node/database`**: The `DatabaseFactory` plugin registry, supporting Mongoose and TypeORM out of the box with connection pooling caching.

### Plug & Play Cloud Adapters
* **`@ferrox-node/aws`**: DynamoDB & S3 clients configuration with advanced credential ingestion.
* **`@ferrox-node/gcp`**: Native Cloud integration matching Rust's `gcp.rs`. Provides `GcpCloudHelper` to fetch secrets and push to Cloud Storage via ADC (Application Default Credentials).
* **`@ferrox-node/firebase`**: Firebase Admin SDK adapter.
* **`@ferrox-node/bitbucket`**: API integration for Bitbucket workspaces and PR management.
* **`@ferrox-node/mailer`**: Universal Mailer with standard SMTP `nodemailer` and `@sendgrid/mail`.
* **`@ferrox-node/stripe`**: Payments and comprehensive `StripeWebhookRouter` to multiplex and process Webhooks concurrently without nested conditions.
* **`@ferrox-node/redis`**: Hyper-scalable `SmartCacheManager` delivering multi-layered Cache Stampede/Thundering Herd protection using Promise Deduplication + Redlock distributed locking.

## Reliability and Testing

Every critical module is strictly tested with a strict **100% Test Coverage** threshold set globally across the workspace. 
