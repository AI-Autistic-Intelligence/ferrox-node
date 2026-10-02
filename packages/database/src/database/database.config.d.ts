export type SupportedDatabase = 'postgresql' | 'mysql' | 'mariadb' | 'mongodb' | 'dynamodb' | 'firebase' | (string & {});
export interface DatabaseConnectionConfig {
    type: SupportedDatabase;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
    replicaSet?: string;
    authSource?: string;
    region?: string;
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
    databaseUrl?: string;
    synchronize?: boolean;
    poolSize?: number;
    ssl?: boolean | object;
}
