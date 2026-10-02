# Resilience Module (`node-yalc/resilience`)

The Resilience module provides advanced fault-tolerance patterns for the Ferrox-Node framework. In distributed microservice architectures, assuming the network or third-party services are always reliable is a fatal flaw. This module ensures your application degrades gracefully instead of crashing catastrophically.

## Patterns Provided

### 1. Circuit Breaker
If an external API (like a payment gateway or a legacy CRM) goes down, repeatedly calling it will only exhaust your server's connection pools and threads. The `CircuitBreaker` pattern temporarily stops ("opens") the flow of requests to the failing service, instantly returning a fallback or an error, giving the downstream service time to recover.

```typescript
import { CircuitBreaker } from '@node-yalc/resilience';

// Trip if 5 consecutive failures occur. Recover after 10 seconds.
const paymentCircuit = new CircuitBreaker(5, 10000);

try {
  const result = await paymentCircuit.execute(
    async () => await stripe.charge(amount),
    () => { return { status: 'DEFERRED', message: 'Payment queued for later.' } } // Fallback
  );
} catch (error) {
  // If no fallback is provided, an error is thrown immediately when OPEN.
}
```

### 2. Token Bucket Rate Limiter
The `RateLimiter` ensures that background processes or incoming requests do not exceed a certain throughput, preventing resource starvation.

```typescript
import { RateLimiter } from '@node-yalc/resilience';

// Max capacity of 100 requests, replenishing 10 tokens every second.
const limiter = new RateLimiter(100, 10);

if (limiter.allowRequest(1)) {
  await processHeavyImage();
} else {
  throw new Error('429 Too Many Requests');
}
```

### 3. Singleflight (Promise Coalescing)
A defense against the "Thundering Herd" problem. If a cache expires and 1,000 concurrent requests suddenly hit your endpoint asking for the exact same expensive database query, `Singleflight` ensures only *one* database query executes. The other 999 requests simply wait for that single promise to resolve and share the result.

```typescript
import { Singleflight } from '@node-yalc/resilience';

const flight = new Singleflight();

async function getPopularProducts() {
  // Even if called 1000 times concurrently, the inner function executes exactly once.
  return flight.do('popular_products', async () => {
    return await db.query('SELECT * FROM products ORDER BY views DESC LIMIT 10');
  });
}
```
