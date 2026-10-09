<div align="center">
  <h1>@ferrox-node/security</h1>
  <p><em>Core enterprise module for the @ferrox-node/security integration within the Ferrox/YALC ecosystem.</em></p>
  
  [![npm version](https://badge.fury.io/js/%40ferrox-node%2Fsecurity.svg)](https://badge.fury.io/js/%40ferrox-node%2Fsecurity)
  [![License](https://img.shields.io/npm/l/%40ferrox-node%2Fsecurity.svg)](https://github.com/AI-Autistic-Intelligence)
</div>

## 🚀 Installation

```bash
npm install @ferrox-node/security
# or
yarn add @ferrox-node/security
# or
pnpm add @ferrox-node/security
```

---

# Security Module (`node-yalc/security`)

The Security module houses the **Ferrox Sentinel Security Engine**. This is the ultimate line of defense for the framework, combining advanced zero-trust architecture, AI guardrails, and cryptographic protections into a single cohesive unit.

## Overview

Unlike standard firewalls that only look at ports and IPs, Sentinel performs Deep Packet Inspection and behavioral analysis.

### Core Engines

*   **`AiPromptGuardrailEngine`**: Protects against LLM Prompt Injection and Jailbreaking attempts in AI-driven applications.
*   **`RagHallucinationGroundednessEngine`**: Evaluates outputs from RAG pipelines to ensure the AI isn't hallucinating facts before sending the response to the user.
*   **`ShannonEntropyEngine`**: Calculates the entropy of incoming JSON payloads to detect obfuscated attacks or encrypted malware payloads hidden in base64 strings.
*   **`PolymorphicRouteEngine`**: Mutates and encrypts API routes at runtime. This prevents automated scrapers and bots from mapping your API because the endpoints constantly change dynamically.
*   **`MarkovBehaviorEngine`**: Uses Markov Chains to establish a baseline of normal user API flows. If a user suddenly jumps from "Login" straight to a deeply nested "Admin Delete" endpoint (skipping normal UI navigation), it flags it as anomalous.
*   **`LsassCredentialGuardEngine`**: Blocks memory injection and credential dumping.
*   **`SbomSupplyChainVerifierEngine`**: Validates the Software Bill of Materials.

## Usage

```typescript
import { FerroxSentinelSecurityEngine } from '@node-yalc/security';

// Initialize with a master key
const sentinel = new FerroxSentinelSecurityEngine(process.env.SENTINEL_MASTER_KEY);

// Use sub-engines
sentinel.shannonEvaluator; // Evaluate payloads
sentinel.routeEngine; // Generate polymorphic routes

// Generate Kernel Sandboxing configurations for CI/CD or Docker deployments
const seccomp = sentinel.generateSeccompBpfPolicy();
const sysctl = sentinel.generateSysctlHardeningConfig();
```

> Note: The Kernel Sandbox logic is also deeply integrated here alongside the `kernel` module to provide a unified security posture.


---
## 📚 Ecosystem Documentation

This module is a core component of the Ferrox enterprise microservice architecture. 

👉 **[Read the Full Documentation on Ferrox-Rust.dev](https://ferrox-rust.dev/docs/ferrox-node/modules/security)**
