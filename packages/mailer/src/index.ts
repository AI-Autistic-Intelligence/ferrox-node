import * as nodemailer from 'nodemailer';
import sendgrid from '@sendgrid/mail';

/**
 * Enterprise Mailer Factory.
 * 
 * Provides unified creation of email transport agents.
 * Supports standard SMTP (via Nodemailer) for enterprise internal relays 
 * and SendGrid (via official SDK) for high-deliverability transactional emails.
 */
export class MailerFactory {
  /**
   * Initializes a standard SMTP transport using Nodemailer.
   * Useful for internal mail servers (e.g. MS Exchange, Postfix) or bulk generic sending.
   * 
   * @param {any} config The Nodemailer transport configuration object.
   * @returns {nodemailer.Transporter} The ready-to-use nodemailer transporter instance.
   */
  static createSmtp(config: any): nodemailer.Transporter {
    return nodemailer.createTransport(config);
  }

  /**
   * Initializes the SendGrid Mail Service.
   * Highly recommended for mission-critical transactional emails requiring high reputation.
   * 
   * @param {string} apiKey The SendGrid API key (usually starts with 'SG.').
   * @returns {typeof sendgrid} The configured SendGrid mail service instance.
   */
  static createSendGrid(apiKey: string): typeof sendgrid {
    sendgrid.setApiKey(apiKey);
    return sendgrid;
  }
}