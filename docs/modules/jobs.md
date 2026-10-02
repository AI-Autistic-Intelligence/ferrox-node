# Jobs Module (`node-yalc/jobs`)

The Jobs module provides lightweight, in-memory background processing and scheduling mechanisms. It is designed to handle asynchronous tasks (like sending emails or recalculating stats) without requiring an external message broker (like Redis or RabbitMQ) for smaller deployments.

## Overview

Offloading heavy work from the main HTTP thread is critical for Node.js performance. This module provides three distinct utilities:
1. **`FerroxJobQueue`**: An asynchronous Task Queue manager.
2. **`FerroxCronScheduler`**: A recurring Task scheduler.
3. **`FerroxSseStream`**: Server-Sent Events (SSE) utilities to stream progress to the frontend.

## Usage Examples

### 1. FerroxJobQueue (Background Worker)

```typescript
import { FerroxJobQueue } from '@node-yalc/jobs';

const queue = new FerroxJobQueue();

// 1. Register a worker to handle specific jobs
queue.registerWorker('SEND_WELCOME_EMAIL', async (payload) => {
  console.log(`Sending email to ${payload.email}...`);
  await mailer.send(payload.email);
});

// 2. Enqueue jobs from your HTTP Controller
// This returns immediately. The job processes asynchronously in the background.
app.post('/register', (req, res) => {
  const user = db.createUser(req.body);
  const job = queue.enqueue('SEND_WELCOME_EMAIL', { email: user.email });
  
  res.json({ user, jobId: job.id }); // Fast response
});
```

### 2. FerroxCronScheduler (Recurring Tasks)

```typescript
import { FerroxCronScheduler } from '@node-yalc/jobs';

const scheduler = new FerroxCronScheduler();

// Runs the database cleanup every 60 seconds
scheduler.scheduleTask('DB_CLEANUP', 60000, async () => {
  console.log('Running background cleanup...');
  await db.query('DELETE FROM sessions WHERE expiresAt < NOW()');
});
```

### 3. FerroxSseStream (Real-time Progress)

If a user triggers a heavy export job, you can use SSE to push updates.

```typescript
import { FerroxSseStream } from '@node-yalc/jobs';

app.get('/api/export/progress', (req, res) => {
  FerroxSseStream.initSseResponse(res);
  
  // Send updates
  FerroxSseStream.sendEvent(res, 'progress', { percentage: 10 });
  
  setTimeout(() => {
    FerroxSseStream.sendEvent(res, 'progress', { percentage: 100 });
    res.end();
  }, 5000);
});
```
