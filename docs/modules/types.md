# Types Module (`node-yalc/types`)

The Types module provides advanced, globally available TypeScript utility types used extensively throughout the Ferrox-Node Framework to enforce extreme type safety and strict compiler checks.

## Overview

TypeScript's standard library is powerful, but enterprise frameworks require more restrictive typing to prevent developer errors (like passing an object with extra, un-typed properties to a generic function).

### Key Utilities Exported

*   **`Exact<T, U>`**: TypeScript is structurally typed, meaning an object `U` can have *extra* properties not defined in `T` and still be accepted. `Exact` enforces that `U` has *only* the properties defined in `T` and nothing more.
*   **`CompareStrict<A, B>`**: Checks if type `A` is exactly equal to type `B`.
*   **`NoExtraProperties<T, U>`**: Strips away any properties in `U` that are not present in the base type `T`.
*   **`XOR<T, U>`**: Enforces an exclusive OR relationship between two types. A value must match exactly `T` or exactly `U`, but never a combination of both.
*   **`Spread<L, R>`**: Strictly types the result of object spreading `{ ...L, ...R }`, correctly handling optional properties and overwriting.
*   **`ClassType<T>`**: Represents a constructable class, heavily used in the Dependency Injection and Lifecycle hooks.
*   **`DeepWritable<T>`**: Recursively removes `readonly` modifiers from all nested properties of `T`.

## Usage
These types are exported and can be used directly in your business logic.

```typescript
import { Exact, XOR } from '@node-yalc/types';

// Enforce strict object shapes
function updateConfig<T>(config: Exact<ConfigSchema, T>) {
  // config cannot contain properties not in ConfigSchema
}
```
