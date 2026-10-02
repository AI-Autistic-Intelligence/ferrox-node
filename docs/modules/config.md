# Config Module (`node-yalc/config`)

The Config module provides a unified configuration engine for the Ferrox-Node Framework. It simplifies accessing application configurations by merging environment variables with developer-defined defaults in a strictly hierarchical manner.

## Overview

Configuration management is critical in enterprise applications. The `ConfigEngine` ensures that variables are fetched reliably, type-casted when possible, and always respect the "Environment Variable first" rule (12-Factor App methodology).

### Resolution Hierarchy
When `config.get('KEY')` is called, the resolution order is:
1. **Environment Variable (`process.env.KEY`)**: If it exists, it is parsed and returned.
2. **In-Memory Store**: If not in ENV, it checks the internal `configStore` map (populated by `defaults` or `config.set()`).
3. **Fallback Value**: If neither exists, the fallback provided in the `get()` call is returned.

### Automatic Type Casting
Environment variables are inherently strings. To reduce boilerplate, `ConfigEngine.get()` automatically casts:
- `"true"` (string) to `true` (boolean)
- `"false"` (string) to `false` (boolean)
- `"123"` (string) to `123` (number)

## Usage Example

```typescript
import { ConfigEngine } from '@node-yalc/config';

// 1. Initialize with defaults
const config = new ConfigEngine({
  APP_PORT: 3000,
  ENABLE_FEATURE_X: false,
});

// 2. Read configurations
// If process.env.APP_PORT is '8080', it will return 8080 (number).
// If process.env.APP_PORT is undefined, it will return 3000 (number).
const port = config.get<number>('APP_PORT');

// Using a fallback dynamically
const dbHost = config.get<string>('DB_HOST', 'localhost');

// 3. Manually setting a config at runtime
config.set('RUNTIME_MODE', 'maintenance');
```

## Next Steps
Use `ConfigEngine` as a singleton provider in your Dependency Injection container so that all services resolve the exact same configuration instance.
