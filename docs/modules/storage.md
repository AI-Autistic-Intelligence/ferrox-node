# Storage Module (`node-yalc/storage`)

The Storage module provides a unified abstraction layer for object storage (file uploads, downloads, and presigned URLs). 

## Overview

By adhering to the `IStorageAdapter` interface, your application business logic remains entirely decoupled from the physical storage provider. You can use the `MemoryStorageAdapter` during local development or testing, and swap it seamlessly for AWS S3 or Google Cloud Storage in production without changing any controller code.

### Architecture

The `StorageEngine` takes an implementation of `IStorageAdapter` in its constructor (Dependency Injection).

```typescript
import { StorageEngine, MemoryStorageAdapter } from '@node-yalc/storage';
// import { S3StorageAdapter } from '@node-yalc/aws-helpers';

// Local Development
const storage = new StorageEngine(new MemoryStorageAdapter());

// Production
// const storage = new StorageEngine(new S3StorageAdapter());

// Uploading a file
const fileUri = await storage.upload('avatars/user_1.png', imageBuffer, 'image/png');

// Generating a temporary download link
const url = await storage.getPresignedUrl('avatars/user_1.png', 3600);
```
