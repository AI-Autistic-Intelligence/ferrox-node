<div align="center">
  <h1>@ferrox-node/transports</h1>
  <p><em>Core enterprise module for the @ferrox-node/transports integration within the Ferrox/YALC ecosystem.</em></p>
  
  [![npm version](https://badge.fury.io/js/%40ferrox-node%2Ftransports.svg)](https://badge.fury.io/js/%40ferrox-node%2Ftransports)
  [![License](https://img.shields.io/npm/l/%40ferrox-node%2Ftransports.svg)](https://github.com/AI-Autistic-Intelligence)
</div>

## 🚀 Installation

```bash
npm install @ferrox-node/transports
# or
yarn add @ferrox-node/transports
# or
pnpm add @ferrox-node/transports
```

---

# Transports Module (`node-yalc/transports`)

The Transports module abstracts all network communication mechanisms (HTTP, WebSockets, Message Brokers) away from the core application logic. This allows the Ferrox Framework to be truly "transport agnostic."

## Overview

If your company decides to migrate from Express to Fastify, or from HTTP REST to WebSockets, your business logic (Controllers and Services) should not change. The Transports layer intercepts the specific protocol and translates it into standard `FerroxHttpRequest` and `FerroxHttpResponse` interfaces.

## 1. HTTP Adapters

The framework ships with two HTTP adapters implementing `IFerroxHttpAdapter`:
*   `ExpressHttpAdapter`: Highly compatible, uses classic Express patterns.
*   `FastifyHttpAdapter`: Extreme throughput and low overhead.

**Example Usage (Internal Framework Bootstrap):**
```typescript
import { FastifyHttpAdapter } from '@node-yalc/transports';

const adapter = new FastifyHttpAdapter();

adapter.registerRoute({
  method: 'GET',
  path: '/api/v1/health',
  handler: async (req, res) => {
    // Note: req and res are Agnostic Ferrox interfaces, NOT Fastify specific!
    return res.json({ status: 'OK' });
  }
});

await adapter.listen(8080);
```

## 2. Event & Stream Adapters

### `WebSocketTransportAdapter`
Allows you to bind agnostic event handlers to WebSocket connections (like `socket.io` or `ws`).

### `KafkaEventBusAdapter`
Abstracts Kafka topics, allowing your application to seamlessly publish and subscribe to distributed events without hardcoding `kafkajs` throughout the codebase.


---
## 📚 Ecosystem Documentation

This module is a core component of the Ferrox enterprise microservice architecture. 

👉 **[Read the Full Documentation on Ferrox-Rust.dev](https://ferrox-rust.dev/docs/ferrox-node/modules/transports)**
