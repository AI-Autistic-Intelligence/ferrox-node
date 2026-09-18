---
id: jobs
title: Jobs Scheduler & SSE Stream
sidebar_position: 13
---

# ⏱️ SSE Job Scheduler & Background Workers (`JobsSchedulerSse`)

`JobsSchedulerSse` combines asynchronous background worker execution with **Server-Sent Events (SSE)** to stream job progress, real-time log outputs, and execution status updates directly to frontend web applications.

---

## 🌟 Key Features

- **Off-Thread Worker Execution**: Moves heavy computational tasks (PDF report rendering, bulk email processing) off the main HTTP request handler thread.
- **Real-Time SSE Streaming**: Pushes progress percentage (`0%` -> `100%`) and live log lines to web browsers via native Server-Sent Events.
- **Async Cron Scheduler**: Supports recurring cron expression schedules (`0 0 * * *`) for background cleanup tasks.
- **Failure Recovery & Retries**: Configurable exponential backoff retries for failed background jobs.

---

## 🔬 Internal Architecture & Execution Mechanics

```mermaid
flowchart TD
    Client["Browser Client EventSource('/jobs/stream')"]
    EnqueueCall["JobsSchedulerSse.enqueueJob('data-export')"]
    WorkerPool["Async Worker Thread Pool"]
    ProgressStream["SSE Real-time Event Stream"]
    JobComplete["Job Completed (Download URL Issued)"]

    EnqueueCall --> WorkerPool
    WorkerPool -->|Report Progress (25%, 50%, 75%)| ProgressStream
    ProgressStream --> Client
    WorkerPool -->|100% Complete| JobComplete
```

---

## 📊 Architectural Comparison: `JobsSchedulerSse` vs Traditional Polling

| Feature / Dimension | ⏱️ `JobsSchedulerSse` (SSE) | 🐢 HTTP Polling (`setInterval`) |
|---|---|---|
| **Network Traffic** | **1 Persistent HTTP Connection** | Hundreds of Repeated HTTP Requests |
| **Latency of Progress Updates** | **Instant (Sub-Millisecond Push)** | Delayed by Polling Interval (e.g. 5s) |
| **Server CPU Utilization** | **Low (Event-Driven Streaming)** | High (Constant Polling Request Overhead) |

---

## 🚀 Practical Usage & Production Code Examples

### Enqueuing Background Jobs with SSE Progress Reporting

```typescript
import { JobsSchedulerSse } from '@ferrox-node/core';

const scheduler = new JobsSchedulerSse();

// 1. Enqueue Background Job with Real-Time Progress Stream
scheduler.enqueueJob('export-user-report', async (jobContext) => {
  jobContext.reportProgress(10, 'Connecting to database...');
  await new Promise(res => setTimeout(res, 500));

  jobContext.reportProgress(50, 'Fetching 50,000 records...');
  await new Promise(res => setTimeout(res, 1000));

  jobContext.reportProgress(90, 'Generating CSV spreadsheet...');
  await new Promise(res => setTimeout(res, 500));

  jobContext.reportProgress(100, 'Report generation completed!');
  return { downloadUrl: '/downloads/report_2026.csv' };
});
```

---

## ⚠️ Common Pitfalls & Anti-Patterns

> [!CAUTION]
> **Blocking the Worker Thread with Synchronous Loops**: Avoid running CPU-bound synchronous loops without yields. Use `await new Promise(res => setImmediate(res))` in long loops to allow the Node.js event loop to process SSE event pushes.

---

## 💡 Best Practices

> [!TIP]
> **Reconnection Handling**: Frontend SSE `EventSource` clients automatically attempt reconnection if network drops occur. `JobsSchedulerSse` buffers the last 10 log messages so reconnected clients resume without missing updates.
