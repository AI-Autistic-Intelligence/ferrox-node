import { Controller, Post, Get, Injectable } from '@ferrox-node/core';
import { SecurityService } from '../services/security.service';
import { BadRequestError, UnauthorizedError } from '@node-yalc/errors';

@Controller('/api/v1/auth')
@Injectable()
export class AuthController {
  constructor(private securityService: SecurityService) {}

  @Post('/login')
  login(req: { body?: { username?: string; password?: string } }) {
    const { username, password } = req.body || {};

    if (!username || !password) {
      throw new BadRequestError('Username and password are required.');
    }

    // Demo authentication check
    if (password !== 'ferrox_secure_pass') {
      throw new UnauthorizedError('Invalid credentials.');
    }

    const token = this.securityService.generatePasetoToken(username, ['admin', 'operator']);

    return {
      success: true,
      tokenType: 'v4.local',
      token,
      expiresIn: 3600
    };
  }

  @Post('/totp/setup')
  setupTotp(req: { body?: { userId?: string } }) {
    const userId = req.body?.userId || 'usr_showcase_01';
    const { secret, uri } = this.securityService.setupTotp(userId);

    return {
      success: true,
      userId,
      secret,
      otpAuthUri: uri,
      instructions: 'Add this secret to your Google Authenticator or 1Password client.'
    };
  }

  @Post('/totp/verify')
  verifyTotp(req: { body?: { secret?: string; code?: string } }) {
    const { secret, code } = req.body || {};

    if (!secret || !code) {
      throw new BadRequestError('Secret and 6-digit TOTP code are required.');
    }

    const isValid = this.securityService.verifyTotp(secret, code);

    if (!isValid) {
      throw new UnauthorizedError('Invalid or expired TOTP code.');
    }

    return {
      success: true,
      message: 'TOTP 2FA Verification Successful.'
    };
  }
}
