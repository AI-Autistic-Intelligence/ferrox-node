import { GcpCloudHelper } from '../src/index';

// Mock the Google Cloud modules
jest.mock('@google-cloud/storage', () => {
  return {
    Storage: jest.fn().mockImplementation(() => {
      return {
        bucket: jest.fn().mockReturnValue({
          file: jest.fn().mockReturnValue({
            save: jest.fn().mockResolvedValue(true)
          })
        })
      };
    })
  };
});

jest.mock('@google-cloud/secret-manager', () => {
  return {
    SecretManagerServiceClient: jest.fn().mockImplementation(() => {
      return {
        accessSecretVersion: jest.fn().mockImplementation(({ name }) => {
          if (name.includes('empty-secret')) {
             return Promise.resolve([{ payload: {} }]); // missing data
          }
          return Promise.resolve([{ payload: { data: Buffer.from('super-secret') } }]);
        })
      };
    })
  };
});

describe('GcpCloudHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with provided projectId', () => {
    const helper = new GcpCloudHelper({ projectId: 'test-project' });
    expect((helper as any).projectId).toBe('test-project');
  });

  it('should throw if getting secret without projectId', async () => {
    const helper = new GcpCloudHelper();
    const originalEnv = process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    
    await expect(helper.getSecret('my-secret')).rejects.toThrow('Project ID is required');
    
    if (originalEnv) process.env.GOOGLE_CLOUD_PROJECT = originalEnv;
  });

  it('should get a secret successfully', async () => {
    const helper = new GcpCloudHelper({ projectId: 'test-project' });
    const secret = await helper.getSecret('my-secret');
    expect(secret).toBe('super-secret');
  });

  it('should throw if secret payload is missing', async () => {
    const helper = new GcpCloudHelper({ projectId: 'test-project' });
    await expect(helper.getSecret('empty-secret')).rejects.toThrow('Missing payload.data');
  });

  it('should upload a file to GCS successfully', async () => {
    const helper = new GcpCloudHelper({ projectId: 'test-project' });
    await expect(helper.uploadToGcs('my-bucket', 'file.txt', 'hello')).resolves.toBeUndefined();
    
    const storageClient = (helper as any).storageClient;
    expect(storageClient.bucket).toHaveBeenCalledWith('my-bucket');
    const bucketMock = storageClient.bucket.mock.results[0].value;
    expect(bucketMock.file).toHaveBeenCalledWith('file.txt');
    const fileMock = bucketMock.file.mock.results[0].value;
    expect(fileMock.save).toHaveBeenCalledWith('hello', { resumable: false });
  });
});
