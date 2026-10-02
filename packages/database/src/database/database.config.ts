export type SupportedDatabase = 'postgresql' | 'mysql' | 'mariadb' | 'mongodb' | 'dynamodb' | 'firebase' | (string & {});

export interface DatabaseConnectionConfig {
  type: SupportedDatabase;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  
  // MongoDB specific
  replicaSet?: string;
  authSource?: string;

  // DynamoDB specific
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;

  // Firebase specific
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
  databaseUrl?: string;

  // General connection pooling and limits
  synchronize?: boolean;
  poolSize?: number;
  ssl?: boolean | object;
}
