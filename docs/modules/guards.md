# Guards Module (`node-yalc/guards`)

The Guards module provides reusable security interceptors for the Ferrox-Node Framework. Guards are executed before route handlers to ensure the incoming request meets specific authentication, authorization, or compliance criteria. If a guard fails, the request is immediately rejected with the appropriate HTTP status code (e.g., 401 or 403), completely bypassing business logic.

## Overview

Ferrox promotes defense-in-depth. Instead of writing authentication logic inside every controller, you attach Guards to your routes. 

### `RbacGuard`
The Role-Based Access Control (RBAC) Guard integrates directly with the `@node-yalc/auth` module. It verifies `v4.local` PASETO tokens and enforces role requirements.

```typescript
import { RbacGuard } from '@node-yalc/guards';
import { PasetoAuthService } from '@node-yalc/auth';

const authService = new PasetoAuthService('your-secret-key-string-min-32-chars-long!');

// 1. Guard that only requires a valid login (No specific role)
const authenticationGuard = new RbacGuard(authService);

// 2. Guard that requires the user to be an Admin OR a SuperAdmin
const adminGuard = new RbacGuard(authService, ['Admin', 'SuperAdmin']);
```
Attach these instances to your router middleware.

### `MandatoryComplianceGuard`
Enterprise applications must adhere to strict security headers (OWASP best practices). This guard automatically injects essential headers into every response and drops requests containing known malicious User-Agents.

```typescript
import { MandatoryComplianceGuard } from '@node-yalc/guards';

const complianceGuard = new MandatoryComplianceGuard();

// Usage in Fastify or Express middleware:
app.use((req, res, next) => {
  const isAllowed = complianceGuard.canActivate(req, res);
  if (isAllowed) {
    next();
  }
});
```
Headers injected automatically:
*   `X-Content-Type-Options: nosniff`
*   `X-Frame-Options: DENY`
*   `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
*   `Content-Security-Policy: default-src 'self'`
*   `X-XSS-Protection: 1; mode=block`
