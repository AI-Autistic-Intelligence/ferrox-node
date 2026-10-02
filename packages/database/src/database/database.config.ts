/**
 * Defines the types of database engines supported by the Ferrox-Node Framework natively, 
 * plus an extensible string union for custom drivers.
 */
export type SupportedDatabase = 'postgresql' | 'mysql' | 'mariadb' | 'mongodb' | 'dynamodb' | 'firebase' | (string & {});

/**
 * Standardized configuration payload for establishing connections across 
 * SQL, NoSQL, and cloud-native databases. Used by the `DatabaseFactory` to 
 * route connection details to the correct underlying ORM/SDK.
 */
export interface DatabaseConnectionConfig {
  /** The type of database engine (e.g., 'postgresql', 'mongodb', 'dynamodb'). */
  type: SupportedDatabase;
  /** The hostname or IP address of the database server. */
  host?: string;
  /** The port on which the database is listening. */
  port?: number;
  /** The database username. */
  username?: string;
  /** The database password. */
  password?: string;
  /** The specific database, schema, or bucket name to connect to. */
  database?: string;
  
  // MongoDB specific
  /** MongoDB Replica Set name for high-availability setups. */
  replicaSet?: string;
  /** The authentication source database in MongoDB (usually 'admin'). */
  authSource?: string;

  // DynamoDB specific
  /** AWS Region for DynamoDB connections (e.g., 'us-east-1'). */
  region?: string;
  /** Custom endpoint URL for local testing (e.g., LocalStack). */
  endpoint?: string;
  /** AWS Access Key ID. Defaults to process.env.AWS_ACCESS_KEY_ID if omitted. */
  accessKeyId?: string;
  /** AWS Secret Access Key. Defaults to process.env.AWS_SECRET_ACCESS_KEY if omitted. */
  secretAccessKey?: string;

  // Firebase specific
  /** Firebase Project ID. */
  projectId?: string;
  /** Firebase Service Account Email. */
  clientEmail?: string;
  /** Firebase Private Key string. */
  privateKey?: string;
  /** Realtime Database URL. */
  databaseUrl?: string;

  // General connection pooling and limits
  /** 
   * Indicates whether the database schema should be auto-created on every application launch. 
   * **DANGER**: Never set this to true in production!
   */
  synchronize?: boolean;
  /** Maximum number of connections in the connection pool. */
  poolSize?: number;
  /** 
   * SSL Configuration. Can be boolean or an object specifying certificate details. 
   */
  ssl?: boolean | object;
}
