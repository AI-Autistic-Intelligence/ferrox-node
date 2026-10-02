import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { DatabaseConnectionConfig } from '@ferrox-node/database';
import { AppLoggerFactory } from '@node-yalc/logger';

const logger = AppLoggerFactory('AwsCloudAdapters');

/**
 * Enterprise AWS Cloud Factory.
 * 
 * Centralizes the instantiation and configuration of AWS SDK v3 clients (DynamoDB, S3, etc).
 * Supports zero-config fallback to environment variables (`AWS_ACCESS_KEY_ID`),
 * custom endpoint overrides (vital for LocalStack / local development), 
 * and secure credential injection via the DatabaseConfig payload.
 */
export class AwsFactory {
  /**
   * Initializes and returns a fully configured AWS DynamoDB Client.
   * 
   * @param {DatabaseConnectionConfig} config Configuration payload containing region and credentials.
   * @returns {DynamoDBClient} The native AWS SDK v3 DynamoDB client instance.
   */
  static createDynamoDbConnection(config: DatabaseConnectionConfig): DynamoDBClient {
    const client = new DynamoDBClient({
      region: config.region || 'us-east-1',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId || process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    logger.log(`Successfully initialized DynamoDB Client for region ${config.region || 'us-east-1'}`);
    return client;
  }

  /**
   * Initializes and returns an AWS S3 Client.
   * Forces Path Style formatting when a custom endpoint is provided, ensuring 
   * compatibility with local emulation tools like LocalStack and MinIO.
   * 
   * @param config The S3 connection configuration containing keys, region, and optional endpoint.
   * @returns {S3Client} The native AWS SDK v3 S3 client instance.
   */
  static createS3Client(config: { region?: string; endpoint?: string; accessKeyId?: string; secretAccessKey?: string }): S3Client {
    const client = new S3Client({
      region: config.region || 'us-east-1',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId || process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      forcePathStyle: !!config.endpoint, // true for localstack/minio
    });

    logger.log(`Successfully initialized S3 Client`);
    return client;
  }
}



