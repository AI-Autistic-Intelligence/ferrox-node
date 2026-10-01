---
id: paseto
title: PASETO vs JWT Security
sidebar_position: 1
---

# PASETO vs JWT Security

Ferrox-Node officially deprecates JSON Web Tokens (JWT) for session and API security, enforcing the use of **Platform-Agnostic Security Tokens (PASETO)** as the enterprise standard.

## The Problem with JWT

JSON Web Tokens have a fundamental design flaw: the header dictates the algorithm (`alg`). This has led to numerous CVEs where attackers change the `alg` to `none` or supply public keys as HMAC secrets (Algorithm Confusion Attacks).

Additionally, JWTs are merely Base64-encoded. Any payload data is easily readable by anyone intercepting the token or decoding it on the client side, risking Information Disclosure.

## The PASETO Advantage

PASETO (specifically `v4.local` used by Ferrox-Node) solves these issues at the protocol level:

1. **No Algorithm Negotiation**: The algorithm is fixed by the version string (`v4.local`). The attacker cannot manipulate it.
2. **AEAD Encryption**: PASETO `local` tokens are symmetrically encrypted using XChaCha20-Poly1305. 
3. **Opaque Payloads**: Because the token is encrypted, the payload is completely opaque to the client. No PII (Personally Identifiable Information) or internal roles can be extracted without the server secret.

## Implementation in Ferrox-Node

Using the `PasetoAuthService`, tokens are generated securely:

```typescript
// Issuing a v4.local token
const token = authService.generateV4LocalToken({ userId: 123, role: 'ADMIN' }, 3600);
```

The payload is locked cryptographically, ensuring maximum Zero-Trust security in the Ferrox-Node edge layer.
