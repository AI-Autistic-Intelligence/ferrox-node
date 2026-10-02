# Selftest Module (`node-yalc/selftest`)

The Selftest module provides built-in, automated security auditing and diagnostic tools for the Ferrox-Node Framework.

## Overview

Security cannot be an afterthought, and standard unit tests rarely cover OS-level or architectural vulnerabilities. The `FerroxSelfTestEngine` acts as an embedded "Red Team," continuously verifying that the environment's security posture is active and functioning.

### 1. Diagnostic Audit
This checks internal application state and configuration to ensure essential protections are loaded.
It verifies:
- Token encryption algorithms.
- Kernel compliance headers are injected by guards.
- Seccomp and Landlock configurations are active.
- Sysctl hardening is applied.
- AI Guardrails (Shannon entropy, RAG groundedness) are running.

```typescript
import { FerroxSelfTestEngine } from '@node-yalc/selftest';

const engine = new FerroxSelfTestEngine();
const report = engine.runDiagnosticAudit();

if (report.overallScore < 100) {
  console.warn('Security Degradation Detected!');
}
```

### 2. Kali Red-Team Simulation
This feature simulates an external offensive scan (mimicking tools like Nmap, Gobuster, SQLMap, Commix, and Hydra) to assert that the framework's defenses successfully block common attack vectors.

```typescript
const audit = engine.runKaliRedTeamAudit('https://api.production.ferrox.dev');

console.log(audit.overallVerdict); // "SECURE_PASS"
```
