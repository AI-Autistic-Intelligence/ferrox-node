import { DatabaseConnectionConfig } from './database.config';
import { DataSource } from 'typeorm';
import mongoose from 'mongoose';
import { AppLoggerFactory } from '@node-yalc/logger';
import { InternalServerError } from '@node-yalc/errors';

const logger = AppLoggerFactory('DatabaseFactory');

export type DatabaseDriverFactory = (config: DatabaseConnectionConfig) => any | Promise<any>;

export class DatabaseFactory {
  private static instances: Map<string, any> = new Map();
  private static drivers: Map<string, DatabaseDriverFactory> = new Map();

  /**
   * Registers a custom database driver (e.g., for AWS DynamoDB or Firebase)
   */
  public static registerDriver(type: string, factory: DatabaseDriverFactory) {
    this.drivers.set(type, factory);
  }

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

    // Check custom registered drivers first (like aws, firebase)
    if (this.drivers.has(config.type)) {
      const factory = this.drivers.get(config.type)!;
      client = await factory(config);
    } else {
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
          throw new InternalServerError(`To use DynamoDB, please install @ferrox-node/aws and register the driver: DatabaseFactory.registerDriver('dynamodb', createDynamoDbConnection)`);
          
        case 'firebase':
          throw new InternalServerError(`To use Firebase, please install @ferrox-node/firebase and register the driver`);

        default:
          throw new InternalServerError(`Unsupported database type: ${config.type}`);
      }
    }

    this.instances.set(connectionKey, client);
    return client;
  }

  private static async createTypeOrmConnection(config: DatabaseConnectionConfig): Promise<DataSource> {
    const dataSource = new DataSource({
      type: config.type === 'postgresql' ? 'postgres' : config.type as 'postgres' | 'mysql' | 'mariadb',
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

  public static async closeAllConnections(): Promise<void> {
    for (const [key, client] of this.instances.entries()) {
      if (client instanceof DataSource) {
        await client.destroy();
      } else if (client === mongoose) {
        await mongoose.disconnect();
      } else if (typeof client.destroy === 'function') {
        client.destroy(); // Works for DynamoDBClient
      }
    }
    this.instances.clear();
    logger.log('Closed all database connections.');
  }
}

