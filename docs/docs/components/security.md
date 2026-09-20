---
id: security
title: Sentinel AI Security & Entropy Engine
sidebar_position: 2
---

# 🛡️ Sentinel AI Threat Engine & Entropy Analysis (`SentinelIntegrationService`)

## 💡 1. What It Is & Architectural Purpose
`SentinelIntegrationService` is the heuristic security and artificial intelligence threat middleware built directly into Ferrox-Node. Its architectural purpose is to detect and neutralize advanced application attacks in real time—such as **LLM Prompt Injections**, **obfuscated SQLi/XSS payloads**, and **secret exfiltration**—before requests ever reach business controllers.

---

## ⚙️ 2. What It Does & Key Features
- **Shannon Payload Entropy Analysis**: Calculates informational randomness of inbound buffers to identify binary shellcode or encrypted secrets.
- **LLM Prompt Injection Defense**: Automatic stripping of ChatML/XML injection tags (`<system>`, `[INST]`, `<|im_start|>`) in inputs bound for AI models.
- **Markov Anomaly Predictor**: Evaluates HTTP endpoint traversal sequences to catch automated bots and crawlers.
- **RAG Hallucination & Risk Scoring**: Scores informational credibility of AI retriever payloads.

---

## 🔬 3. How It Works Under the Hood

### Shannon Entropy Calculation

Shannon entropy calculates the amount of information uncertainty or randomness in a string or buffer.

Where P(x_i) is the relative frequency of byte x_i in the payload.
- **Plain Text (JSON, HTML)**: H(X) \approx 3.5 - 4.8
- **Base64 Payload / Obfuscated SQLi**: H(X) \approx 5.2 - 6.5
- **Binary Shellcode / Encrypted Buffers**: H(X) > 7.2

If H(X) exceeds the security threshold (\ge 7.2), Sentinel immediately isolates the request, terminating the HTTP lifecycle with an HTTP `403 Forbidden` status.

---

## 🧠 4. Why It Was Designed This Way (Sentinel vs Standard WAF)

| Feature | 🛡️ Ferrox Sentinel AI | 🌐 Standard WAF (Cloudflare/AWS) |
|---|---|---|
| **Prompt Injection Defense** | **Native ChatML Stripping Engine** | None (Inspects static HTTP Regex only) |
| **In-Memory Entropy Inspection** | **Direct Node.js Buffer Analysis** | None / Limited to HTTP Headers |
| **Inspection Latency** | **Sub-millisecond (< 0.2ms)** | Adds 10-50ms Network Latency |
| **Markov Sequence Predictor** | **User Traversal Route Analysis** | Static Rate-Limiting Rules |

---

## 🚀 5. Practical Usage Guide & Extended Code Examples

### Protecting AI Endpoints with Sentinel

```typescript
import { SentinelIntegrationService } from '@ferrox-node/core';

export class PromptSecurityController {
  private sentinel = new SentinelIntegrationService();

  async handleUserPrompt(userPrompt: string): Promise<string> {
    // 1. Sanitize Prompt Injection (ChatML Stripping)
    const sanitizedPrompt = this.sentinel.sanitizePrompt(userPrompt);

    // 2. Evaluate Payload Entropy
    const entropyScore = this.sentinel.calculateEntropy(Buffer.from(sanitizedPrompt));
    console.log(`Payload Entropy Score: ${entropyScore.toFixed(2)}`);

    if (entropyScore > 7.0) {
      throw new Error('Payload blocked: abnormal entropy detected (possible shellcode or secret exfiltration).');
    }

    // 3. Securely forward to LLM Model
    return await sendToLLM(sanitizedPrompt);
  }
}
```

---

## ⚠️ 6. Anti-Patterns: How NOT to Use It

1. ❌ **DO NOT disable sanitization on LLM input forms**: Passing raw user inputs directly to AI model prompts without ChatML cleaning exposes your application to System Prompt Hijacking attacks.
2. ❌ **DO NOT apply low entropy thresholds to image/ZIP file uploads**: Legitimate binary files (JPEG, PNG, ZIP) naturally exhibit high entropy (H(X) > 7.5). Apply entropy filtering selectively to text and JSON request bodies.

---

## 💡 7. Pro-Tips & Best Practices

> [!TIP]
> **Selective API Scanning**: Configure `SentinelIntegrationService` as a global middleware for `/api/v1/ai/*` and `/api/v1/auth/*` routes to guarantee maximum security with zero impact on static asset routes.
