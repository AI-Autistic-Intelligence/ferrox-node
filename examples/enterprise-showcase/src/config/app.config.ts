export interface AppConfig {
  port: number;
  host: string;
  env: string;
  pasetoSecret: string;
  pasetoIssuer: string;
  redisUrl: string;
  databaseUrl: string;
  sentinelSecretKey: string;
}

export const loadConfig = (): AppConfig => ({
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  env: process.env.NODE_ENV || 'development',
  pasetoSecret: process.env.PASETO_SECRET || 'ferrox-enterprise-paseto-secret-32b-key!',
  pasetoIssuer: process.env.PASETO_ISSUER || 'ferrox-node-showcase',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ferrox_showcase',
  sentinelSecretKey: process.env.SENTINEL_SECRET || 'sentinel-enterprise-threat-secret-key-1'
});
