# Tracing Module (`node-yalc/tracing`)

The Tracing module provides distributed tracing capabilities compatible with the W3C Trace Context specification.

## Overview

In a microservice architecture, a single user click might trigger requests across 5 different services. If an error occurs deep down the stack, looking at isolated logs is useless. Distributed tracing solves this by passing a unique `traceId` through every HTTP header and logging it alongside every message.

### W3C Trace Context
The `TracingEngine` parses and generates the standard `traceparent` HTTP header.

```typescript
import { TracingEngine } from '@node-yalc/tracing';

// 1. A request comes in from another microservice
const incomingHeader = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
const traceCtx = TracingEngine.parseTraceparent(incomingHeader);

console.log(traceCtx.traceId); // "0af7651916cd43dd8448eb211c80319c"

// 2. You make an outbound request to another service.
// You MUST attach this header to continue the chain.
const outboundHeader = TracingEngine.formatTraceparent(traceCtx);
```

### FerroxLogger
The `FerroxLogger` automatically structures JSON logs. When combined with AsyncLocalStorage (ALS) and the `TracingEngine`, these JSON logs can be ingested by Datadog or ELK to seamlessly visualize the request lifecycle.
