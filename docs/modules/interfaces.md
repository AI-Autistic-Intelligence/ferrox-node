# Interfaces Module (`node-yalc/interfaces`)

The Interfaces module provides standard TypeScript definitions that are shared globally across the Ferrox-Node Framework.

## Overview

Unlike the `node-yalc/common` module (which focuses on DI marker interfaces and execution contexts), this module exports lower-level data structures used across the ORM layer, routers, and internal mappers.

### `FieldMapper`
When exposing databases over GraphQL or complex REST endpoints, clients often request fields that map differently to underlying database columns, or they require certain foreign keys to be implicitly fetched.
The `FieldMapper` interface allows developers to define a strictly typed schema for this mapping.

```typescript
import { FieldMapper } from '@node-yalc/interfaces';

// Maps incoming client fields to database structure
const userMapper: FieldMapper<UserEntity> = {
  emailAddress: { dst: 'email', isRequired: true },
  fullName: { dst: 'name_concat', isSymbolic: true }
};
```
