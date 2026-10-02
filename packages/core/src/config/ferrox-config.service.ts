import { Injectable } from '../routing/decorators';
import { ConfigEngine } from '@node-yalc/config';

@Injectable()
export class FerroxConfigService<T = any> extends ConfigEngine {
  constructor() {
    super({
      ferrox: {
        APP_NAME: 'Ferrox Enterprise API',
        PORT: 3000
      }
    });
  }
}
