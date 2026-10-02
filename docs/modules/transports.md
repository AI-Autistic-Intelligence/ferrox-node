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
