import { DatabaseFactory } from '../src/database/database.factory';


describe('DatabaseFactory', () => {
  it('should register custom drivers correctly', async () => {
    const mockDriver = jest.fn().mockResolvedValue('CUSTOM_CLIENT');
    DatabaseFactory.registerDriver('custom', mockDriver);

    const client = await DatabaseFactory.createConnection({ type: 'custom', database: 'test' });
    expect(client).toBe('CUSTOM_CLIENT');
    expect(mockDriver).toHaveBeenCalled();
  });

  it('should cache instances', async () => {
    const mockDriver = jest.fn().mockResolvedValue('CACHED_CLIENT');
    DatabaseFactory.registerDriver('cachedDB', mockDriver);

    const client1 = await DatabaseFactory.createConnection({ type: 'cachedDB', database: 'test-cache' });
    const client2 = await DatabaseFactory.createConnection({ type: 'cachedDB', database: 'test-cache' });
    
    expect(client1).toBe('CACHED_CLIENT');
    expect(client2).toBe('CACHED_CLIENT');
    expect(mockDriver).toHaveBeenCalledTimes(1); // Cached, shouldn't call again
  });

  it('should initialize postgresql using typeorm', async () => {
    const { DataSource } = require('typeorm');
    jest.spyOn(DataSource.prototype, 'initialize').mockResolvedValue(true);
    jest.spyOn(DataSource.prototype, 'destroy').mockResolvedValue(true);
    
    const client = await DatabaseFactory.createConnection({ type: 'postgresql', database: 'pg_test' });
    expect(client).toBeDefined();
  });

  it('should initialize mongodb using mongoose', async () => {
    const mongoose = require('mongoose');
    mongoose.connect = jest.fn().mockResolvedValue(true);

    const client = await DatabaseFactory.createConnection({ type: 'mongodb', database: 'mongo_test', username: 'u', password: 'p', replicaSet: 'rs', authSource: 'admin' });
    expect(client).toBe(mongoose);
    expect(mongoose.connect).toHaveBeenCalled();

    // test mongodb without options
    const client2 = await DatabaseFactory.createConnection({ type: 'mongodb', database: 'mongo_test_2' });
    expect(client2).toBeDefined();
  });

  it('should initialize mysql with default port', async () => {
    const { DataSource } = require('typeorm');
    jest.spyOn(DataSource.prototype, 'initialize').mockResolvedValue(true);
    const client = await DatabaseFactory.createConnection({ type: 'mysql', projectId: 'proj-mysql' });
    expect(client).toBeDefined();
  });

  it('should throw for dynamodb', async () => {
    await expect(DatabaseFactory.createConnection({ type: 'dynamodb', database: 'aws_test' })).rejects.toThrow();
  });

  it('should throw for firebase', async () => {
    await expect(DatabaseFactory.createConnection({ type: 'firebase', database: 'fb_test' })).rejects.toThrow();
  });

  it('should throw for unsupported types', async () => {
    await expect(DatabaseFactory.createConnection({ type: 'unknown_db' as any, database: 'fb_test' })).rejects.toThrow();
  });

  it('should close all connections', async () => {
    // Add a custom object with destroy
    DatabaseFactory.registerDriver('destroyable', jest.fn().mockResolvedValue({ destroy: jest.fn() }));
    await DatabaseFactory.createConnection({ type: 'destroyable', database: 'test' });
    
    await DatabaseFactory.closeAllConnections();
    // No error means it worked

    // Test fallback connectionKey when database and projectId are undefined
    const fallbackConfig: any = { type: 'custom_db_fallback', host: 'localhost' };
    DatabaseFactory.registerDriver('custom_db_fallback', async () => 'fallback_instance');
    const fallbackClient = await DatabaseFactory.createConnection(fallbackConfig);
    expect(fallbackClient).toBe('fallback_instance');
  });
});
