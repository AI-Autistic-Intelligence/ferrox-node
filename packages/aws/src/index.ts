import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { DatabaseConnectionConfig } from '@ferrox-node/database';
import { AppLoggerFactory } from '@node-yalc/logger';

const logger = AppLoggerFactory('AwsCloudAdapters');

export class AwsFactory {
  /**
   * Initializes and returns an AWS DynamoDB Client
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
   * Initializes and returns an AWS S3 Client
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


