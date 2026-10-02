import { GcpCloudHelper } from '../src/index';

describe('GcpCloudHelper', () => {
  it('should initialize with provided projectId', () => {
    const helper = new GcpCloudHelper({ projectId: 'test-project' });
    expect((helper as any).projectId).toBe('test-project');
  });

  it('should throw if getting secret without projectId', async () => {
    const helper = new GcpCloudHelper();
    // Simulate process.env.GOOGLE_CLOUD_PROJECT being unset
    const originalEnv = process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    
    await expect(helper.getSecret('my-secret')).rejects.toThrow('Project ID is required');
    
    if (originalEnv) process.env.GOOGLE_CLOUD_PROJECT = originalEnv;
  });
});
