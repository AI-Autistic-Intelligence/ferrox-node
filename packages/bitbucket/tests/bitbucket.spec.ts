import { BitbucketClient } from '../src/index';

describe('BitbucketClient', () => {
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should throw on api error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: jest.fn().mockResolvedValue('Bad token')
    });

    const client = new BitbucketClient('token');
    await expect(client.getRepositories('workspace')).rejects.toThrow('Bitbucket API error: Unauthorized');
  });

  it('should request repositories successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ values: [] })
    });

    const client = new BitbucketClient('token');
    const res = await client.getRepositories('workspace');
    expect(res.values).toEqual([]);
    expect(global.fetch).toHaveBeenCalledWith('https://api.bitbucket.org/2.0/repositories/workspace', expect.any(Object));
  });

  it('should create a pull request successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 1 })
    });

    const client = new BitbucketClient('token');
    const res = await client.createPullRequest('workspace', 'repo', 'title', 'source', 'dest');
    expect(res.id).toBe(1);
  });
});
