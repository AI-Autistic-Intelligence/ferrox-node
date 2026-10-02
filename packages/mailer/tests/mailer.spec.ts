import { MailerFactory } from '../src/index';

describe('MailerFactory', () => {
  it('should initialize Smtp', () => {
    const client = MailerFactory.createSmtp({ host: 'smtp.test.com' });
    expect(client).toBeDefined();
  });

  it('should initialize SendGrid', () => {
    const client = MailerFactory.createSendGrid('SG.test');
    expect(client).toBeDefined();
  });
});
