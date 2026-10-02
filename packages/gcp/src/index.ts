import { Storage } from '@google-cloud/storage';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { AppLoggerFactory } from '@node-yalc/logger';

const logger = AppLoggerFactory('GcpCloudHelper');

export class GcpCloudHelper {
  private storageClient: Storage;
  private secretManagerClient: SecretManagerServiceClient;
  private projectId?: string;

  constructor(options?: { projectId?: string }) {
    this.projectId = options?.projectId;
    this.storageClient = new Storage({ projectId: this.projectId });
    this.secretManagerClient = new SecretManagerServiceClient({ projectId: this.projectId });
    logger.log(`Initialized GCP Cloud Helper for project: ${this.projectId || 'ADC (Default)'}`);
  }

  /**
   * Fetches a payload from GCP Secret Manager
   */
  async getSecret(secretId: string, version: string = 'latest', projectId?: string): Promise<string> {
    const pId = projectId || this.projectId || process.env.GOOGLE_CLOUD_PROJECT;
    if (!pId) throw new Error('Project ID is required to fetch secrets');

    const name = `projects/${pId}/secrets/${secretId}/versions/${version}`;
    logger?.debug?.(`[GCP SecretManager] Fetching secret ${name}`);

    const [secretVersion] = await this.secretManagerClient.accessSecretVersion({ name });
    const payload = secretVersion.payload?.data?.toString();
    
    if (!payload) {
      throw new Error(`Missing payload.data in GCP Secret Manager response for ${name}`);
    }

    return payload;
  }

  /**
   * Uploads an object to Google Cloud Storage (GCS)
   */
  async uploadToGcs(bucketName: string, key: string, data: Buffer | string): Promise<void> {
    logger?.debug?.(`[GCP Storage] Uploading object to gs://${bucketName}/${key}`);
    const bucket = this.storageClient.bucket(bucketName);
    const file = bucket.file(key);
    
    await file.save(data, { resumable: false });
    logger?.debug?.(`[GCP Storage] Successfully uploaded gs://${bucketName}/${key}`);
  }
}
