import * as nodemailer from 'nodemailer';
import sendgrid from '@sendgrid/mail';

export class MailerFactory {
  static createSmtp(config: any) {
    return nodemailer.createTransport(config);
  }
  static createSendGrid(apiKey: string) {
    sendgrid.setApiKey(apiKey);
    return sendgrid;
  }
}