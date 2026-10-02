import { AwsFactory } from '../src/index';

describe('AwsFactory', () => {
  it('should initialize DynamoDB Client', () => {
    const client = AwsFactory.createDynamoDbConnection({ region: 'us-west-1', endpoint: 'http://localhost:8000' } as any);
    expect(client).toBeDefined();
  });

  it('should initialize S3 Client', () => {
    const client = AwsFactory.createS3Client({ region: 'us-west-1', endpoint: 'http://localhost:9000' });
    expect(client).toBeDefined();
  });
});
