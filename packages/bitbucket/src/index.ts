import { AppLoggerFactory } from '@node-yalc/logger';

const logger = AppLoggerFactory('BitbucketClient');

export class BitbucketClient {
  private baseUrl = 'https://api.bitbucket.org/2.0';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    logger?.debug?.(`[Bitbucket API] Requesting ${url}`);

    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error(`[Bitbucket API] Request failed: ${res.status} - ${errText}`);
      throw new Error(`Bitbucket API error: ${res.statusText}`);
    }

    return res.json();
  }

  /**
   * Retrieves a list of repositories for a given workspace.
   */
  async getRepositories(workspace: string) {
    return this.request(`/repositories/${workspace}`);
  }

  /**
   * Creates a new pull request.
   */
  async createPullRequest(workspace: string, repoSlug: string, title: string, sourceBranch: string, destBranch: string) {
    return this.request(`/repositories/${workspace}/${repoSlug}/pullrequests`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        source: { branch: { name: sourceBranch } },
        destination: { branch: { name: destBranch } }
      })
    });
  }
}

