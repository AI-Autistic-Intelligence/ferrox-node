# Kernel Module (`node-yalc/kernel`)

The Kernel module provides zero-trust security configuration generators designed to harden the underlying Linux OS or Docker container running the Ferrox Framework. 

## Overview

Application-level security (like JWTs and RBAC) is not enough. If an attacker exploits a vulnerability in a third-party dependency (like a zero-day in an image processing library) to gain Remote Code Execution (RCE), they could theoretically spawn a shell or read sensitive files from the container's disk.

The `KernelSandboxEngine` generates configuration files that instruct the Linux Kernel to block these actions at the OS level, meaning the attacker cannot execute malicious payloads even if they bypass the application logic.

## Supported Technologies

### 1. Seccomp (Secure Computing) BPF
Filters which Linux System Calls the Node.js process is allowed to make. The generated profile strictly allows standard networking and file I/O, but explicitly kills the process if it attempts to:
- Execute arbitrary shell commands (`execve`)
- Read process memory (`ptrace`)
- Load arbitrary kernel modules (`init_module`)

```typescript
import { KernelSandboxEngine } from '@node-yalc/kernel';
import * as fs from 'fs';

const engine = new KernelSandboxEngine();

// Generate a seccomp.json file to be used in your docker-compose.yml or Kubernetes Pod Security Context
fs.writeFileSync('seccomp-profile.json', engine.generateSeccompBpfPolicy());
```

### 2. Landlock LSM
A newer Linux Security Module that creates unprivileged filesystem sandboxes. The generated policy isolates the application so it can only read/write to `/app` and `/tmp`, preventing an attacker from reading `/etc/passwd` or ssh keys.

### 3. Sysctl Hardening
Generates network stack and filesystem protections to prevent SYN floods, IP spoofing, and symlink escalation attacks on the host OS.
