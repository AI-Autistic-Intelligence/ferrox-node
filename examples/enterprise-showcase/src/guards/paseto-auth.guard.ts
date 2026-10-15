import { SecurityService } from '../services/security.service';
import { UnauthorizedError } from '@node-yalc/errors';

export class PasetoAuthGuard {
  constructor(private securityService: SecurityService) {}

  canActivate(req: { headers: Record<string, string | undefined>; user?: any }): boolean {
    const authHeader = req.headers?.['authorization'] || req.headers?.['Authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header. Expected: Bearer <v4.local token>');
    }

    const token = authHeader.substring(7);

    try {
      const decoded = this.securityService.verifyPasetoToken(token);
      req.user = decoded;
      return true;
    } catch (err: any) {
      throw new UnauthorizedError(`PASETO Authentication Failed: ${err.message}`);
    }
  }
}
