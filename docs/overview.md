---
id: overview
title: Overview
sidebar_position: 1
---

# Ferrox Node Overview

**Ferrox Node** is the crucial bridge that connects the high-performance Rust core (`ferrox`) with the Node.js ecosystem (`nestjs-yalc` and `node-yalc`).

## Why Ferrox Node?

While Node.js is excellent for routing, API design, and rapid development (especially with frameworks like NestJS), it is single-threaded and struggles with heavy computational tasks or extremely high-throughput data processing. Rust, on the other hand, excels in these areas but has a steeper learning curve for standard web development.

Ferrox Node gives you the best of both worlds by exposing Rust's performance capabilities directly to Node.js via **N-API (Neon / NAPI-RS)**.

## Architecture

Ferrox Node compiles the Rust `ferrox` core into a native Node.js addon (`.node` file). It then provides idiomatic TypeScript wrappers around these native functions.

### How it works

1. **Rust Core**: The heavy lifting (e.g., complex calculations, Kafka stream processing, massive data serialization) is done in Rust.
2. **N-API Bindings**: Rust functions are exposed to C-ABI via N-API.
3. **TypeScript Interface**: `ferrox-node` provides strong TypeScript definitions (`d.ts`) that match the Rust exports.
4. **Node.js Integration**: Your NestJS application imports `ferrox-node` just like any standard npm package, but under the hood, it's executing native, highly optimized code.

## Performance Considerations

When crossing the boundary between V8 (JavaScript engine) and Rust, there is a small serialization/deserialization overhead. `ferrox-node` is optimized to:
- Pass pointers or Buffers instead of full JSON objects where possible.
- Use asynchronous Rust functions that return Promises to Node.js, ensuring the main Event Loop is never blocked during heavy processing.

## Getting Started

To use Ferrox Node within a NestJS-YALC application:

```typescript
import { Injectable } from '@nestjs/common';
import { FerroxEngine } from 'ferrox-node';

@Injectable()
export class HighPerformanceService {
  private engine: FerroxEngine;

  constructor() {
    this.engine = new FerroxEngine();
  }

  async processMassiveData(dataId: string) {
    // This call executes natively in Rust, freeing the Node event loop
    const result = await this.engine.computeComplexModels(dataId);
    return result;
  }
}
```
