import { Injectable } from '../routing/decorators';
import { ConfigManager } from '@node-yalc/config';
import { ConfigEngine } from './config-engine';

@Injectable()
export class FerroxConfigService<T = any> extends ConfigManager<T> {
  constructor() {
    // For now we use the global ConfigEngine as the provider, and a default app alias
    const engine = new ConfigEngine({
      ferrox: {
        APP_NAME: 'Ferrox Enterprise API',
        PORT: 3000
      }
    });
    super(engine, 'ferrox');
  }
}
