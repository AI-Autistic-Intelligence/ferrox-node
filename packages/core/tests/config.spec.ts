import 'reflect-metadata';
import { ConfigEngine } from '../src/config/config-engine';
import { FerroxConfigService } from '../src/config/ferrox-config.service';

describe('ConfigEngine', () => {
  it('should get boolean true from env', () => {
    process.env['TEST_BOOL_TRUE'] = 'true';
    const config = new ConfigEngine();
    expect(config.get('TEST_BOOL_TRUE')).toBe(true);
    delete process.env['TEST_BOOL_TRUE'];
  });

  it('should get boolean false from env', () => {
    process.env['TEST_BOOL_FALSE'] = 'false';
    const config = new ConfigEngine();
    expect(config.get('TEST_BOOL_FALSE')).toBe(false);
    delete process.env['TEST_BOOL_FALSE'];
  });

  it('should get number from env', () => {
    process.env['TEST_NUM'] = '42';
    const config = new ConfigEngine();
    expect(config.get('TEST_NUM')).toBe(42);
    delete process.env['TEST_NUM'];
  });

  it('should get string from env', () => {
    process.env['TEST_STR'] = 'hello_world';
    const config = new ConfigEngine();
    expect(config.get('TEST_STR')).toBe('hello_world');
    delete process.env['TEST_STR'];
  });

  it('should fallback if not set', () => {
    const config = new ConfigEngine();
    expect(config.get('NON_EXISTENT', 'fallback')).toBe('fallback');
  });

  it('should set and get values programmatically', () => {
    const config = new ConfigEngine();
    config.set('custom', 'value');
    expect(config.get('custom')).toBe('value');
  });
});

describe('FerroxConfigService', () => {
  it('should initialize with defaults', () => {
    const service = new FerroxConfigService();
    expect(service.get('ferrox').APP_NAME).toBe('Ferrox Enterprise API');
  });
});
