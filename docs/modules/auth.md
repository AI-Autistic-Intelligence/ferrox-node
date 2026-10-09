---
id: auth
title: "@ferrox-node/auth"
sidebar_position: 1
---

# 🚀 Auth Module (`@ferrox-node/auth`)

## 💡 1. What It Is & Architectural Purpose

The Auth module provides enterprise-grade authentication utilities for the Ferrox-Node Framework. It focuses on modern, secure, and stateless authentication protocols, avoiding outdated or insecure practices. By utilizing the underlying `node-yalc` infrastructure, it bridges standard Node authentication patterns with high-performance operations, ensuring that cryptographic operations remain secure and efficient.

---

## ⚙️ 2. Comprehensive Taxonomy & Key Features

The `@ferrox-node/auth` module currently offers two primary services aligned with the Layer 3 (Security) specifications of the Ferrox Architecture:

1. **PASETO Authentication (`PasetoAuthService`)**: Platform-Agnostic Security Tokens.
2. **TOTP Authentication (`TotpAuthService`)**: Time-Based One-Time Passwords for Multi-Factor Authentication (MFA).

---

## 🔬 3. How It Works Under the Hood

### PASETO (Platform-Agnostic Security Tokens)

Unlike JWTs, which allow the header to specify the cryptographic algorithm (leading to algorithmic confusion attacks), PASETO enforces algorithms strictly based on the token version and purpose. This module implements **v4.local**, which utilizes symmetric authenticated encryption (AES-256-GCM) to ensure payloads are completely opaque and tamper-proof to the client.

### TOTP (Time-Based One-Time Password)

The `TotpAuthService` implements RFC 6238 to provide 2FA / MFA capabilities. It generates highly secure secrets, creates QR code URIs compliant with standard authenticator apps, and validates user-submitted codes against a sliding time window to account for clock skew.

---

## 🧠 4. Why It Was Designed This Way (Rationale)

JWTs have historically suffered from structural vulnerabilities due to their "algo-agility" design. By shifting to PASETO v4, the architecture completely eliminates algorithm-downgrade attacks. Furthermore, implementing these security primitives as dedicated Node services ensures that any HTTP framework (like NestJS or Fastify) can safely inject them without coupling security logic to HTTP request parsing.

---

## 🚀 5. Practical Usage Guide & Extended Code Examples

### 5.1 PASETO Usage

```typescript
import { PasetoAuthService } from '@ferrox-node/auth';

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

### 5.2 TOTP Usage

```typescript
import { TotpAuthService } from '@ferrox-node/auth';

const totpService = new TotpAuthService();

// 1. Setup Phase: Generate a new secret for a user
const secret = totpService.generateSecret();
// Save `secret` to the user's secure database record

// 2. Setup Phase: Generate QR Code URI for the user's authenticator app
const uri = totpService.generateOtpAuthUri('user@example.com', secret, 'Ferrox App');

// 3. Login Phase: Verify the 6-digit code submitted by the user
const isValid = totpService.verifyTotpCode(secret, '123456');
```

---

## ⚠️ 6. Anti-Patterns: How NOT to Use It

> [!CAUTION]
> **Anti-Pattern 1: Hardcoding Secrets**
> Never hardcode the PASETO symmetric key in source code. It must be dynamically injected via environment variables (`process.env.PASETO_KEY`) or fetched from a secure Secret Manager (like AWS Secrets Manager or HashiCorp Vault) at runtime.

---

## 💡 7. Pro-Tips & Best Practices

> [!TIP]
> **Pro-Tip 1: Key Rotation**
> Use structured key rotation for PASETO v4 local tokens by maintaining an array of valid decryption keys. Attempt to verify against the newest key first, and fallback to older keys to gracefully transition without forcibly logging out active users.

---

## 🔗 Cross-References

- [Ferrox-Node Overview](../overview.md)
- [Node-YALC Auth](../../node-yalc/security/auth.md)
