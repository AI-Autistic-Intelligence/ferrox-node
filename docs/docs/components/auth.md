---
id: auth
title: Authentication (PASETO v4 & TOTP 2FA)
sidebar_position: 1
---

# 🔒 Authentication: PASETO v4 & TOTP 2FA (`PasetoAuthService`)

## 💡 1. What It Is & Architectural Purpose
`PasetoAuthService` is the native cryptographic authentication service of Ferrox-Node. It was engineered to completely replace legacy **JSON Web Tokens (JWT)** with the **PASETO v4 (Platform-Agnostic Security Tokens)** specification, while providing out-of-the-box support for **TOTP 2FA (Time-Based One-Time Password, RFC 6238)** multi-factor authentication.

---

## ⚙️ 2. What It Does & Key Features
- **PASETO v4 Symmetric Tokens (`v4.local`)**: AEAD authenticated symmetric encryption for high-speed session management.
- **PASETO v4 Asymmetric Tokens (`v4.public`)**: Asymmetric Ed25519 digital signatures for distributed microservice architectures.
- **Native JWT Exploit Prevention**: Immune to `alg: none` attacks, algorithm manipulation, and RSA/HMAC key confusion exploits.
- **TOTP 2FA Subsystem (`TotpAuthService`)**: Generation of TOTP secrets, Google Authenticator/Authy compatible QR-Code URIs, and time-step verification windows.

---

## 🔬 3. How It Works Under the Hood

### PASETO v4 Cryptographic Primitives

```
                   PASETO v4.local (Symmetric Token)
 +-------------------------------------------------------------------+
 | Header: "v4.local." | Nonce (24 bytes) | Encrypted Payload + AEAD Tag |
 +-------------------------------------------------------------------+
        ^ (Encrypted using XChaCha20-Poly1305 + BLAKE2b MAC)
```

1. **`v4.local`**: Employs **XChaCha20-Poly1305** AEAD encryption with an extended 24-byte cryptographically secure random nonce (`crypto.randomBytes(24)`). This eliminates any risk of nonce reuse vulnerabilities.
2. **`v4.public`**: Employs **Ed25519** (EdDSA over Curve25519) elliptic curve digital signatures with BLAKE2b hashing to sign claims non-repudiably.

---

## 🧠 4. Why It Was Designed This Way (Rationale vs JWT)

| Feature | 🔒 PASETO v4 (Ferrox-Node) | ⚠️ JWT (JSON Web Tokens) |
|---|---|---|
| **Algorithm Agility** | **Non-existent (Crypto-Agility Avoided for Security)** | Permissive (`alg: none`, `HS256`, `RS256` attacker-controlled) |
| **Symmetric Encryption** | **XChaCha20-Poly1305 AEAD** | AES-CBC (Vulnerable to Padding Oracles) or Unencrypted |
| **Asymmetric Signatures** | **Ed25519 (Curve25519)** | RSA 2048/4096 (Slow, Key Confusion Vulnerabilities) |
| **Payload Parsing** | **Strict Versioning (`v4.local.` / `v4.public.`)** | Flexibly parsed Base64 JSON (Manipulable) |

---

## 🚀 5. Practical Usage Guide & Extended Code Examples

### Generating and Verifying `v4.local` Tokens

```typescript
import { PasetoAuthService } from '@ferrox-node/core';
import crypto from 'crypto';

async function authWorkflow() {
  const authService = new PasetoAuthService();
  const secretKey = crypto.randomBytes(32); // 256-bit symmetric key

  // 1. Generate Symmetric Token
  const payload = { userId: 'usr_88192', role: 'admin', tenantId: 'org_acme' };
  const token = await authService.generateV4LocalToken(payload, secretKey, {
    expiresIn: '2h',
    issuer: 'ferrox-auth-engine'
  });

  console.log('Generated PASETO Token:', token);

  // 2. Decrypt & Verify Token Claims
  const verifiedClaims = await authService.verifyV4LocalToken(token, secretKey);
  console.log('Verified Claims:', verifiedClaims.userId, verifiedClaims.role);
}

authWorkflow().catch(console.error);
```

### Setting Up TOTP 2FA

```typescript
import { TotpAuthService } from '@ferrox-node/core';

async function setupTwoFactor(userId: string) {
  const totpService = new TotpAuthService();

  // 1. Generate TOTP Secret
  const { secret, qrCodeUrl } = await totpService.generateSecret('Acme Corp', userId);
  console.log('Scan QR Code URL:', qrCodeUrl);

  // 2. Verify 6-digit User Code
  const userEnteredCode = '582910';
  const isValid = totpService.verifyCode(secret, userEnteredCode);

  if (!isValid) {
    throw new Error('Invalid or expired 2FA code!');
  }

  console.log('2FA Authentication Successful!');
}
```

---

## ⚠️ 6. Anti-Patterns: How NOT to Use It

1. ❌ **DO NOT hardcode symmetric Secret Keys in source code**: Storing `v4.local` decryption keys inside TypeScript files leaks credentials if your repository is compromised.
2. ❌ **DO NOT use `v4.local` for untrusted inter-service communication**: For token verification across distributed microservices that do not share a database, use **`v4.public`** and distribute only the public key to consumer nodes.
3. ❌ **DO NOT ignore `exp` (Expiration Time)**: Issuing tokens without scadenze or with expirations exceeding 24 hours increases the window of impact for session hijack attacks.

---

## 💡 7. Pro-Tips & Best Practices

> [!TIP]
> **Encryption Key Rotation**: Use `ConfigEngine` to inject cryptographic keys as hex-encoded strings from secure environment variables (such as AWS Secrets Manager or HashiCorp Vault).
