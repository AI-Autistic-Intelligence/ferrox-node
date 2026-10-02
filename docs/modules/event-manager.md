# Event Manager Module (`node-yalc/event-manager`)

The Event Manager module wraps `eventemitter2` to provide a robust, enterprise-grade publish/subscribe (PubSub) mechanism for the Ferrox-Node Framework.

## Overview

In microservices or complex monoliths, modules often need to react to changes without being tightly coupled. The Event Manager provides a Global Event Emitter that allows modules to broadcast events (e.g. `user.created`, `order.shipped`) and other modules to asynchronously react to them.

Key features provided by this wrapper:
1. **Wildcard Routing**: Listeners can subscribe to namespaces (e.g., `user.*` to catch both `user.created` and `user.deleted`).
2. **Data Masking**: Before events are emitted, sensitive payloads (passwords, credit cards) can be stripped or masked to prevent leaks in logs or downstream listeners.
3. **Promise Tracking**: Support for `emitAsync`, allowing the emitter to track asynchronous listeners and wait for their completion, which is critical during graceful shutdowns or serverless executions.

## Usage Example

### 1. Setting up Listeners

```typescript
import { getYalcGlobalEventEmitter } from '@node-yalc/event-manager';

const emitter = getYalcGlobalEventEmitter();

// Listen to a specific event
emitter.on('user.created', (payload) => {
  console.log('Welcome email sent to:', payload.email);
});

// Listen to a wildcard event
emitter.on('payment.*', (payload) => {
  console.log('Payment event received for amount:', payload.amount);
});
```

### 2. Emitting Events

You can use the helper `emitEvent` which provides advanced capabilities like masking and asynchronous promise tracking.

```typescript
import { emitEvent, getYalcGlobalEventEmitter } from '@node-yalc/event-manager';

const emitter = getYalcGlobalEventEmitter();

await emitEvent(
  emitter,
  'user.created',
  { id: 1, email: 'john@example.com', passwordHash: 'SECRET123' },
  {
    mask: ['passwordHash'], // Will replace passwordHash with '***' before sending to listeners
    await: true // Waits for all async listeners to resolve before continuing
  }
);
```

## Naming Conventions
The framework exports standard formatters to enforce consistent naming. For example, `versionedDomainActionFormatter` enforces the schema:
`{version}.{domain}.{action}.{lifecycle}` -> `v1.users.create.onProcess`

Using standard formatters prevents typos and ensures scalable event routing.
