# Auth Module (`node-yalc/auth`)

The Auth module provides enterprise-grade authentication utilities for the Ferrox-Node Framework. It focuses on modern, secure, and stateless authentication protocols, avoiding outdated or insecure practices.

## Overview

The `node-yalc/auth` module currently offers two primary services:
1. **PASETO Authentication (`PasetoAuthService`)**: Platform-Agnostic Security Tokens.
2. **TOTP Authentication (`TotpAuthService`)**: Time-Based One-Time Passwords for MFA.

## PASETO (Platform-Agnostic Security Tokens)

Unlike JWTs, which allow the header to specify the cryptographic algorithm (leading to algorithmic confusion attacks), PASETO enforces algorithms strictly based on the token version and purpose. This module implements **v4.local**, which utilizes symmetric authenticated encryption (AES-256-GCM) to ensure payloads are completely opaque and tamper-proof to the client.

### Usage Example

```typescript
import { PasetoAuthService } from '@node-yalc/auth';

const pasetoService = new PasetoAuthService('super-secret-32-byte-key-string!');

// Encrypt a payload (e.g. at login)
const token = pasetoService.generateV4LocalToken({ sub: 'user-123', roles: ['ADMIN'] }, 3600);
// Output: v4.local.a29...

// Decrypt and verify the payload (e.g. in an Auth Guard)
try {
  const payload = pasetoService.verifyV4LocalToken(token);
  console.log(payload.sub); // 'user-123'
} catch (error) {
  // Handles expired, tampered, or invalid tokens
  console.error('Authentication failed:', error.message);
}
```

## TOTP (Time-Based One-Time Password)

The `TotpAuthService` implements RFC 6238 to provide 2FA / MFA capabilities. It allows generating secrets, creating QR code URIs, and validating user-submitted codes against a sliding time window.

### Usage Example

```typescript
import { TotpAuthService } from '@node-yalc/auth';

const totpService = new TotpAuthService();

// 1. Setup Phase: Generate a new secret for a user
const secret = totpService.generateSecret();
// Save `secret` to the user's secure database record

// 2. Setup Phase: Generate QR Code URI for the user's authenticator app
const uri = totpService.generateOtpAuthUri('user@example.com', secret, 'Ferrox App');
// Render `uri` as a QR code in the frontend

// 3. Login Phase: Verify the 6-digit code submitted by the user
const isValid = totpService.verifyTotpCode(secret, '123456');
if (isValid) {
  // Proceed with login
} else {
  // Reject login
}
```

## Next Steps

These services are designed to be imported directly into dependency injection containers (e.g., NestJS modules or Fastify decorators). Ensure that all cryptographic secrets (like the PASETO symmetric key) are injected via environment variables (`process.env`) and never hardcoded in production.
