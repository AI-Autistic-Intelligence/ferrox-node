import { Injectable } from '@ferrox-node/core';
import { PasetoAuthService, TotpAuthService, FerroxSentinelSecurityEngine } from '@ferrox-node/security';
import { AppConfig } from '../config/app.config';

@Injectable()
export class SecurityService {
  private paseto: PasetoAuthService;
  private totp: TotpAuthService;
  private sentinel: FerroxSentinelSecurityEngine;

  constructor(config: AppConfig) {
    this.paseto = new PasetoAuthService(config.pasetoSecret, config.pasetoIssuer);
    this.totp = new TotpAuthService();
    this.sentinel = new FerroxSentinelSecurityEngine(config.sentinelSecretKey);
  }

  public generatePasetoToken(userId: string, roles: string[] = ['user']): string {
    return this.paseto.generateV4LocalToken({
      sub: userId,
      roles,
    }, 3600);
  }

  public verifyPasetoToken(token: string) {
    return this.paseto.verifyV4LocalToken(token);
  }

  public setupTotp(userId: string) {
    const secret = this.totp.generateSecret();
    const uri = this.totp.generateOtpAuthUri(`${userId}@ferrox.dev`, secret, 'FerroxEnterpriseShowcase');
    return { secret, uri };
  }

  public verifyTotp(secret: string, code: string): boolean {
    return this.totp.verifyTotpCode(secret, code);
  }

  public evaluateThreat(payload: string, clientIp: string) {
    return this.sentinel.inspectPayload(payload, clientIp);
  }
}
