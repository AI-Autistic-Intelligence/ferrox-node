import * as admin from 'firebase-admin';
import { DatabaseConnectionConfig } from '@ferrox-node/database';
import { AppLoggerFactory } from '@node-yalc/logger';
import { InternalServerError } from '@node-yalc/errors';

const logger = AppLoggerFactory('FirebaseDatabaseDriver');

export function createFirebaseConnection(config: DatabaseConnectionConfig): admin.app.App {
  if (!config.projectId || !config.clientEmail || !config.privateKey) {
    throw new Error('Firebase connection requires projectId, clientEmail, and privateKey');
  }

  // Fix formatting issues with environment variable loaded private keys
  const privateKey = config.privateKey.replace(/\\n/g, '\n');

  const app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: privateKey,
    }),
    databaseURL: config.databaseUrl,
  }, config.projectId);

  logger.log(`Successfully initialized Firebase Admin for project ${config.projectId}`);
  return app;
}

