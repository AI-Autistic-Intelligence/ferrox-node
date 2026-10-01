---
id: security
title: Global Security Core & Data Protection
sidebar_position: 4
---

# 🛡️ Global Security Core & Data Protection

## 💡 1. What It Is & Architectural Purpose
The `@ferrox-node/security` module acts as the central nerve center for all protective measures within the application. Its architectural purpose is to provide a "Defense in Depth" strategy by standardizing cryptographic operations, payload sanitization, and request firewalling. It ensures that security is not an afterthought but a baked-in default.

---

## ⚙️ 2. Comprehensive Taxonomy & Key Features

| Component | Description | Use Case |
| :--- | :--- | :--- |
| **`HelmetMiddleware`** | Configures secure HTTP response headers. | Preventing XSS, Clickjacking, MIME-sniffing. |
| **`CorsService`** | Strict Cross-Origin Resource Sharing manager. | Restricting API access to trusted domains. |
| **`PayloadSanitizer`** | Recursively strips malicious inputs from JSON bodies. | Preventing NoSQL Injection and Prototype Pollution. |
| **`CryptoService`** | AES-256-GCM authenticated encryption utility. | Encrypting PII (Personal Identifiable Information) at rest. |

---

## 🔬 3. How It Works Under the Hood

When an HTTP request enters the `FerroxApp` boundary, it must pass through a strict security gauntlet before reaching the Router.

```mermaid
flowchart TD
    Internet[Internet Traffic]
    Helmet[Helmet Headers Check]
    CORS[CORS Validation]
    Sanitizer[Prototype Pollution / SQLi Sanitizer]
    RateLimiter[Rate Limiter (Redis)]
    Router[Application Router]

    Internet --> Helmet
    Helmet --> CORS
    CORS --> Sanitizer
    Sanitizer --> RateLimiter
    RateLimiter --> Router
    
    Helmet -.->|Fails| Drop
    CORS -.->|Fails| Drop
    Sanitizer -.->|Malicious| Drop
```

The `CryptoService` uses Authenticated Encryption with Associated Data (AEAD), ensuring that not only is data encrypted, but any tampering with the ciphertext will immediately trigger an error upon decryption.

---

## 🧠 4. Why It Was Designed This Way (Rationale)

Most developers use generic `crypto` wrappers or outdated algorithms like `AES-CBC`. `@ferrox-node/security` enforces the use of modern algorithms (AES-GCM for symmetric, Ed25519 for signatures, Argon2id for password hashing). By providing these as standard IoC services, we prevent developers from accidentally introducing cryptographic vulnerabilities through misconfiguration.

---

## 🚀 5. Usage Guide & Code Examples

### Hashing Passwords Securely

```typescript
import { HashService } from '@ferrox-node/security';

@Injectable()
export class AuthService {
  constructor(private hashService: HashService) {}

  async registerUser(password: string) {
    // Automatically uses Argon2id with optimal memory/time cost parameters
    const hashedPassword = await this.hashService.hash(password);
    
    // Verify during login
    const isValid = await this.hashService.verify(password, hashedPassword);
  }
}
```

### Encrypting PII Data

```typescript
import { CryptoService } from '@ferrox-node/security';

const crypto = new CryptoService('32-byte-master-encryption-key-here!');

// Encrypting a Credit Card (Outputs: IV:Ciphertext:AuthTag)
const encryptedData = crypto.encryptAES256GCM('4111-1111-1111-1111');

// Decrypting (Validates AuthTag to prevent tampering)
const decryptedData = crypto.decryptAES256GCM(encryptedData);
```

---

## ⚠️ 6. Anti-Patterns: How NOT to Use It

> [!CAUTION]
> **Anti-Pattern 1: Hardcoding Master Keys**
> Never hardcode the 32-byte AES master key in source code. Always inject it via the `ConfigEngine` from a secure Vault or KMS.

> [!WARNING]
> **Anti-Pattern 2: Disabling Helmet for "Development"**
> Do not disable security headers locally. If your frontend app cannot connect to your backend locally due to CORS or CSP, fix your local proxy configuration, do not weaken the API.

---

## 开启 7. Pro-Tips & Best Practices

> [!TIP]
> **Pro-Tip: Data Key Rotation**
> Use the Envelope Encryption pattern. Use AWS KMS to encrypt a local Data Key, and use the `CryptoService` to encrypt the payload with the Data Key. This allows you to rotate the KMS master key without needing to re-encrypt terrabytes of database records!
