import { AwsFactory } from '../src/index';

describe('AwsFactory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should initialize DynamoDB Client with provided config', () => {
    const client = AwsFactory.createDynamoDbConnection({ region: 'us-west-1', endpoint: 'http://localhost:8000', accessKeyId: 'a', secretAccessKey: 'b' } as any);
    expect(client).toBeDefined();
  });

  it('should initialize DynamoDB Client with empty config (fallbacks)', () => {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    const client = AwsFactory.createDynamoDbConnection({} as any);
    expect(client).toBeDefined();
  });

  it('should initialize DynamoDB Client utilizing process.env fallbacks', () => {
    process.env.AWS_ACCESS_KEY_ID = 'test-id';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
    const client = AwsFactory.createDynamoDbConnection({} as any);
    expect(client).toBeDefined();
  });

  it('should initialize S3 Client with provided config', () => {
    const client = AwsFactory.createS3Client({ region: 'us-west-1', endpoint: 'http://localhost:9000', accessKeyId: 'a', secretAccessKey: 'b' });
    expect(client).toBeDefined();
  });

  it('should initialize S3 Client with empty config (fallbacks)', () => {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    const client = AwsFactory.createS3Client({});
    expect(client).toBeDefined();
  });

  it('should initialize S3 Client utilizing process.env fallbacks', () => {
    process.env.AWS_ACCESS_KEY_ID = 'test-id';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
    const client = AwsFactory.createS3Client({});
    expect(client).toBeDefined();
  });
});
