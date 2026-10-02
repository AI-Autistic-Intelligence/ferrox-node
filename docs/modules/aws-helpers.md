# AWS Helpers Module (`node-yalc/aws-helpers`)

The AWS Helpers module abstracts common Amazon Web Services operations, standardizing integrations and providing robust type safety. It utilizes both the `aws-sdk` (v2) and the `@aws-sdk` (v3) where appropriate for optimal performance.

## Overview

This module provides straightforward APIs for interacting with AWS services commonly used in a Serverless or Microservices architecture:
*   **Lambda Execution (`aws-lambda.helpers.ts`)**: Secure handlers for Lambda entry points.
*   **S3 Object Storage (`aws-s3.helper.ts`)**: Utilities for generating presigned URLs for secure asset distribution.
*   **SQS Queues (`aws-sqs.helper.ts`)**: Fast and reliable message enqueueing.
*   **Systems Manager (SSM) & Encryption (`encryption.helper.ts`)**: Retrieving and decrypting secrets dynamically.

## Services

### Lambda Helpers

Provides the `runLambdaCliOperation` wrapper. When writing lambda functions that act as cron jobs or CLI triggers, uncaught exceptions can cause the Lambda to time out and lock up resources. This helper catches the exception and cleanly rejects the Promise so AWS Lambda can accurately register the invocation as a failure immediately.

```typescript
import { runLambdaCliOperation } from '@node-yalc/aws-helpers';

export const handler = async (event, context) => {
  return runLambdaCliOperation(
    async () => await myBusinessLogic(),
    "Operation completed successfully."
  );
};
```

### Simple Queue Service (SQS)

The `pushToAwsSQS` function abstracts the boilerplate required to enqueue messages. It is fully typed and returns a standard Promise.

```typescript
import { pushToAwsSQS } from '@node-yalc/aws-helpers';

await pushToAwsSQS({
  endpoint: 'https://sqs.us-east-1.amazonaws.com/123456789012/',
  region: 'us-east-1',
  queueName: 'my-ferrox-queue'
}, { userId: '123', action: 'CREATE_PDF' });
```

### Simple Storage Service (S3)

Often, files must remain private in S3 but need to be accessible temporarily by a client application. The `getFileFromS3` helper generates a 60-second presigned URL for secure frontend delivery.

```typescript
import { getFileFromS3 } from '@node-yalc/aws-helpers';

const temporaryDownloadUrl = await getFileFromS3('documents/invoice-123.pdf', 'my-private-bucket');
```

### Systems Manager Parameter Store (SSM)

Instead of hardcoding secrets or putting them in unencrypted environment variables on a server, Ferrox promotes fetching them dynamically from AWS SSM (encrypted with KMS). The `setEnvironmentVariablesFromSsm` function can be run at startup to map SSM keys into `process.env`. It also implements an internal cache to reduce API calls to AWS.

```typescript
import { setEnvironmentVariablesFromSsm } from '@node-yalc/aws-helpers';

await setEnvironmentVariablesFromSsm({
  DATABASE_PASSWORD: '/ferrox/production/database/password',
  STRIPE_SECRET_KEY: '/ferrox/production/stripe/secret'
});

console.log(process.env.DATABASE_PASSWORD); // Decrypted string
```
