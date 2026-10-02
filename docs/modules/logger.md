# Logger Module

This module provides an enterprise-grade logging abstraction for the Ferrox-Node Framework. It ensures consistent, typed, and easily swappable logging implementations across the entire system.

## Overview

The `node-yalc/logger` module defines the core interfaces, types, and enumerations that dictate how logging should behave. It is designed to act as a unified facade, allowing developers to use a standardized API (`LoggerService`) while delegating the actual I/O operations to robust engines like `console`, `Pino`, or custom implementations.

## Core Concepts

### Logging Levels
Logging levels are strictly typed via the `LogLevel` type and `LogLevelEnum` enumeration. They include standard levels with the addition of a `fatal` level for critical system failures.
* `log`: Standard informational messages.
* `error`: System errors and exceptions.
* `warn`: Non-fatal warnings.
* `debug`: Verbose messages meant for development tracing.
* `verbose`: Extremely granular debugging information.
* `fatal`: Critical unrecoverable errors.

### The `LoggerService` Interface
This interface represents the contract all logger implementations must fulfill. Any class implementing `LoggerService` can be injected seamlessly into the application context, ensuring that swapping the underlying logging engine requires no changes to the business logic.

## Usage Example

```typescript
import { LoggerService, LogLevelEnum } from '@ferrox-node/logger';

class MyService {
  constructor(private readonly logger: LoggerService) {}

  doWork() {
    this.logger.log('Starting work...');
    try {
      // Business logic here
    } catch (error) {
      this.logger.error('Work failed', error.stack, { context: 'MyService' });
    }
  }
}
```

## Next Steps
The internal implementation of the logger, including the `Pino` and `Console` adapters, are being thoroughly documented with JSDoc line-by-line to ensure perfect Intellisense and automated documentation generation in the future.
