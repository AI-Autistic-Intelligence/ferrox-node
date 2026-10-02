# Errors Module (`node-yalc/errors`)

The Errors module provides a centralized, secure, and highly extensible error handling mechanism for the Ferrox-Node Framework. It ensures that internal exceptions are properly logged, sanitized, and transformed into secure HTTP responses before reaching the client.

## Overview

In enterprise applications, raw stack traces or internal database errors must never leak to the client. This module provides base error classes (`DefaultErrorBase`) and pre-mapped HTTP Exceptions that standardize exactly what is logged internally versus what is sent externally.

## Core Concepts

### `DefaultErrorBase`
All custom exceptions in the framework should extend this mixin/class. It provides built-in mechanisms for:
- **Internal Logging**: Automatically logging the error to the `ImprovedLoggerService`.
- **Data Masking**: Stripping sensitive fields (passwords, tokens, PII) from logs automatically based on defined paths.
- **Event Emission**: Broadcasting the error to the EventManager so monitoring systems (e.g., Datadog, Sentry) or alarms can be triggered asynchronously.

### Standard HTTP Exceptions (`error.class.ts`)
The framework provides drop-in replacements for standard NestJS/Express exceptions, backed by the `HttpException` class.
Examples include:
*   `BadRequestException` (400)
*   `UnauthorizedException` (401)
*   `NotFoundException` (404)
*   `InternalServerErrorException` (500)

## Usage Example

### Throwing a Standard Exception
```typescript
import { BadRequestException } from '@node-yalc/errors';

if (!user.isValid) {
  // Throws a secure 400 error. The client sees the message "Invalid User Payload".
  throw new BadRequestException('Invalid User Payload');
}
```

### Throwing a Complex Masked Error
When you need to pass internal debug data that must NOT be sent to the client, use the options object:

```typescript
import { InternalServerErrorException } from '@node-yalc/errors';

try {
  await database.execute('SELECT * FROM secret_table');
} catch (error) {
  throw new InternalServerErrorException('Database query failed', {
    cause: error, // Original stack trace, logged internally
    data: { query: 'SELECT * FROM secret_table', userId: req.user.id }, // Logged internally
    internalMessage: 'The DB connection timed out during the query.', // Logged internally
  });
}
```
In the above example, the client simply receives:
```json
{
  "statusCode": 500,
  "message": "Database query failed"
}
```
While the server logs contain the full query, user ID, internal message, and original stack trace.

## Global Exception Filter Integration
Ensure that your application registers a Global Exception Filter that catches these errors. The `DefaultErrorBase` handles formatting the payload (`IErrorPayload`), which the filter then serializes to the HTTP Response.
