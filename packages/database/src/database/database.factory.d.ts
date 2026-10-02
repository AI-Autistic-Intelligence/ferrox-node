import { DatabaseConnectionConfig } from './database.config';
export type DatabaseDriverFactory = (config: DatabaseConnectionConfig) => any | Promise<any>;
export declare class DatabaseFactory {
    private static instances;
    private static drivers;
    /**
     * Registers a custom database driver (e.g., for AWS DynamoDB or Firebase)
     */
    static registerDriver(type: string, factory: DatabaseDriverFactory): void;
    /**
     * Initializes and establishes a connection to the chosen database using enterprise defaults.
     * Caches connections based on the database name/type to prevent connection leaks.
     */
    static createConnection(config: DatabaseConnectionConfig): Promise<any>;
    private static createTypeOrmConnection;
    private static createMongooseConnection;
    static closeAllConnections(): Promise<void>;
}
