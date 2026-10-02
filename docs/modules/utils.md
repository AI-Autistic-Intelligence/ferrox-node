# Utils Module (`node-yalc/utils`)

The Utils module is a comprehensive collection of enterprise-grade helper functions, formatters, and transformation utilities used across the Ferrox-Node framework and downstream microservices.

## Overview

Instead of constantly reinventing the wheel (or installing heavy external dependencies like Lodash for basic tasks), Ferrox provides highly optimized, typed utilities for common operations.

### Key Helpers

*   **`class.helper`**: Provides `isClass`, `isNativeClass`, and `isES6Class`. Critical for Dependency Injection to differentiate between factory functions and actual constructable classes.
*   **`command.helper`**: Provides `commandWithErrors`, a wrapper for CLI commands that safely catches exceptions and enforces a `process.exit(1)` code for CI/CD pipelines.
*   **`config-manager.helper`**: Utilities for deeply merging and validating configuration objects across environments.
*   **`date.helper`**: Typed helpers for parsing, formatting, and comparing ISO dates and UNIX timestamps safely.
*   **`encryption.helper`**: High-performance wrappers for Node's native `crypto` module (AES-GCM encryption, hashing).
*   **`error.helper`**: Fast error serialization utilities for logging.
*   **`http.helper`**: Contains `HttpStatusCodes` and descriptions, merging standard Node HTTP codes with extended definitions (e.g., Axios).
*   **`object-mapper.helper`**: A powerful, decorators-free `objectMapper`. Allows you to strictly map an Input object to an Output object by defining a schema, complete with transformation functions and property exclusions. Extremely useful for mapping Database Entities to DTOs.
*   **`object.helper`**: Deep cloning, deep freezing (immutability), and safe property extraction.
*   **`plugin.helper`**: Standardized plugin loading mechanisms for extending Ferrox functionality.
*   **`promise.helper`**: Advanced concurrency primitives (e.g., `sleep`, async retries, parallel batch processing with limits).
*   **`rxjs.helper`**: Reactive extensions and wrappers for interacting with Observables safely.
*   **`zlib.helper`**: Wrappers for fast gzip/brotli compression and decompression of payloads.

## Example: Object Mapper

Instead of using heavy reflection libraries, you can map objects transparently:

```typescript
import { objectMapper } from '@node-yalc/utils';

const entity = {
  first_name: 'John',
  last_name: 'Doe',
  internal_id: 1234,
};

const dto = objectMapper(entity, {
  first_name: 'firstName',
  last_name: 'lastName',
  internal_id: false, // Exclude from mapping
  $transformer: (input, output) => {
    output.fullName = `${input.first_name} ${input.last_name}`;
  }
});

// dto is now: { firstName: 'John', lastName: 'Doe', fullName: 'John Doe' }
```
