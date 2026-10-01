import { DatabaseConnectionConfig } from './database.config';
import { DataSource } from 'typeorm';
import mongoose from 'mongoose';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import * as admin from 'firebase-admin';
import { AppLoggerFactory } from '@node-yalc/logger/logger.factory.js';
import { InternalServerError } from '@node-yalc/errors/error.class.js';

const logger = AppLoggerFactory('DatabaseFactory');

export class DatabaseFactory {
  private static instances: Map<string, any> = new Map();

  /**
   * Initializes and establishes a connection to the chosen database using enterprise defaults.
   * Caches connections based on the database name/type to prevent connection leaks.
   */
  public static async createConnection(config: DatabaseConnectionConfig): Promise<any> {
    const connectionKey = `${config.type}_${config.database || config.projectId || 'default'}`;

    if (this.instances.has(connectionKey)) {
      return this.instances.get(connectionKey);
    }

    let client: any;

    switch (config.type) {
      case 'postgresql':
      case 'mysql':
      case 'mariadb':
        client = await this.createTypeOrmConnection(config);
        break;

      case 'mongodb':
        client = await this.createMongooseConnection(config);
        break;

      case 'dynamodb':
        client = this.createDynamoDbConnection(config);
        break;

      case 'firebase':
        client = this.createFirebaseConnection(config);
        break;

      default:
        throw new InternalServerError(`Unsupported database type: ${config.type}`);
    }

    this.instances.set(connectionKey, client);
    return client;
  }

  private static async createTypeOrmConnection(config: DatabaseConnectionConfig): Promise<DataSource> {
    const dataSource = new DataSource({
      type: config.type as 'postgres' | 'mysql' | 'mariadb',
      host: config.host || 'localhost',
      port: config.port || (config.type === 'postgresql' ? 5432 : 3306),
      username: config.username,
      password: config.password,
      database: config.database,
      synchronize: config.synchronize ?? false,
      logging: false,
      poolSize: config.poolSize || 20,
      ssl: config.ssl,
      entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../../**/migrations/*{.ts,.js}'],
    });

    await dataSource.initialize();
    logger.log(`Successfully connected to ${config.type} at ${config.host}`);
    return dataSource;
  }

  private static async createMongooseConnection(config: DatabaseConnectionConfig): Promise<typeof mongoose> {
    let uri = `mongodb://${config.host || 'localhost'}:${config.port || 27017}/${config.database}`;
    
    if (config.username && config.password) {
      uri = `mongodb://${config.username}:${config.password}@${config.host || 'localhost'}:${config.port || 27017}/${config.database}`;
    }

    const options: mongoose.ConnectOptions = {
      autoIndex: config.synchronize ?? false,
      maxPoolSize: config.poolSize || 20,
    };

    if (config.replicaSet) {
      options.replicaSet = config.replicaSet;
    }
    if (config.authSource) {
      options.authSource = config.authSource;
    }

    await mongoose.connect(uri, options);
    logger.log(`Successfully connected to MongoDB at ${config.host}`);
    return mongoose;
  }

  private static createDynamoDbConnection(config: DatabaseConnectionConfig): DynamoDBClient {
    const client = new DynamoDBClient({
      region: config.region || 'us-east-1',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId || process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    logger.log(`Successfully initialized DynamoDB Client for region ${config.region}`);
    return client;
  }

  private static createFirebaseConnection(config: DatabaseConnectionConfig): admin.app.App {
    if (!config.projectId || !config.clientEmail || !config.privateKey) {
      throw new InternalServerError('Firebase connection requires projectId, clientEmail, and privateKey');
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

  public static async closeAllConnections(): Promise<void> {
    for (const [key, client] of this.instances.entries()) {
      if (client instanceof DataSource) {
        await client.destroy();
      } else if (client === mongoose) {
        await mongoose.disconnect();
      } else if (client instanceof DynamoDBClient) {
        client.destroy();
      }
      // Firebase doesn't strictly need teardown for the app reference in most scenarios
    }
    this.instances.clear();
    logger.log('Closed all database connections.');
  }
}
