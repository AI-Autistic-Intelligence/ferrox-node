"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseFactory = void 0;
const typeorm_1 = require("typeorm");
const mongoose_1 = __importDefault(require("mongoose"));
const logger_factory_1 = require("@node-yalc/logger/logger.factory");
const error_class_1 = require("@node-yalc/errors/error.class");
const logger = (0, logger_factory_1.AppLoggerFactory)('DatabaseFactory');
class DatabaseFactory {
    static instances = new Map();
    static drivers = new Map();
    /**
     * Registers a custom database driver (e.g., for AWS DynamoDB or Firebase)
     */
    static registerDriver(type, factory) {
        this.drivers.set(type, factory);
    }
    /**
     * Initializes and establishes a connection to the chosen database using enterprise defaults.
     * Caches connections based on the database name/type to prevent connection leaks.
     */
    static async createConnection(config) {
        const connectionKey = `${config.type}_${config.database || config.projectId || 'default'}`;
        if (this.instances.has(connectionKey)) {
            return this.instances.get(connectionKey);
        }
        let client;
        // Check custom registered drivers first (like aws, firebase)
        if (this.drivers.has(config.type)) {
            const factory = this.drivers.get(config.type);
            client = await factory(config);
        }
        else {
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
                    throw new error_class_1.InternalServerError(`To use DynamoDB, please install @ferrox-node/aws and register the driver: DatabaseFactory.registerDriver('dynamodb', createDynamoDbConnection)`);
                case 'firebase':
                    throw new error_class_1.InternalServerError(`To use Firebase, please install @ferrox-node/firebase and register the driver`);
                default:
                    throw new error_class_1.InternalServerError(`Unsupported database type: ${config.type}`);
            }
        }
        this.instances.set(connectionKey, client);
        return client;
    }
    static async createTypeOrmConnection(config) {
        const dataSource = new typeorm_1.DataSource({
            type: config.type === 'postgresql' ? 'postgres' : config.type,
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
    static async createMongooseConnection(config) {
        let uri = `mongodb://${config.host || 'localhost'}:${config.port || 27017}/${config.database}`;
        if (config.username && config.password) {
            uri = `mongodb://${config.username}:${config.password}@${config.host || 'localhost'}:${config.port || 27017}/${config.database}`;
        }
        const options = {
            autoIndex: config.synchronize ?? false,
            maxPoolSize: config.poolSize || 20,
        };
        if (config.replicaSet) {
            options.replicaSet = config.replicaSet;
        }
        if (config.authSource) {
            options.authSource = config.authSource;
        }
        await mongoose_1.default.connect(uri, options);
        logger.log(`Successfully connected to MongoDB at ${config.host}`);
        return mongoose_1.default;
    }
    static async closeAllConnections() {
        for (const [key, client] of this.instances.entries()) {
            if (client instanceof typeorm_1.DataSource) {
                await client.destroy();
            }
            else if (client === mongoose_1.default) {
                await mongoose_1.default.disconnect();
            }
            else if (typeof client.destroy === 'function') {
                client.destroy(); // Works for DynamoDBClient
            }
        }
        this.instances.clear();
        logger.log('Closed all database connections.');
    }
}
exports.DatabaseFactory = DatabaseFactory;
